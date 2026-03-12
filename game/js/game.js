// ui.js — game UI, screens, drag/drop, wire drawing

const engine = new CircuitEngine();
let currentLevel = null;
let placedGates = [];
let gateCounter = 0;

// Wiring state
let wiringFrom = null;  // { type: 'input'|'gate', name?, gateId?, x, y }
let tempWirePath = null;

// DOM refs
let canvasEl, svgOverlay;
let inputNodes = {};   // name -> { el, portEl }
let outputNodeEl = null;

// ─── Screen management ────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function initHome() {
  document.getElementById("play-btn").addEventListener("click", () => {
    initLevelSelect();
    showScreen("level-select");
  });
  document.getElementById("leaderboard-btn").addEventListener("click", showLeaderboard);
  document.getElementById("lb-back-btn").addEventListener("click", () => showScreen("home"));
}

// ─── Level Select ─────────────────────────────────────────────────────────────

function initLevelSelect() {
  const grid = document.getElementById("level-grid");
  grid.innerHTML = "";
  const progress = loadProgress();

  LEVELS.forEach((lvl, i) => {
    const unlocked = i === 0 || (progress[i - 1]?.stars ?? 0) > 0;
    const stars = progress[i]?.stars ?? 0;

    const card = document.createElement("div");
    card.className = "level-card" + (unlocked ? "" : " locked");
    card.innerHTML = `
      <div class="level-number">Level ${lvl.id}</div>
      <div class="level-title">${lvl.title}</div>
      <div class="level-stars">${renderStars(stars)}</div>
      ${!unlocked ? '<div class="lock-icon">🔒</div>' : ""}
    `;
    if (unlocked) card.addEventListener("click", () => startLevel(lvl));
    grid.appendChild(card);
  });

  document.getElementById("back-home-btn").onclick = () => showScreen("home");
}

function renderStars(n) {
  return [1,2,3].map(i => `<span class="star ${i<=n?"lit":""}"">★</span>`).join("");
}

// ─── Level Start ──────────────────────────────────────────────────────────────

function startLevel(lvl) {
  currentLevel = lvl;
  placedGates = [];
  gateCounter = 0;
  wiringFrom = null;
  tempWirePath = null;
  engine.reset();
  engine.setInputs({}); // inputs are set by the user

  showScreen("game");

  document.getElementById("game-level-title").textContent = `Level ${lvl.id}: ${lvl.title}`;
  document.getElementById("game-description").textContent = lvl.description;
  document.getElementById("hint-text").textContent = lvl.hint;
  document.getElementById("hint-box").classList.add("hidden");
  document.getElementById("result-panel").classList.add("hidden");

  canvasEl  = document.getElementById("circuit-canvas");
  svgOverlay = document.getElementById("wire-svg");
  canvasEl.innerHTML = "";
  svgOverlay.innerHTML = "";

  buildInputNodes(lvl);
  buildOutputNode(lvl);
  buildToolbox(lvl);

  // Canvas-level mouse handlers (for wire dragging)
  canvasEl.addEventListener("mousemove", onCanvasMouseMove);

  // Global mouseup to finish or cancel wire
  document.addEventListener("mouseup", onGlobalMouseUp);

  // Buttons
  document.getElementById("simulate-btn").onclick = runSimulation;
  document.getElementById("reset-btn").onclick    = () => startLevel(lvl);
  document.getElementById("hint-btn").onclick     = () =>
    document.getElementById("hint-box").classList.toggle("hidden");
  document.getElementById("back-levels-btn").onclick = () => {
    showScreen("level-select");
    initLevelSelect();
    document.removeEventListener("mouseup", onGlobalMouseUp);
  };

  // Drag-drop gates onto canvas
  canvasEl.addEventListener("dragover", e => e.preventDefault());
  canvasEl.addEventListener("drop", e => {
    e.preventDefault();
    const type = e.dataTransfer.getData("gateType");
    if (!type) return;
    const rect = canvasEl.getBoundingClientRect();
    placeGate(type, e.clientX - rect.left - 60, e.clientY - rect.top - 28);
  });

  syncSVGSize();
  window.onresize = syncSVGSize;
}

