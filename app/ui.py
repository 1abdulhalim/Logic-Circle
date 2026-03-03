# app/ui.py

import streamlit as st
from logic_gates import LogicGate
from fsm import TrafficLightFSM

st.title("Logic Circle – Traffic Light FSM Simulator")

gate = LogicGate()
fsm = TrafficLightFSM()

cars_waiting = st.selectbox("Cars waiting?", [0, 1])
ped_button = st.selectbox("Pedestrian button pressed?", [0, 1])

gate_output = gate.AND(cars_waiting, ped_button)
st.write("Gate output:", gate_output)

fsm.transition(gate_output)
st.write("Traffic light state:", fsm.get_state())
