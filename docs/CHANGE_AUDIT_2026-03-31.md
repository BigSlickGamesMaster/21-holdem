# 2026-03-31 Change Audit

## Snapshot

- Repository: `Bigslickgames`
- Branch: `dev`
- Baseline committed revision before the current working tree: `90b0e1a` (`feat: update guest lobby and tutorial flow`)
- Current state: large multi-area redesign in progress across guest flow, tutorial, authenticated lobby, rewards, headers, avatars, networking, and backend table metadata
- Verification status at audit time: `npm run build` passes
- Known build caveat: the repo still has existing ESLint warnings outside the scope of this audit

## 1. Guest / Unauthenticated Flow

- The guest entry flow has been reworked so unauthenticated users land on a lightweight guest lobby instead of being dropped straight into the tutorial.
- The guest lobby now supports direct guest seating via device-based guest login and guest-table join flow.
- The guest lobby visuals were heavily reworked:
- themed animated background
- centered welcome-stage composition
- guest welcome art and promo badges
- lightweight bullet-point intro copy
- fixed/mobile CTA layout
- sign-up access from the guest lobby
- tutorial access from the guest lobby
- Relevant files:
- `src/views/guest/index.jsx`
- `src/assets/scss/views/guest/_guest.scss`
- `src/views/guest/game.jsx`
- `src/views/guest/session.js`

## 2. Tutorial Experience

- The tutorial content has been separated from the guest landing and consolidated into `/guest/tutorial`.
- The tutorial now uses a chat-style walkthrough rather than mixing the onboarding copy into the guest lobby.
- The tutorial flow was extended with additional steps, including:
- community cards explanation
- action-button guidance
- showdown / winner explanation
- The tutorial UI was iterated multiple times:
- heading cleanup
- larger chat typography
- removal of extra descriptive blocks
- window height/size adjustments
- close `X` control
- CTA rename to `Take A Seat`
- themed background aligned with the guest lobby
- Relevant files:
- `src/views/guest/tutorial/index.jsx`
- `src/views/guest/tutorial/game.jsx`
- `src/views/guest/tutorial/tutorial.css`
- `src/assets/scss/views/guest/_guest.scss`

## 3. Auth Screens / Entry Polish

- Guest-side access was improved by adding clearer sign-up paths and simplifying unauthenticated navigation.
- Register page issues were addressed around the terms-and-conditions row:
- the checkbox checked state now lights up properly
- the `and` text between links is visible again
- Large heading typography was revised so words no longer mash together in a compressed blocky treatment.
- Relevant files:
- `src/views/auth/register/index.jsx`
- `src/assets/scss/views/auth/_login.scss`

## 4. Authenticated Lobby Redesign

- The authenticated `/lobby` experience has been substantially redesigned away from the older overlay/table-selection presentation.
- The current direction is a single-window tabbed hub with icon-first section navigation at the top and a framed content area below.
- The four core lobby sections are:
- live tables
- missions / rewards
- private table
- player profile
- The top section was iterated from multi-card sections to a cleaner tabbed system where the buttons switch the framed content below.
- Mobile-first behavior was enforced after the redesign direction changed.
- Mobile behavior has gone through multiple layouts:
- compact stacked sections
- accordion treatment
- then the current top tab + framed content approach
- Desktop behavior was adjusted to avoid unnecessary scrolling and keep the key windows aligned more deliberately.
- A strong visual polish pass was applied:
- animated themed background
- stronger contrast between controls and panels
- glass / liquid-blue button treatment
- stronger active-state glow
- decorative background character removed from behind the tab pages
- Live tables tab current behavior:
- heading at top of the frame
- immediate table selection flow
- seat-count selector (`4`, `6`, `9`)
- buy-in selector (`1000`, `5000`, `15000`, `20000`)
- blinds computed/displayed from table min bet
- available table list with live participant counts
- inline `Take A Seat` action in each table row
- backend occupancy data added to support player counts in the lobby
- Relevant files:
- `src/views/dashboard/index.jsx`
- `src/views/dashboard/LobbyPreviewOverlay.jsx`
- `src/assets/scss/views/dashboard/_dashboard.scss`
- `game-backend/app/routers/game/poker/lib/controllers.js`

## 5. Daily Rewards Merge / Decommission

- The rewards experience was first redesigned as a standalone page and then moved into the authenticated lobby rewards tab.
- The standalone `/daily-rewards` route is now decommissioned as a destination and redirects back into the lobby rewards tab.
- The lobby now owns the daily rewards experience directly through an embedded reusable component.
- The rewards UI has been simplified to a calendar-style chip schedule:
- each day shows the chip amount
- upcoming days remain lit
- the current day is highlighted
- completed days dim out
- The previous flickering `Daily Bonus` header treatment was removed.
- The calendar day tiles were resized to align better with the tab-button scale.
- Relevant files:
- `src/shared/components/DailyRewardsPanel/index.jsx`
- `src/views/dailyRewards/index.jsx`
- `src/assets/scss/views/dailyRewards/_dailyRewards.scss`
- `src/views/dashboard/index.jsx`

