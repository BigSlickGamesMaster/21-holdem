# Admin Frontend Reference

Last inspected: 2026-03-22

Frontend path:

- `D:\BIGSLICKGAMES\games\21-holdem\Admin-Frontend`

This document is the practical map for the admin UI. It explains:

- what the admin frontend is
- how it boots
- how it authenticates
- which routes exist
- which backend endpoints each screen calls
- which files matter most
- which parts are live versus currently unused
- how to change or extend it safely

## 1. What This App Is

`Admin-Frontend` is a Create React App admin panel for the 21 Hold'em stack.

It is not the game site.

It talks only to the admin backend.

That backend is expected to expose routes under:

- `/api/v1/admin`

The admin frontend does not directly update the player frontend.

Admin actions become visible in the player app because:

- admin frontend -> admin backend -> Mongo
- player frontend -> game backend -> same Mongo

So the admin panel changes shared data, and the player app later reads that shared data.

## 2. Stack Summary

The current admin frontend uses:

- React 18
- `react-router-dom` v6
- `react-query` v3
- `react-hook-form`
- `axios`
- `react-bootstrap`
- `react-select`
- SCSS
- Create React App / `react-scripts`

Key scripts from `Admin-Frontend/package.json`:

- `npm start`
- `npm run build`
- `npm test`

There is no checked-in `.env` file in `Admin-Frontend`.

That means the API endpoint must be supplied per environment.

## 3. Required Environment

The single most important frontend env var is:

- `REACT_APP_API_ENDPOINT`

For this admin app, that value must include the admin API prefix already:

- correct example:
  - `https://admin-api.21-holdem.com/api/v1/admin`
- wrong example:
  - `https://admin-api.21-holdem.com`

Why:

- `Admin-Frontend/src/axios.js` creates a base URL once
- query files call paths like `/auth/login`, `/user/list`, `/setting`
- those query files do not prepend `/api/v1/admin` themselves

Important build-time rule:

- this is a CRA app
- `REACT_APP_*` values are compiled into the bundle at build time
- if the API domain changes, the admin frontend must be rebuilt

## 4. Boot Flow

The admin frontend starts like this:

1. `src/index.js`
   - renders the React app
   - loads `index.css`
2. `src/App.js`
   - creates the global `QueryClient`
   - centralizes error/toast handling
   - lazy-loads routes
3. `src/routes/index.jsx`
   - creates the `BrowserRouter`
   - mounts public and private route trees
4. `src/routes/Router.jsx`
   - declares the actual route table
5. `src/routes/PublicRoutes.jsx`
   - wraps login/forgot/reset pages
6. `src/routes/PrivateRoutes.jsx`
   - checks for auth token
   - mounts `layouts/main-layout`

Important file map:

| File | Role |
| --- | --- |
| `Admin-Frontend/src/App.js` | global React Query setup and error handling |
| `Admin-Frontend/src/axios.js` | axios client and auth header behavior |
| `Admin-Frontend/src/routes/index.jsx` | top-level router |
| `Admin-Frontend/src/routes/Router.jsx` | route definitions |
| `Admin-Frontend/src/routes/PublicRoutes.jsx` | unauthenticated route wrapper |
| `Admin-Frontend/src/routes/PrivateRoutes.jsx` | token gate for private pages |
| `Admin-Frontend/src/layouts/main-layout/index.jsx` | header, sidebar, breadcrumbs, content shell |
| `Admin-Frontend/src/shared/components/Sidebar/SidebarConfig.jsx` | sidebar menu structure |
| `Admin-Frontend/src/shared/constants/AllRoutes.jsx` | canonical route paths |

## 5. Auth And Session Model

The admin frontend uses a simple token model.

### Where the token lives

The app checks:

- `localStorage.getItem('token')`
- or `sessionStorage.getItem('token')`

### How the token is attached

`Admin-Frontend/src/axios.js` adds:

- `Authorization: <token>`

to outgoing requests when a token exists.

### Login flow

`views/auth/login/index.jsx`:

- submits `sEmail` and `sPassword`
- calls `query/auth/auth.query.js -> login()`
- reads the response `authorization` header
- stores it in `localStorage`
- navigates to `/dashboard`

### Logout flow

`query/auth/auth.query.js -> logout()`:

- calls `/profile/logout`

