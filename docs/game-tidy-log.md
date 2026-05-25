# Game Tidy Log

This file records each stabilization/refactor step so future work can see what changed, why it changed, and how to roll back if needed.

## 2026-05-26

### Baseline Backup

- Created a full copy of `src` before starting cleanup.
- Backup path: `D:\Bigslickgames-src-backup-20260526-091409`
- Current working branch: `dev`
- Last pushed baseline commit before tidy work: `0555f5b` (`Stabilize game flow and update lobby UI`)

### Working Rules

- Keep changes small and reviewable.
- Prefer behavior-preserving extraction before rewriting logic.
- Do not mix visual polish with state/timer/socket refactors.
- Document each module extraction here before or alongside the code change.
- Run focused checks after each step where practical.

### First Stabilization Targets

1. Add a central cleanup registry for `Level.js` listeners, timers, and delayed work.
2. Centralize browser event names currently passed as raw strings.
3. Extract action button visibility logic from `Level.js`.
4. Extract player/card/score synchronization helpers from `Level.js`.
5. Add event replay tests once socket event payloads are mapped.

### Step 1: Cleanup Registry

- Goal: make scene teardown deterministic before changing state logic.
- Scope: add a small cleanup registry and use it for obvious `Level.js` browser/scale listeners.
- Non-goal: do not change socket event ordering, hand timing, card rendering, betting rules, or overlay behavior in this step.
- Expected benefit: fewer stale listeners after scene shutdown/destroy, with a reusable place to register timers and delayed work in later passes.
- Implemented:
  - Added `src/scripts/CleanupRegistry.js`.
  - Routed `Level.js` window listeners and the Phaser resize listener through the registry.
  - Registered result/community-card delayed callbacks so scene cleanup cancels them.
- Checks:
  - `npm run build` was attempted twice but timed out after 2 minutes and 5 minutes.
  - `npx eslint src/scripts/CleanupRegistry.js` passed.
  - `npx eslint src/scenes/Level.js src/scripts/CleanupRegistry.js` still reports existing `Level.js` lint debt, mainly unused variables.

### Step 2: Browser Event Constants

- Goal: remove duplicated raw `bsg:*` event strings from the game bridge surface.
- Scope: add shared event-name constants and replace strings in the game scene/overlay modules where Phaser and React communicate.
- Non-goal: do not change event payload shape, event timing, socket names, or UI behavior.
- Implemented:
  - Added `src/scripts/gameEvents.js`.
  - Replaced shared browser event strings in `Level.js`, `GameActionOverlay.jsx`, `EmojiPicker.jsx`, and `TutorialOverlay.jsx`.
- Checks:
  - `npx eslint src/scripts/CleanupRegistry.js src/scripts/gameEvents.js src/views/game/GameActionOverlay.jsx src/views/game/EmojiPicker.jsx src/views/guest/tutorial/TutorialOverlay.jsx` passed.
  - Touched files were read successfully with Node.

### Step 3: Action State Extraction

- Goal: separate turn-action decision logic from Phaser button mutation.
- Scope: add a pure helper that decides which action buttons should be visible, enabled, labelled, and carrying amounts.
- Non-goal: do not change socket request names, raise calculations, double-down rules, button layout, or overlay rendering in this step.
- Expected benefit: action bugs become testable without booting Phaser or sockets.
- Implemented:
  - Added `src/scripts/gameActionState.js`.
  - Added focused tests in `src/scripts/gameActionState.test.js`.
  - Updated `Level.showAllButtons()` to build action state and apply it through `Level.applyGameActionState()`.
- Checks:
  - `CI=true npx react-scripts test src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/gameActionState.js src/scripts/gameActionState.test.js` passed.
