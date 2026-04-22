// fsm-levels.js — FSM level definitions
// type: "trace"  → full diagram shown, user clicks correct next state
// type: "fill"   → partial table shown, user fills missing transitions
// type: "build"  → blank table, user builds FSM from description

const FSM_LEVELS = [

  // ── Trace: user clicks the correct next state ────────────────────────────

  {
    id: 1,
    type: "trace",
    title: "Traffic Light",
    description: "A traffic light cycles Red → Green → Amber on each timer event. Step through the inputs by clicking the correct next state.",
    hint: "Follow the arrows — each timer event moves to the next colour in the cycle.",
    states: ["Red", "Green", "Amber"],
    initial: "Red",
    accepting: [],
    inputs: ["timer"],
    transitions: {
      "Red":   { "timer": "Green" },
      "Green": { "timer": "Amber" },
      "Amber": { "timer": "Red"   },
    },
    traceInputs: ["timer", "timer", "timer", "timer"],
  },

  {
    id: 2,
    type: "trace",
    title: "Door Lock",
    description: "A door starts Locked. 'key' unlocks it. 'lock' locks it again. Both inputs work from either state.",
    hint: "key always unlocks regardless of state. lock always locks regardless of state.",
    states: ["Locked", "Unlocked"],
    initial: "Locked",
    accepting: ["Unlocked"],
    inputs: ["key", "lock"],
    transitions: {
      "Locked":   { "key": "Unlocked", "lock": "Locked"   },
      "Unlocked": { "key": "Unlocked", "lock": "Locked"   },
    },
    traceInputs: ["key", "lock", "key", "key", "lock"],
  },

  // ── Fill: some transitions hidden, user completes the table ─────────────

  {
    id: 3,
    type: "fill",
    title: "Vending Machine",
    description: "Complete the missing transitions. A coin moves from Waiting → Ready. Buy moves Ready → Dispensing. Done returns Dispensing → Waiting.",
    hint: "Only the 3 key transitions are hidden — one per state. Think about what each input does.",
    states: ["Waiting", "Ready", "Dispensing"],
    initial: "Waiting",
    accepting: ["Dispensing"],
    inputs: ["coin", "buy", "done"],
    transitions: {
      "Waiting":    { "coin": "Ready",      "buy": "Waiting",    "done": "Waiting"    },
      "Ready":      { "coin": "Ready",      "buy": "Dispensing", "done": "Ready"      },
      "Dispensing": { "coin": "Dispensing", "buy": "Dispensing", "done": "Waiting"    },
    },
    hiddenCells: [
      { state: "Waiting",    input: "coin" },
      { state: "Ready",      input: "buy"  },
      { state: "Dispensing", input: "done" },
    ],
    testCases: [
      { inputs: ["coin"],              expected: "Ready",      label: "Insert coin"     },
      { inputs: ["coin", "buy"],       expected: "Dispensing", label: "Buy after coin"  },
      { inputs: ["coin","buy","done"], expected: "Waiting",    label: "Full cycle"      },
      { inputs: ["buy"],               expected: "Waiting",    label: "Buy without coin (no change)" },
    ],
  },

  {
    id: 4,
    type: "fill",
    title: "Turnstile",
    description: "A turnstile is Locked by default. Insert a coin to unlock. Pushing when Unlocked locks it again. Pushing when Locked does nothing. Extra coins when Unlocked keep it Unlocked.",
    hint: "Every (state, input) must be defined. Think about what happens on each input from each state.",
    states: ["Locked", "Unlocked"],
    initial: "Locked",
    accepting: [],
    inputs: ["coin", "push"],
    transitions: {
      "Locked":   { "coin": "Unlocked", "push": "Locked"   },
      "Unlocked": { "coin": "Unlocked", "push": "Locked"   },
    },
    hiddenCells: [
      { state: "Locked",   input: "push" },
      { state: "Unlocked", input: "coin" },
      { state: "Unlocked", input: "push" },
    ],
    testCases: [
      { inputs: ["push"],               expected: "Locked",   label: "Push without coin"        },
      { inputs: ["coin", "push"],       expected: "Locked",   label: "Coin then push"           },
      { inputs: ["coin", "coin"],       expected: "Unlocked", label: "Two coins"                },
      { inputs: ["coin","push","coin"], expected: "Unlocked", label: "Enter, then insert again" },
    ],
  },

  // ── Build: build the entire FSM from scratch ─────────────────────────────

  {
    id: 5,
    type: "build",
    title: "ATM Machine",
    description: "Build the ATM state machine from scratch using the transition table.\n\n• Idle + card → PINEntry\n• PINEntry + correct → Ready\n• PINEntry + wrong → Idle\n• Ready + withdraw → Idle\n• All other transitions stay in the same state.",
    hint: "There are 3 states × 4 inputs = 12 cells. Most 'undefined' transitions self-loop (stay in current state).",
    states: ["Idle", "PINEntry", "Ready"],
    initial: "Idle",
    accepting: ["Ready"],
    inputs: ["card", "correct", "wrong", "withdraw"],
    transitions: {
      "Idle":     { "card": "PINEntry", "correct": "Idle",     "wrong": "Idle",     "withdraw": "Idle"     },
      "PINEntry": { "card": "PINEntry", "correct": "Ready",    "wrong": "Idle",     "withdraw": "PINEntry" },
      "Ready":    { "card": "Ready",    "correct": "Ready",    "wrong": "Ready",    "withdraw": "Idle"     },
    },
    hiddenCells: "all",
    testCases: [
      { inputs: ["card", "correct"],                  expected: "Ready",    label: "Successful login"       },
      { inputs: ["card", "wrong"],                    expected: "Idle",     label: "Wrong PIN → rejected"   },
      { inputs: ["card", "correct", "withdraw"],      expected: "Idle",     label: "Full withdrawal"        },
      { inputs: ["card","wrong","card","correct"],     expected: "Ready",    label: "Retry after wrong PIN"  },
    ],
  },

  {
    id: 6,
    type: "build",
    title: "Traffic Light + Emergency",
    description: "Build a traffic light with emergency override.\n\n• timer cycles: Red→Green→Amber→Red\n• emergency from any state → Emergency\n• reset from Emergency → Red\n• All other transitions self-loop.",
    hint: "4 states × 3 inputs = 12 cells. The emergency input overrides all normal states.",
    states: ["Red", "Green", "Amber", "Emergency"],
    initial: "Red",
    accepting: [],
    inputs: ["timer", "emergency", "reset"],
    transitions: {
      "Red":       { "timer": "Green",     "emergency": "Emergency", "reset": "Red"       },
      "Green":     { "timer": "Amber",     "emergency": "Emergency", "reset": "Green"     },
      "Amber":     { "timer": "Red",       "emergency": "Emergency", "reset": "Amber"     },
      "Emergency": { "timer": "Emergency", "emergency": "Emergency", "reset": "Red"       },
    },
    hiddenCells: "all",
    testCases: [
      { inputs: ["timer", "timer"],             expected: "Amber",     label: "Two timers from Red"        },
      { inputs: ["timer", "emergency"],         expected: "Emergency", label: "Emergency during Green"     },
      { inputs: ["emergency", "reset"],         expected: "Red",       label: "Emergency then reset"       },
      { inputs: ["timer","timer","timer"],      expected: "Red",       label: "Full normal cycle"          },
      { inputs: ["timer","emergency","reset"],  expected: "Red",       label: "Emergency mid-cycle, reset" },
    ],
  },

  // ── More trace levels ────────────────────────────────────────────────────

  {
    id: 7,
    type: "trace",
    title: "Elevator (3 Floors)",
    description: "An elevator starts on Floor 1. 'up' moves it up one floor. 'down' moves it down. It can't go above Floor 3 or below Floor 1.",
    hint: "At the top floor, 'up' stays. At the bottom floor, 'down' stays.",
    states: ["Floor1", "Floor2", "Floor3"],
    initial: "Floor1",
    accepting: [],
    inputs: ["up", "down"],
    transitions: {
      "Floor1": { "up": "Floor2", "down": "Floor1" },
      "Floor2": { "up": "Floor3", "down": "Floor1" },
      "Floor3": { "up": "Floor3", "down": "Floor2" },
    },
    traceInputs: ["up", "up", "up", "down", "down", "up"],
  },

  // ── More fill levels ─────────────────────────────────────────────────────

  {
    id: 8,
    type: "fill",
    title: "Phone Call",
    description: "A phone starts Idle. An incoming call → Ringing. Answer → Talking. Hang up from Ringing or Talking → Idle. A missed call (timeout) → Missed.",
    hint: "Think about which inputs cause real transitions and which ones have no effect.",
    states: ["Idle", "Ringing", "Talking", "Missed"],
    initial: "Idle",
    accepting: ["Talking"],
    inputs: ["call", "answer", "hangup", "miss"],
    transitions: {
      "Idle":    { "call": "Ringing", "answer": "Idle",    "hangup": "Idle",    "miss": "Idle"    },
      "Ringing": { "call": "Ringing", "answer": "Talking", "hangup": "Idle",    "miss": "Missed"  },
      "Talking": { "call": "Talking", "answer": "Talking", "hangup": "Idle",    "miss": "Talking" },
      "Missed":  { "call": "Ringing", "answer": "Missed",  "hangup": "Missed",  "miss": "Missed"  },
    },
    hiddenCells: [
      { state: "Idle",    input: "call"   },
      { state: "Ringing", input: "answer" },
      { state: "Ringing", input: "miss"   },
      { state: "Talking", input: "hangup" },
      { state: "Missed",  input: "call"   },
    ],
    testCases: [
      { inputs: ["call"],                  expected: "Ringing",  label: "Receive a call"     },
      { inputs: ["call", "answer"],        expected: "Talking",  label: "Answer the call"    },
      { inputs: ["call", "hangup"],        expected: "Idle",     label: "Reject the call"    },
      { inputs: ["call", "miss"],          expected: "Missed",   label: "Miss a call"        },
      { inputs: ["call","miss","call","answer"], expected: "Talking", label: "Miss then answer" },
    ],
  },

  {
    id: 9,
    type: "fill",
    title: "Garage Door",
    description: "A garage door starts Closed. Press button → Opening. Sensor fires when fully open → Open. Press button again → Closing. Sensor fires when fully closed → Closed. Pressing button mid-motion reverses direction.",
    hint: "The button always reverses or starts motion. The sensor only fires when fully open or closed.",
    states: ["Closed", "Opening", "Open", "Closing"],
    initial: "Closed",
    accepting: ["Open"],
    inputs: ["button", "sensor"],
    transitions: {
      "Closed":  { "button": "Opening", "sensor": "Closed"  },
      "Opening": { "button": "Closing", "sensor": "Open"    },
      "Open":    { "button": "Closing", "sensor": "Open"    },
      "Closing": { "button": "Opening", "sensor": "Closed"  },
    },
    hiddenCells: [
      { state: "Closed",  input: "button" },
      { state: "Opening", input: "sensor" },
      { state: "Open",    input: "button" },
      { state: "Closing", input: "sensor" },
    ],
    testCases: [
      { inputs: ["button"],                            expected: "Opening", label: "Start opening"            },
      { inputs: ["button", "sensor"],                  expected: "Open",    label: "Fully open"               },
      { inputs: ["button","sensor","button"],           expected: "Closing", label: "Start closing"            },
      { inputs: ["button","sensor","button","sensor"],  expected: "Closed",  label: "Full open and close"      },
      { inputs: ["button","button"],                   expected: "Closing", label: "Reverse while opening"    },
    ],
  },

  // ── More build levels ─────────────────────────────────────────────────────

  {
    id: 10,
    type: "build",
    title: "Login with Lockout",
    description: "Build a login system that locks after 2 failed attempts.\n\n• Idle + correct → LoggedIn\n• Idle + wrong → OneWrong\n• OneWrong + correct → LoggedIn\n• OneWrong + wrong → Locked\n• LoggedIn + logout → Idle\n• Locked + reset → Idle\n• All other inputs keep the machine in its current state.",
    hint: "4 states × 4 inputs = 16 cells. Most undefined transitions self-loop.",
    states: ["Idle", "OneWrong", "Locked", "LoggedIn"],
    initial: "Idle",
    accepting: ["LoggedIn"],
    inputs: ["correct", "wrong", "logout", "reset"],
    transitions: {
      "Idle":     { "correct": "LoggedIn", "wrong": "OneWrong", "logout": "Idle",     "reset": "Idle"     },
      "OneWrong": { "correct": "LoggedIn", "wrong": "Locked",   "logout": "OneWrong", "reset": "OneWrong" },
      "Locked":   { "correct": "Locked",   "wrong": "Locked",   "logout": "Locked",   "reset": "Idle"     },
      "LoggedIn": { "correct": "LoggedIn", "wrong": "LoggedIn", "logout": "Idle",     "reset": "LoggedIn" },
    },
    hiddenCells: "all",
    testCases: [
      { inputs: ["correct"],                      expected: "LoggedIn", label: "Login correctly"          },
      { inputs: ["wrong", "correct"],             expected: "LoggedIn", label: "Wrong then correct"       },
      { inputs: ["wrong", "wrong"],               expected: "Locked",   label: "Two wrong → locked"       },
      { inputs: ["wrong","wrong","reset"],         expected: "Idle",     label: "Reset after lockout"      },
      { inputs: ["correct","logout"],              expected: "Idle",     label: "Login then logout"        },
      { inputs: ["wrong","wrong","correct"],       expected: "Locked",   label: "Can't login while locked" },
    ],
  },
];
