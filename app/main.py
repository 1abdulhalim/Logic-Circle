# app/main.py

from logic_gates import LogicGate
from fsm import TrafficLightFSM

def run_demo():
    gate = LogicGate()
    fsm = TrafficLightFSM()

    cars_waiting = 1
    ped_button = 1

    gate_output = gate.AND(cars_waiting, ped_button)

    fsm.transition(gate_output)

    print("Gate output:", gate_output)
    print("Traffic light state:", fsm.get_state())

if __name__ == "__main__":
    run_demo()
