# 21 Hold'em Developer Pack

Last inspected: 2026-03-22

Workspace root:

- `D:\BIGSLICKGAMES\games\21-holdem`

This document is the practical handoff for a new developer. It covers:

- what is in this workspace
- which repo owns which behavior
- exact local env values currently present
- what credentials/secrets actually exist here and what does not
- how to run the player stack
- how to wire new frontend work into the backend
- how the admin stack fits in
- where logs, mail previews, and local runtime data are written
- known gaps, contract drift, and red flags

This is not a generic setup guide. It is based on the code currently in this workspace.

## 1. Workspace Map

There are four codebases in this tree:

| Repo | Path | Purpose |
| --- | --- | --- |
| Player frontend | `D:\BIGSLICKGAMES\games\21-holdem` | React app for login, lobby, profile, guest flow, gameplay shell, Phaser runtime |
| Game backend | `D:\BIGSLICKGAMES\games\21-holdem\game-backend` | Express API and Socket.IO backend for auth, boards, gameplay, transactions, rewards |
| Admin frontend | `D:\BIGSLICKGAMES\games\21-holdem\Admin-Frontend` | React admin panel for users, table prototypes, settings, logs, transactions |
| Admin backend | `D:\BIGSLICKGAMES\games\21-holdem\Admin-Backend` | Express admin API mounted under `/api/v1/admin` |

## 2. Current Local Topology

The player stack is currently the only stack proven working in this workspace.

| Service | Current local port | Status | Notes |
| --- | --- | --- | --- |
| Player frontend | `3001` | Working | `PORT=3001` in root `.env` |
| Game backend | `4000` | Working | `PORT=4000` in `game-backend/.env` |
| Local Mongo for game backend | `27018` | Working | started by `mongodb-memory-server-core` when game backend boots |
| Redis | `6379` | Optional locally | game backend falls back to in-memory Redis if unavailable |
| Admin backend | inferred `3051` | Not validated in this pass | `Dockerfile` and `docker-compose.yml` expose `3051`, but there is no `.env` file and no `start` script |
| Admin frontend | not configured | Not validated in this pass | no `.env` file present |

Current player topology:

```text
Browser http://localhost:3001
  -> REST calls to http://localhost:4000/api/v1/*
  -> Socket.IO to http://localhost:4000
  -> Game backend data in Mongo at mongodb://127.0.0.1:27018/holdem
  -> Redis features use in-memory fallback when Redis is down
```

Recommended admin topology:

```text
Browser http://localhost:3002
  -> REST calls to http://localhost:3051/api/v1/admin/*
  -> Admin backend points at the same Mongo database as the game backend
```

## 3. Node Versions and Scripts

### Player frontend

- Path: `D:\BIGSLICKGAMES\games\21-holdem`
- Node version from `.nvmrc`: `v22.12.0`
- Scripts from `package.json`:
  - `npm start`
  - `npm run build`
  - `npm test`
  - `npm run lint`
  - `npm run lint:fix`

### Game backend

- Path: `D:\BIGSLICKGAMES\games\21-holdem\game-backend`
- Node version from `.nvmrc`: `v20.18.0`
- Scripts from `package.json`:
  - `npm start`
  - `npm run dev`
  - `npm run lint`
  - `npm run lint:fix`
- `npm start` and `npm run dev` both run `node index.js`

### Admin frontend

- Path: `D:\BIGSLICKGAMES\games\21-holdem\Admin-Frontend`
- Node version from `.nvmrc`: `v22.2.0`
- Scripts from `package.json`:
  - `npm start`
  - `npm run build`
  - `npm test`

### Admin backend

- Path: `D:\BIGSLICKGAMES\games\21-holdem\Admin-Backend`
- Node version from `.nvmrc`: `v20.18.0`
- Scripts from `package.json`:
  - `npm run lint`
  - `npm run lint:fix`
- Important: there is no `start` or `dev` script in `package.json`
- To run it as-is, use `node index.js`

## 4. Exact Environment Values Present Right Now

### Player frontend `.env`

File:

- `D:\BIGSLICKGAMES\games\21-holdem\.env`

Current values:

```dotenv
REACT_APP_API_ENDPOINT=http://localhost:4000
REACT_APP_ENVIRONMENT=0
PORT=3001
```

Meaning:

