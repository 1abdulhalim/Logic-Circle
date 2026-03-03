from app.logic_gates import LogicGate

def test_and():
    g = LogicGate("test")
    assert g.AND(1, 1) == 1
    assert g.AND(1, 0) == 0
