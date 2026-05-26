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

### Step 4: Player Hand Sync Extraction

- Goal: separate card/score reconciliation decisions from Phaser scene mutation.
- Scope: extract helpers that decide rendered hand IDs, incoming hand IDs, score visibility, score reveal, and whether a rendered hand needs reset.
- Non-goal: do not change card creation, animation, seat rendering, score graphics, or server payload handling in this step.
- Expected benefit: stale/duplicate card bugs become easier to test without a running Phaser scene.
- Implemented:
  - Added `src/scripts/playerHandSync.js`.
  - Added focused tests in `src/scripts/playerHandSync.test.js`.
  - Kept existing `Level.js` method names as thin wrappers so call sites stay stable.
- Checks:
  - `CI=true npx react-scripts test src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/playerHandSync.js src/scripts/playerHandSync.test.js` passed.

### Step 5: Result Lifecycle Guard Extraction

- Goal: make hand-result timing and stale-callback checks explicit.
- Scope: extract constants and pure helpers for result reveal delay, clear delay, side-bet reopen delay, and token validity.
- Non-goal: do not move result rendering, winner animation, pot payout, card reveal, or socket handling in this step.
- Expected benefit: less risk that old result timers mutate the next hand, and easier tests around lifecycle timing.
- Implemented:
  - Added `src/scripts/handResultLifecycle.js`.
  - Added focused tests in `src/scripts/handResultLifecycle.test.js`.
  - Updated `Level.setDeclareResult()` to use named timing constants, token validation, and side-bet reopen timing helper.
- Checks:
  - `CI=true npx react-scripts test src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/handResultLifecycle.js src/scripts/handResultLifecycle.test.js` passed.

### Step 6: Socket Event Constants

- Goal: centralize socket request/response event names before changing socket flow.
- Scope: add shared constants for existing client socket event strings and wire the current socket bridge to them.
- Non-goal: do not rename any server-facing event, payload key, or handler method in this step.
- Expected benefit: fewer typo regressions and a clearer event inventory for the later state reducer work.
- Implemented:
  - Added `src/scripts/socketEvents.js`.
  - Added `src/scripts/socketEvents.test.js` to lock server-facing event names.
  - Updated `SocketManager.js`, `emitter.js`, and raw socket-name comparisons in `Level.js`.
  - Added missing legacy emitter aliases for `reqSideBets`, `reqDiscardCard`, and `reqFinish`.
- Checks:
  - `CI=true npx react-scripts test src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/socketEvents.js src/scripts/socketEvents.test.js src/scripts/emitter.js src/scripts/SocketManager.js` passed.

### Step 7: Socket Receive Router Extraction

- Goal: make server event routing testable without a live socket or Phaser scene.
- Scope: extract `SocketManager.onReceive()` routing into a helper that maps response event names to scene methods.
- Non-goal: do not change event names, payload forwarding, scene method names, or socket connection behavior in this step.
- Expected benefit: replay tests can later feed server events through one routing surface.
- Implemented:
  - Added `src/scripts/socketReceiveRouter.js`.
  - Added `src/scripts/socketReceiveRouter.test.js`.
  - Updated `SocketManager.onReceive()` to delegate to the router while keeping the public method.
- Checks:
  - `CI=true npx react-scripts test src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/socketReceiveRouter.js src/scripts/socketReceiveRouter.test.js src/scripts/SocketManager.js` passed.

### Step 8: Socket Callback Router Extraction

- Goal: make socket acknowledgement/error routing testable.
- Scope: extract `SocketManager.onCallBackReceive()` callback routing into a helper.
- Non-goal: do not change callback signatures, error payload handling, or scene error display behavior in this step.
- Expected benefit: socket action errors become testable without a live socket.
- Implemented:
  - Added `src/scripts/socketCallbackRouter.js`.
  - Added `src/scripts/socketCallbackRouter.test.js`.
  - Updated `SocketManager.onCallBackReceive()` to delegate to the router while keeping the public method.
- Checks:
  - `CI=true npx react-scripts test src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/socketCallbackRouter.js src/scripts/socketCallbackRouter.test.js src/scripts/SocketManager.js` passed.

### Step 9: Socket Lifecycle Cleanup

- Goal: make socket-owned intervals/listeners deterministic on teardown.
- Scope: use `CleanupRegistry` inside `SocketManager` for ping interval cleanup and socket disconnect/listener cleanup.
- Non-goal: do not change socket connection options, ping frequency, join-board behavior, or event routing.
- Expected benefit: fewer orphaned ping intervals and socket listeners after leaving/destroying a game scene.
- Implemented:
  - `SocketManager` now owns a `CleanupRegistry`.
  - Ping interval cleanup and socket listener/disconnect teardown are registered centrally.
  - Added `src/scripts/CleanupRegistry.test.js`.
- Checks:
  - `CI=true npx react-scripts test src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/CleanupRegistry.js src/scripts/CleanupRegistry.test.js src/scripts/SocketManager.js` passed.
