# app/logic_gates.py

class LogicGate:
    def AND(self, a, b):
        return int(a and b)

    def OR(self, a, b):
        return int(a or b)

    def NOT(self, a):
        return int(not a)

    def XOR(self, a, b):
        return int(a ^ b)

    def NAND(self, a, b):
        return int(not (a and b))

    def NOR(self, a, b):
        return int(not (a or b))

    def XNOR(self, a, b):
        return int(not (a ^ b))
