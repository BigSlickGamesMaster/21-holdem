# 21 Hold'em Frontend Engineering Spec

## 1. Scope

This document describes the current `21-holdem` frontend as implemented in:

- `D:\BIGSLICKGAMES\games\21-holdem`

It also cross-references the shared backend currently expected by the frontend:

- `D:\BIGSLICKGAMES\shared\hub-backend`

This is an implementation-backed spec, not a product pitch. It is intended for engineers who need to understand:

- what the frontend does
- how it boots and routes
- how authentication works
- how it integrates with backend REST and Socket.IO
- what data it expects
- where the current frontend/backend contracts drift

Date of inspection: `2026-03-17`

---

## 2. System Summary

`21 Hold'em` is a React + Phaser web client for a blackjack/poker-hybrid table game. The frontend has two major layers:

1. A standard React shell for auth, lobby, profile, transactions, daily rewards, shop, CMS pages, and route/layout orchestration.
2. A Phaser gameplay runtime for the live table, including cards, seats, action buttons, timers, audio, and FX overlays.

The backend dependency model is:

- REST API under `REACT_APP_API_ENDPOINT + /api/v1`
- Socket.IO connection to `REACT_APP_API_ENDPOINT`
- MongoDB + Redis required by the backend

The main backend responsibilities are:

- user auth and profile
- guest identity creation
- board creation and join/leave lifecycle
- authoritative gameplay state
- turn sequencing and outcome resolution
- daily rewards, transactions, analytics, shop settings

The frontend is not authoritative for game rules. The server owns:

- board state
- turn validity
- join limits
- outcomes
- chip movements

The frontend is responsible for:

- rendering UI
- collecting user actions
- invoking REST endpoints
- joining the correct socket room
- translating socket payloads into table visuals

---

## 3. Technology Stack

### Frontend

- React 18
- Create React App (`react-scripts`)
- React Router 6
- React Query 3
- React Hook Form
- Phaser 3
- Socket.IO client
- Bootstrap / React Bootstrap
- Sass
- Axios

### Backend expected by the frontend

- Node.js / Express
- Socket.IO
- MongoDB
- Redis

### Other integrations

- Stripe publishable key is hardcoded in the shop UI
- FX overlay scripts are loaded from `public/fx-overlay/*`

---

## 4. Repository Layout

| Path | Responsibility |
| --- | --- |
| `src/index.js` | React root bootstrap, global CSS, `ToastContainer`, `NetworkStatus` |
| `src/App.js` | React Query provider, gameplay context provider, lazy route mounting |
| `src/routes/*` | Route tree and auth/guest/private guards |
| `src/views/*` | Route-level pages |
| `src/query/*` | REST endpoint wrappers using shared Axios instance |
| `src/axios.js` | Shared API base URL logic, auth header injection, error interceptors |
| `src/views/game/index.jsx` | React wrapper that mounts Phaser game |
| `src/scenes/Preload.js` | Phaser asset preloader |
| `src/scenes/Level.js` | Main gameplay scene |
| `src/scripts/SocketManager.js` | Socket.IO transport and game event dispatch |
| `src/scripts/Services.js` | Direct REST calls used inside Phaser runtime |
| `src/scripts/GameManager.js` | Client-side gameplay UI timings/layout/config |
| `src/prefabs/*` | Phaser UI building blocks |
| `public/fx-overlay/*` | Non-React visual/audio overlay system exposed as `window.FXOverlay` |
| `docs/*` | Project docs and release notes |

---

## 5. Runtime Configuration

### Frontend environment variables

Observed from `.env.example` and implementation:

| Variable | Purpose |
| --- | --- |
| `REACT_APP_API_ENDPOINT` | Base URL for REST API and Socket.IO |
| `REACT_APP_ENVIRONMENT` | Environment flag used by existing codebase |
| `PORT` | CRA dev server port when present in `.env` |

Current local expectation in docs:

- `REACT_APP_API_ENDPOINT=http://localhost:4000`
- frontend local port usually `3000`, but local overrides may use `3001`