function syncSVGSize() {
  const r = canvasEl.getBoundingClientRect();
  svgOverlay.setAttribute("width",  r.width);
  svgOverlay.setAttribute("height", r.height);
}

// ─── Input nodes (fixed on left of canvas) ────────────────────────────────────

function buildInputNodes(lvl) {
  inputNodes = {};
  const names = Object.keys(lvl.inputs);
  const total  = names.length;

  names.forEach((name, i) => {
    const canvasH = window.innerHeight - 160;
    const y = (i + 1) * canvasH / (total + 1) - 35;

    const node = document.createElement("div");
    node.className = "canvas-input unset";
    node.style.left = "16px";
    node.style.top  = y + "px";
    node.innerHTML  = `
      <span class="cin-label">${name}</span>
      <div class="cin-btns">
        <button class="cin-btn" data-val="0">0</button>
        <button class="cin-btn" data-val="1">1</button>
      </div>
      <div class="port output-port" data-source="input" data-name="${name}"></div>
    `;
    canvasEl.appendChild(node);

    node.querySelectorAll(".cin-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const val = parseInt(btn.dataset.val);
        engine.inputNodes[name] = val;
        node.classList.remove("unset", "on", "off");
        node.classList.add(val === 1 ? "on" : "off");
        node.querySelectorAll(".cin-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        engine.signals = {};
        document.getElementById("result-panel").classList.add("hidden");
        document.getElementById("output-node")?.classList.remove("solved");
        redrawWires();
      });
    });

    const portEl = node.querySelector(".output-port");
    portEl.addEventListener("mousedown", e => {
      e.preventDefault(); e.stopPropagation();
      const pr = portEl.getBoundingClientRect();
      const cr = canvasEl.getBoundingClientRect();
      startWire({ type: "input", name, x: pr.right - cr.left, y: pr.top - cr.top + 8 });
    });

    inputNodes[name] = { el: node, portEl };
  });
}

// ─── Output node (fixed on right of canvas) ───────────────────────────────────

function buildOutputNode(lvl) {
  const node = document.createElement("div");
  node.id = "output-node";
  node.className = "canvas-output";
  node.innerHTML = `
    <div class="port input-port" id="output-input-port"></div>
    <span class="cout-bulb">💡</span>
    <span class="cout-label">OUTPUT<br><small>target: ${lvl.targetOutput}</small></span>
  `;
  canvasEl.appendChild(node);
  outputNodeEl = node;

  // Position it vertically centered — done via CSS absolute + transform

  // Accept wire drop
  node.querySelector("#output-input-port").addEventListener("mouseup", e => {
    e.stopPropagation();
    if (!wiringFrom) return;
    if (wiringFrom.type === "gate") {
      engine.setOutputGate(wiringFrom.gateId);
      // Store wire for rendering
      engine.wires.push({ from: { gateId: wiringFrom.gateId }, to: { outputNode: true } });
    }
    cancelWire();
    redrawWires();
  });
}

// ─── Toolbox ──────────────────────────────────────────────────────────────────

function buildToolbox(lvl) {
  const toolbox = document.getElementById("toolbox");
  toolbox.innerHTML = "";
  lvl.availableGates.forEach(type => {
    const btn = document.createElement("div");
    btn.className = "toolbox-gate";
    btn.style.background = GATE_COLORS[type];
    btn.textContent = type;
    btn.draggable   = true;
    btn.addEventListener("dragstart", e => e.dataTransfer.setData("gateType", type));
    toolbox.appendChild(btn);
  });
}

// ─── Gate placement ───────────────────────────────────────────────────────────

