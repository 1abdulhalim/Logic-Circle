// fsm.js — FSM game UI (trace / fill / build modes)

let fsmCurrentLevel = null;
let fsmAttempts     = 0;

// ─── Level Select ─────────────────────────────────────────────────────────────

function initFSMLevelSelect() {
  const grid     = document.getElementById("fsm-level-grid");
  const progress = loadFSMProgress();
  grid.innerHTML = "";

  FSM_LEVELS.forEach((lvl, i) => {
    const unlocked = i === 0 || (progress[i - 1]?.stars ?? 0) > 0;
    const stars    = progress[i]?.stars ?? 0;
    const badge    = { trace: "Trace", fill: "Fill", build: "Build" }[lvl.type];
    const badgeCol = { trace: "#0891b2", fill: "#7c3aed", build: "#e11d48" }[lvl.type];

    const card = document.createElement("div");
    card.className = "level-card" + (unlocked ? "" : " locked");
    card.innerHTML = `
      <div class="level-number">FSM ${lvl.id}
        <span class="puzzle-badge" style="background:${badgeCol}">${badge}</span>
      </div>
      <div class="level-title">${lvl.title}</div>
      <div class="level-stars">${fsmRenderStars(stars)}</div>
      ${!unlocked ? '<div class="lock-icon">🔒</div>' : ""}
    `;
    if (unlocked) card.addEventListener("click", () => startFSMLevel(lvl));
    grid.appendChild(card);
  });

  document.getElementById("fsm-back-home-btn").onclick = () => showScreen("home");
}

function fsmRenderStars(n) {
  return [1, 2, 3].map(i => `<span class="star ${i <= n ? "lit" : ""}">★</span>`).join("");
}

// ─── Start Level ──────────────────────────────────────────────────────────────