`helper/helper.js -> removeToken()`:

- clears local storage
- clears session storage

### Unauthorized behavior

Two different layers can force logout:

- `src/axios.js`
  - if response is `401`, token is cleared and user is redirected to `/login`
- `src/App.js`
  - React Query error handlers also clear token and raise toast messages

## 6. Layout And Navigation

Private pages render inside `layouts/main-layout/index.jsx`.

That layout includes:

- `Header`
- `SideBar`
- `Breadcrumbs`
- a responsive content container

Sidebar structure from `shared/components/Sidebar/SidebarConfig.jsx`:

- Dashboard
- User Management
- Game Management
  - Table Management
  - Game Logs
  - Transactions List
- Settings

## 7. Route Map

Current route constants live in:

- `Admin-Frontend/src/shared/constants/AllRoutes.jsx`

Current routed pages:

| Route | View file | Purpose |
| --- | --- | --- |
| `/login` | `views/auth/login/index.jsx` | admin sign-in |
| `/forgot-password` | `views/auth/forgot-password/index.jsx` | request reset link |
| `/reset-password/:token` | `views/auth/reset-password/index.jsx` | set new password |
| `/dashboard` | `views/dashboard/index.jsx` | high-level stats |
| `/profile` | `views/profile/index.jsx` | edit current admin profile |
| `/change-password` | `views/profile/changePassword.jsx` | change current admin password |
| `/user-management` | `views/user/index.jsx` | list/search/filter users |
| `/user-management/add` | `views/user/add/index.jsx` | create user |
| `/user-management/view/:id` | `views/user/view/index.jsx` | inspect user |
| `/user-management/edit/:id` | `views/user/edit/index.jsx` | edit user |
| `/table-management` | `views/proto/index.jsx` | list/search/filter table prototypes |
| `/table-management/add` | `views/proto/add/index.jsx` | create table prototype |
| `/table-management/:type/:id` | `views/proto/add/index.jsx` | edit or view table prototype |
| `/game-logs` | `views/gmeLogs/GameLogs.jsx` | finished-game history list |
| `/game-logs/:type/:id` | `views/gmeLogs/view/index.jsx` | single game log view |
| `/transactions` | `views/finance/FinanceManagement.jsx` | transaction list and detail modal |
| `/settings` | `views/settings/index.jsx` | rake, rewards, shop, avatar settings |

Important note:

- `route.login` in `shared/constants/AllRoutes.jsx` is currently `'/'`
- the actual login route mounted in `routes/Router.jsx` is `'/login'`

That mismatch is confusing and should be cleaned up.

## 8. Query Layer And Backend Contract

All query modules live under:

- `Admin-Frontend/src/query`

They all call the shared axios instance from:

- `Admin-Frontend/src/axios.js`

That means every endpoint below is relative to:

- `REACT_APP_API_ENDPOINT`

If production env is correct, the real base becomes:

- `https://admin-api.21-holdem.com/api/v1/admin`

### Query modules

| Query file | Endpoints used | Main screens |
| --- | --- | --- |
| `query/auth/auth.query.js` | `/auth/login`, `/auth/password/forgot`, `/auth/password/reset/:token`, `/auth/verify-forgotpassword-maillink/:token`, `/profile/logout`, `/profile/change/password` | login, forgot password, reset password, change password |
| `query/profile/profile.query.js` | `/profile`, `/profile/edit` | profile |
| `query/settings/settings.query.js` | `/setting`, `/setting/edit` | settings |
| `query/user/user.query.js` | `/user/list`, `/user/create`, `/user/delete/:id`, `/user/edit/:id`, `/user/view/:id` | users list/add/edit/view |
| `query/proto/user.proto.js` | `/table-prototype/list`, `/table-prototype/create`, `/table-prototype/view/:id`, `/table-prototype/update/:id`, `/table-prototype/delete/:id` | table management |
| `query/gameLogs/gameLogs.query.js` | `game-logs/list`, `game-logs/view/:id` | game logs |
| `query/finance/finance.query.js` | `/transaction/list`, `/transaction/view/:id`, `/transaction/withdraw/list`, `/transaction/update/withdraw/:id` | transactions |
| `query/statistics/statistics.query.js` | `/dashboard/` | dashboard |

### Query files present but not part of the current routed flow

