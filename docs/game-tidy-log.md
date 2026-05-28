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

### Step 19: Participant Hand/Score Reducer State

- Goal: track hand and score updates in normalized participant state.
- Scope: add reducer helper/action for participant `aCardHand` and `nCardScore`, then wire current card-hand/score update paths.
- Non-goal: do not change card rendering, animation, score display, or reveal rules in this step.
- Expected benefit: card/score socket updates become replay-testable without requiring Phaser containers.
- Implemented:
  - Added `SET_PARTICIPANT_HAND_SCORE` support in `src/scripts/clientGameState.js`.
  - Added reducer tests for participant hand/score updates.
  - Updated `Level.setCardHand()` and `Level.setMyPlayerData()` to keep reducer state in sync.
- Checks:
  - `CI=true npx react-scripts test src/scripts/clientGameState.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameState.js src/scripts/clientGameState.test.js` passed.

### Step 20: Participant Status Reducer State

- Goal: track participant state transitions like fold, bust, spectator, and leave in normalized state.
- Scope: add reducer support for participant status patches and wire the existing fold/leave/bust scene path.
- Non-goal: do not change visual alpha, prompts, sounds, or exit behavior in this step.
- Expected benefit: player lifecycle transitions become replay-testable.
- Implemented:
  - Added `SET_PARTICIPANT_STATUS` support in `src/scripts/clientGameState.js`.
  - Added reducer tests for participant status transitions.
  - Updated `Level.setFoldPlayer()` to keep reducer state in sync.
- Checks:
  - `CI=true npx react-scripts test src/scripts/clientGameState.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameState.js src/scripts/clientGameState.test.js` passed.

### Step 21: Socket-To-State Reducer Mapping

- Goal: let socket replay update normalized reducer state directly.
- Scope: map selected socket response events to `clientGameState` reducer actions.
- Non-goal: do not change live socket routing, Phaser rendering, or server payloads in this step.
- Expected benefit: mini game-flow regressions can be tested from socket events to final state.
- Implemented:
  - Added `src/scripts/socketStateReducer.js`.
  - Added `src/scripts/socketStateReducer.test.js`.
  - Covered board state, user join, local hand, fold status, bet/pot updates, and a mini hand replay.
- Checks:
  - `CI=true npx react-scripts test src/scripts/socketStateReducer.test.js src/scripts/clientGameState.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/socketStateReducer.js src/scripts/socketStateReducer.test.js` passed.

### Step 22: Live Socket-To-State Integration

- Goal: feed live incoming socket events into normalized client state before existing Phaser handlers run.
- Scope: add a scene hook for socket events and call it from `SocketManager.onReceive()`.
- Non-goal: do not remove existing scene mutations or make rendering depend on reducer state in this step.
- Expected benefit: runtime state mirrors replay-tested socket transitions, creating the bridge for later reducer-driven rendering.
- Implemented:
  - Added `Level.applySocketEventToClientState()`.
  - `SocketManager.onReceive()` now calls the state hook before routing to existing scene handlers.
- Checks:
  - `CI=true npx react-scripts test src/scripts/socketStateReducer.test.js src/scripts/socketReceiveRouter.test.js src/scripts/clientGameState.test.js src/scripts/socketEvents.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/SocketManager.js src/scripts/socketStateReducer.js src/scripts/clientGameState.js` passed.

### Step 23: Client State Selectors and Community Cards

- Goal: begin reading from normalized state in low-risk places.
- Scope: add selectors, track community-card updates in reducer state, and use selectors with fallbacks for pot/stand checks.
- Non-goal: do not switch rendering or card animation to reducer-driven output in this step.
- Expected benefit: reducer state becomes an active read source without removing legacy scene state yet.
- Implemented:
  - Added `src/scripts/clientGameSelectors.js`.
  - Added `src/scripts/clientGameSelectors.test.js`.
  - Added `SET_COMMUNITY_CARDS` support in `clientGameState`.
  - Updated `socketStateReducer` to handle `resCommunityCard`.
  - Updated low-risk `Level.js` reads for pot/chips/score/community card count to use selectors with legacy fallbacks.