### Backend environment variables that matter to the frontend

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend listen port, expected to be `4000` locally |
| `BASE_API_PATH` | Used in email verification links |
| `FRONTEND_URL` | Used in verification and password reset email links |
| `JWT_SECRET` | Required for token issuance/validation |
| `DB_URL` | MongoDB connection |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |

---

## 6. Frontend Boot Sequence

### 6.1 React boot

`src/index.js` mounts:

- `NetworkStatus`
- `App`
- `ToastContainer`

`App` sets up:

- `QueryClientProvider`
- `GamePlayProvider`
- lazy route loading

### 6.2 API client boot

`src/axios.js`:

- creates a shared Axios instance
- resolves `baseURL` from `REACT_APP_API_ENDPOINT`
- injects `Authorization` from cookie `sAuthToken` when not already present
- on network error:
  - shows a toast
  - removes auth cookie
  - redirects to `/login`
- on `401`:
  - removes auth cookie
  - redirects to `/login`

### 6.3 Route boot

`src/routes/index.jsx` mounts `BrowserRouter` and route groups from `src/routes/Router.jsx`.

High-level route groups:

- `PublicRoute`
- `GuestRoute`
- `PrivateRoute`

### 6.4 Gameplay boot

When the user navigates to `/game` or guest tutorial/game routes:

1. `src/views/game/index.jsx` reads route state:
   - `sAuthToken`
   - `iBoardId`
   - optional `sPrivateCode`
   - optional `isGuestTutorial`
2. It creates a `Phaser.Game`
3. It starts `Boot`
4. `Boot` loads minimal splash assets
5. `Boot` starts `Preload`
6. `Preload` loads gameplay assets and then starts `Level`
7. `Level.create()`:
   - instantiates `GameManager`, `SoundManager`, `Animations`
   - opens Socket.IO via `SocketManager`
   - creates `Services` client for profile/settings sync
   - builds gameplay UI
   - fetches profile settings for sound/music
   - registers browser visibility and back-navigation exit handlers

Important constraint:

- `/game` cannot be deep-linked safely without route state. If `sAuthToken` or `iBoardId` is missing, the component redirects to a fallback route.

---

## 7. Routing and Layout Model

### Public routes

Rendered inside `AuthLayout`.

| Path | Purpose |
| --- | --- |
| `/login` | Login, forgot password, reset password, guest entry, website handoff flow |
| `/register` | Account creation |
| `/about-us` | CMS/static |
| `/contact` | CMS/static |

Behavior:

- if `sAuthToken` cookie exists, `PublicRoute` redirects to `/lobby`

### Guest routes

Rendered inside `CommonLayout`, except gameplay screens.

| Path | Purpose |
| --- | --- |
| `/guest` | Guest landing that auto-creates or rejoins a guest board |
| `/guest/game` | Guest gameplay route |
| `/guest/tutorial` | Guided tutorial landing |
| `/guest/tutorial/game` | Tutorial gameplay route |

Behavior:

- `/guest/game` and `/guest/tutorial/game` bypass `CommonLayout`

### Private routes

Rendered inside `MainLayout`, except a few public informational pages.

| Path | Purpose |
| --- | --- |
| `/lobby` | Live table lobby |
| `/private-table` | Private table create/join |
| `/profile` | Profile and avatar selection |
| `/transactions` | Transaction history |
| `/game` | Authenticated live gameplay |
| `/how-to-play` | Gameplay info |
| `/game-rule` | Rules page |
| `/privacy-policy` | CMS/static |
| `/terms-conditions` | CMS/static |
| `/daily-rewards` | Daily reward streak UI |
| `/shop` | Chips purchase UI |

Behavior:

- missing token redirects to `/login`
- `PrivateRoute` allows unauthenticated access to a small list of public informational routes
- `MainLayout` hides the private header/footer when pathname is `/game`

---

## 8. Client State Model

### 8.1 Persistent browser state

| Key | Storage | Purpose |
| --- | --- | --- |
| `sAuthToken` | browser cookie | primary auth token for authenticated users |
| `guest-device-id` | `localStorage` | stable guest identity seed |

### 8.2 React Query state

Used for:

- profile
- table list
- transactions
- daily rewards
- shop list
- toast message bus

The app does not use Redux or Zustand.

