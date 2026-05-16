# 2026-04-04 Change Audit

## Snapshot

- Repository: `Bigslickgames`
- Branch: `dev`
- Baseline committed revision before the current working tree: `90b0e1a` (`feat: update guest lobby and tutorial flow`)
- Audit date: `2026-04-04`
- Working tree size at audit time: `40` modified tracked files plus new assets/components/helpers
- Verification status at audit time:
- `npm run build` passes
- `node --check` passes for the patched backend/community-card logic and FX overlay modules
- Known caveat: the repo still has pre-existing ESLint warnings outside the scope of this audit

## 1. Guest / First-Run Experience

- The unauthenticated flow now lands on a dedicated guest lobby instead of dropping straight into tutorial content.
- The guest lobby was redesigned repeatedly into a cleaner themed welcome screen with:
- premium blue-gold styling
- updated welcome character art
- tighter mobile-first composition
- direct sign-up placement under the welcome artwork
- guest-seat access and tutorial access
- The guest join flow now resets stale tutorial guest-device state when needed so players can recover from the earlier board-limit issue and reach a normal guest table.
- Guest welcome art has been standardized to the new master welcome asset.
- Relevant files:
- `src/views/guest/index.jsx`
- `src/views/guest/game.jsx`
- `src/views/guest/session.js`
- `src/assets/scss/views/guest/_guest.scss`

## 2. Tutorial Flow

- The tutorial remains separated from the guest lobby and lives on `/guest/tutorial`.
- The tutorial content was cleaned up to focus on the chat-style teaching flow rather than duplicated marketing copy.
- Tutorial updates in the current working tree include:
- community-card explanation
- showdown / winner explanation
- larger chat typography
- close control
- CTA rename to `Take A Seat`
- themed background alignment with the guest lobby
- shared master welcome art usage
- Relevant files:
- `src/views/guest/tutorial/index.jsx`
- `src/assets/scss/views/guest/_guest.scss`

## 3. Auth / Entry Screen Polish

- Auth headings and guest-entry presentation were adjusted so the typography reads more clearly and aligns better with the newer lobby theme.
- Register page terms-and-conditions handling was improved:
- checkbox state is visually clearer
- the missing `and` text is restored
- spacing and visibility are improved for the terms row
- Relevant files:
- `src/views/auth/register/index.jsx`
- `src/assets/scss/views/auth/_login.scss`

## 4. Shared Header / Branding

- Both public and private headers now use a bespoke app wordmark instead of the earlier smaller header image/text treatment.
- Header presentation was reworked toward the current blue-gold casino theme.
- Header menus were also improved:
- private header menu auto-closes correctly
- `Contact` was added to the authenticated menu
- bug-report access was moved into menu-driven UI instead of floating side/bottom clutter
- Relevant files:
- `src/shared/components/AppWordmark/`
- `src/shared/components/Header/Public/index.jsx`
- `src/shared/components/Header/Private/index.jsx`
- `src/assets/scss/components/header/_header-public.scss`
- `src/assets/scss/components/header/_header-private.scss`

## 5. Authenticated Lobby Redesign

- The authenticated `/lobby` experience has moved far beyond the earlier overlay/table-list presentation.
- Mobile behavior is now the primary experience:
- top icon-first tab row
- framed content window below
- live tables, missions/rewards, private table, and profile sections
- the live tables tab now opens straight into table setup/selection instead of explanatory copy
- table setup currently centers on:
- seat count selection (`4`, `6`, `9`)
- buy-in selection (`1000`, `5000`, `15000`, `20000`)
- available-table presentation using portrait table art and per-table player silhouettes
- A first-run authenticated welcome modal was added with a `Don't show again` preference and 21 Hold'em explanation.
- Desktop/PC layout work is in progress and has been iterated multiple times; mobile remains the primary stabilized path.
- The lobby visual system was pushed toward a stronger premium UI treatment:
- darker framed panels
- stronger contrast between navigation and content
- blue active glows
- reduced duplicate rewards/live-table text clutter
- Relevant files:
- `src/views/dashboard/index.jsx`
- `src/views/dashboard/LobbyPreviewOverlay.jsx`
- `src/assets/scss/views/dashboard/_dashboard.scss`

