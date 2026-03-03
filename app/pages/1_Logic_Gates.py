import streamlit as st
import pandas as pd
from logic_gates import LogicGate

st.title("Logic Gate Simulator")

gate = LogicGate()

st.subheader("Inputs")
col1, col2 = st.columns(2)
with col1:
    a = st.selectbox("Input A", [0, 1])
with col2:
    b = st.selectbox("Input B", [0, 1])

st.markdown("---")

st.subheader("Gate Outputs")
colA, colB, colC = st.columns(3)

with colA:
    st.write("**AND:**", gate.AND(a, b))
    st.write("**OR:**", gate.OR(a, b))
    st.write("**XOR:**", gate.XOR(a, b))

with colB:
    st.write("**NAND:**", gate.NAND(a, b))
    st.write("**NOR:**", gate.NOR(a, b))
    st.write("**XNOR:**", gate.XNOR(a, b))

with colC:
    st.write("**NOT A:**", gate.NOT(a))
    st.write("**NOT B:**", gate.NOT(b))

st.markdown("---")

st.subheader("Truth Table")

truth_data = []
for A in [0, 1]:
    for B in [0, 1]:
        truth_data.append({
            "A": A,
            "B": B,
            "AND": gate.AND(A, B),
            "OR": gate.OR(A, B),
            "XOR": gate.XOR(A, B),
            "NAND": gate.NAND(A, B),
            "NOR": gate.NOR(A, B),
            "XNOR": gate.XNOR(A, B)
        })

df = pd.DataFrame(truth_data)
st.table(df)