### 8.3 Gameplay state

Gameplay state is mostly held inside Phaser runtime objects:

- `Level`
- `SocketManager`
- `GameManager`
- prefabs such as `PlayerProfile`

Server state is continuously merged into the scene through socket events.

### 8.4 Global context

`GamePlayContext` exists but is lightly used. `MainLayout` currently keeps its own local `isGamePlay` state rather than relying on the shared context.

---

## 9. Authentication Model

### 9.1 Token storage and transport

The frontend stores the auth token in a regular browser cookie:

- cookie name: `sAuthToken`

The token is then sent to the backend in one of two ways:

1. Shared Axios interceptor adds `Authorization` automatically for normal REST queries.
2. Some direct callers manually pass `authorization` or `Authorization` headers.

Socket authentication is done via Socket.IO connection query:

- `query.authorization = sAuthToken`

### 9.2 Registered-user auth flow

#### Register

Frontend:

- `POST /api/v1/auth/register`
- payload:
  - `sEmail`
  - `sPassword`
  - `sUserName`

Backend behavior:

- creates user
- sends email verification link
- does not auto-log in the user

#### Login

Frontend:

- `POST /api/v1/auth/login`
- payload:
  - `sEmail` (email or username)
  - `sPassword`

Backend behavior:

- verifies credentials
- blocks login if email is not verified
- returns token in both:
  - response body data
  - `authorization` response header

Frontend behavior:

- stores token in `sAuthToken` cookie for 14 days
- navigates to `/lobby`

#### Email verification

Backend generates verification links based on:

- `BASE_API_PATH`
- `FRONTEND_URL`

Normal authenticated API middleware also requires:

- valid token
- non-deleted / non-blocked user
- `isEmailVerified === true`

### 9.3 Forgot password flow

Frontend endpoints:

- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/verify-forgotpassword-maillink/:token`
- `POST /api/v1/auth/reset-password/:token`

Flow:

1. user submits email
2. backend emails a link to frontend `/login?forgotPasswordToken=...`
3. frontend verifies token
4. frontend submits new password

### 9.4 Guest auth flow

Frontend:

- `POST /api/v1/auth/guestLogin`

Payload:

- `sDeviceId`

Backend behavior:

- reuses an existing guest user for that device ID if present
- otherwise creates a new guest user
- returns token in body and `authorization` header

Guest auth is validated by backend `isGuestAuthenticated`, which still requires a normal token but additionally enforces:

- `eUserType === 'guest'`

### 9.5 Auth implementation notes

- Auth is client-managed, not `httpOnly`
- Token invalidation on the frontend is cookie deletion only
- Network errors force logout behavior
- Authenticated routes assume client-side cookie presence rather than server-side session

---

## 10. Page and Feature Modules

### 10.1 Login

`src/views/auth/login/index.jsx`

Capabilities:

- normal login
- forgot password
- reset password
- website handoff token exchange
- navigation to guest mode

Important note:

- frontend expects `POST /api/v1/auth/handoff/exchange`
- this route was not found in the current shared backend

### 10.2 Registration

`src/views/auth/register/index.jsx`

Capabilities:

- collect email, username, password
- client-side validation
- terms acceptance checkbox
- submit registration

### 10.3 Lobby

`src/views/dashboard/index.jsx`

Capabilities:

- fetch board prototype list
- present live lobby overlay
- join a public board

Expected table data from backend:

- `_id`
- `sName`
- `nMinBet`
- `nMinBuyIn`
- `nMaxPlayer`

The UI also has placeholders for:

- `nRapidPlay`
- `nMultiDeck`

Those fields are not currently returned by backend `listBoard`.

### 10.4 Private Table

`src/views/dashboard/privateTable.jsx`

Capabilities:

- list table prototypes
- create private board from prototype
- join private board via 8-digit code

Navigation to gameplay carries:

- `sAuthToken`
- `iBoardId`
- `sPrivateCode`

### 10.5 Profile

`src/views/profile/index.jsx`

Capabilities:

- fetch profile
- update `sUserName`
- update `sAvatar`
- show lifetime stats:
  - `nGamePlayed`
  - `nGameWon`
  - `nGameLost`

Avatar handling:

- backend returns avatar settings list
- frontend builds displayable avatar options locally

### 10.6 Transactions

`src/views/transactions/index.jsx`

Capabilities:

- paginated transaction list
- sorting
- filters by mode and status

Backend-supported modes observed in transaction controller:

- `game`
- `IAP`
- `DR`

### 10.7 Daily Rewards

`src/views/dailyRewards/index.jsx`

Capabilities:

- fetch reward ladder
- claim daily reward
- update profile chip display on success

Response shape expected:

- `rewards`
- `eligibleDay`
- `bTodayRewardClaimed`

### 10.8 Shop

`src/views/shop/index.jsx`

Capabilities intended by frontend:

- fetch chip packages
- initiate Stripe checkout
- confirm checkout after redirect

Actual backend implementation currently observed:

- `GET /api/v1/shop` returns item list
- `POST /api/v1/shop/buy` directly credits chips
- no `GET /api/v1/shop/confirm` route was found
- no Stripe session creation was found in the current shop router/controller

This is a major frontend/backend contract mismatch.

### 10.9 Guest Mode

`src/views/guest/index.jsx`

Flow:

1. get or create persistent `guest-device-id`
2. call guest login
3. call guest board join
4. navigate to `/guest/game`

### 10.10 Guided Tutorial

`src/views/guest/tutorial/index.jsx`

Frontend intent:

- create a tutorial-specific guest board
- navigate to `/guest/tutorial/game`
- show tutorial overlay guidance

However:

- the frontend calls `POST /api/v1/poker/guest/tutorial/board/join`
- that route was not found in the current backend poker router

This is another major contract mismatch.

---

## 11. REST API Inventory

The table below documents the frontend contract as implemented in the client and whether the current shared backend appears to support it.

| Feature | Method | Path | Auth | Frontend caller | Backend status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Register | `POST` | `/api/v1/auth/register` | No | `src/query/login.query.js` | Present | Sends email verification |
| Login | `POST` | `/api/v1/auth/login` | No | `src/query/login.query.js` | Present | Returns auth token |
| Forgot password | `POST` | `/api/v1/auth/forgot-password` | No | `src/query/login.query.js` | Present | Sends email link |
| Reset password | `POST` | `/api/v1/auth/reset-password/:token` | No | `src/query/login.query.js` | Present | Tokenized reset |
| Verify forgot-password link | `POST` | `/api/v1/auth/verify-forgotpassword-maillink/:token` | No | `src/query/login.query.js` | Present | Pre-validates reset token |
| Website handoff exchange | `POST` | `/api/v1/auth/handoff/exchange` | No | `src/query/login.query.js` | Not found | Frontend expects it, backend route missing |
| Guest login | `POST` | `/api/v1/auth/guestLogin` | No | `src/query/guest.query.js` | Present | Returns guest token |
| Profile get | `GET` | `/api/v1/profile` | Yes | `src/query/profile.query.js`, `src/scripts/Services.js`, header | Present | Used heavily |
| Profile update | `POST` | `/api/v1/profile/update` | Yes | `src/query/profile.query.js` | Present | Username/avatar |
| Profile settings update | `POST` | `/api/v1/profile/setting` | Yes | `src/scripts/Services.js` | Present | Sound/music toggles |
| Table list | `GET` | `/api/v1/poker/board/list` | Yes | `src/query/gameTable.query.js` | Present | Returns board prototypes |
| Join public board | `POST` | `/api/v1/poker/board/join` | Yes | `src/query/gameTable.query.js` | Present | Requires sufficient chips |
| Create private board | `POST` | `/api/v1/poker/private/create` | Yes | `src/query/gameTable.query.js` | Present | Creates private board |
| Join private board | `POST` | `/api/v1/poker/private/join` | Yes | `src/query/gameTable.query.js` | Present | Expects `sPrivateCode` |
| Leave board | `GET` | `/api/v1/poker/board/leave` | Yes | `src/query/gameTable.query.js`, header | Present | Removes active board |
| Join guest board | `POST` | `/api/v1/poker/guest/board/join` | Guest | `src/query/guest.query.js` | Present | Can seed guest bots |
| Join guest tutorial board | `POST` | `/api/v1/poker/guest/tutorial/board/join` | Guest | `src/query/guest.query.js` | Not found | Frontend route missing in backend |
| Pause guest board | `POST` | `/api/v1/poker/guest/board/pause` | Guest | `src/scripts/Services.js` | Not found | Frontend-only expectation |
| Resume guest board | `POST` | `/api/v1/poker/guest/board/resume` | Guest | `src/scripts/Services.js` | Not found | Frontend-only expectation |
| Daily rewards get | `GET` | `/api/v1/daily_rewards` | Yes | `src/query/dailyRewards.query.js` | Present | Returns reward ladder |
| Daily rewards claim | `POST` | `/api/v1/daily_rewards/claim` | Yes | `src/query/dailyRewards.query.js` | Present | Credits chips and logs transaction |
| Transactions list | `GET` | `/api/v1/transaction?...` | Yes | `src/query/transactions.query.js` | Present | Pagination and filters |
| Shop list | `GET` | `/api/v1/shop` | Yes | `src/query/shop.query.js` | Present | Returns `aShop` items |
| Shop buy | `POST` | `/api/v1/shop/buy` | Yes | `src/query/shop.query.js` | Present | Backend instantly credits chips |
| Shop confirm | `GET` | `/api/v1/shop/confirm?session_id=...` | Yes | `src/query/shop.query.js` | Not found | Frontend assumes Stripe confirmation route |
| Analytics update | `GET` | `/api/v1/analytics?nInAppTime=...` | Yes | `src/query/analytics.query.js` | Present | Not currently called by UI |

---

## 12. Socket.IO Contract

### 12.1 Connection model

Frontend `SocketManager` connects to:

- `io(REACT_APP_API_ENDPOINT, { query: { authorization: sAuthToken } })`

After connect, the frontend emits:

- `reqJoinBoard` with `{ iBoardId }`

The backend then:

- validates token from socket handshake
- locates the board
- registers per-board listener
- returns the participant game state
- emits join/update events to the room

### 12.2 Client-emitted gameplay events

From `src/scripts/emitter.js` and `src/scenes/Level.js`:

| Event | Purpose |
| --- | --- |
| `reqCall` | call current amount |
| `reqRaise` | raise with amount |
| `reqDoubleDown` | double down |
| `reqFold` | fold |
| `reqLeave` | leave board |
| `reqStand` | stand |
| `reqCheck` | check |

Also emitted outside that map:

| Event | Purpose |
| --- | --- |
| `reqJoinBoard` | join socket board room |
| `ping` | latency measurement |

Backend additionally supports:

| Event | Status |
| --- | --- |
| `reqReaction` | supported by backend listener, not used by frontend |

### 12.3 Server-emitted events handled by frontend

`SocketManager.onReceive()` handles:

| Event | Frontend effect |
| --- | --- |
| `initializeGame` | show countdown/start state |
| `resUserJoined` | add/update joined player |
| `resBoardState` | full board refresh |
| `resCollectBootAmount` | collect blinds / forced opening amounts |
| `resCommunityCard` | update community cards |
| `resClearBettingLabels` | clear seat action labels |
| `resCardHand` | deal player cards |
| `resPlayerTurn` | turn timer and allowed actions |
| `resPlayerLeft` | leave/fold UI |
| `resTurnMissed` | clear timer |
| `resFoldPlayer` | fold/leave state |
| `resDeclareResult` | result UI, winner prompts, next-round countdown |
| `resKickOut` | leave table popup |
| `resRefundOnLongWait` | waiting-state refund message |
| `resCall` | apply call result |
| `resCheck` | apply check result |
| `resRaise` | apply raise result |
| `resDoubledown` | apply double-down result |
| `resStand` | apply stand result |
| `disconnect` | force exit game |

Backend appears to support at least one extra event not handled in the frontend:

| Event | Status |
| --- | --- |
| `resReaction` | backend emits it, frontend has no handler |

---

## 13. Gameplay Runtime Architecture

### 13.1 Core objects

| Object | Role |
| --- | --- |
| `Level` | main live gameplay scene |
| `Preload` | asset loading |
| `SocketManager` | server transport |
| `Services` | profile/settings/guest auxiliary REST calls |
| `GameManager` | local constants, timings, layout, convenience state |
| `SoundManager` | local sound/music control |
| `Animations` | Phaser tween helpers |
| `PlayerProfile` | seat-level UI and card containers |
| `Prompt`, `Popup`, `Settings`, `GameInfo` | gameplay UI widgets |

### 13.2 Scene lifecycle

The core `Level` flow is:

1. initialize runtime fields
2. connect socket
3. build UI
4. fetch profile settings
5. wait for server state
6. render board/participants
7. accept player actions when the server grants turn ownership

### 13.3 Seat and board handling

The scene maintains:

- `players: Map<iUserId, participant>`
- `aPlayerProfiles`
- dealer / small blind / big blind IDs
- pot amount
- turn owner
- tutorial state

Seat arrangement is relative to the current player seat so the local player is visually anchored consistently.

### 13.4 Action gating

The server tells the client which actions are legal through `aUserAction`.

The UI translates those codes into buttons:

| Code | UI action |
| --- | --- |
| `f` | Fold |
| `c` | Call |
| `r` | Raise |
| `d` | Double Down |
| `s` | Stand |
| `a` | All In |
| `ck` | Check |

The frontend does not decide legality. It only reveals buttons based on server payload.

### 13.5 Exit behavior

The live table exits to `/lobby` when:

- socket disconnect handling forces exit
- player is kicked out
- tab visibility becomes hidden
- browser popstate/back occurs
- the scene decides the current player was removed

This is an anti-desync / anti-backgrounding behavior.

---

## 14. FX Overlay System

The project ships a separate browser-global FX system loaded from `public/index.html`:

- `screenShake.js`
- `chipBurst.js`
- `potEffects.js`
- `audioLayer.js`
- `overlayUI.js`
- `fxOverlay.js`

The Phaser scene integrates with this through `window.FXOverlay`.

Current uses include:

- pot stack amount updates
- player focus spotlight
- small bet / big bet / all-in effects
- win-pot effect
- blackjack effect
- music/sound enable flags

This is not React-managed state. It is a global imperative layer.

---

## 15. Backend Data Shapes Expected by the Frontend

These are inferred from live client usage and backend controller projections.

### 15.1 Profile

The frontend expects profile data to include at least:

- `sUserName`
- `sEmail`
- `sAvatar`
- `nChips`
- `nGamePlayed`
- `nGameWon`
- `nGameLost`
- `aPokerBoard`
- `sPrivateCode`
- `bSoundEnabled`
- `bMusicEnabled`
- `aAvatar`

### 15.2 Board prototype / lobby row

The lobby expects:

- `_id`
- `sName`
- `nMinBet`
- `nMinBuyIn`
- `nMaxPlayer`

Optional-but-not-currently-projected fields used by the UI:

- `nRapidPlay`
- `nMultiDeck`

### 15.3 Guest join response

Guest join response may contain:

- `iBoardId`
- `eState`
- `nChips`
- `sPrivateCode`
- `nTotalParticipant`
- `eBoardType`

### 15.4 Daily rewards

- `rewards: number[]`
- `eligibleDay: number`
- `bTodayRewardClaimed: boolean`

### 15.5 Transactions

Frontend expects aggregated payload containing:

- `transactions`
- `count[0].totalData`

### 15.6 Shop item

Frontend expects each shop row to contain:

- `nChips`
- `nPrice`

---

## 16. Local Stack Dependencies

To run the full intended stack locally, the project expects:

1. frontend in this repo
2. shared backend in `D:\BIGSLICKGAMES\shared\hub-backend`
3. MongoDB
4. Redis

The backend README indicates Docker is the intended local path for MongoDB + Redis.

Expected backend health check:

- `http://localhost:4000/ping`

