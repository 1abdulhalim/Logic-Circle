// fsm.js — FSM Puzzle Builder Game v1

// ── CSS ───────────────────────────────────────────────────────────────────────

(function injectCSS() {
  if (document.getElementById("fsm-game-css")) return;
  const s = document.createElement("style");
  s.id = "fsm-game-css";
  s.textContent = `
    /* ── FSM level select ── */
    #fsm-level-select { padding:32px 24px; gap:20px; overflow-y:auto; flex-direction:column; align-items:center; }

    /* ── FSM game screen ── */
    #fsm-game { flex-direction:column; height:100vh; overflow:hidden; }

    #fgame-hdr {
      display:flex; align-items:center; gap:14px;
      padding:10px 18px; background:#1e293b; border-bottom:1px solid #334155;
      flex-shrink:0;
    }
    #fgame-hdr-title { font-size:1.1rem; font-weight:700; white-space:nowrap; }
    #fgame-hdr-desc  { font-size:0.88rem; color:#94a3b8; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    #fgame-canvas {
      flex:1; position:relative; overflow:hidden;
      background:radial-gradient(circle,#334155 1px,transparent 1px) 0 0/28px 28px,#0f172a;
    }
    #fgame-svg { position:absolute; top:0; left:0; width:100%; height:100%; }

    /* Instruction pill */
    .fgame-pill {
      position:absolute; bottom:10px; left:50%; transform:translateX(-50%);
      background:#1e293b; border:1px solid #334155; border-radius:999px;
      padding:5px 16px; font-size:0.75rem; color:#94a3b8;
      z-index:50; pointer-events:none; white-space:nowrap;
    }

    /* Result panel */
    #fgame-result {
      position:absolute; bottom:72px; left:50%; transform:translateX(-50%);
      background:#1e293b; border:1px solid #334155; border-radius:14px;
      padding:18px 26px; text-align:center; z-index:200;
      min-width:320px; max-width:520px; box-shadow:0 16px 48px rgba(0,0,0,0.5);
    }
    #fgame-result.win  { border-color:#22c55e; }
    #fgame-result.lose { border-color:#ef4444; }
    #fgame-result-txt  { font-size:1.05rem; font-weight:700; margin-bottom:4px; }
    #fgame-result-sub  { font-size:0.85rem; color:#94a3b8; margin-bottom:12px; }
    #fgame-result-cases {
      display:flex; flex-direction:column; gap:5px;
      max-height:210px; overflow-y:auto; margin-bottom:6px; text-align:left;
    }

    .fgame-tc { display:flex; align-items:flex-start; gap:8px; padding:7px 10px; border-radius:8px; border:1px solid #334155; background:#0f172a; font-size:0.8rem; }
    .fgame-tc.pass { background:#14532d30; border-color:#16a34a55; }
    .fgame-tc.fail { background:#7f1d1d30; border-color:#ef444455; }
    .fgame-tc-badge { padding:2px 7px; border-radius:999px; font-weight:700; font-size:0.72rem; flex-shrink:0; margin-top:1px; }
    .fgame-tc-badge.pass { background:#14532d; color:#86efac; }
    .fgame-tc-badge.fail { background:#7f1d1d; color:#fca5a5; }
    .fgame-tc-body { display:flex; flex-direction:column; gap:2px; flex:1; }
    .fgame-tc-lbl  { font-weight:600; color:#e2e8f0; }
    .fgame-tc-path { font-size:0.75rem; color:#94a3b8; }

    /* Bottom bar */
    #fgame-bar {
      display:flex; align-items:center; gap:14px;
      padding:10px 18px; background:#1e293b; border-top:1px solid #334155;
      flex-shrink:0;
    }
    #fgame-bar > label { font-size:0.78rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; white-space:nowrap; }
    #fgame-evts { display:flex; gap:8px; flex-wrap:wrap; flex:1; }

    /* Event chips */
    .fgame-chip {
      padding:8px 16px; border-radius:8px;
      background:#0c2d3a; color:#67e8f9; border:1.5px solid #0891b2;
      font-weight:700; font-size:0.88rem; cursor:pointer;
      transition:transform 0.1s, box-shadow 0.1s;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    }
    .fgame-chip:hover:not(.dim) { transform:scale(1.06); box-shadow:0 4px 14px rgba(0,0,0,0.5); }
    .fgame-chip.active { background:#312e81; border-color:#818cf8; color:#c7d2fe; box-shadow:0 0 0 2px #6366f160; }
    .fgame-chip.dim    { opacity:0.35; cursor:default; }

    /* Hint box */
    #fgame-hint-box {
      position:absolute; top:10px; right:14px;
      background:#1e293b; border:1px solid #f59e0b;
      border-radius:10px; padding:10px 14px; max-width:240px;
      font-size:0.83rem; color:#fde68a; z-index:150;
    }

    /* SVG interaction */
    .fgame-state { cursor:pointer; }
    .fgame-edge  { cursor:pointer; }
  `;
  document.head.appendChild(s);
})();

