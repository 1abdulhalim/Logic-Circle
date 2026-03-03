from app.fsm import FSM

def test_fsm_transition():
    states = ["A", "B"]
    transitions = {("A", "go"): "B"}
    fsm = FSM(states, "A", transitions)

    assert fsm.trigger("go") == "B"
