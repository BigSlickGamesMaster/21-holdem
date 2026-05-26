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

### Step 10: Pot State Helper Extraction

- Goal: isolate pot amount delta/effect decisions from `Level.handlePlayerBet()`.
- Scope: extract pure helpers for pot increase calculation and bet effect selection.
- Non-goal: do not move chip animation, sounds, FX, pot display rendering, or payout sequencing in this step.
- Expected benefit: pot update decisions become testable before extracting the larger animation controller.
- Implemented:
  - Added `src/scripts/potState.js`.
  - Added `src/scripts/potState.test.js`.
  - Updated `Level.handlePlayerBet()` to use pot calculation/effect helpers while keeping rendering and sounds in the scene.
- Checks:
  - `CI=true npx react-scripts test src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/potState.js src/scripts/potState.test.js` passed.

### Step 11: Socket Replay Harness

- Goal: create a lightweight way to replay server event sequences through the extracted router.
- Scope: add a helper that feeds ordered socket events into a scene-like object and records which events were handled.
- Non-goal: do not add recorded production payloads or change runtime game flow in this step.
- Expected benefit: future join/turn/result regressions can be tested as event sequences instead of manual browser checks only.
- Implemented:
  - Added `src/scripts/socketReplay.js`.
  - Added `src/scripts/socketReplay.test.js`.
- Checks:
  - `CI=true npx react-scripts test src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/socketReplay.js src/scripts/socketReplay.test.js` passed.

### Step 12: Participant State Helper Extraction

- Goal: start the normalized client state layer at the participant boundary.
- Scope: extract pure helpers for participant arrays, user/socket matching, and player map lookups.
- Non-goal: do not change seat rendering, `setPlayersData()`, `setGameData()`, or `setBoardState()` behavior in this step.
- Expected benefit: player identity/reconnect matching becomes testable before larger board-state reconciliation work.
- Implemented:
  - Added `src/scripts/participantState.js`.
  - Added `src/scripts/participantState.test.js`.
  - Updated `Level.findMyPlayer()`, `Level.findPlayerByUserId()`, and player-profile attachment in `setPlayersData()` to use tested helpers.
- Checks:
  - `CI=true npx react-scripts test src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/participantState.js src/scripts/participantState.test.js` passed.

### Step 13: Board Snapshot Normalization

- Goal: start unifying `setGameData()` and `setBoardState()` around one board payload interpretation.
- Scope: extract pure helpers for board identity/blinds/settings/round/tutorial/community/pot fields.
- Non-goal: do not move Phaser rendering, player profile updates, socket timing, or seat arrangement in this step.
- Expected benefit: board-state and join-state paths become easier to compare before building a full client reducer.
- Implemented:
  - Added `src/scripts/boardSnapshot.js`.
  - Added `src/scripts/boardSnapshot.test.js`.
  - Updated `Level.setGameData()` and `Level.setBoardState()` to use normalized board snapshot fields for shared data.
- Checks:
  - `CI=true npx react-scripts test src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/boardSnapshot.js src/scripts/boardSnapshot.test.js` passed.

### Step 14: Participant Update Planning

- Goal: make new-vs-existing participant reconciliation explicit.
- Scope: add a pure helper that classifies participants as map/create or merge/update work for `setPlayersData()`.
- Non-goal: do not move profile rendering, card sync, or `setProfiles()` calls in this step.
- Expected benefit: the next state reducer can reuse participant reconciliation decisions without depending on Phaser.
- Implemented:
  - Added `buildParticipantUpdatePlan()` to `src/scripts/participantState.js`.
  - Updated `Level.setPlayersData()` to consume the tested plan while keeping existing profile update calls.
- Checks:
  - `CI=true npx react-scripts test src/scripts/participantState.test.js src/scripts/boardSnapshot.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/participantState.js src/scripts/participantState.test.js` passed.

### Step 15: Client Game State Reducer Foundation

- Goal: introduce a normalized client state object that can receive board snapshots.
- Scope: add a pure reducer for board fields and participants, then store the latest reducer state in `Level.js`.
- Non-goal: do not make Phaser or React render from this state yet.
- Expected benefit: future socket replay tests can assert state transitions before UI mutation.
- Implemented:
  - Added `src/scripts/clientGameState.js`.
  - Added `src/scripts/clientGameState.test.js`.
  - `Level.js` now initializes `oClientGameState` and applies board snapshots in `setGameData()` and `setBoardState()`.
- Checks:
  - `CI=true npx react-scripts test src/scripts/clientGameState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameState.js src/scripts/clientGameState.test.js` passed.

### Step 16: Participant Patch Reducer

- Goal: let the client reducer track incremental participant updates after the initial board snapshot.
- Scope: add reducer support for one participant patch and wire join/participant-adjustment paths into it.
- Non-goal: do not render from reducer state or remove existing Phaser player mutation in this step.
- Expected benefit: socket replay can eventually assert participant chip/state changes without a Phaser scene.
- Implemented:
  - Added `APPLY_PARTICIPANT_PATCH` support in `src/scripts/clientGameState.js`.
  - Added reducer tests for participant patch merge/add/ignore behavior.
  - Updated `Level.setUserJoined()` and `Level.applyParticipantAdjustment()` to update `oClientGameState` alongside existing scene mutation.
- Checks:
  - `CI=true npx react-scripts test src/scripts/clientGameState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameState.js src/scripts/clientGameState.test.js` passed.

### Step 17: Pot State Reducer Updates

- Goal: keep normalized client state in sync with pot/table-chip updates.
- Scope: add reducer support for pot amount updates and wire existing pot commit path.
- Non-goal: do not change pot rendering, FX, payout sequencing, or animation behavior in this step.
- Expected benefit: replay/state tests can verify table-chip changes independently from Phaser display objects.
- Implemented:
  - Added `SET_TABLE_CHIPS` support in `src/scripts/clientGameState.js`.
  - Added reducer tests for table-chip updates.
  - Updated `Level.commitPotAmount()` to keep `oClientGameState.board.nTableChips` in sync with existing pot display state.
- Checks:
  - `CI=true npx react-scripts test src/scripts/clientGameState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameState.js src/scripts/clientGameState.test.js` passed.

### Step 18: Turn Action Reducer State

- Goal: track latest player-turn context and derived action-button state in the normalized client state.
- Scope: add reducer support for turn context/action state and wire `Level.showAllButtons()`.
- Non-goal: do not render buttons from reducer state or change legal-action decisions in this step.
- Expected benefit: turn/action regressions can be asserted from state without booting Phaser.
- Implemented:
  - Added `SET_TURN_ACTION_STATE` support in `src/scripts/clientGameState.js`.
  - Added reducer tests for turn context/action state.
  - Updated `Level.showAllButtons()` to store the same derived action state it applies to buttons.
- Checks:
  - `CI=true npx react-scripts test src/scripts/clientGameState.test.js src/scripts/gameActionState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js src/scripts/playerHandSync.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameState.js src/scripts/clientGameState.test.js` passed.