- `REACT_APP_API_ENDPOINT` is the API base for both Axios and Socket.IO
- `PORT=3001` keeps the player frontend off `3000`

### Game backend `.env`

File:

- `D:\BIGSLICKGAMES\games\21-holdem\game-backend\.env`

Current values:

```dotenv
DB_URL=mongodb://127.0.0.1:27018/holdem
NODE_ENV=development
PORT=4000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
JWT_SECRET=local-dev-secret
HASH_KEY=local-hash-key
BASE_API_PATH=http://localhost:4000/api/v1
FRONTEND_URL=http://localhost:3001
S3_BUCKET=local-assets
LOCAL_DEV_MONGO=memory
LOCAL_DEV_MONGO_PORT=27018
SMTP_SERVICE=gmail
SMTP_EMAIL=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
```

Meaning:

- `JWT_SECRET` and `HASH_KEY` are local dev placeholders, not production secrets
- `LOCAL_DEV_MONGO=memory` forces the backend to start its own Mongo server
- blank `SMTP_*` values mean no real email account is configured
- blank Redis username/password means local unauthenticated Redis only

### Credentials and passkeys actually present in the workspace

Present:

- Player frontend API base: `http://localhost:4000`
- Player frontend port: `3001`
- Game backend JWT secret: `local-dev-secret`
- Game backend hash key: `local-hash-key`
- Game backend Mongo URI: `mongodb://127.0.0.1:27018/holdem`

Not present in the workspace:

- real SMTP username/password
- real AWS credentials
- real Square credentials
- real Google auth credentials
- real Razorpay credentials
- real MSG91 credentials
- any checked-in admin `.env`
- any checked-in admin frontend `.env`
- any seeded admin username/password

Important:

- do not assume hidden production secrets exist anywhere in this tree
- this workspace currently contains local placeholders and blank values, not deployable credentials

## 5. Inferred Admin Environment Setup

The admin repos do not contain `.env` or `.env.example` files. The values below are inferred from code and are the minimum sensible local baseline.

### Recommended admin frontend `.env.local`

Create in:

- `D:\BIGSLICKGAMES\games\21-holdem\Admin-Frontend\.env.local`

Suggested content:

```dotenv
REACT_APP_API_ENDPOINT=http://localhost:3051/api/v1/admin
PORT=3002
```

Why:

- admin frontend query files call paths like `/auth/login` and `/user/list`
- admin backend is mounted at `/api/v1/admin`
- therefore the admin frontend base URL must include `/api/v1/admin`

### Recommended admin backend `.env`

Create in:

- `D:\BIGSLICKGAMES\games\21-holdem\Admin-Backend\.env`

Suggested local baseline:

```dotenv
NODE_ENV=development
PORT=3051
DB_URL=mongodb://127.0.0.1:27018/holdem
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
JWT_SECRET=local-dev-secret
FRONTEND_URL=http://localhost:3002
SMTP_EMAIL=
SMTP_PASS=
S3_BUCKET=local-assets
AVATAR_DEFAULT=
```

Notes:

- `DB_URL` can point at the same local Mongo that the player backend starts on `27018`
- if the player backend is not running, that Mongo will not exist
- unlike the game backend, the admin backend does not have a memory-Mongo fallback
- admin backend Redis init logs errors when Redis is missing but does not hard-fail startup

## 6. How to Run the Player Stack

### Fastest proven working path

Open one terminal for the game backend:

```powershell
cd D:\BIGSLICKGAMES\games\21-holdem\game-backend
npm install
npm start
```

Open another terminal for the player frontend:

```powershell
cd D:\BIGSLICKGAMES\games\21-holdem
npm install
npm start
```

Open:

- `http://localhost:3001`

### Windows npm temp/cache fallback

This workspace previously needed a local temp/cache override to get CRA running cleanly on Windows when system temp paths were failing. If `npm start` behaves badly, run:

```powershell
cd D:\BIGSLICKGAMES\games\21-holdem
$env:TEMP="D:\BIGSLICKGAMES\games\21-holdem\.tmp"
$env:TMP="D:\BIGSLICKGAMES\games\21-holdem\.tmp"
$env:npm_config_cache="D:\BIGSLICKGAMES\games\21-holdem\.npm-cache"
npm start
```

### Health checks

Backend health:

```powershell
Invoke-WebRequest http://localhost:4000/ping
```

Expected:

- HTTP `200`
- body `{}` or equivalent JSON object

Frontend check:

```powershell
Invoke-WebRequest http://localhost:3001 -Headers @{ Accept = 'text/html' }
```

Expected:

- HTTP `200`

### Gameplay smoke test

Minimum smoke test order:

1. Open `http://localhost:3001`
2. Use Guest Mode
3. Confirm guest login succeeds
4. Confirm a board is created/joined
5. Confirm gameplay scene loads

Useful direct API checks:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/v1/auth/guestLogin -ContentType "application/json" -Body '{"sDeviceId":"guest-dev-pack-check"}'
```

## 7. How to Run the Admin Stack

This stack is not yet as turnkey as the player stack.

### Admin backend

```powershell
cd D:\BIGSLICKGAMES\games\21-holdem\Admin-Backend
npm install
node index.js
```

Expected backend base:

- `http://localhost:3051/api/v1/admin`

Health check:

```powershell
Invoke-WebRequest http://localhost:3051/ping
```

### Admin frontend

```powershell
cd D:\BIGSLICKGAMES\games\21-holdem\Admin-Frontend
npm install
npm start
```

Recommended local URL:

- `http://localhost:3002`

### Admin bootstrap

No seeded admin account was found. The intended bootstrap path is the admin backend register endpoint:

- `POST /api/v1/admin/auth/register`

Required fields from code:

- `sEmail`
- `sPassword`
- `sUserName`
- `sMobile`

Example:

```powershell
$body = @{
  sEmail    = "admin@example.com"
  sPassword = "Admin123!"
  sUserName = "admin"
  sMobile   = "0400000000"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3051/api/v1/admin/auth/register `
  -ContentType "application/json" `
  -Body $body
```

Then log in via:

- `POST /api/v1/admin/auth/login`

Password rule from admin backend helper:

- 8 to 15 chars
- at least 1 uppercase
- at least 1 lowercase
- at least 1 number
- at least 1 special character

## 8. Player Stack Behavior and Local Fallbacks

### Mongo

The game backend file:

- `game-backend/app/utils/lib/mongodb.js`

does this in local development:

- starts `mongodb-memory-server-core`
- binds it to `127.0.0.1:27018`
- stores runtime files under `D:\BIGSLICKGAMES\games\21-holdem\.codex-runtime\mongo`
- seeds default `setting` and `board_prototypes` if missing

Seed file:

- `game-backend/app/utils/lib/local-dev-seed.js`

Default seeded data includes:

- daily rewards
- default avatars
- three shop packages
- three table prototypes

### Redis

The game backend file:

- `game-backend/app/utils/lib/redis.js`

tries real Redis first, then falls back to:

- `game-backend/app/utils/lib/in-memory-redis.js`

Local consequences:

- single-process development works
- queue, expiry, JSON operations, and sorted sets are emulated
- this is not a real multi-instance Redis deployment

### Email verification

The game backend file:

- `game-backend/app/utils/lib/nodemailer.js`

uses this behavior:

- if `SMTP_EMAIL` and `SMTP_PASS` exist, send real mail
- otherwise, in non-prod, write preview mail files into `game-backend/.codex-mailbox`

Preview artifacts:

- HTML email files
- JSON metadata files
- verification link in the JSON payload

Frontend behavior:

- player register page auto-follows `oDevMailPreview.sLink` when returned
- player login page also auto-follows preview verification links for unverified users

### Square payments

The game backend file:

- `game-backend/app/utils/lib/square.js`

falls back locally if the Square SDK is missing or not configured.

Meaning:

- local gameplay does not require Square to be healthy
- real payment flows are not configured in this workspace

## 9. How the Player Frontend Hooks Into the Backend

### REST wiring pattern

Player frontend network entry points:

- `src/axios.js`
- `src/query/*.js`
- `src/scripts/Services.js`

Pattern:

1. create or update a query wrapper in `src/query`
2. call it from a route component in `src/views`
3. if gameplay runtime needs it, call from `src/scripts/Services.js` or Phaser scene code
4. add the backend route in `game-backend/app/routers/game/...`
5. implement the backend controller and update any schema projections

Example player frontend query files:

- `src/query/login.query.js`
- `src/query/gameTable.query.js`
- `src/query/guest.query.js`
- `src/query/profile.query.js`
- `src/query/shop.query.js`

### Socket wiring pattern

Player gameplay socket entry points:

- `src/scripts/SocketManager.js`
- `game-backend/app/sockets/root/socket.js`
- `game-backend/app/sockets/root/player.js`
- `game-backend/app/sockets/root/listener.js`

Pattern:

1. add or update a client emit in `SocketManager`
2. add the server-side socket event listener
3. update the board/participant logic under `app/game/boardManager`
4. add a matching client handler in `SocketManager.onReceive`
5. update Phaser scene methods in `src/scenes/Level.js`

Golden rule:

- do not change socket event names on one side only

### Auth transport

Player auth storage and transport:

- cookie name: `sAuthToken`
- Axios adds `Authorization`
- Socket.IO passes token via handshake query/auth/header

Important:

- token is JS-readable, not `httpOnly`
- registered users must be email verified before authenticated routes work
- guest users are created by `POST /api/v1/auth/guestLogin`

## 10. Repo Ownership: Where To Change What

### Player frontend

Main directories:

| Path | Responsibility |
| --- | --- |
| `src/routes` | route groups and auth gating |
| `src/views` | route-level screens |
| `src/query` | REST wrappers |
| `src/scripts` | gameplay helpers, socket client, direct services |
| `src/scenes` | Phaser scenes |
| `src/prefabs` | Phaser UI building blocks |
| `src/layouts` | shell layouts |
| `public/fx-overlay` | browser-global overlay FX system |
| `docs` | local project docs |

Edit here when:

- changing page UI
- adding a form or React route
- changing player-side REST calls
- changing gameplay rendering or Phaser interactions

### Game backend

Main directories:

| Path | Responsibility |
| --- | --- |
| `app/routers/game` | REST route groups under `/api/v1` |
| `app/routers/middleware` | auth and rate limit middleware |
| `app/sockets` | Socket.IO setup and listeners |
| `app/game/boardManager` | live table orchestration and turn scheduling |
| `app/models` | Mongo schemas |
| `app/utils/lib` | Mongo, Redis, mail, payments, queue, fake users, helpers |
| `app/cache` | settings cache helpers |
| `globals` | message/log/helper globals |

Edit here when:

- adding API routes
- changing auth or verification logic
- changing gameplay rules or board lifecycle
- changing Mongo schemas or shared projections
- changing local dev fallbacks

### Admin frontend

Main directories:

| Path | Responsibility |
| --- | --- |
| `src/routes` | admin route groups |
| `src/views` | dashboard, users, prototypes, settings, finance, logs |
| `src/query` | admin API wrappers |
| `src/shared/components/Sidebar` | admin nav structure |
| `src/axios.js` | admin API baseURL and auth header injection |

Edit here when:

- changing admin screens
- changing table management flows
- changing settings UI
- changing admin API wrappers

### Admin backend

Main directories:

| Path | Responsibility |
| --- | --- |
| `app/routers/admin` | admin API route groups |
| `app/models` | admin-side views of shared Mongo collections |
| `app/utils` | Redis, Mongo, mail, AWS, helpers |
| `globals` | shared admin helpers/messages/logging |

Edit here when:

- adding admin-only endpoints
- changing admin auth
- changing user/table/settings operations from the admin panel

## 11. Important Route Inventory

### Player frontend routes

Public:

- `/login`
- `/register`
- `/about-us`
- `/contact`

Guest:

- `/guest`
- `/guest/game`
- `/guest/tutorial`
- `/guest/tutorial/game`

Private or mixed-access:

- `/lobby`
- `/private-table`
- `/profile`
- `/transactions`
- `/game`
- `/how-to-play`
- `/game-rule`
- `/privacy-policy`
- `/terms-conditions`
- `/daily-rewards`
- `/shop`

### Game backend route groups

Base:

- `http://localhost:4000/api/v1`

Groups:

- `/auth`
- `/profile`
- `/poker`
- `/daily_rewards`
- `/shop`
- `/transaction`
- `/analytics`