## 6. Daily Rewards Merge / Simplification

- The standalone daily rewards page has effectively been decommissioned as a real destination and redirected back into the lobby rewards tab.
- The lobby rewards tab now owns the daily rewards experience through a reusable embedded panel component.
- The rewards UI was simplified to a cleaner chip-calendar approach:
- daily chip amounts by day
- current day highlight
- completed days dim out
- uncollected days use the fluid active-style treatment
- The older flashing sign/image treatment was removed and replaced with an in-theme built sign/header.
- Relevant files:
- `src/shared/components/DailyRewardsPanel/`
- `src/views/dailyRewards/index.jsx`
- `src/assets/scss/views/dailyRewards/_dailyRewards.scss`
- `src/views/dashboard/index.jsx`

## 7. Avatar / Profile Asset Refresh

- Older built-in profile icon usage has been replaced with the new image-based profile set under `src/assets/images/player-profile/profile_images/`.
- Avatar fallback/normalization logic was updated so legacy built-in choices resolve into the new image set.
- This affects headers, profile selection, lobby profile surfaces, and in-game player portraits.
- Relevant files:
- `src/shared/constants/builtInAvatars.js`
- `src/views/profile/index.jsx`
- `src/views/dashboard/index.jsx`
- `src/prefabs/PlayerProfile.js`

## 8. Phone / LAN Networking

- Development API and socket resolution no longer hard-depend on `localhost` during dev usage.
- The frontend now resolves dev endpoints from the current browser hostname, which allows phone testing against the PC-hosted stack.
- Relevant files:
- `src/axios.js`
- `src/scripts/SocketManager.js`
- `src/scenes/Level.js`

## 9. Game Screen: Portrait / Mobile-First UI Refactor

- The gameplay presentation has been refactored away from the old landscape-first layout into a portrait/mobile-first table presentation.
- The portrait table art is now the primary board image, and the game shell has been reworked around that orientation.
- Major UI work in the game layer includes:
- portrait table staging
- larger player profile shells
- fuller avatar fill inside profile circles
- repositioned other-player action banners for right-side seats
- simplified game buttons using darker generated button art instead of the earlier baked vector button set
- reset/removal of the heavier table-status/console experiments in favor of a cleaner table-first screen
- pot display repositioning
- bankroll anchoring inside the local player area
- removal of the portrait-mode warning banner
- loading screen rebuild using the empty portrait table art and `Get your chips ready!`
- desktop shell constrained back to a centered portrait frame so the game no longer stretches awkwardly wide on PC
- Relevant files:
- `src/views/game/index.jsx`
- `src/assets/scss/views/game/_game.scss`
- `src/scenes/Level.js`
- `src/scenes/Preload.js`
- `src/scripts/config.js`
- `src/scripts/GameManager.js`
- `src/prefabs/PlayerProfile.js`
- `src/prefabs/Button.js`

## 10. Game Rules / Score / Card-Flow Fixes

- Several gameplay bugs were audited and patched without changing the core ruleset intent:
- stale player totals were being shown into the next hand
- opening-hand rendering could replay/duplicate cards on the client
- raise affordance/amount handling could leave the player stuck after a rejected raise
- community-card progression could continue even after a player hit exactly `21`
- Current backend/gameplay fixes include:
- score-clearing paths when a hand ends
- stricter score display gating against live hands instead of stale participant totals
- refreshed participant data syncing for existing player profiles
- raise presets recalculated against true affordable amounts
- raise-rejection recovery that restores the player turn UI
- exact-21 short-circuit in community-card dealing on the backend
- explicit numeric comparison hardening in winner/scoring paths
- Relevant files:
- `src/scenes/Level.js`
- `src/prefabs/PlayerProfile.js`
- `src/scripts/GameManager.js`
- `src/scripts/SocketManager.js`
- `game-backend/app/game/boardManager/TwentyOneHoldem/Board/index.js`
- `game-backend/app/game/boardManager/TwentyOneHoldem/Participant/index.js`

