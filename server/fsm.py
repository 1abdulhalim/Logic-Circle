import graphviz


def build_diagram(states, initial, transitions, accepting=None, current_state=None, active_transition=None):
    accepting = accepting or []
    active = tuple(active_transition) if active_transition else None

    dot = graphviz.Digraph(format='svg')
    dot.attr(rankdir='LR', bgcolor='transparent', pad='0.4', nodesep='0.6', ranksep='0.9')
    dot.attr('node', fontname='Segoe UI', fontsize='13', margin='0.25,0.15')
    dot.attr('edge', fontname='Segoe UI', fontsize='11')

    dot.node('__start__', '', shape='point', width='0.2', color='#94a3b8')
    dot.edge('__start__', initial, color='#94a3b8', arrowsize='0.8')

    for state in states:
        shape = 'doublecircle' if state in accepting else 'circle'
        if state == current_state:
            dot.node(state, state, shape=shape, style='filled',
                     fillcolor='#6366f1', fontcolor='white',
                     color='#818cf8', penwidth='2.5')
        else:
            dot.node(state, state, shape=shape, style='filled',
                     fillcolor='#1e293b', fontcolor='#e2e8f0',
                     color='#475569')

    edge_map = {}
    for from_state, trans in transitions.items():
        for symbol, to_state in trans.items():
            edge_map.setdefault((from_state, to_state), []).append(symbol)

    for (src, dst), symbols in edge_map.items():
        label = ', '.join(symbols)
        if active == (src, dst):
            dot.edge(src, dst, label=label,
                     color='#22c55e', fontcolor='#22c55e', penwidth='2.5', arrowsize='0.9')
        else:
            dot.edge(src, dst, label=label,
                     color='#64748b', fontcolor='#94a3b8', arrowsize='0.8')

    svg = dot.pipe().decode('utf-8')
    if '<?xml' in svg:
        svg = svg[svg.index('<svg'):]
    return svg


def run_fsm(initial, transitions, inputs):
    current = initial
    path = []
    for inp in inputs:
        trans = transitions.get(current, {})
        if inp in trans:
            nxt = trans[inp]
            path.append({'from': current, 'input': inp, 'to': nxt})
            current = nxt
        else:
            path.append({'from': current, 'input': inp, 'to': None})
            break
    return {'path': path, 'final': current}
