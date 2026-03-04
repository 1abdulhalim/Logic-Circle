// engine.js — circuit simulation via topological evaluation

class CircuitEngine {
  constructor() {
    this.gates = {};      // id -> { id, type, inputPorts, outputPort }
    this.wires = [];      // { from: {gateId, port}, to: {gateId, port} }
    this.inputNodes = {}; // name -> value (0 or 1)
    this.outputNode = null; // gateId whose output is the circuit output
    this.signals = {};    // gateId/inputName -> computed value
  }

  reset() {
    this.gates = {};
    this.wires = [];
    this.inputNodes = {};
    this.outputNode = null;
    this.signals = {};
  }

  setInputs(inputMap) {
    this.inputNodes = { ...inputMap };
  }

  addGate(id, type) {
    this.gates[id] = {
      id,
      type,
      inputPorts: Array.from({ length: GATE_INPUTS_NEEDED[type] }, (_, i) => `in${i}`),
      outputPort: "out",
    };
  }

  removeGate(id) {
    delete this.gates[id];
    this.wires = this.wires.filter(
      w => w.from.gateId !== id && w.to.gateId !== id
    );
    if (this.outputNode === id) this.outputNode = null;
  }

  addWire(fromGateId, toGateId, toPort) {
    // Remove any existing wire into the same input port
    this.wires = this.wires.filter(
      w => !(w.to.gateId === toGateId && w.to.port === toPort)
    );
    this.wires.push({ from: { gateId: fromGateId }, to: { gateId: toGateId, port: toPort } });
  }

  addInputWire(inputName, toGateId, toPort) {
    this.wires = this.wires.filter(
      w => !(w.to.gateId === toGateId && w.to.port === toPort)
    );
    this.wires.push({ from: { inputName }, to: { gateId: toGateId, port: toPort } });
  }

  setOutputGate(id) {
    this.outputNode = id;
  }

  // Returns { success, outputValue, signals, error }
  simulate() {
    this.signals = {};

    // Seed inputs
    for (const [name, val] of Object.entries(this.inputNodes)) {
      this.signals[`input:${name}`] = val;
    }

    // Topological sort of gates
    const order = this._topoSort();
    if (order === null) {
      return { success: false, error: "Cycle detected in circuit." };
    }

    for (const gateId of order) {
      const gate = this.gates[gateId];
      const fn = GATE_TRUTH[gate.type];
      const inputValues = gate.inputPorts.map((port) => {
        const wire = this.wires.find(
          w => w.to.gateId === gateId && w.to.port === port
        );
        if (!wire) return null;
        if (wire.from.inputName !== undefined) {
          return this.signals[`input:${wire.from.inputName}`] ?? null;
        }
        return this.signals[`gate:${wire.from.gateId}`] ?? null;
      });

      if (inputValues.some(v => v === null)) {
        this.signals[`gate:${gateId}`] = null; // unconnected
        continue;
      }

      this.signals[`gate:${gateId}`] = fn(...inputValues);
    }

    if (!this.outputNode) {
      return { success: false, error: "No output gate set." };
    }

    const outputValue = this.signals[`gate:${this.outputNode}`];
    if (outputValue === null || outputValue === undefined) {
      return { success: false, error: "Output gate has unconnected inputs." };
    }

    return { success: true, outputValue, signals: { ...this.signals } };
  }

  // Returns signal on a wire: from a source to its output
  getWireSignal(wire) {
    if (wire.from.inputName !== undefined) {
      return this.signals[`input:${wire.from.inputName}`] ?? null;
    }
    return this.signals[`gate:${wire.from.gateId}`] ?? null;
  }

  _topoSort() {
    const visited = new Set();
    const inStack = new Set();
    const order = [];

    const visit = (id) => {
      if (inStack.has(id)) return false; // cycle
      if (visited.has(id)) return true;
      inStack.add(id);

      // Find gates that feed into this gate
      for (const wire of this.wires) {
        if (wire.to.gateId === id && wire.from.gateId) {
          if (!visit(wire.from.gateId)) return false;
        }
      }

      inStack.delete(id);
      visited.add(id);
      order.push(id);
      return true;
    };

    for (const id of Object.keys(this.gates)) {
      if (!visit(id)) return null;
    }

    return order;
  }

  // Returns all wires as array with their computed signal values
  getWiresWithSignals() {
    return this.wires.map(w => ({
      ...w,
      signal: this.getWireSignal(w),
    }));
  }
}