Notable player auth routes:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/email/verify/:token`
- `POST /auth/forgot-password`
- `POST /auth/reset-password/:token`
- `POST /auth/verify-forgotpassword-maillink/:token`
- `POST /auth/guestLogin`

Notable gameplay routes:

- `GET /poker/board/list`
- `POST /poker/board/join`
- `POST /poker/private/create`
- `POST /poker/private/join`
- `GET /poker/board/leave`
- `POST /poker/guest/board/join`
- `POST /poker/guest/board/pause`
- `POST /poker/guest/board/resume`
- `POST /poker/guest/tutorial/board/join`

### Admin backend route groups

Base:

- `http://localhost:3051/api/v1/admin`

Groups:

- `/auth`
- `/profile`
- `/dashboard`
- `/user`
- `/table-prototype`
- `/transaction`
- `/game-logs`
- `/setting`

## 12. Shared Data Model

These collections are the core shared contract between player backend and admin backend.

| Collection | Model file | Purpose |
| --- | --- | --- |
| `users` | `game-backend/app/models/lib/User.js` | players, guests, admins, bots |
| `board_prototypes` | `game-backend/app/models/lib/BoardProtoType.js` | table templates used by lobby and admin table management |
| `setting` | `game-backend/app/models/lib/Setting.js` | rake, daily rewards, avatars, shop inventory |
| `poker_boards` | `game-backend/app/models/lib/PokerBoard.js` | live/private board records |
| `pokerfinishgame` | `game-backend/app/models/lib/PokerFinishGame.js` | finished board history and game logs |
| `transaction` | `game-backend/app/models/lib/Transaction.js` | chips, admin/manual/game/IAP records |
| `analytics` | `game-backend/app/models/lib/Analytics.js` | in-app and in-game time |
| `KYC` | `game-backend/app/models/lib/KYC.js` | user verification docs and statuses |

Important shared facts:

- admin accounts live in the same `users` collection as players
- admin auth uses `eUserType: 'admin'`
- guest accounts use `eUserType: 'guest'`
- the admin backend edits the same `setting` and `board_prototypes` collections used by the player app

## 13. Logs, Mail, and Runtime Artifacts

### Player/frontend logs in workspace root

- `.codex-frontend-3001.log`
- `.codex-frontend-3001.err.log`
- `.codex-backend-4000.log`
- `.codex-backend-4000.err.log`

### Local runtime data

- `.codex-runtime\mongo\binaries`
- `.codex-runtime\mongo\data`

### Mail previews

- `game-backend\.codex-mailbox`

What appears there:

- verification HTML/JSON previews
- forgot password previews

### Temporary npm/cache folders

- `.tmp`
- `.npm-cache`

## 14. Local Verification and Auth Notes

### Player registration

Flow:

1. user submits `/register`
2. backend creates unverified `users` record
3. backend sends mail or creates preview mail
4. frontend auto-opens preview verification link in local dev
5. backend redirects to `http://localhost:3001/login?verificationStatus=...`

### Guest mode

Flow:

1. frontend creates/reads `guest-device-id` in `localStorage`
2. frontend calls `POST /api/v1/auth/guestLogin`
3. backend creates or reuses `eUserType: 'guest'` user
4. frontend calls guest board join
5. frontend navigates into Phaser gameplay

### Admin-created users

Admin backend behavior in `app/routers/admin/users/lib/controllers.js`:

- creates normal users directly
- marks them `isEmailVerified = true`
- can optionally seed chips
- tries to email plaintext credentials if mail is configured

That means:

- admin-created users bypass the normal public email verification flow
- if SMTP is blank, credential mail may not actually go anywhere

## 15. How To Add or Change Features Safely

### New player REST feature

Use this order:

1. Add backend route under `game-backend/app/routers/game/<feature>/index.js`
2. Implement controller under `.../lib/controllers.js`
3. Update model/projection if payload changes
4. Add frontend wrapper under `src/query`
5. Call it from `src/views` or `src/scripts/Services.js`
6. Verify both guest and authenticated behavior if relevant

### New gameplay socket feature

Use this order:

1. Add socket listener/server event
2. Add board-manager behavior
3. Add client emit/receive handling in `src/scripts/SocketManager.js`
4. Add UI handling in `src/scenes/Level.js`
5. Verify reconnect, leave, and end-of-hand behavior

### New admin feature

Use this order:

1. Add admin backend route under `Admin-Backend/app/routers/admin`
2. Add admin frontend query wrapper under `Admin-Frontend/src/query`
3. Add or wire the admin screen in `Admin-Frontend/src/views`
4. Update sidebar/routes if it is a new screen
5. Verify it operates on the same shared Mongo documents expected by the player stack

### Schema changes

Whenever you change these, update both player and admin assumptions:

- `users`
- `board_prototypes`
- `setting`
- `transaction`
- `pokerfinishgame`

## 16. Current Mismatches, Risks, and Red Flags

These are the biggest things a new dev should know immediately.

### Player frontend and backend drift

Current player frontend still calls:

- `POST /api/v1/auth/handoff/exchange`
- `GET /api/v1/shop/confirm?session_id=...`

The current game backend route tree does not expose those routes.

Consequence:

- Big Slick website handoff is not wired end-to-end in this workspace
- the shop confirm-after-redirect flow is not wired end-to-end in this workspace

### Transaction sort parameter mismatch

Player frontend sends lower-case `order` or `orderBy` values such as `asc` / `desc`.

Several backend controllers compare against upper-case `DESC`.

Consequence:

- sort behavior can drift or silently behave differently than expected

### Admin frontend base URL is not actually configured

File:

- `Admin-Frontend/src/axios.js`

Facts:

- repo has no admin `.env`
- `baseURL` depends on `process.env.REACT_APP_API_ENDPOINT`
- if that env is missing, requests do not point at the admin backend correctly

### Admin frontend has dead or stale query wrappers

Examples:

- `getAdminById()` calls `/admin/view/:id`
- `updateAdminById()` calls `/admin/edit/:id`

Current admin backend route tree exposes:

- `/user/view/:iUserId`
- `/user/edit/:iUserId`

Also, admin frontend query files expect deposit/withdraw routes that are not present in the current admin backend transaction router.

Consequence:

- do not trust every admin frontend query wrapper as live and correct
- verify route existence before debugging UI state

### Admin backend package scripts are incomplete

Facts:

- `Admin-Backend/package.json` has no `start` or `dev` script
- `docker-compose.yml` still says `command: npm start`

Consequence:

- `docker-compose` will not work without fixing package scripts or changing the command

### Admin backend `index.js` contains an obfuscated appended payload

File:

- `Admin-Backend/index.js`

Observation:

- after the normal startup code, the file contains a large obfuscated block

Treat this as a serious red flag.

Recommendation:

- do not deploy or broadly trust the admin backend unchanged
- review, remove, or replace that payload before using the admin stack outside isolated local development

### Admin backend depends on shared DB but has no local DB bootstrap

Facts:

- admin backend uses `process.env.DB_URL`
- it does not create its own Mongo instance
- easiest local DB source is the game backend's memory Mongo on `27018`

Consequence:

- if the player backend is down and no external Mongo is running, the admin backend has no database

## 17. First-Day Checklist For A New Developer

1. Read this file.
2. Read `docs/ENGINEERING_SPEC.md` for the frontend architecture narrative.
3. Run the game backend and confirm `http://localhost:4000/ping`.
4. Run the player frontend and confirm `http://localhost:3001`.
5. Test Guest Mode.
6. Register a local test user and verify the preview-mail flow in `game-backend/.codex-mailbox`.
7. Inspect `game-backend/app/routers/game` before changing API contracts.
8. Inspect `src/scripts/SocketManager.js` before touching gameplay events.
9. If you need the admin stack, create admin env files first.
10. Audit `Admin-Backend/index.js` before trusting that repo.

## 18. What Not To Commit

Do not commit these as real environment decisions:

- local `.env` secrets
- `.codex-runtime`
- `.tmp`
- `.npm-cache`
- `.codex-mailbox`
- `.codex-*.log`

Also avoid committing:

- ad hoc port changes without updating docs
- fake local credentials as if they were production values

## 19. Short Practical Summary

If you only remember five things:

1. The player stack is the working stack: frontend `3001`, backend `4000`, local Mongo `27018`.
2. The game backend already has local fallbacks for Mongo, Redis, mail, and Square.
3. The admin stack is incomplete out of the box and needs env files plus startup cleanup.
4. Admin and player backends share the same Mongo collections, especially `users`, `setting`, and `board_prototypes`.
5. There are no real production credentials in this workspace right now, only local placeholders and blank secret fields.
