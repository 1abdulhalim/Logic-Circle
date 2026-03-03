import streamlit as st
import time
from logic_gates import LogicGate
from fsm import TrafficLightFSM

st.set_page_config(page_title="Traffic Light Trouble!", page_icon="🚦")

st.title("🚦 Traffic Light Trouble! (Kids Game)")

gate = LogicGate()
fsm = TrafficLightFSM()

# --- session state ---
if "score" not in st.session_state:
    st.session_state.score = 0
if "state" not in st.session_state:
    st.session_state.state = "RED"

st.markdown("### Help the silly traffic light make the right choice!")

# --- cartoon traffic light display ---
def draw_light(state):
    if state == "RED":
        st.markdown("<h1 style='text-align:center; color:red;'>🔴 STOP!</h1>", unsafe_allow_html=True)
    elif state == "GREEN":
        st.markdown("<h1 style='text-align:center; color:green;'>🟢 GO!</h1>", unsafe_allow_html=True)
    elif state == "YELLOW":
        st.markdown("<h1 style='text-align:center; color:gold;'>🟡 WAIT!</h1>", unsafe_allow_html=True)

draw_light(st.session_state.state)

st.markdown("---")

st.subheader("Your Mission")

cars = st.selectbox("Are cars waiting? 🚗", [0, 1])
ped = st.selectbox("Is the pedestrian button pressed? 🚶‍♂️", [0, 1])

st.write("The silly traffic light needs your help!")
st.write("Use the **AND gate** to decide what it should do.")

if st.button("Make Decision! 🎉"):
    output = gate.AND(cars, ped)

    fsm.state = st.session_state.state
    fsm.transition(output)
    new_state = fsm.get_state()

    if new_state != st.session_state.state:
        st.session_state.score += 1
        st.success("Yay! You helped the traffic light! ⭐")
    else:
        st.error("Oops! The traffic light is confused 😵")

    st.session_state.state = new_state

    draw_light(new_state)

st.markdown("---")
st.metric("⭐ Score", st.session_state.score)
st.caption("Keep helping the traffic light to earn more stars!")