These exist in the repo but are not part of the active main route tree right now:

- `query/dashboard/dashboard.query.js`
- `query/transaction/transaction.query.js`
- `query/kyc/kyc.query.js`
- `query/deposit/deposit.query.js`

Some related screens exist too, but are not mounted in the main router.

## 9. Screen-By-Screen Reference

### 9.1 Login

File:

- `Admin-Frontend/src/views/auth/login/index.jsx`

What it does:

- renders email/password form
- validates email and password presence
- calls `login()`
- stores `authorization` response header in `localStorage`
- redirects to `/dashboard`

Main backend dependency:

- `POST /auth/login`

### 9.2 Forgot Password

File:

- `Admin-Frontend/src/views/auth/forgot-password/index.jsx`

What it does:

- accepts admin email
- calls forgot-password endpoint
- shows a toast
- navigates back after success

Main backend dependency:

- `POST /auth/password/forgot`

### 9.3 Reset Password

File:

- `Admin-Frontend/src/views/auth/reset-password/index.jsx`

What it does:

- validates reset token first
- allows new password entry
- submits reset request
- handles expired or invalid tokens

Main backend dependencies:

- `POST /auth/verify-forgotpassword-maillink/:token`
- `POST /auth/password/reset/:token`

### 9.4 Dashboard

File:

- `Admin-Frontend/src/views/dashboard/index.jsx`

What it does:

- loads top-level counts and revenue figures
- shows total users, active users, admin win amount, revenue summaries

Main backend dependency:

- `GET /dashboard/`

Note:

- the routed dashboard page uses `query/statistics/statistics.query.js`
- other dashboard query files exist, but are not what this routed page currently uses

### 9.5 User Management List

File:

- `Admin-Frontend/src/views/user/index.jsx`

What it does:

- lists users
- paginates
- filters by query string params
- searches
- updates user status
- deletes users

Main backend dependencies:

- `GET /user/list`
- `PUT /user/edit/:id`
- `POST /user/delete/:id`

Main supporting components:

- `shared/components/DataTable`
- `shared/components/UserRow`
- `shared/components/userFilter`
- `shared/components/Modal`

### 9.6 Add User

File:

- `Admin-Frontend/src/views/user/add/index.jsx`

What it does:

- creates a new player user
- sends username, email, chips, password
- forces `eUserType: 'user'`
- includes a client-side password generator

Main backend dependency:

- `POST /user/create`

### 9.7 Edit User

File:

- `Admin-Frontend/src/views/user/edit/index.jsx`

What it does:

- loads a user by id
- tracks dirty fields
- updates only changed fields
- currently allows editing username and chips
- email is shown but disabled

Main backend dependencies:

- `GET /user/view/:id`
- `PUT /user/edit/:id`

### 9.8 View User

File:

- `Admin-Frontend/src/views/user/view/index.jsx`

What it does:

- loads a user by id
- renders profile summary
- shows verification status and profile data

Main backend dependency:

- `GET /user/view/:id`

Important note:

- KYC and bank tabs are present in code but currently commented out in the view

### 9.9 Table Management List

File:

- `Admin-Frontend/src/views/proto/index.jsx`

What it does:

- lists table prototypes
- paginates and filters
- toggles table status
- deletes tables
- links to add/edit/view screen

Main backend dependencies:

- `GET /table-prototype/list`
- `POST /table-prototype/update/:id`
- `DELETE /table-prototype/delete/:id`

### 9.10 Add / Edit / View Table

File:

- `Admin-Frontend/src/views/proto/add/index.jsx`

What it does:

- handles create, edit, and read-only view mode from one component
- mode is chosen from route param `type`
- edits core table fields such as:
  - `sName`
  - `nMinBuyIn`
  - `nMinBet`
  - `nBigBlind`
  - `nTurnTime`

Main backend dependencies:

- `POST /table-prototype/create`
- `GET /table-prototype/view/:id`
- `POST /table-prototype/update/:id`

Important current behavior:

- `nMaxPlayer` is effectively locked to `9`
- `nBigBlind` is derived from `nMinBet`

### 9.11 Game Logs

Files:

- `Admin-Frontend/src/views/gmeLogs/GameLogs.jsx`
- `Admin-Frontend/src/views/gmeLogs/view/index.jsx`