function placeGate(type, x, y) {
  const id  = `gate_${++gateCounter}`;
  engine.addGate(id, type);

  const portsNeeded = GATE_INPUTS_NEEDED[type];
  const inputPortsHTML = Array.from({ length: portsNeeded }, (_, i) => {
    const topPct = portsNeeded === 1 ? 50 : i === 0 ? 28 : 72;
    return `<div class="port input-port" data-gate="${id}" data-port="in${i}" style="top:${topPct}%"></div>`;
  }).join("");

  const el = document.createElement("div");
  el.className = "placed-gate";
  el.id = id;
  el.style.left = Math.max(120, x) + "px";
  el.style.top  = Math.max(8, y)   + "px";
  el.style.background = GATE_COLORS[type];
  el.innerHTML = `
    ${inputPortsHTML}
    <span class="gate-label">${type}</span>
    <div class="port output-port" data-gate="${id}" data-port="out"></div>
    <div class="gate-delete" title="Delete">✕</div>
  `;

  // Drag gate around canvas
  makeDraggable(el);

  // Output port → start wire
  el.querySelector(".output-port").addEventListener("mousedown", e => {
    e.preventDefault(); e.stopPropagation();
    const pr = e.target.getBoundingClientRect();
    const cr = canvasEl.getBoundingClientRect();
    startWire({ type: "gate", gateId: id, x: pr.left - cr.left + 8, y: pr.top - cr.top + 8 });
  });

  // Input ports → finish wire
  el.querySelectorAll(".input-port").forEach(port => {
    port.addEventListener("mouseup", e => {
      e.stopPropagation();
      finishWireAtGate(id, port.dataset.port);
    });
  });

  // Delete gate
  el.querySelector(".gate-delete").addEventListener("click", e => {
    e.stopPropagation();
    engine.removeGate(id);
    // Also remove any output-node wire pointing from this gate
    engine.wires = engine.wires.filter(w => !(w.from.gateId === id && w.to?.outputNode));
    if (engine.outputNode === id) engine.outputNode = null;
    placedGates = placedGates.filter(g => g.id !== id);
    el.remove();
    redrawWires();
  });

  canvasEl.appendChild(el);
  placedGates.push({ id, type, el });
}