- Checks:
  - `CI=true npx react-scripts test src/scripts/clientGameSelectors.test.js src/scripts/socketStateReducer.test.js src/scripts/clientGameState.test.js src/scripts/playerHandSync.test.js src/scripts/gameActionState.test.js src/scripts/boardSnapshot.test.js src/scripts/participantState.test.js src/scripts/socketReplay.test.js src/scripts/potState.test.js src/scripts/CleanupRegistry.test.js src/scripts/socketCallbackRouter.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/handResultLifecycle.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameSelectors.js src/scripts/clientGameSelectors.test.js src/scripts/clientGameState.js src/scripts/socketStateReducer.js` passed.

### Step 24: Turn Context Selectors

- Goal: continue moving game decisions away from direct scene/GameManager reads.
- Scope: add turn selectors and use reducer state first for raise context and double-down eligibility.
- Non-goal: do not change button rendering, socket payloads, timers, or the overlay bridge in this step.
- Expected benefit: turn decisions use the same replayable state surface as pot, hand score, and community-card reads.
- Implemented:
  - Added turn selectors in `src/scripts/clientGameSelectors.js`.
  - Covered selector defaults in `src/scripts/clientGameSelectors.test.js`.
  - Updated `Level.getRaiseContext()` to prefer reducer turn context for `toCallAmount`.
  - Updated `Level.canShowDoubleDownAction()` to prefer reducer hand score and community-card count with legacy fallbacks.
- Checks:
  - `$env:CI='true'; npx react-scripts test src/scripts/clientGameSelectors.test.js src/scripts/socketStateReducer.test.js src/scripts/clientGameState.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npx eslint src/scripts/clientGameSelectors.js src/scripts/clientGameSelectors.test.js` passed.
  - `npx eslint src/scenes/Level.js` still fails on existing unused-variable/empty-block issues outside this step; keep that as a later `Level.js` lint cleanup item.

### Step 25: Level Lint Gate Cleanup

- Goal: make `Level.js` pass ESLint so future scene work has a reliable safety check.
- Scope: remove dead imports, unused destructured socket fields, unused placeholder parameters, and an empty catch block.
- Non-goal: do not change socket payload contracts, visual behavior, betting math, or animation behavior in this step.
- Expected benefit: scene cleanup can now use lint as a fast regression signal instead of carrying known failures.
- Implemented:
  - Removed unused `ChipAnimationController` import.
  - Narrowed `setGameData()`, `setBoardState()`, `setProfiles()`, and waiting-method parameters to the values they actually use.
  - Removed unused parameters from no-op FX/staged-bet methods.
  - Replaced an empty catch block with an explicit return.