What it does:

- lists historical game logs
- filters by board type and search
- opens detailed view screen for a single log

Main backend dependencies:

- `GET game-logs/list`
- `GET game-logs/view/:id`

### 9.12 Transactions

File:

- `Admin-Frontend/src/views/finance/FinanceManagement.jsx`

What it does:

- lists transactions
- filters and paginates
- fetches a single transaction for detail view

Main backend dependencies:

- `GET /transaction/list`
- `GET /transaction/view/:id`

Important note:

- withdraw-specific query helpers exist, but the currently routed finance page is the general transaction list page

### 9.13 Settings

File:

- `Admin-Frontend/src/views/settings/index.jsx`

What it does:

- loads shared platform settings
- edits rake
- edits daily reward ladder
- edits shop chip/price/tag entries

Main backend dependencies:

- `GET /setting`
- `POST /setting/edit`

Shared data impact:

- `nRakeAmount` affects gameplay/rake calculations
- `aDailyReward` affects player daily rewards
- `aShop` affects player chip packages
- `aAvatar` is part of the settings payload, though the current settings screen mostly centers on rake, rewards, and shop

### 9.14 Profile

File:

- `Admin-Frontend/src/views/profile/index.jsx`

What it does:

- loads current admin profile
- switches between view and edit mode
- only submits changed values

Main backend dependencies:

- `GET /profile`
- `PUT /profile/edit`

### 9.15 Change Password

File:

- `Admin-Frontend/src/views/profile/changePassword.jsx`

What it does:

- validates current, new, and confirm password
- calls change-password endpoint
- clears session and returns to login on success

Main backend dependency:

- `POST /profile/change/password`

## 10. Shared Components And Utilities

The admin frontend relies heavily on a reusable UI layer.

Important shared components:

| File | Use |
| --- | --- |
| `shared/components/DataTable` | list screens |
| `shared/components/Topbar` | list page actions such as Create |
| `shared/components/Modal` | delete confirmations and detail dialogs |
| `shared/components/Wrapper` | section/card shell |
| `shared/components/UserRow` | user list row rendering |
| `shared/components/ProtoRow` | table prototype row rendering |
| `shared/components/FinanceRow` | transaction row rendering |
| `shared/components/LogsRow` | game log row rendering |
| `shared/components/Breadcrumb` | page breadcrumb path |
| `shared/components/Sidebar` | main navigation |
| `shared/components/Header` | header bar |

Important utility files:

| File | Use |
| --- | --- |
| `helper/helper.js` | token removal, dirty-field extraction, helper formatting |
| `shared/utils.jsx` | query-string parsing, URL state, toast wrapper |
| `shared/constants/AllRoutes.jsx` | route path constants |
| `shared/constants/TableHeaders.jsx` | table column definitions |
| `shared/constants/ValidationErrors.jsx` | form validation messages |

## 11. Styling Structure

Styling lives mostly under:

- `Admin-Frontend/src/assets/scss`

The main SCSS entry is:

- `Admin-Frontend/src/assets/scss/main.scss`

Structure is broadly split into:

- `helper/`
- `components/`
- `views/`

That means when a developer edits a screen, they usually need to check both:

- the React view file
- the matching SCSS partial

## 12. Files Most Important For A New Dev

If a new dev only reads a small number of admin frontend files, start with these:

- `Admin-Frontend/src/axios.js`
- `Admin-Frontend/src/App.js`
- `Admin-Frontend/src/routes/Router.jsx`
- `Admin-Frontend/src/routes/PrivateRoutes.jsx`
- `Admin-Frontend/src/routes/PublicRoutes.jsx`
- `Admin-Frontend/src/shared/constants/AllRoutes.jsx`
- `Admin-Frontend/src/shared/components/Sidebar/SidebarConfig.jsx`
- `Admin-Frontend/src/views/dashboard/index.jsx`
- `Admin-Frontend/src/views/user/index.jsx`
- `Admin-Frontend/src/views/proto/index.jsx`
- `Admin-Frontend/src/views/settings/index.jsx`
- `Admin-Frontend/src/query/`

## 13. Current Gaps, Oddities, And Risks

This section matters because the admin frontend is not perfectly clean.

### 13.1 No checked-in admin frontend env file

There is no `Admin-Frontend/.env` in this workspace.