function makeDraggable(el) {
  let startX, startY, origL, origT;

  el.addEventListener("mousedown", e => {
    if (e.target.classList.contains("port") || e.target.classList.contains("gate-delete")) return;
    startX = e.clientX; startY = e.clientY;
    origL  = parseInt(el.style.left); origT = parseInt(el.style.top);
    el.style.zIndex = 100;

    const move = e2 => {
      el.style.left = origL + (e2.clientX - startX) + "px";
      el.style.top  = origT + (e2.clientY - startY) + "px";
      redrawWires();
    };
    const up = () => {
      el.style.zIndex = 10;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    e.preventDefault();
  });
}

// ─── Wiring ───────────────────────────────────────────────────────────────────

function startWire(from) {
  wiringFrom = from;
  tempWirePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tempWirePath.setAttribute("stroke", "#a78bfa");
  tempWirePath.setAttribute("stroke-width", "3");
  tempWirePath.setAttribute("fill", "none");
  tempWirePath.setAttribute("stroke-dasharray", "8,4");
  tempWirePath.setAttribute("id", "temp-wire");
  svgOverlay.appendChild(tempWirePath);
}

function onCanvasMouseMove(e) {
  if (!wiringFrom || !tempWirePath) return;
  const cr = canvasEl.getBoundingClientRect();
  const mx = e.clientX - cr.left;
  const my = e.clientY - cr.top;
  tempWirePath.setAttribute("d", makeBezier(wiringFrom.x, wiringFrom.y, mx, my));
}

function onGlobalMouseUp(e) {
  // If mouseup wasn't on a port, cancel the wire
  if (wiringFrom) cancelWire();
}

function finishWireAtGate(toGateId, toPort) {
  if (!wiringFrom) return;
  if (wiringFrom.type === "input") {
    engine.addInputWire(wiringFrom.name, toGateId, toPort);
  } else if (wiringFrom.type === "gate") {
    engine.addWire(wiringFrom.gateId, toGateId, toPort);
  }
  cancelWire();
  redrawWires();
}

function cancelWire() {
  if (tempWirePath) { tempWirePath.remove(); tempWirePath = null; }
  wiringFrom = null;
}

// ─── Wire rendering ───────────────────────────────────────────────────────────

function redrawWires() {
  svgOverlay.querySelectorAll(".wire-path").forEach(p => p.remove());
  const cr = canvasEl.getBoundingClientRect();

  engine.wires.forEach(wire => {
    // Source position
    let fx, fy;
    if (wire.from.inputName !== undefined) {
      const node = inputNodes[wire.from.inputName];
      if (!node) return;
      const pr = node.portEl.getBoundingClientRect();
      fx = pr.right - cr.left;
      fy = pr.top   - cr.top + 8;
    } else {
      const gateEl = document.getElementById(wire.from.gateId);
      if (!gateEl) return;
      const port = gateEl.querySelector(".output-port");
      if (!port) return;
      const pr = port.getBoundingClientRect();
      fx = pr.left - cr.left + 8;
      fy = pr.top  - cr.top  + 8;
    }

    // Target position
    let tx, ty;
    if (wire.to?.outputNode) {
      const port = document.getElementById("output-input-port");
      if (!port) return;
      const pr = port.getBoundingClientRect();
      tx = pr.left - cr.left + 8;
      ty = pr.top  - cr.top  + 8;
    } else {
      const gateEl = document.getElementById(wire.to.gateId);
      if (!gateEl) return;
      const port = gateEl.querySelector(`.input-port[data-port="${wire.to.port}"]`);
      if (!port) return;
      const pr = port.getBoundingClientRect();
      tx = pr.left - cr.left + 8;
      ty = pr.top  - cr.top  + 8;
    }

    // Signal colour
    let signal = null;
    if (wire.from.inputName !== undefined) {
      signal = engine.signals[`input:${wire.from.inputName}`] ?? null;
    } else {
      signal = engine.signals[`gate:${wire.from.gateId}`] ?? null;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("wire-path");
    path.setAttribute("d", makeBezier(fx, fy, tx, ty));
    path.setAttribute("stroke-width", "3");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", signal === 1 ? "#22c55e" : signal === 0 ? "#64748b" : "#a78bfa");
    svgOverlay.appendChild(path);
  });
}

function makeBezier(x1, y1, x2, y2) {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

// ─── Simulation ───────────────────────────────────────────────────────────────

function runSimulation() {
  // Check all inputs have been set
  const unset = Object.keys(currentLevel.inputs).filter(
    name => engine.inputNodes[name] === undefined
  );
  if (unset.length > 0) {
    showResult(false, `⚠️ Set a value for input${unset.length > 1 ? "s" : ""}: ${unset.join(", ")}`, "Click 0 or 1 on each input node.");
    return;
  }

  // Check output is connected
  const hasOutputWire = engine.wires.some(w => w.to?.outputNode);
  if (!hasOutputWire) {
    showResult(false, "Connect a gate's output to the OUTPUT node first.", "Drag a wire from a gate's right port to the 💡 node.");
    return;
  }

  const result = engine.simulate();
  redrawWires();

  if (!result.success) {
    showResult(false, "⚠️ " + result.error, "Make sure all gate inputs are connected.");
    return;
  }

  const bulb = document.getElementById("output-node");
  if (result.outputValue === currentLevel.targetOutput) {
    const used  = placedGates.length;
    const stars = used <= currentLevel.par ? 3 : used <= currentLevel.par + 2 ? 2 : 1;
    saveProgress(currentLevel.id - 1, stars);
    bulb.classList.add("solved");
    showResult(true,
      `✅ Correct! Output = ${result.outputValue}`,
      `${renderStarsText(stars)}  (${used} gate${used !== 1 ? "s" : ""} used, par is ${currentLevel.par})`,
      stars,
    );
  } else {
    bulb.classList.remove("solved");
    showResult(false,
      `❌ Output = ${result.outputValue}, need ${currentLevel.targetOutput}`,
      "Try a different gate combination.",
    );
  }
}

function showResult(win, text, sub, stars = null) {
  const panel = document.getElementById("result-panel");
  panel.classList.remove("hidden", "win", "lose");
  panel.classList.add(win ? "win" : "lose");
  document.getElementById("result-text").textContent    = text;
  document.getElementById("result-subtext").textContent = sub;

  // Score submit row (only on win)
  const submitRow = document.getElementById("score-submit-row");
  if (win && stars !== null) {
    submitRow.classList.remove("hidden");
    submitRow.dataset.stars = stars;
  } else {
    submitRow.classList.add("hidden");
  }

  const nextBtn = document.getElementById("next-level-btn");
  if (win) {
    const nextLvl = LEVELS[currentLevel.id];
    if (nextLvl) {
      nextBtn.classList.remove("hidden");
      nextBtn.onclick = () => startLevel(nextLvl);
    } else {
      nextBtn.classList.add("hidden");
    }
  } else {
    nextBtn.classList.add("hidden");
  }
}

// ─── Score submission ─────────────────────────────────────────────────────────

async function submitScore(playerName, stars) {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: playerName,
        level_id: currentLevel.id,
        stars,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Leaderboard screen ───────────────────────────────────────────────────────

async function showLeaderboard() {
  showScreen("leaderboard");
  await fetchLeaderboard();
  document.getElementById("lb-refresh-btn").onclick = fetchLeaderboard;
}

async function fetchLeaderboard() {
  const container = document.getElementById("lb-entries");
  const maxStars  = LEVELS.length * 3;

  container.innerHTML = `<div class="lb-loading">Loading...</div>`;

  try {
    const res  = await fetch("/api/leaderboard");
    const data = await res.json();

    if (data.length === 0) {
      container.innerHTML = `<div class="lb-empty">No scores yet — be the first!</div>`;
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];

    container.innerHTML = data.map((row, i) => {
      const pct       = Math.round((row.total_stars / maxStars) * 100);
      const medalOrNum = i < 3 ? `<span class="lb-medal">${medals[i]}</span>` : `<span class="lb-num">${row.rank}</span>`;

      return `
        <div class="lb-row ${i === 0 ? "lb-first" : ""}">
          <div class="lb-left">
            ${medalOrNum}
            <div class="lb-info">
              <span class="lb-name">${row.player_name}</span>
              <span class="lb-sub">${row.levels_completed} / ${LEVELS.length} levels</span>
            </div>
          </div>
          <div class="lb-right">
            <span class="lb-star-count">${row.total_stars} <span style="color:var(--yellow)">★</span></span>
            <div class="lb-bar-wrap">
              <div class="lb-bar" style="width:${pct}%"></div>
            </div>
          </div>
        </div>`;
    }).join("");

  } catch {
    container.innerHTML = `<div class="lb-empty" style="color:var(--red)">Could not load scores. Is the server running?</div>`;
  }
}

function renderStarsText(n) {
  return [1,2,3].map(i => i<=n ? "★" : "☆").join("");
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function loadProgress() {
  try { return JSON.parse(localStorage.getItem("lc_progress") || "{}"); }
  catch { return {}; }
}
function saveProgress(index, stars) {
  const p = loadProgress();
  if (!p[index] || p[index].stars < stars) p[index] = { stars };
  localStorage.setItem("lc_progress", JSON.stringify(p));
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initHome();
  showScreen("home");
});
