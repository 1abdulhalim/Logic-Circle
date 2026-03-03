import streamlit as st
import random
from logic_gates import LogicGate

st.set_page_config(page_title="Logic Game", page_icon="🎮")

st.title("🎮 Logic Gate Challenge")

gate = LogicGate()

# --- session state for score ---
if "score" not in st.session_state:
    st.session_state.score = 0
if "question" not in st.session_state:
    st.session_state.question = None
if "correct_answer" not in st.session_state:
    st.session_state.correct_answer = None

gates = ["AND", "OR", "XOR", "NAND", "NOR", "XNOR"]

def new_question():
    A = random.randint(0, 1)
    B = random.randint(0, 1)
    gate_name = random.choice(gates)

    if gate_name == "AND":
        ans = gate.AND(A, B)
    elif gate_name == "OR":
        ans = gate.OR(A, B)
    elif gate_name == "XOR":
        ans = gate.XOR(A, B)
    elif gate_name == "NAND":
        ans = gate.NAND(A, B)
    elif gate_name == "NOR":
        ans = gate.NOR(A, B)
    elif gate_name == "XNOR":
        ans = gate.XNOR(A, B)

    st.session_state.question = (A, B, gate_name)
    st.session_state.correct_answer = ans

if st.session_state.question is None:
    new_question()

A, B, gate_name = st.session_state.question

st.markdown("### 🧠 Your Mission")
st.write(f"Inputs: **A = {A}**, **B = {B}**")
st.write(f"Gate: **{gate_name}**")
st.write("What is the **output**?")

col1, col2 = st.columns(2)
with col1:
    if st.button("0 ❌"):
        chosen = 0
        if chosen == st.session_state.correct_answer:
            st.success("✅ Correct! +1 point")
            st.session_state.score += 1
        else:
            st.error(f"❌ Wrong! Correct answer was {st.session_state.correct_answer}")
        new_question()
with col2:
    if st.button("1 ✅"):
        chosen = 1
        if chosen == st.session_state.correct_answer:
            st.success("✅ Correct! +1 point")
            st.session_state.score += 1
        else:
            st.error(f"❌ Wrong! Correct answer was {st.session_state.correct_answer}")
        new_question()

st.markdown("---")
st.metric("🏆 Score", st.session_state.score)
st.caption("Keep playing to beat your high score!")