// ── State ─────────────────────────────────────────────────────────────────────

let fsmLevel    = null;
let fsmBuilt    = {};   // { stateName: { event: nextState } }
let fsmSrc      = null; // currently selected source state
let fsmEvt      = null; // currently selected event
let fsmPos      = {};   // { stateName: { x, y } } in virtual coords
let fsmProgress = {};   // { levelId: stars }

const VW = 700, VH = 400; // virtual canvas size
const SR = 42;             // state circle radius

// ── Entry ─────────────────────────────────────────────────────────────────────

function fsmProgressKey() {
  return "fsm_progress_" + (currentUser?.username || "guest");
}

function initFSMLevelSelect() {
  fsmProgress = JSON.parse(localStorage.getItem(fsmProgressKey()) || "{}");
  renderFSMLevelSelect();
}

// ── Level Select ──────────────────────────────────────────────────────────────

function renderFSMLevelSelect() {
  const screen = document.getElementById("fsm-level-select");
  if (!screen) return;

  screen.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;width:100%;max-width:880px;">
      <button id="fsm-ls-home" class="btn btn-secondary" style="padding:8px 18px;">← Home</button>
      <h2 style="font-size:2rem;font-weight:800;">⚙ State Machines</h2>
    </div>
    <p style="color:var(--muted);font-size:0.9rem;margin-top:-8px;">
      Each level gives you the states — you draw the transitions. Build the correct FSM to pass all tests.
    </p>
    <div class="level-grid" style="max-width:880px;">
      ${FSM_LEVELS.map((lvl, i) => {
        const stars  = fsmProgress[lvl.id] || 0;
        const locked = i > 0 && !fsmProgress[FSM_LEVELS[i - 1].id];
        return `
          <div class="level-card${locked ? " locked" : ""}" data-id="${lvl.id}">
            ${locked ? '<span class="lock-icon">🔒</span>' : ""}
            <div class="level-number">Level ${i + 1}</div>
            <div class="level-title">${lvl.emoji} ${lvl.title}</div>
            <div style="font-size:0.8rem;color:var(--muted);margin-top:3px;">
              ${lvl.states.length} states &middot; ${lvl.inputs.length} input${lvl.inputs.length > 1 ? "s" : ""}
            </div>
            <div class="level-stars" style="margin-top:auto;">
              ${[1, 2, 3].map(n => `<span class="star${stars >= n ? " lit" : ""}">★</span>`).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  document.getElementById("fsm-ls-home").onclick = () => showScreen("home");
  screen.querySelectorAll(".level-card:not(.locked)").forEach(card => {
    const lvl = FSM_LEVELS.find(l => l.id == card.dataset.id);
    if (lvl) card.onclick = () => openFSMLevel(lvl);
  });
}

// ── Open Level ────────────────────────────────────────────────────────────────

function openFSMLevel(level) {
  fsmLevel = level;
  fsmBuilt = {};
  fsmSrc   = null;
  fsmEvt   = null;
  showScreen("fsm-game");
  renderFSMGame();
}

// ── Game Screen ───────────────────────────────────────────────────────────────

function renderFSMGame() {
  const screen = document.getElementById("fsm-game");
  if (!screen) return;

  screen.innerHTML = `
    <div id="fgame-hdr">
      <button id="fgame-back" class="btn btn-secondary" style="padding:6px 14px;font-size:0.83rem;">← Levels</button>
      <span id="fgame-hdr-title"></span>
      <span id="fgame-hdr-desc"></span>
      <button id="fgame-hint-btn" class="btn btn-secondary" style="padding:6px 14px;font-size:0.83rem;">💡 Hint</button>
    </div>

    <div id="fgame-canvas">
      <svg id="fgame-svg" preserveAspectRatio="none"></svg>
      <div class="fgame-pill" id="fgame-pill">Click a state to start a transition</div>
      <div id="fgame-hint-box" class="hidden"></div>

      <div id="fgame-result" class="hidden">
        <div id="fgame-result-txt"></div>
        <div id="fgame-result-sub"></div>
        <div id="fgame-result-cases"></div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">
          <button id="fgame-retry" class="btn btn-secondary">↺ Try Again</button>
          <button id="fgame-next"  class="btn btn-primary  hidden">Next Level →</button>
        </div>
      </div>
    </div>

    <div id="fgame-bar">
      <label>Events:</label>
      <div id="fgame-evts"></div>
      <div class="controls">
        <button id="fgame-reset" class="btn btn-secondary">↺ Reset</button>
        <button id="fgame-check" class="btn btn-primary">▶ Check</button>
      </div>
    </div>
  `;

  document.getElementById("fgame-hdr-title").textContent = `${fsmLevel.emoji} ${fsmLevel.title}`;
  document.getElementById("fgame-hdr-desc").textContent  = fsmLevel.description;

  document.getElementById("fgame-back").onclick  = () => { showScreen("fsm-level-select"); renderFSMLevelSelect(); };
  document.getElementById("fgame-reset").onclick = fsmReset;
  document.getElementById("fgame-check").onclick = fsmCheck;
  document.getElementById("fgame-retry").onclick = () => document.getElementById("fgame-result").classList.add("hidden");
  document.getElementById("fgame-next").onclick  = fsmNextLevel;

  let hintVisible = false;
  document.getElementById("fgame-hint-btn").onclick = () => {
    hintVisible = !hintVisible;
    const box = document.getElementById("fgame-hint-box");
    if (hintVisible) {
      box.textContent = "💡 " + fsmLevel.hint;
      box.classList.remove("hidden");
    } else {
      box.classList.add("hidden");
    }
  };

  // Init positions after the canvas is in the DOM
  requestAnimationFrame(() => {
    const wrap = document.getElementById("fgame-canvas");
    fsmInitPos(fsmLevel.states, wrap ? wrap.offsetWidth : VW, wrap ? wrap.offsetHeight : VH);
    fsmRenderChips();
    fsmDraw();
  });
}

// ── State Positions ───────────────────────────────────────────────────────────

function fsmInitPos(states, W, H) {
  fsmPos = {};
  const n = states.length;
  if (n === 1) {
    fsmPos[states[0]] = { x: W / 2, y: H / 2 };
  } else if (n === 2) {
    fsmPos[states[0]] = { x: W * 0.27, y: H / 2 };
    fsmPos[states[1]] = { x: W * 0.73, y: H / 2 };
  } else {
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.30;
    states.forEach((s, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      fsmPos[s] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }
}

// ── Event Chips ───────────────────────────────────────────────────────────────

function fsmRenderChips() {
  const el = document.getElementById("fgame-evts");
  if (!el) return;
  el.innerHTML = fsmLevel.inputs.map(ev => `
    <button class="fgame-chip${fsmEvt === ev ? " active" : ""}${!fsmSrc ? " dim" : ""}" data-ev="${ev}">${ev}</button>
  `).join("");
  el.querySelectorAll(".fgame-chip").forEach(btn => {
    btn.onclick = () => {
      if (!fsmSrc) return;
      fsmEvt = (fsmEvt === btn.dataset.ev) ? null : btn.dataset.ev;
      fsmRenderChips();
      fsmUpdatePill();
    };
  });
}

// ── Instruction Pill ──────────────────────────────────────────────────────────

function fsmUpdatePill() {
  const pill = document.getElementById("fgame-pill");
  if (!pill) return;
  if (!fsmSrc) {
    pill.textContent = "Click a state to start a transition  ·  Click an existing arrow to delete it";
  } else if (!fsmEvt) {
    pill.textContent = `"${fsmSrc}" selected — click an event button below`;
  } else {
    pill.textContent = `"${fsmSrc}" —[${fsmEvt}]→ click the destination state`;
  }
}

// ── Draw Canvas ───────────────────────────────────────────────────────────────

function fsmDraw() {
  const svg = document.getElementById("fgame-svg");
  const wrap = document.getElementById("fgame-canvas");
  if (!svg || !wrap) return;

  const W = wrap.offsetWidth  || VW;
  const H = wrap.offsetHeight || VH;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  // Build edge map: (from → to) → [events]
  const pairMap = new Map();
  for (const [from, evts] of Object.entries(fsmBuilt)) {
    for (const [ev, to] of Object.entries(evts)) {
      const key = `${from}\x00${to}`;
      if (!pairMap.has(key)) pairMap.set(key, { from, to, evts: [] });
      pairMap.get(key).evts.push(ev);
    }
  }

  // Bidir detection
  const bidir = new Set();
  pairMap.forEach((_, key) => {
    const [f, t] = key.split("\x00");
    if (pairMap.has(`${t}\x00${f}`)) bidir.add(key);
  });

  let h = `
    <defs>
      <marker id="fga" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0,8 3,0 6" fill="#475569"/>
      </marker>
    </defs>
  `;

  // Draw edges
  pairMap.forEach(({ from, to, evts }, key) => {
    const fp = fsmPos[from], tp = fsmPos[to];
    if (!fp || !tp) return;
    const label = evts.join(" / ");
    let pathD, lx, ly;

    if (from === to) {
      pathD = `M ${fp.x - 14} ${fp.y - SR} C ${fp.x - 46} ${fp.y - SR - 58}, ${fp.x + 46} ${fp.y - SR - 58}, ${fp.x + 14} ${fp.y - SR}`;
      lx = fp.x;
      ly = fp.y - SR - 44;
    } else {
      const dx = tp.x - fp.x, dy = tp.y - fp.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist, ny = dy / dist;
      const sx = fp.x + nx * SR, sy = fp.y + ny * SR;
      const ex = tp.x - nx * (SR + 10), ey = tp.y - ny * (SR + 10);
      const off = bidir.has(key) ? 24 : 0;
      const qx = (sx + ex) / 2 + (-ny) * off;
      const qy = (sy + ey) / 2 + nx * off;
      pathD = `M ${sx} ${sy} Q ${qx} ${qy} ${ex} ${ey}`;
      lx = (sx + 2 * qx + ex) / 4;
      ly = (sy + 2 * qy + ey) / 4 - 7;
    }

    const evtsEncoded = evts.map(e => encodeURIComponent(e)).join(",");
    h += `
      <g class="fgame-edge" data-from="${from}" data-evts="${evtsEncoded}">
        <path d="${pathD}" stroke="#475569" stroke-width="1.6" fill="none" marker-end="url(#fga)" stroke-linecap="round"/>
        <path d="${pathD}" stroke="transparent" stroke-width="14" fill="none"/>
        <text x="${lx}" y="${ly}" text-anchor="middle"
          font-family="Segoe UI,system-ui,sans-serif" font-size="11"
          fill="#94a3b8" stroke="#0f172a" stroke-width="3" paint-order="stroke"
          pointer-events="none">${label}</text>
      </g>
    `;
  });

  // Initial arrow
  const ip = fsmPos[fsmLevel.initial];
  if (ip) {
    h += `<line x1="${ip.x - SR - 28}" y1="${ip.y}" x2="${ip.x - SR - 2}" y2="${ip.y}"
      stroke="#475569" stroke-width="1.5" marker-end="url(#fga)"/>`;
  }

  // Draw state circles (above edges)
  for (const [name, p] of Object.entries(fsmPos)) {
    const isInit = name === fsmLevel.initial;
    const isSrc  = name === fsmSrc;
    const fill   = isSrc ? "#1e1b4b" : "#1e293b";
    const stroke = isSrc ? "#6366f1" : "#334155";
    const sw     = isSrc ? 3 : 1.5;

    h += `<g class="fgame-state" data-state="${name}">`;

    if (isInit) {
      h += `<circle cx="${p.x}" cy="${p.y}" r="${SR + 7}"
        fill="none" stroke="${isSrc ? "#6366f1" : "#334155"}" stroke-width="1.5"/>`;
    }

    h += `<circle cx="${p.x}" cy="${p.y}" r="${SR}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

    if (isSrc) {
      const pr = SR + (isInit ? 14 : 8);
      h += `<circle cx="${p.x}" cy="${p.y}" r="${pr}"
        fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate"
          from="0 ${p.x} ${p.y}" to="360 ${p.x} ${p.y}" dur="4s" repeatCount="indefinite"/>
      </circle>`;
    }

    const lbl = name.length > 11 ? name.slice(0, 10) + "…" : name;
    h += `<text x="${p.x}" y="${p.y + 5}" text-anchor="middle"
      font-family="Segoe UI,system-ui,sans-serif" font-size="13" font-weight="600"
      fill="${isSrc ? "#c7d2fe" : "#94a3b8"}" pointer-events="none">${lbl}</text>`;

    h += `</g>`;
  }

  svg.innerHTML = h;
  fsmAttachHandlers();
}

// ── SVG Event Handlers ────────────────────────────────────────────────────────

function fsmAttachHandlers() {
  const svg  = document.getElementById("fgame-svg");
  const wrap = document.getElementById("fgame-canvas");
  if (!svg || !wrap) return;

  // Helper: convert client coords → SVG virtual coords
  function toVirtual(cx, cy) {
    const rect = wrap.getBoundingClientRect();
    const W = rect.width  || VW;
    const H = rect.height || VH;
    const svgW = svg.viewBox.baseVal.width  || W;
    const svgH = svg.viewBox.baseVal.height || H;
    return {
      x: (cx - rect.left) / W * svgW,
      y: (cy - rect.top)  / H * svgH
    };
  }

  // State nodes: click to select/complete transition, drag to reposition
  svg.querySelectorAll(".fgame-state").forEach(node => {
    let dragData = null;

    node.addEventListener("mousedown", e => {
      e.stopPropagation();
      const stateName = node.dataset.state;
      dragData = { stateName, startX: e.clientX, startY: e.clientY, origX: fsmPos[stateName].x, origY: fsmPos[stateName].y, moved: false };

      const onMove = ev => {
        const dx = ev.clientX - dragData.startX;
        const dy = ev.clientY - dragData.startY;
        if (!dragData.moved && Math.hypot(dx, dy) < 5) return;
        dragData.moved = true;
        const v  = toVirtual(ev.clientX, ev.clientY);
        const sv = toVirtual(dragData.startX, dragData.startY);
        const svgW = svg.viewBox.baseVal.width  || VW;
        const svgH = svg.viewBox.baseVal.height || VH;
        fsmPos[dragData.stateName] = {
          x: Math.max(SR + 4, Math.min(svgW - SR - 4, dragData.origX + (v.x - sv.x))),
          y: Math.max(SR + 4, Math.min(svgH - SR - 4, dragData.origY + (v.y - sv.y)))
        };
        fsmDraw();
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup",   onUp);
        if (!dragData.moved) fsmHandleStateClick(dragData.stateName);
        dragData = null;
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup",   onUp);
    });
  });

  // Edge groups: click to delete all transitions on that path
  svg.querySelectorAll(".fgame-edge").forEach(grp => {
    grp.addEventListener("click", e => {
      e.stopPropagation();
      const from = grp.dataset.from;
      const evts = grp.dataset.evts.split(",").map(decodeURIComponent);
      evts.forEach(ev => { if (fsmBuilt[from]) delete fsmBuilt[from][ev]; });
      fsmSrc = null;
      fsmEvt = null;
      fsmRenderChips();
      fsmUpdatePill();
      fsmDraw();
    });
  });

  // Click on blank canvas → deselect
  svg.addEventListener("click", () => {
    if (fsmSrc) {
      fsmSrc = null;
      fsmEvt = null;
      fsmRenderChips();
      fsmUpdatePill();
      fsmDraw();
    }
  });
}

// ── State Click Logic ─────────────────────────────────────────────────────────

function fsmHandleStateClick(stateName) {
  if (!fsmSrc) {
    // Select source
    fsmSrc = stateName;
    fsmEvt = null;
    fsmRenderChips();
    fsmUpdatePill();
    fsmDraw();
  } else if (!fsmEvt) {
    // Re-select or deselect source
    fsmSrc = (fsmSrc === stateName) ? null : stateName;
    fsmRenderChips();
    fsmUpdatePill();
    fsmDraw();
  } else {
    // Complete transition: fsmSrc --[fsmEvt]--> stateName
    if (!fsmBuilt[fsmSrc]) fsmBuilt[fsmSrc] = {};
    fsmBuilt[fsmSrc][fsmEvt] = stateName;
    fsmSrc = null;
    fsmEvt = null;
    fsmRenderChips();
    fsmUpdatePill();
    fsmDraw();
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function fsmReset() {
  fsmBuilt = {};
  fsmSrc   = null;
  fsmEvt   = null;
  fsmRenderChips();
  fsmUpdatePill();
  fsmDraw();
}

// ── Check ─────────────────────────────────────────────────────────────────────

function fsmCheck() {
  const results = fsmLevel.testCases.map(tc => {
    let state = fsmLevel.initial;
    const path = [state];
    for (const ev of tc.sequence) {
      const next = fsmBuilt[state]?.[ev];
      if (next === undefined) {
        return { ...tc, pass: false, path, stuck: true };
      }
      state = next;
      path.push(state);
    }
    return { ...tc, pass: state === tc.expectedFinal, path, stuck: false };
  });

  const allPass  = results.every(r => r.pass);
  const passCount = results.filter(r => r.pass).length;
  const stars = allPass ? 3 : passCount >= Math.ceil(results.length * 0.6) ? 2 : passCount > 0 ? 1 : 0;

  const prev = fsmProgress[fsmLevel.id] || 0;
  if (stars > prev) {
    fsmProgress[fsmLevel.id] = stars;
    localStorage.setItem(fsmProgressKey(), JSON.stringify(fsmProgress));
  }

  const panel = document.getElementById("fgame-result");
  panel.classList.remove("hidden", "win", "lose");
  panel.classList.add(allPass ? "win" : "lose");

  document.getElementById("fgame-result-txt").textContent =
    allPass ? "✅ All tests passed!" : `❌ ${passCount} / ${results.length} tests passed`;
  document.getElementById("fgame-result-sub").textContent =
    allPass
      ? "Your FSM is correct — well done!"
      : "Check your transitions. Click an arrow to delete it.";

  document.getElementById("fgame-result-cases").innerHTML = results.map(r => `
    <div class="fgame-tc ${r.pass ? "pass" : "fail"}">
      <span class="fgame-tc-badge ${r.pass ? "pass" : "fail"}">${r.pass ? "✓" : "✗"}</span>
      <div class="fgame-tc-body">
        <span class="fgame-tc-lbl">${r.description}</span>
        ${!r.pass ? `<span class="fgame-tc-path">${r.path.join(" → ")}${r.stuck ? " → ?" : " (wrong final state)"}</span>` : ""}
      </div>
    </div>
  `).join("");

  const nextBtn = document.getElementById("fgame-next");
  const idx = FSM_LEVELS.findIndex(l => l.id === fsmLevel.id);
  nextBtn.classList.toggle("hidden", !allPass || idx >= FSM_LEVELS.length - 1);
}

// ── Next Level ────────────────────────────────────────────────────────────────

function fsmNextLevel() {
  const idx = FSM_LEVELS.findIndex(l => l.id === fsmLevel.id);
  if (idx >= 0 && idx < FSM_LEVELS.length - 1) openFSMLevel(FSM_LEVELS[idx + 1]);
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("fsm-level-select")) initFSMLevelSelect();
});
