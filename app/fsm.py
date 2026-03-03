# app/fsm.py

class TrafficLightFSM:
    def __init__(self):
        self.state = "RED"
        self.transitions = {
            ("RED", 1): "GREEN",
            ("GREEN", 1): "YELLOW",
            ("YELLOW", 1): "RED"
        }

    def transition(self, gate_output):
        key = (self.state, gate_output)
        if key in self.transitions:
            self.state = self.transitions[key]

    def get_state(self):
        return self.state