function startFSMLevel(lvl) {
  fsmCurrentLevel = lvl;
  fsmAttempts     = 0;

  showScreen("fsm-game");

  const typeName = { trace: "Trace", fill: "Fill in", build: "Build" }[lvl.type];
  document.getElementById("fsm-level-title").textContent = `FSM ${lvl.id}: ${lvl.title}`;
  document.getElementById("fsm-level-badge").textContent = typeName;
  document.getElementById("fsm-level-badge").className =
    "fsm-mode-badge fsm-mode-" + lvl.type;

  document.getElementById("fsm-desc").textContent       = lvl.description;
  document.getElementById("fsm-hint-text").textContent  = lvl.hint;
  document.getElementById("fsm-hint-box").classList.add("hidden");
  document.getElementById("fsm-result").className       = "hidden";
  document.getElementById("fsm-sim-panel")?.classList.add("hidden");
  document.getElementById("fsm-next-btn").classList.add("hidden");

  document.getElementById("fsm-hint-btn").onclick = () =>
    document.getElementById("fsm-hint-box").classList.toggle("hidden");
  document.getElementById("fsm-game-back-btn").onclick = () => {
    showScreen("fsm-level-select");
    initFSMLevelSelect();
  };

  if (lvl.type === "trace") {
    startTraceMode(lvl);
  } else {
    startTableMode(lvl);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE MODE
// ═══════════════════════════════════════════════════════════════════════════════

let traceStep       = 0;
let traceMistakes   = 0;
let traceState      = null;
let traceWaiting    = false;

function startTraceMode(lvl) {
  traceStep     = 0;
  traceMistakes = 0;
  traceState    = lvl.initial;
  traceWaiting  = false;

  document.getElementById("fsm-trace-ui").classList.remove("hidden");
  document.getElementById("fsm-table-ui").classList.add("hidden");

  renderTraceInputChips();
  renderStateButtons(lvl.states);
  updateTracePrompt();
  loadFSMDiagram(traceState, null, lvl.transitions).then(() => makeTraceDiagramClickable());

  document.getElementById("fsm-trace-reset").onclick = () => startFSMLevel(lvl);
}

function makeTraceDiagramClickable() {
  document.getElementById("fsm-diagram").querySelectorAll(".node").forEach(node => {
    const title = node.querySelector("title");
    if (!title || title.textContent.trim() === "__start__") return;
    const stateName = title.textContent.trim();
    node.classList.add("fsm-node-clickable");
    node.onclick = () => handleTraceClick(stateName);
  });
}

function renderTraceInputChips() {
  const container = document.getElementById("fsm-trace-sequence");
  container.innerHTML = fsmCurrentLevel.traceInputs
    .map((inp, i) => `<span class="fsm-chip" id="tc-${i}">${inp}</span>`)
    .join('<span class="fsm-arrow">→</span>');
}

function renderStateButtons(states) {
  const container = document.getElementById("fsm-state-btns");
  container.innerHTML = states
    .map(s => `<button class="fsm-state-btn" data-state="${s}">${s}</button>`)
    .join("");

  container.querySelectorAll(".fsm-state-btn").forEach(btn => {
    btn.addEventListener("click", () => handleTraceClick(btn.dataset.state));
  });
}

function updateTracePrompt() {
  const inputs = fsmCurrentLevel.traceInputs;
  document.getElementById("fsm-trace-current").textContent = traceState;

  if (traceStep >= inputs.length) {
    document.getElementById("fsm-trace-prompt").textContent = "All inputs applied!";
    document.getElementById("fsm-state-btns").classList.add("hidden");
    const stars = traceMistakes === 0 ? 3 : traceMistakes <= 2 ? 2 : 1;
    saveFSMProgress(fsmCurrentLevel.id - 1, stars);
    showFSMResult(true, `✅ Complete! Final state: "${traceState}" — ${fsmRenderStars(stars)}`);
    return;
  }

  document.getElementById("fsm-trace-prompt").textContent =
    `Input: "${inputs[traceStep]}" — click the correct next state`;
  document.getElementById("fsm-state-btns").classList.remove("hidden");
  highlightChip(traceStep, "active");
}

function handleTraceClick(clicked) {
  if (traceWaiting) return;
  const inputs  = fsmCurrentLevel.traceInputs;
  const input   = inputs[traceStep];
  const correct = fsmCurrentLevel.transitions[traceState]?.[input];

  const btns = document.getElementById("fsm-state-btns");
  const clickedBtn = btns.querySelector(`[data-state="${clicked}"]`);

  if (clicked === correct) {
    clickedBtn?.classList.add("correct");
    highlightChip(traceStep, "done");
    traceState = correct;
    traceStep++;

    traceWaiting = true;
    loadFSMDiagram(traceState, null, fsmCurrentLevel.transitions).then(() => {
      makeTraceDiagramClickable();
      btns.querySelectorAll(".fsm-state-btn").forEach(b => b.classList.remove("correct", "wrong"));
      traceWaiting = false;
      updateTracePrompt();
    });
  } else {
    traceMistakes++;
    clickedBtn?.classList.add("wrong");
    highlightChip(traceStep, "error");
    setTimeout(() => {
      clickedBtn?.classList.remove("wrong");
      highlightChip(traceStep, "active");
    }, 700);
  }
}

function highlightChip(index, cls) {
  const chip = document.getElementById(`tc-${index}`);
  if (!chip) return;
  chip.className = "fsm-chip " + cls;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE MODE (fill / build)
// ═══════════════════════════════════════════════════════════════════════════════

function startTableMode(lvl) {
  document.getElementById("fsm-trace-ui").classList.add("hidden");
  document.getElementById("fsm-table-ui").classList.remove("hidden");

  renderTransitionTable(lvl, null);
  renderTestCases(lvl.testCases, null);

  const visibleTransitions = getKnownTransitions(lvl);
  loadFSMDiagram(lvl.initial, null, visibleTransitions);

  document.getElementById("fsm-run-btn").onclick   = runFSMTests;
  document.getElementById("fsm-clear-btn").onclick = () => startFSMLevel(lvl);
}

function getKnownTransitions(lvl) {
  if (lvl.hiddenCells === "all") return {};
  const known = {};
  for (const [state, trans] of Object.entries(lvl.transitions)) {
    for (const [input, next] of Object.entries(trans)) {
      const hidden = lvl.hiddenCells.some(h => h.state === state && h.input === input);
      if (!hidden) {
        if (!known[state]) known[state] = {};
        known[state][input] = next;
      }
    }
  }
  return known;
}

function isHiddenCell(lvl, state, input) {
  if (lvl.hiddenCells === "all") {
    return (lvl.transitions[state]?.[input] !== undefined);
  }
  return lvl.hiddenCells.some(h => h.state === state && h.input === input);
}

function renderTransitionTable(lvl, results) {
  const container = document.getElementById("fsm-transition-table");
  const stateOpts = lvl.states.map(s => `<option value="${s}">${s}</option>`).join("");

  let html = '<table class="fsm-table"><thead><tr>';
  html += '<th>State \\ Input</th>';
  for (const inp of lvl.inputs) html += `<th>${inp}</th>`;
  html += '</tr></thead><tbody>';

  for (const state of lvl.states) {
    html += `<tr><td class="fsm-state-cell">${state}</td>`;
    for (const inp of lvl.inputs) {
      const correct = lvl.transitions[state]?.[inp];
      const hidden  = isHiddenCell(lvl, state, inp);

      if (correct === undefined) {
        html += `<td class="fsm-cell fsm-na">—</td>`;
      } else if (!hidden) {
        html += `<td class="fsm-cell fsm-known">${correct}</td>`;
      } else {
        const cellId = `cell-${state}-${inp}`.replace(/\s/g, "_");
        const res = results?.find(r => r.state === state && r.input === inp);
        const errClass = res?.wrong ? "fsm-cell-error" : "";
        html += `<td class="fsm-cell fsm-editable ${errClass}">
          <select class="fsm-cell-select" id="${cellId}"
            data-state="${state}" data-input="${inp}">
            <option value="">?</option>
            ${stateOpts}
          </select>
        </td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderTestCases(testCases, results) {
  const container = document.getElementById("fsm-test-cases");
  container.innerHTML = testCases.map((tc, i) => {
    const r = results?.[i];
    const statusClass = r == null ? "" : (r.passed ? "pass" : "fail");
    const badge = r == null ? '<span class="tc-badge pending">?</span>'
      : r.passed
      ? '<span class="tc-badge pass">✓</span>'
      : `<span class="tc-badge fail">✗ got "${r.actual}"</span>`;
    return `
      <div class="fsm-test-case ${statusClass}">
        ${badge}
        <span class="tc-label">${tc.label}</span>
        <span class="tc-path">${tc.inputs.join(" → ")} → <strong>${tc.expected}</strong></span>
      </div>`;
  }).join("");
}

function getUserTransitions() {
  const result = {};
  document.querySelectorAll(".fsm-cell-select").forEach(sel => {
    const { state, input } = sel.dataset;
    if (!result[state]) result[state] = {};
    result[state][input] = sel.value || null;
  });
  return result;
}

function runFSMTests() {
  const lvl          = fsmCurrentLevel;
  const userFilled   = getUserTransitions();
  const fullTrans    = buildFullTransitions(lvl, userFilled);

  // Check all editable cells are filled
  const empties = [];
  document.querySelectorAll(".fsm-cell-select").forEach(sel => {
    if (!sel.value) empties.push(sel);
  });
  if (empties.length > 0) {
    empties.forEach(s => s.closest("td").classList.add("fsm-cell-error"));
    showFSMResult(false, `Fill in all ${empties.length} missing transition(s) first.`);
    return;
  }

  // Run each test case
  const results = lvl.testCases.map(tc => {
    let current = lvl.initial;
    for (const input of tc.inputs) {
      const next = fullTrans[current]?.[input];
      if (!next) return { passed: false, actual: `no transition from "${current}" on "${input}"` };
      current = next;
    }
    return { passed: current === tc.expected, actual: current };
  });

  renderTestCases(lvl.testCases, results);

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    const stars = fsmAttempts === 0 ? 3 : fsmAttempts === 1 ? 2 : 1;
    saveFSMProgress(lvl.id - 1, stars);
    showFSMResult(true, `✅ All tests passed! ${fsmRenderStars(stars)}`);
    loadFSMDiagram(lvl.initial, null, fullTrans);
    showSimPanel(fullTrans);

    const nextLvl = FSM_LEVELS[lvl.id];
    const nextBtn = document.getElementById("fsm-next-btn");
    if (nextLvl) {
      nextBtn.classList.remove("hidden");
      nextBtn.onclick = () => startFSMLevel(nextLvl);
    }
  } else {
    fsmAttempts++;
    const failCount = results.filter(r => !r.passed).length;
    showFSMResult(false, `${failCount} test case${failCount > 1 ? "s" : ""} failed — check your table.`);
  }
}

function buildFullTransitions(lvl, userFilled) {
  const full = {};
  for (const state of lvl.states) {
    full[state] = { ...(lvl.transitions[state] || {}) };
    if (userFilled[state]) {
      for (const [input, val] of Object.entries(userFilled[state])) {
        if (val) full[state][input] = val;
      }
    }
  }
  return full;
}

// ─── Try it yourself ──────────────────────────────────────────────────────────

function showSimPanel(transitions) {
  const panel = document.getElementById("fsm-sim-panel");
  panel.classList.remove("hidden");

  document.getElementById("fsm-sim-run").onclick = () => {
    const raw    = document.getElementById("fsm-sim-input").value;
    const inputs = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    if (!inputs.length) return;
    runCustomSim(transitions, inputs);
  };

  document.getElementById("fsm-sim-input").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("fsm-sim-run").click();
  });
}

function runCustomSim(transitions, inputs) {
  const lvl  = fsmCurrentLevel;
  let current = lvl.initial;
  const steps = [{ state: current, input: null }];

  for (const input of inputs) {
    const next = transitions[current]?.[input];
    if (!next) { steps.push({ state: null, input, error: true }); break; }
    steps.push({ state: next, input });
    current = next;
  }

  const container = document.getElementById("fsm-sim-path");
  container.innerHTML = steps.map((s, i) => {
    if (s.error) return `<span class="sim-error">✗ no transition from "${steps[i-1].state}" on "${s.input}"</span>`;
    const arrow = i > 0 ? `<span class="sim-via">${s.input}</span><span class="sim-arrow">→</span>` : "";
    return `${arrow}<span class="sim-state">${s.state}</span>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED — diagram + result + progress
// ═══════════════════════════════════════════════════════════════════════════════

async function loadFSMDiagram(currentState, activeTransition, transitions) {
  const lvl       = fsmCurrentLevel;
  const diagramEl = document.getElementById("fsm-diagram");
  diagramEl.innerHTML = '<p class="fsm-loading">Rendering diagram…</p>';

  try {
    const res  = await fetch("/api/fsm/diagram", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        states:            lvl.states,
        initial:           lvl.initial,
        transitions:       transitions || {},
        accepting:         lvl.accepting || [],
        current_state:     currentState,
        active_transition: activeTransition,
      }),
    });
    const data = await res.json();
    diagramEl.innerHTML = data.svg;

    const svg = diagramEl.querySelector("svg");
    if (svg) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width  = "100%";
      svg.style.height = "100%";
    }
  } catch {
    diagramEl.innerHTML = '<p class="fsm-loading" style="color:var(--red)">Could not render diagram.</p>';
  }
}

function showFSMResult(win, text) {
  const el = document.getElementById("fsm-result");
  el.innerHTML  = text;
  el.className  = "fsm-result " + (win ? "win" : "lose");
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function fsmProgressKey() {
  const name = (typeof currentUser !== "undefined" && currentUser?.username) || "guest";
  return `lc_fsm_progress_${name}`;
}

function loadFSMProgress() {
  try { return JSON.parse(localStorage.getItem(fsmProgressKey()) || "{}"); }
  catch { return {}; }
}

function saveFSMProgress(index, stars) {
  const p = loadFSMProgress();
  if (!p[index] || p[index].stars < stars) p[index] = { stars };
  localStorage.setItem(fsmProgressKey(), JSON.stringify(p));
}