Expected frontend API base:

- `http://localhost:4000`

---

## 17. Known Contract Drift and Engineering Risks

This section is the most important one for anyone trying to stabilize or extend this system.

### 17.1 Missing backend route: website handoff exchange

Frontend expects:

- `POST /api/v1/auth/handoff/exchange`

Current shared backend:

- route not found during inspection

Impact:

- Big Slick website handoff flow in login screen is not currently backed by the shared backend inspected here.

### 17.2 Missing backend route: guest tutorial join

Frontend expects:

- `POST /api/v1/poker/guest/tutorial/board/join`

Current shared backend:

- route not found during inspection

Impact:

- guided tutorial entry is frontend-implemented but not supported by the current backend router.

### 17.3 Missing backend routes: guest pause/resume

Frontend expects:

- `POST /api/v1/poker/guest/board/pause`
- `POST /api/v1/poker/guest/board/resume`

Current shared backend:

- routes not found during inspection

Impact:

- guest help/pause overlay sync cannot work against the current backend as written.

### 17.4 Shop flow contract drift

Frontend assumes a Stripe checkout flow:

- backend returns checkout `sessionId`
- browser redirects to Stripe Checkout
- frontend later confirms payment with `/api/v1/shop/confirm`

Current shared backend implementation:

- `POST /api/v1/shop/buy` immediately credits chips
- no `sessionId`
- no `/shop/confirm` route

