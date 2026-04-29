// fsm-levels.js — FSM puzzle levels v1

const FSM_LEVELS = [
  {
    id: 1,
    emoji: "🚦",
    title: "Traffic Light",
    description: "A traffic light cycles Red → Green → Amber. Wire each state so a 'timer' event moves it forward.",
    hint: "Every state needs exactly one transition — the 'timer' event should always advance to the next colour.",
    states: ["Red", "Green", "Amber"],
    initial: "Red",
    inputs: ["timer"],
    solution: {
      "Red":   { "timer": "Green" },
      "Green": { "timer": "Amber" },
      "Amber": { "timer": "Red"   }
    },
    testCases: [
      { sequence: ["timer"],                    expectedFinal: "Green",  description: "1 timer from Red → Green"      },
      { sequence: ["timer", "timer"],           expectedFinal: "Amber",  description: "2 timers → Amber"              },
      { sequence: ["timer", "timer", "timer"],  expectedFinal: "Red",    description: "3 timers → back to Red"        }
    ]
  },

  {
    id: 2,
    emoji: "🔄",
    title: "Turnstile",
    description: "A coin unlocks the turnstile; a push locks it again. Don't forget self-loops — pushing a locked gate keeps it locked, and inserting a coin when already unlocked keeps it unlocked.",
    hint: "Self-loops are transitions where a state points back to itself. Each state needs two transitions here.",
    states: ["Locked", "Unlocked"],
    initial: "Locked",
    inputs: ["coin", "push"],
    solution: {
      "Locked":   { "coin": "Unlocked", "push": "Locked"   },
      "Unlocked": { "coin": "Unlocked", "push": "Locked"   }
    },
    testCases: [
      { sequence: ["coin"],                  expectedFinal: "Unlocked", description: "coin → Unlocked"                   },
      { sequence: ["push"],                  expectedFinal: "Locked",   description: "push when locked → stays Locked"   },
      { sequence: ["coin", "push"],          expectedFinal: "Locked",   description: "coin then push → back to Locked"   },
      { sequence: ["coin", "coin"],          expectedFinal: "Unlocked", description: "extra coin → stays Unlocked"       },
      { sequence: ["coin", "push", "coin"],  expectedFinal: "Unlocked", description: "full cycle then unlock again"      }
    ]
  },

  {
    id: 3,
    emoji: "🎵",
    title: "Media Player",
    description: "A music player can only pause while playing, and only resume from paused. Build all the transitions — not every state needs every event.",
    hint: "Stopped: 1 transition (play). Playing: 2 (pause, stop). Paused: 2 (play, stop).",
    states: ["Stopped", "Playing", "Paused"],
    initial: "Stopped",
    inputs: ["play", "pause", "stop"],
    solution: {
      "Stopped": { "play":  "Playing"                       },
      "Playing": { "pause": "Paused",  "stop": "Stopped"   },
      "Paused":  { "play":  "Playing", "stop": "Stopped"   }
    },
    testCases: [
      { sequence: ["play"],                          expectedFinal: "Playing",  description: "play from Stopped"          },
      { sequence: ["play", "pause"],                 expectedFinal: "Paused",   description: "play then pause"            },
      { sequence: ["play", "stop"],                  expectedFinal: "Stopped",  description: "play then stop"             },
      { sequence: ["play", "pause", "play"],         expectedFinal: "Playing",  description: "pause then resume"          },
      { sequence: ["play", "pause", "stop"],         expectedFinal: "Stopped",  description: "stop directly from Paused"  }
    ]
  },

  {
    id: 4,
    emoji: "🎰",
    title: "Vending Machine",
    description: "Insert a coin, select an item, then confirm. You can refund from HasCoin back to Idle, or cancel a selection back to HasCoin.",
    hint: "Idle: 1 transition. HasCoin: 2 (select, refund). Selected: 2 (confirm, refund).",
    states: ["Idle", "HasCoin", "Selected"],
    initial: "Idle",
    inputs: ["coin", "select", "confirm", "refund"],
    solution: {
      "Idle":     { "coin":    "HasCoin"                        },
      "HasCoin":  { "select":  "Selected", "refund": "Idle"    },
      "Selected": { "confirm": "Idle",     "refund": "HasCoin" }
    },
    testCases: [
      { sequence: ["coin", "select", "confirm"],          expectedFinal: "Idle",    description: "full purchase flow"          },
      { sequence: ["coin", "refund"],                     expectedFinal: "Idle",    description: "refund after inserting coin"  },
      { sequence: ["coin", "select", "refund"],           expectedFinal: "HasCoin", description: "cancel selection"            },
      { sequence: ["coin", "select", "confirm", "coin"],  expectedFinal: "HasCoin", description: "buy then insert another coin" }
    ]
  },

  {
    id: 5,
    emoji: "🔐",
    title: "Login System",
    description: "Users log in with 'ok' or fail with 'fail'. One failure gives a second try. Two failures lock the account. An admin 'reset' clears the lockout.",
    hint: "LoggedOut: ok→LoggedIn, fail→Failed. LoggedIn: logout→LoggedOut. Failed: ok→LoggedIn, fail→Locked. Locked: reset→LoggedOut.",
    states: ["LoggedOut", "LoggedIn", "Failed", "Locked"],
    initial: "LoggedOut",
    inputs: ["ok", "fail", "logout", "reset"],
    solution: {
      "LoggedOut": { "ok": "LoggedIn",   "fail": "Failed"    },
      "LoggedIn":  { "logout": "LoggedOut"                   },
      "Failed":    { "ok": "LoggedIn",   "fail": "Locked"    },
      "Locked":    { "reset": "LoggedOut"                    }
    },
    testCases: [
      { sequence: ["ok"],                    expectedFinal: "LoggedIn",  description: "successful login"          },
      { sequence: ["ok", "logout"],          expectedFinal: "LoggedOut", description: "login then logout"         },
      { sequence: ["fail"],                  expectedFinal: "Failed",    description: "one failed attempt"        },
      { sequence: ["fail", "fail"],          expectedFinal: "Locked",    description: "two fails → locked out"   },
      { sequence: ["fail", "ok"],            expectedFinal: "LoggedIn",  description: "fail once then succeed"    },
      { sequence: ["fail", "fail", "reset"], expectedFinal: "LoggedOut", description: "admin reset after lockout" }
    ]
  }
];
