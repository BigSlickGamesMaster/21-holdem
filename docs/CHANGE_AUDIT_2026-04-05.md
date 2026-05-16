# 2026-04-05 Change Audit

## Snapshot

- Repository: `Bigslickgames`
- Branch: `dev`
- Baseline committed revision before this save: `18ae3b5` (`feat: refresh lobby rewards and portrait gameplay`)
- Audit date: `2026-04-05`
- Verification status at audit time:
- `npm run build` passes
- `node --check` passes for `game-backend/app/game/boardManager/TwentyOneHoldem/Participant/index.js`
- Game backend restarted successfully and `http://127.0.0.1:4000/ping` returned `200 {}`
- Known caveat: the repo still has pre-existing ESLint warnings outside the scope of this audit

## 1. Gameplay Action Controls

- The game action buttons were moved away from the earlier Phaser-only button rendering and into a dedicated DOM overlay that sits over the game stage.
- The gameplay controls now use the same auth/lobby button language instead of image-driven button art:
- primary mint CTA styling
- dark outlined secondary buttons
- condensed uppercase button labels
- mobile-safe wrapping and dedicated compact preset rows
- The overlay now handles:
- normal turn actions
- raise preset selection
- raise confirmation actions
- call amount text inside the call button
- Relevant files:
- `src/views/game/GameActionOverlay.jsx`
- `src/views/game/index.jsx`
- `src/scripts/gameActionOverlayBridge.js`
- `src/assets/scss/views/game/_game.scss`
- `src/scenes/Level.js`

## 2. Raise / All-In Flow Stabilization

- The raise flow was tightened so it behaves consistently when moving from preset selection into the confirm step.
- The visible raise preset row was simplified to `MIN`, `1/2`, and `POT`.
- The voluntary `ALL IN` option was removed from the normal raise builder.
- `All In` is now reserved for the short-stack case where the player cannot fully cover a call.
- A key backend lock issue was fixed:
- a raise or call that reduced chips to exactly `0` was previously forcing `isAllInLock = true`
- that caused round settlement to skip the player's next decision
- this auto-lock is now removed for normal raise/call paths so action can come back correctly
- Relevant files:
- `src/scenes/Level.js`
- `game-backend/app/game/boardManager/TwentyOneHoldem/Participant/index.js`

## 3. Player Totals / Showdown Visibility

- Formal request tracking was added in `CHANGE_REQUEST_002_PLAYER_TOTALS_BEFORE_SHOWDOWN.md`.
- Opponent totals are now hidden during active hands and only revealed during result resolution.
- Local player totals remain visible during the hand.
- Score displays are also cleared correctly between hands instead of lingering from the previous round.
- Relevant files:
- `docs/CHANGE_REQUEST_002_PLAYER_TOTALS_BEFORE_SHOWDOWN.md`
- `src/scenes/Level.js`
- `src/prefabs/PlayerProfile.js`

## 4. Table Profile / Avatar Presentation

- Player profile portraits on the table were re-tuned so they fill the profile frame more cleanly.
- Avatar cover scaling was increased slightly for local and non-local seats.
- Portraits now reset to a centered origin/position after texture changes instead of drifting inside the mask area.
- Relevant file:
- `src/prefabs/PlayerProfile.js`

## 5. Game Screen Layout Cleanup

- The main playfield remains portrait-first, but several gameplay UI experiments were stripped back in favor of a cleaner table view.
- The separate heavy console treatment was removed in favor of the staged action overlay.
- The playfield and action controls were separated more cleanly so button layout can evolve without dragging the whole table shell with it.
- Win FX were also simplified by removing winner confetti from the overlay path.
- Relevant files:
- `src/scenes/Level.js`
- `src/assets/scss/views/game/_game.scss`
- `public/fx-overlay/overlayUI.js`

## 6. About Page Audio

- The About page now includes a lightweight `Listen` control under the top intro copy.
- A new voiceover asset was added and wired into the page with play/stop state handling.
- Older lower explanatory sections were removed so the page stays tighter and more focused.
- Relevant files:
- `src/views/cms/about.jsx`
- `src/assets/scss/views/cms/_cms.scss`
- `src/assets/sounds/21_Holdem_about.mp3`

## 7. Added Files In This Save

- `docs/CHANGE_REQUEST_002_PLAYER_TOTALS_BEFORE_SHOWDOWN.md`
- `docs/CHANGE_AUDIT_2026-04-05.md`
- `src/assets/sounds/21_Holdem_about.mp3`
- `src/scripts/gameActionOverlayBridge.js`
- `src/views/game/GameActionOverlay.jsx`

## 8. Working Tree Scope For This Save

- This save is focused on gameplay interaction stability and the supporting UI layer:
- gameplay button system replacement
- raise/all-in turn handling
- showdown score visibility
- avatar fit/centering improvements
- About page audio CTA

## 9. Backup Target For This Audit

- Local backup directory for this save:
- `docs/backups/20260405`