Impact:

- current frontend shop behavior does not match current backend shop behavior
- the buy flow will not complete as currently implemented

### 17.5 Transaction sort contract drift

Frontend sends:

- `orderBy=asc` or `orderBy=desc`

Backend transaction controller checks:

- `body.orderBy === 'DESC'`

Impact:

- descending sort may not behave as intended because frontend uses lowercase values

### 17.6 Tutorial and reaction feature asymmetry

Observed asymmetry:

- backend supports `reqReaction` / `resReaction`
- frontend does not expose or handle reaction UI

Impact:

- latent capability exists on server side but is effectively dead from the current client

### 17.7 Auth token storage model

Current frontend stores auth token in a normal JS-readable cookie.

Impact:

- easier client-side integration
- weaker security posture than `httpOnly` cookie session designs

### 17.8 `/game` deep-link fragility

Gameplay route depends on route `state` rather than durable URL parameters or server rehydration.

Impact:

- refreshing `/game` directly can bounce the user out unless the app reconstructs state elsewhere

### 17.9 Header/profile rejoin coupling

Private header checks `profile.aPokerBoard` and can prompt rejoin automatically.

Impact:

- profile endpoint is not purely profile data; it also drives session continuation behavior

### 17.10 Analytics endpoint exists but is not wired from active UI flows