- Checks:
  - `npx eslint src/scenes/Level.js` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/clientGameSelectors.test.js src/scripts/socketStateReducer.test.js src/scripts/clientGameState.test.js src/scripts/gameActionState.test.js src/scripts/potState.test.js --watchAll=false` passed.
  - `npx eslint src/scenes/Level.js src/scripts/clientGameSelectors.js src/scripts/clientGameSelectors.test.js` passed.

### Step 26: Game Lint Safety Gate

- Goal: create a reliable lint command for the live game code.
- Scope: align flat ESLint config with the React/Jest/Node environment, ignore the old source backup folder, and clean the remaining game-script lint blockers.
- Non-goal: do not clean unrelated dashboard/login/admin UI lint debt in this step.
- Expected benefit: game scene, script, and prefab changes can now be checked with one stable command.
- Implemented:
  - Updated `eslint.config.mjs` to ignore `src/_backup_25apr_profilefix/**`, detect React, and include browser/node/jest globals.
  - Disabled React rules that do not fit this React 18 codebase: `react/react-in-jsx-scope` and `react/prop-types`.
  - Added `npm run lint:game` for `src/scenes`, `src/scripts`, and `src/prefabs`.
  - Removed unused animation/GameManager parameters and made game UI layout storage catches explicit.
- Checks:
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameUiLayout.test.js src/scripts/clientGameSelectors.test.js src/scripts/socketStateReducer.test.js src/scripts/clientGameState.test.js src/scripts/gameActionState.test.js src/scripts/potState.test.js --watchAll=false` passed.
  - `npm run lint -- --max-warnings=0` still fails on unrelated active UI/admin unused-code debt; the game lint gate is clean.

### Step 27: Game UI Layout Tests

- Goal: protect the game UI layout persistence helpers after making their failure paths explicit.
- Scope: add tests for sanitizing, localStorage read/write fallback behavior, and layout update dispatching.
- Non-goal: do not change layout defaults, scene positioning, or the in-browser layout tuning UI in this step.
- Expected benefit: future layout tuning cannot silently break saved game layout handling.
- Implemented:
  - Added `src/scripts/gameUiLayout.test.js`.
  - Covered clamping, invalid input fallback, storage write/read, storage exceptions, and event dispatch.
- Checks:
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameUiLayout.test.js src/scripts/clientGameSelectors.test.js src/scripts/socketStateReducer.test.js src/scripts/clientGameState.test.js src/scripts/gameActionState.test.js src/scripts/potState.test.js --watchAll=false` passed.

### Step 28: Table UX Cleanup Pass

- Goal: remove duplicated card display noise and make winner/side-bet/chip feedback clearer.
- Scope: remove the React action-card render, keep console cards, remove floating winner celebration FX, add side-bet payout feedback, make visible action rows size by actual button count, and restore individual chip transfer animation.
- Non-goal: do not change server side-bet rules or payout calculation in this step.
- Expected benefit: fewer competing card surfaces, clearer side-bet feedback, cleaner action rows, and more readable chip movement.
- Implemented:
  - Removed the duplicate action-hand card render from `GameActionOverlay`; console cards remain.
  - Added a curved `Place Side Bets` heading above table side bets.
  - Added side-bet paid badges and payout callout support from `resSideBets` payloads.
  - Stopped calling the floating winner celebration FX; winner feedback now stays on player profile/console.
  - Rewired `ChipAnimationController` into pot updates and payouts with pop/hold/swoosh chip movement.
  - Made action overlay rows choose 1/2/3/4-column classes from the number of visible buttons.
- Checks:
  - `npm run lint:game` passed.
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/potState.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npm run build` completed successfully with existing repo warnings.

### Step 29: Card/FX/Stripe Correction

- Goal: correct the previous UX pass where the card console was over-removed and chip motion was routed through the old Phaser controller.
- Scope: restore the player card console using the single console-card renderer, remove the old chip controller path, move chip transfer into the FX overlay, and harden Stripe checkout redirect.
- Non-goal: do not reintroduce the duplicate action-card renderer or the floating winner crown animation.
- Expected benefit: one card render system remains visible in the console, chip animation belongs to the FX module, and Stripe checkout can redirect even when Stripe.js is missing a publishable key.
- Implemented:
  - Restored `ConsoleCards` inside the console center column.
  - Deleted `src/scripts/ChipAnimationController.js` and removed the `Level.js` controller wiring.
  - Added `FXOverlay.transferChips()` backed by `public/fx-overlay/chipBurst.js` pop/hold/swoosh DOM animation.
  - Updated pot update/payout paths to call FX overlay chip transfer and commit pot state after the animation window.
  - Returned Stripe `checkoutUrl` from the backend checkout session and used it as the frontend redirect fallback.
  - Cleaned small dashboard unused-code lint issues in the touched Stripe file.
- Checks:
  - `npm run lint:game` passed.
  - `npx eslint src/views/game/GameActionOverlay.jsx src/views/dashboard/index.jsx --max-warnings=0` passed.
  - `node --check public/fx-overlay/chipBurst.js; node --check public/fx-overlay/fxOverlay.js; node --check game-backend/app/routers/game/shop/lib/controllers.js` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/socketReceiveRouter.test.js src/scripts/socketEvents.test.js src/scripts/potState.test.js src/scripts/gameActionState.test.js --watchAll=false` passed.
  - `npm run build` completed successfully with existing repo warnings.

### Step 30: Remove Profile Seat Card Renderer

- Goal: remove the remaining duplicate player-card renderer from Phaser player profiles and keep the console card renderer as the single visible player-hand UI.
- Scope: stop `Level` from creating cards inside `PlayerProfile.container_cards`, keep those containers hidden as cleanup-only compatibility targets, preserve score/winner/profile UI, and lift the bottom console upward by half its height.
- Non-goal: do not delete the profile/avatar renderer or change community-card rendering.
- Expected benefit: one card design is visible, stale profile-seat cards cannot reappear during hand/result/double-down flows, and action controls remain clear after the console lift.
- Implemented:
  - Removed the `Level.createCard`/`animateCard` profile-seat card creation path.
  - Changed hand sync/result/double-down flows to update player hand state and console cards without rendering profile-seat cards.
  - Forced `PlayerProfile.container_cards` to stay hidden by default and after winner prompt cleanup.
  - Moved the bottom action console up by 38px and moved the action rows up by the same amount.
- Checks:
  - `npm run lint:game` passed.
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `node --check public/fx-overlay/chipBurst.js; node --check public/fx-overlay/fxOverlay.js` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/playerHandSync.test.js src/scripts/socketReceiveRouter.test.js src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js --watchAll=false` passed.
  - `npm run build` was attempted; the shell command timed out after 244s, and the background build process later exited without captured output.

### Step 31: Fix Action Rows And Card Face Mismatch

- Goal: address the visible screenshot issues where the main actions still formed three rows and console cards did not match the table/community card face.
- Scope: pair main action buttons into two-button rows and make the React console card face use the same card-front asset and rank/suit structure as the Phaser card prefab.
- Non-goal: do not change game rules, available actions, or community-card placement.
- Expected benefit: `Fold | Call` and `Call/Stand | Raise` appear as two rows when all four actions are visible, and the console hand no longer looks like a separate card design.
- Implemented:
  - Added paired main-action row generation in `Level.syncGameActionOverlay()`.
  - Updated `ConsoleCard` to render card front art, corner rank/suit, and center rank.
- Checks:
  - `npm run lint:game` passed.
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js --watchAll=false` passed.

### Step 32: Remove Table/Login Flashes And Reposition Hand Cards

- Goal: remove one-frame UI flashes during login/table load and put the visible hand cards where the player expects them.
- Scope: derive gameplay layout immediately for `/game`, stop the login splash from fading back to the login form before navigation, remove the old Phaser header buttons, make the side-bet heading appear only while side bets are active, move console cards above action buttons, and apply the requested card face design.
- Non-goal: do not change login authentication, route permissions, or game action rules.
- Expected benefit: no old topbar/header flash on table load, no login form glimpse after successful login, side-bet text does not sit on the felt when inactive, and hand cards are larger above the controls with a large rank and top-left suit.
- Implemented:
  - Replaced delayed `isGamePlay` layout state with direct `/game` path detection.
  - Removed the login splash fade-out step and cleaned up its timer on unmount.
  - Disabled the old Phaser settings/exit header because the React game utility overlay owns exit now.
  - Rendered the `Place Side Bets` arc only while the side-bet window is open.
  - Moved `ConsoleCards` into a floating area above the action rows and enlarged them.
  - Updated both React console cards and Phaser `Card` faces to use one large center rank plus a medium top-left suit.
- Checks:
  - `npm run lint:game` passed.
  - `npx eslint src/views/game/GameActionOverlay.jsx src/views/auth/login/index.jsx src/layouts/main-layout/index.jsx --max-warnings=0` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js --watchAll=false` passed.

### Step 33: Turn/Bust Feedback And New Motion Pass

- Goal: make turn, bust, card, side-bet, and chip feedback more readable without bringing back the old Phaser chip animation module.
- Scope: React console feedback, FX overlay audio/chip motion, side-bet opacity, and card deal/clear motion.
- Non-goal: do not reintroduce `ChipAnimationController` or change server-side payout/action rules.
- Expected benefit: the player gets a clear green console flash and audible tone on their turn, a red console bust blast plus screen shake on bust, clearer side-bet affordances, and new chip/card motion built in the current overlay systems.
- Implemented:
  - Added `CONSOLE_BUST` browser event and self-bust console red blast handling.
  - Added FX overlay `turnAlert()` using the existing audio layer and a green pulse.
  - Triggered turn alert when the local player receives turn control.
  - Made side-bet inactive/empty states less unevenly opaque.
  - Added React console card deal and clear animations with delayed removal for clear-out.
  - Reworked FX overlay chip transfer so bets pop/hold/lob into the pot, and payouts rise toward camera scale before swooshing to the player.
- Checks:
  - `npm run lint:game` passed.
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `node --check public/fx-overlay/chipBurst.js; node --check public/fx-overlay/fxOverlay.js; node --check public/fx-overlay/audioLayer.js` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js --watchAll=false` passed.

### Step 34: Player Bankroll Tablets

- Goal: make player bankroll amounts match the side-bet amount tablet style.
- Scope: replace loose profile bankroll text positioning with a dark rounded chip-value tablet in `PlayerProfile`.
- Non-goal: do not change chip balances or server state.
- Expected benefit: player bankrolls visually match the side-bet bet amount badges and resize cleanly for short and abbreviated amounts.
- Implemented:
  - Added a rounded dark/gold bankroll tablet behind each player bankroll.
  - Repositioned the chip icon and amount text inside the tablet.
  - Redraws the tablet width when the formatted bankroll amount changes.
- Checks:
  - `npm run lint:game` passed.

### Step 35: Hand Reset, Stand Lock, And Side-Bet Bankroll Feedback

- Goal: fix the current console/profile display issues at their state sources instead of layering another visual patch over them.
- Scope: player bankroll backing, local console hand lifecycle, post-stand card visibility, new-card-only motion, local chip-transfer anchor, and side-bet bankroll/payout event data.
- Non-goal: do not reintroduce the removed profile-card renderer or the old Phaser chip animation module.
- Expected benefit: bankroll tablets no longer sit on a square backing, the local hand clears after result cleanup, standing stops new community cards from appearing in the console hand, only newly received cards animate, chip FX has a stable source for the suppressed local profile, and side-bet debits/credits are reflected in the console bankroll.
- Implemented:
  - Hid the old `PlayerProfile` identity panel behind the new bankroll tablet while leaving the tablet renderer active.
  - Added a local console hand clear path that clears player hand state and the reducer hand score together.
  - Limited console community cards after stand/double-down lock to the cards that were eligible when the player stood.
  - Tracked console card render keys so deal motion applies only to cards that were not already on screen.
  - Moved the console cards up by 20px and enlarged the score total number.
  - Added an FX overlay anchor for the local console so chip transfers still animate when the local seat profile is visually suppressed.
  - Normalized side-bet result payout payloads and passed `nChips` through to the React overlay so the visible bankroll changes on side-bet debit/credit.
- Checks:
  - `npm run lint:game` passed.
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `node --check public/fx-overlay/chipBurst.js; node --check public/fx-overlay/fxOverlay.js; node --check public/fx-overlay/audioLayer.js` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js --watchAll=false` passed.

### Step 36: Freeze Local Console Cards After Stand

- Goal: stop the local console from receiving or animating extra cards after the player has stood.
- Scope: the local console card payload and stand socket handling in `Level`.
- Non-goal: do not stop table/community cards, bankroll updates, pot updates, or final result state from updating.
- Expected benefit: standing freezes the exact local hand display that was visible at the moment of stand, while the rest of the table can continue resolving normally.
- Implemented:
  - Added a local console hand lock snapshot used by `emitConsoleCards()`.
  - Captured that snapshot before marking the player as stand/double-down locked.
  - Cleared the lock through the existing local hand reset path between hands.
- Checks:
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js --watchAll=false` passed.
  - `git diff --check -- src/scenes/Level.js docs/game-tidy-log.md` passed.

### Step 37: Mobile Portrait Visible Viewport Fit

- Goal: make mobile portrait gameplay fill the actual visible phone viewport without leaving a large dark strip below the bottom console.
- Scope: viewport height measurement, mobile game-stage sizing, and bottom-console vertical offset math.
- Non-goal: do not redesign controls, cards, table art, or console styling.
- Expected benefit: the game stage and React overlay use the live visual viewport height, and the mobile bottom console sits against the visible bottom safe area instead of a hard-coded gap.
- Implemented:
  - Set the `--vh` CSS variable from `visualViewport.height`/`innerHeight` while the game view is mounted.
  - Changed the mobile game stage from strict 9:16 aspect-height sizing to the actual visible viewport height.
  - Replaced the hard-coded `38px` console bottom offset with a CSS variable and set it to the device safe-area bottom on mobile.
- Checks:
  - `npx eslint src/views/game/index.jsx --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `git diff --check -- src/views/game/index.jsx src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 38: Lock Console On Stand Intent

- Goal: ensure the local player never receives extra console cards after choosing any stand action.
- Scope: local action command handling and bet response handling in `Level`.
- Non-goal: do not change server rules, pot updates, bankroll updates, or table community-card display.
- Expected benefit: `Stand`, `Call/Stand`, and `Raise+Stand` all freeze the local console hand before later socket card updates can repaint it.
- Implemented:
  - Locked the local console hand immediately when the stand command is sent.
  - Locked the local console hand before stand-raise requests with `bTakeCard: false`.
  - Treated `CALL`/`RAISE` responses with `bTakeCard: false` as stand confirmations.
  - Cleared the local console lock if the action request returns an error.
- Checks:
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js --watchAll=false` passed.
  - `git diff --check -- src/scenes/Level.js docs/game-tidy-log.md` passed.

### Step 39: Remove Card Animations

- Goal: remove card motion from the game display so cards appear and clear immediately.
- Scope: React console cards, card animation CSS, and the legacy Phaser card flip helper.
- Non-goal: do not change chip animations, win/bust/turn feedback, card art, or card layout.
- Expected benefit: no card deal/clear/flip animation path remains in the active game UI.
- Implemented:
  - Removed React console card motion state, delayed clear timing, and new-card class handling.
  - Removed console card deal/clear keyframes and animation selectors.
  - Removed the unused `Card.animateCard()` tween helper.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js --watchAll=false` passed.
  - `git diff --check -- src/views/game/GameActionOverlay.jsx src/assets/scss/views/game/_game.scss src/prefabs/Card.js docs/game-tidy-log.md` passed.

### Step 40: Remove Action Button Glass Treatment

- Goal: remove the glass highlight treatment from the gameplay action buttons without redesigning their layout.
- Scope: React action button CSS in the game overlay.
- Non-goal: do not change button commands, row layout, sizing, or console structure.
- Expected benefit: action buttons keep their rounded form and color variants but no longer show the white glass band/inset shine.
- Implemented:
  - Removed layered white gloss gradients from action buttons.
  - Removed the pseudo-element highlight and inner glass border.
  - Replaced inset glass shadows with simpler outer depth shadows.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `git diff --check -- src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.

### Step 41: In-Game Rewards Shop And Fresh Card Motion

- Goal: add in-game reward/shop access, correct stale zero bankroll display, align card number sizing, and add a new card motion path after the previous animation code was removed.
- Scope: React game overlay, game SCSS, existing daily reward/shop APIs, and console card presentation.
- Non-goal: do not change server economy rules, table actions, side-bet rules, or chip animations.
- Expected benefit: players can claim rewards or buy chips without leaving the game screen, the console bankroll prefers live table data when profile data is stale, hand/community card ranks match visually, and cards enter/leave with a fresh animation when the hand appears/clears.
- Implemented:
  - Added bottom-left Rewards and Shop icon buttons.
  - Added modal panels using the existing `DailyRewardsPanel`, `getChips`, and `buyChips` flows.
  - Changed console bankroll fallback to prefer live override/profile/table bankroll data instead of showing stale zero.
  - Matched floating console card rank sizing to the existing hand-card rank size.
  - Added new card arrive/leave keyframes and state classes with different names and timing from the removed animation path.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js --watchAll=false` passed.
  - `git diff --check -- src/views/game/GameActionOverlay.jsx src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 42: Console Stand Lock And New-Card Motion Fix

- Goal: fix the reported regressions where the console could still show community cards after stand, old console cards replayed the incoming animation, and reward/shop buttons sat outside the console controls.
- Scope: local console card lock state, React console card event filtering, console card motion targeting, and console shortcut placement.
- Non-goal: do not redesign the table, action buttons, card art, economy rules, or chip animation.
- Expected benefit: once the local player chooses stand, the console hand freezes until hand clear; only genuinely new cards animate in; reward, shop, and emoji controls live together in the center console area.
- Implemented:
  - Added a local stand-intent lock that is set before stand socket requests and kept active even if the server response omits `bTakeCard: false`.
  - Tagged locked console card payloads and made the React overlay ignore later non-clear console card pushes while locked.
  - Stopped score/hand display sync from repainting the local console while the stand lock is active.
  - Changed card motion so the arrive animation only applies to cards whose render key was not already displayed.
  - Moved Rewards and Shop beside the emoji picker in the console center and removed the floating bottom shortcut cluster.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js --watchAll=false` passed.
  - `git diff --check -- src/scenes/Level.js src/views/game/GameActionOverlay.jsx src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 43: Remove Overlay Card Renderer And Rehome Console Controls

- Goal: remove the duplicate React card renderer/animation path, move side bets into the bottom console, move rewards/shop to the top utility strip, and stop post-stand participant payloads from overwriting the local hand.
- Scope: React game overlay, game SCSS, and local participant assignment in `Level`.
- Non-goal: do not redesign the table cards, Phaser card prefab, side-bet rules, economy APIs, or sound/exit controls.
- Expected benefit: only the Phaser card system renders gameplay cards; the bottom console uses its center area for side bets; reward/shop live with the speaker controls; stood players keep their frozen hand/score until the hand clears.
- Implemented:
  - Removed `ConsoleCard`, `ConsoleCards`, floating console cards, card-motion state, card asset imports, and all related SCSS selectors/keyframes.
  - Removed the emoji picker from the bottom console.
  - Moved Reward and Shop buttons into the top game utility control row beside sound/exit.
  - Moved `SideBetsModule` into the center column of the bottom console with its info, payout, timer/amount, and clear controls.
  - Added a local-hand-preserving participant assignment helper so local `aCardHand`/`nCardScore` are not overwritten while stand lock is active.
  - Guarded `setCardHand` so late local hand snapshots cannot repaint cards after stand.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js --watchAll=false` passed.
  - `git diff --check -- src/scenes/Level.js src/views/game/GameActionOverlay.jsx src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 44: Add Top Utility Banner Space

- Goal: move the game playfield down while keeping the bottom console anchored, making room at the top for a banner that houses the utility icons.
- Scope: game SCSS layout only.
- Non-goal: do not change game logic, cards, side bets, action buttons, or bottom console positioning.
- Expected benefit: the table/canvas content shifts down under a dedicated top banner, while the bottom console stays fixed to the bottom of the visible game screen.
- Implemented:
  - Added `--game-top-banner-height` and `--game-playfield-offset-y` layout variables.
  - Offset the Phaser canvas vertically using the playfield offset variable.
  - Restyled the top utility control row as a full-width banner aligned to the top safe area.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `git diff --check -- src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 45: Double Playfield Downward Offset

- Goal: move the game playfield down again by doubling the existing top-banner offset while leaving the bottom console anchored.
- Scope: game SCSS layout variable only.
- Non-goal: do not change controls, card rendering, gameplay state, side bets, or the bottom console.
- Expected benefit: the playfield sits lower under the top banner, creating more room around the utility icons.
- Implemented:
  - Changed `--game-playfield-offset-y` from `0.46` to `0.92` of the top banner height.
- Checks:
  - `git diff --check -- src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 46: Add One More Playfield Offset Step

- Goal: move the game playfield down by one more original offset step while leaving the bottom console anchored.
- Scope: game SCSS layout variable only.
- Non-goal: do not change controls, card rendering, gameplay state, side bets, or the bottom console.
- Expected benefit: the playfield sits lower again beneath the top banner.
- Implemented:
  - Changed `--game-playfield-offset-y` from `0.92` to `1.38` of the top banner height.
- Checks:
  - `git diff --check -- src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 47: Add Fresh Hole Card Display Above Lowered Buttons

- Goal: move the action buttons down 20px and add a new local hole-card display above them without restoring the removed console card renderer.
- Scope: React game overlay and game SCSS.
- Non-goal: do not change Phaser table card logic, gameplay state, side bets, chip flow, or old card animation code.
- Expected benefit: action buttons sit lower, and the local hand appears above them using the same face/suit assets and visual structure as the table cards.
- Implemented:
  - Added a fresh `HoleCardDisplay` component with new `hole-card` class names.
  - Used `card_front` and the existing suit PNG assets used by table cards.
  - Kept the display limited to local hand cards from the existing `CONSOLE_CARDS` payload.
  - Added layout variables for a 20px action-button downward shift and for positioning the hole-card display above the buttons.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `git diff --check -- src/views/game/GameActionOverlay.jsx src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 48: Increase Mobile Gameplay UI Scale

- Goal: make the mobile portrait UI readable and playable by increasing the overlay controls by about 20%.
- Scope: mobile game SCSS for the bottom console, action buttons, side bets, hole cards, and top utility controls.
- Non-goal: do not change gameplay logic, card state, server events, desktop sizing, or the Phaser playfield.
- Expected benefit: larger touch targets and more readable bankrolls, side bets, hole cards, action buttons, and top icons on mobile.
- Implemented:
  - Added a final mobile override block so it wins over earlier mobile sizing rules.
  - Increased the bottom console height from 75px to 90px on mobile and recalculated button/card positions from that height.
  - Increased action button min-height, padding, and font size by roughly 20%.
  - Increased hole cards, side-bet controls, bankroll text, avatar, and top utility controls by roughly 20%.
- Checks:
  - `git diff --check -- src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 49: Banner Blinds Bankroll And Button Size Adjustment

- Goal: lower hole-card layering for modals, reduce action button size, fix zero bankroll fallback, and show table blinds in the top banner.
- Scope: React game overlay, overlay state bridge, Level overlay payload, and game SCSS.
- Non-goal: do not change gameplay rules, card dealing, side-bet rules, or modal behavior.
- Expected benefit: modal windows render above hole cards, mobile action buttons are smaller after the previous scale increase, the player bankroll avoids stale zero values when live/profile values exist, and the top banner displays blinds such as `50/100`.
- Implemented:
  - Lowered `.game-action-overlay__hole-card-display` from z-index `6` to `2`.
  - Reduced the final mobile action button override by about 20%.
  - Added `smallBlind` and `bigBlind` to the overlay state.
  - Emitted blind values from `Level.syncGameActionOverlay()`.
  - Added a left-aligned top-banner blind pill.
  - Changed bankroll selection to prefer positive override/profile/live values before falling back to zero.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx src/scripts/gameActionOverlayBridge.js --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js --watchAll=false` passed.
  - `git diff --check -- src/views/game/GameActionOverlay.jsx src/scripts/gameActionOverlayBridge.js src/scenes/Level.js src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 50: Raise Action Buttons 20px

- Goal: move the action buttons up 20px and leave the rest of the UI unchanged.
- Scope: game SCSS layout variable only.
- Non-goal: do not change button size, hole cards, banner, console, gameplay state, or card rendering.
- Expected benefit: action buttons sit 20px higher than the previous position.
- Implemented:
  - Changed `--game-action-buttons-shift-y` from `20px` to `0px`, which raises the action button row by 20px because the bottom offset no longer subtracts that shift.
- Checks:
  - `git diff --check -- src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 51: Lower Hole Cards 20px

- Goal: move the local hole-card display down 20px while leaving action buttons and the bottom console unchanged.
- Scope: game SCSS layout variables only.
- Non-goal: do not change card rendering, card size, action button position, modal layering, gameplay state, or console layout.
- Expected benefit: the hole cards sit 20px closer to the action buttons.
- Implemented:
  - Reduced the default hole-card offset from `126px` to `106px` above the action buttons.
  - Reduced the mobile hole-card offset from `151px` to `131px` above the action buttons.
- Checks:
  - `git diff --check -- src/assets/scss/views/game/_game.scss docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.

### Step 52: Adjust Player Console Block And Timer Check

- Goal: move the local profile circle/name/bankroll up 5px, remove the word `Current`, and verify the turn timer path is still wired.
- Scope: React game overlay text and game SCSS layout.
- Non-goal: do not change timer logic, bankroll calculation, console sizing, cards, buttons, or gameplay events.
- Expected benefit: the local player block sits slightly higher and shows only name plus bankroll.
- Implemented:
  - Removed the `Current` label from the local bankroll display.
  - Shifted `.game-action-overlay__console-col--left` up by 5px.
  - Verified the timer path remains `Level.emitConsoleTurnTimer()` -> `GAME_BROWSER_EVENTS.CONSOLE_TURN_TIMER` -> `turnTimer` state -> avatar `--turn-progress` ring and `is-timing` class.
  - Locked table player profiles to their base seat coordinates so saved layout offsets/scales cannot make other players float away from the table.
- Checks:
  - `npx eslint src/views/game/GameActionOverlay.jsx --max-warnings=0` passed.
  - `npm run lint:game` passed.
  - `$env:CI='true'; npx react-scripts test src/scripts/gameActionState.test.js src/scripts/clientGameState.test.js src/scripts/socketReceiveRouter.test.js src/scripts/socketStateReducer.test.js src/scripts/gameUiLayout.test.js --watchAll=false` passed.
  - `git diff --check -- src/views/game/GameActionOverlay.jsx src/assets/scss/views/game/_game.scss src/scenes/Level.js docs/game-tidy-log.md` passed.
  - `npm run build` passed with existing project-wide warnings.