## 11. FX Overlay / Audio / Chip Animation System

- The older ad-hoc chip/fx behavior was replaced with a cleaner reusable chip animation system in the overlay layer.
- The new chip module now provides:
- chip object creation
- requestAnimationFrame update loop
- call-to-pot animation
- pot-to-winner animation
- staggered spawns, easing, stacking offsets, and light randomness
- The surrounding FX overlay was updated to focus on:
- bust / win / double-down / crowd-reaction events
- removal of earlier duplicated chip burst behavior
- removal of the old bust voice callout
- bug-report UI relocation into menu-driven access
- Relevant files:
- `public/fx-overlay/chipBurst.js`
- `public/fx-overlay/fxOverlay.js`
- `public/fx-overlay/audioLayer.js`
- `public/fx-overlay/overlayUI.js`
- `src/scripts/SoundManager.js`

## 12. Backend Lobby Data Support

- Lobby table listing support was extended so the frontend can show live occupancy/player-count information for available tables.
- Relevant file:
- `game-backend/app/routers/game/poker/lib/controllers.js`

## 13. Added / New Assets In Current Working Tree

- New lobby/background assets:
- `src/assets/images/bg/live_tables.png`
- `src/assets/images/bg/master_welcome.png`
- `src/assets/images/bg/private_table.png`
- New gameplay/table assets:
- `src/assets/images/gameplay/new_21_holdem_table.png`
- `src/assets/images/gameplay/portrate_table.png`
- `src/assets/images/gameplay/blank_chip.png`
- New button assets:
- `src/assets/images/buttons/blank_button.png`
- `src/assets/images/buttons/button_base.png`
- `src/assets/images/buttons/call_button.png`
- `src/assets/images/buttons/check_button.png`
- `src/assets/images/buttons/console.png`
- `src/assets/images/buttons/d-down_button.png`
- `src/assets/images/buttons/fold_button.png`
- `src/assets/images/buttons/raise_button.png`
- `src/assets/images/buttons/stand_button.png`
- New rewards assets:
- `src/assets/images/daily-rewards/D_1.png`
- `src/assets/images/daily-rewards/D_2.png`
- `src/assets/images/daily-rewards/sign_1.png`
- `src/assets/images/daily-rewards/sign_2.png`
- New reusable/shared code:
- `src/shared/components/AppWordmark/`
- `src/shared/components/DailyRewardsPanel/`
- `src/scripts/gameUiLayout.js`
- `src/views/game/GameLayoutOverlay.jsx`
- `src/views/guest/session.js`
- `src/views/guest/quickLogin.jsx`

## 14. Working Tree Inventory Summary

- Current working tree remains large and cross-cutting:
- frontend views/styles
- Phaser gameplay UI
- FX overlay scripts
- backend community-card/winner logic
- new assets for lobby, rewards, buttons, table, and avatars
- Log files under `.startup-logs/` are also modified from local dev activity and are currently part of the uncommitted tree.

## 15. Known Open Items / Notes

- `src/views/guest/quickLogin.jsx` is present in the working tree but is not currently routed into the app.
- Desktop lobby layout still needs another deliberate PC-only polish pass if it is expected to match the latest static design mock exactly.
- The repo still contains pre-existing warnings that were not cleaned up as part of this working-tree pass.
- This audit reflects the current working tree as of `2026-04-04`, not every intermediate layout variation made during iteration.

## 16. Backup Target For This Audit

- New backup root for this audit cycle: `docs/backups/20260404/`
- Expected artifacts for the backup set:
- git bundle
- worktree patch
- branch/status/diff metadata
- recent commit snapshot
- changed/untracked file snapshot