`/api/v1/analytics` exists on both sides, but the frontend helper is currently unused in live route code.

Impact:

- analytics coverage is likely incomplete from the web client

---

## 18. Practical Change Guidance

### Safe frontend change areas

- route-level UI
- lobby presentation
- profile forms
- transaction filters
- CMS pages
- Phaser asset additions
- gameplay UI positioning/timing values in `GameManager`

### High-risk change areas

- `SocketManager` event names or payloads
- `Level` server payload field assumptions
- auth token handling
- board join / leave flow
- guest-mode contracts
- shop flow until backend/frontend are reconciled

### Recommended engineering priorities

1. Reconcile REST contract drift for:
   - handoff exchange
   - guest tutorial join
   - guest pause/resume
   - shop checkout/confirm
2. Normalize transaction sort parameter casing.
3. Decide whether auth remains cookie-token based or moves to a more robust session model.
4. Decide whether `/game` should support hard refresh / deep-link recovery.
5. Either remove dormant reaction/tutorial/shop assumptions or fully implement them end-to-end.

---

## 19. Short Architecture Narrative

If a new engineer needs the one-paragraph version:

This project is a React application with a Phaser gameplay core. Users authenticate through token-based REST auth, the token is stored in a browser cookie, and most app pages use React Query over `/api/v1`. When a user joins a board, the app navigates into a Phaser scene and switches to a Socket.IO-driven runtime where the backend is authoritative for board state and turns. Profile, lobby, rewards, transactions, and shop are conventional React pages, but gameplay is event-driven and heavily coupled to server socket payloads. The biggest current engineering issue is frontend/backend contract drift around handoff auth, guided tutorial, guest pause/resume, and the Stripe-style shop flow.