## 6. Header / Logo / Menu Behavior

- The private header menu now auto-closes on route change, outside click, and common header actions.
- The shared header logo asset has been updated from the smaller header-specific asset to the main logo asset for a more polished look.
- Header logo sizing was changed from fixed-width behavior to height-based sizing with stronger presentation/shadow styling.
- The change applies to both private and public headers.
- Relevant files:
- `src/shared/components/Header/Private/index.jsx`
- `src/shared/components/Header/Public/index.jsx`
- `src/assets/scss/components/header/_header-private.scss`
- `src/assets/scss/components/header/_header-public.scss`

## 7. Profile Avatars

- The app’s older built-in avatar icon set was replaced with the new image-based avatar set located under `src/assets/images/player-profile/profile_images`.
- Built-in avatar loading now uses a `require.context`-based asset loader.
- Legacy built-in SVG-style avatars are normalized to the new image set.
- This affects header avatar display, lobby profile surfaces, profile selection, and in-game/profile usage paths that depend on `getAvatarImageSrc`.
- Relevant files:
- `src/shared/constants/builtInAvatars.js`
- `src/views/profile/index.jsx`
- `src/views/dashboard/index.jsx`

## 8. Mobile / Phone Networking

- Development networking was updated so frontend API/socket/game URLs resolve from the current browser hostname in development instead of assuming `localhost`.
- This was required to allow phone testing against the PC-hosted dev stack.
- Relevant files:
- `src/axios.js`
- `src/scripts/SocketManager.js`
- `src/scenes/Level.js`

## 9. New / Added Assets and Files

- New background / lobby assets:
- `src/assets/images/bg/live_tables.png`
- `src/assets/images/bg/private_table.png`
- `src/assets/images/gameplay/new_21_holdem_table.png`
- New daily rewards assets:
- `src/assets/images/daily-rewards/D_1.png`
- `src/assets/images/daily-rewards/D_2.png`
- New avatar asset directory:
- `src/assets/images/player-profile/profile_images/`
- New reusable component:
- `src/shared/components/DailyRewardsPanel/index.jsx`
- New guest session helper:
- `src/views/guest/session.js`
- Additional guest quick-login screen present in the working tree:
- `src/views/guest/quickLogin.jsx`

## 10. Working Tree Inventory At Audit Time

- Modified tracked files:
- `game-backend/app/routers/game/poker/lib/controllers.js`
- `src/assets/scss/components/header/_header-private.scss`
- `src/assets/scss/components/header/_header-public.scss`
- `src/assets/scss/views/auth/_login.scss`
- `src/assets/scss/views/dailyRewards/_dailyRewards.scss`
- `src/assets/scss/views/dashboard/_dashboard.scss`
- `src/assets/scss/views/guest/_guest.scss`
- `src/axios.js`
- `src/scenes/Level.js`
- `src/scripts/SocketManager.js`
- `src/shared/components/Header/Private/index.jsx`
- `src/shared/components/Header/Public/index.jsx`
- `src/shared/constants/builtInAvatars.js`
- `src/views/auth/register/index.jsx`
- `src/views/dailyRewards/index.jsx`
- `src/views/dashboard/LobbyPreviewOverlay.jsx`
- `src/views/dashboard/index.jsx`
- `src/views/guest/game.jsx`
- `src/views/guest/index.jsx`
- `src/views/guest/tutorial/index.jsx`
- `src/views/profile/index.jsx`
- Untracked additions:
- `src/assets/images/bg/live_tables.png`
- `src/assets/images/bg/private_table.png`
- `src/assets/images/daily-rewards/D_1.png`
- `src/assets/images/daily-rewards/D_2.png`
- `src/assets/images/gameplay/new_21_holdem_table.png`
- `src/assets/images/player-profile/profile_images/`
- `src/shared/components/DailyRewardsPanel/`
- `src/views/guest/quickLogin.jsx`
- `src/views/guest/session.js`

## 11. Known Open Items / Notes

- `src/views/guest/quickLogin.jsx` exists in the working tree but is not currently route-wired in `src/routes/Router.jsx`.
- The lobby and rewards work has been iterated heavily. This document records the current working-tree state, not every intermediate visual permutation.
- The repo still contains pre-existing warnings that were not cleaned up as part of this pass.

## 12. Backup Artifacts Created

- Primary backup root: `docs/backups/20260331/`
- Metadata / restore references:
- `docs/backups/20260331/meta/branch.txt`
- `docs/backups/20260331/meta/status.txt`
- `docs/backups/20260331/meta/diff-stat.txt`
- `docs/backups/20260331/meta/recent-commits.txt`
- `docs/backups/20260331/meta/worktree.patch`
- File snapshot of the current changed working tree:
- `docs/backups/20260331/ws/`
- Snapshot verification at audit time:
- metadata files present
- `worktree.patch` present
- workspace snapshot contains copied changed/untracked files and directories