The dev must supply `REACT_APP_API_ENDPOINT` manually for local, staging, or production builds.

### 13.2 Base URL is build-time only

Because the app is CRA-based:

- env changes require a rebuild

You cannot change the admin API base at runtime without rebuilding the bundle.

### 13.3 `route.login` is misleading

`shared/constants/AllRoutes.jsx` sets:

- `login: '/'`

but the router mounts:

- `/login`

That should be normalized.

### 13.4 Unused or partially wired modules exist

Files present but not actively routed in the main app include:

- `views/user/kycDetails/index.jsx`
- `views/dashboard/transactionStats/index.jsx`
- `views/dashboard/statistics/index.jsx`
- `views/finance/deposit/index.jsx`
- `views/finance/withdraw/index.jsx`
- `query/kyc/kyc.query.js`
- `query/deposit/deposit.query.js`
- `query/dashboard/dashboard.query.js`
- `query/transaction/transaction.query.js`

These may be old work, future work, or abandoned work. A new dev should verify before reusing them.

### 13.5 User admin-specific query helpers look stale

`query/user/user.query.js` includes:

- `getAdminById()` calling `/admin/view/:id`
- `updateAdminById()` calling `/admin/edit/:id`

Those functions do not match the main route style used elsewhere and appear unused in the active routed app.

They should be treated as suspect until verified against the admin backend.

### 13.6 KYC and bank UX is incomplete

The user detail page includes commented-out tabs and related components for:

- bank info
- KYC detail

That suggests the KYC/admin banking area is incomplete or intentionally disabled in the current UI.

### 13.7 `src/axios.js` contains confusing placeholder text

The axios setup calls:

- `setUrl('if you have ip then paste it here', { prod: true })`

Because `setUrl()` returns `process.env.REACT_APP_API_ENDPOINT` in prod mode, that placeholder string is not the real base URL, but it is still misleading and should be cleaned up.

## 14. How To Change Or Extend The Admin Frontend

### Add a new admin page

1. create the view under `Admin-Frontend/src/views/...`
2. create or update the needed query module under `Admin-Frontend/src/query/...`
3. add a route constant in `shared/constants/AllRoutes.jsx`
4. register the route in `routes/Router.jsx`
5. add a sidebar item in `shared/components/Sidebar/SidebarConfig.jsx` if it should be visible
6. add SCSS under `assets/scss/views/...` if needed

### Change an existing API endpoint

1. update the correct query file in `src/query`
2. verify the backend route exists under the admin backend
3. retest the screen that uses it
4. rebuild the frontend if environment changes were involved

### Change the admin API domain

1. set a new `REACT_APP_API_ENDPOINT`
2. make sure it includes `/api/v1/admin`
3. rebuild the app with `npm run build`

### Change auth behavior

Primary files:

- `src/axios.js`
- `src/routes/PublicRoutes.jsx`
- `src/routes/PrivateRoutes.jsx`
- `src/query/auth/auth.query.js`

## 15. Build And Run Notes

Local development:

- `npm start`

Production build:

- `npm run build`

Because this is a CRA app:

- local dev reads `REACT_APP_*` from env when the dev server starts
- production bundles also read them at build time

## 16. Relationship To The Rest Of The Stack

The admin frontend should be read together with:

- `docs/DEV_PACK.md`
- `docs/LINUX_LIVE_DEPLOYMENT_GUIDE.md`

Short version:

- admin frontend talks to admin backend
- player frontend talks to game backend
- both backends share Mongo
- settings, users, table prototypes, and logs are the main data overlap

## 17. Practical Summary

If a developer needs the shortest useful mental model, it is this:

1. `Admin-Frontend` is a CRA React admin panel.
2. It must be built with `REACT_APP_API_ENDPOINT` pointing at the admin backend base URL including `/api/v1/admin`.
3. The admin auth token is stored in `localStorage` or `sessionStorage` under `token`.
4. Routes are declared in `src/routes/Router.jsx`.
5. Sidebar navigation is declared in `src/shared/components/Sidebar/SidebarConfig.jsx`.
6. API calls are centralized in `src/query/*`.
7. Users, tables, settings, logs, and transactions are the main active admin screens.
8. Several KYC, finance, and dashboard files exist but are not fully wired into the main route tree.
