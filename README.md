# 21 Hold'em Frontend

React client for lobby/table/gameplay UI and player interactions.

## Stack
- React 18
- Create React App
- Phaser
- Socket.IO client

## Prerequisites
- Node.js `v22.12.0` (see `.nvmrc`)
- npm
- Running backend API on `http://localhost:4000`

## Quick Start
1. Create env file:
```powershell
cd d:\21HOLDEM25 LOCAL\Game-Frontend
copy .env.example .env
```

2. Install dependencies (if needed):
```powershell
npm install
```

3. Start app:
```powershell
npm start
```

4. Open:
- `http://localhost:3000`

## Available Scripts
- `npm start`: run dev server
- `npm run build`: create production build
- `npm test`: run tests
- `npm run lint`: run ESLint on `src`
- `npm run lint:fix`: run ESLint with auto-fix

## Environment Variables
See `.env.example`.

Required for local:
- `REACT_APP_API_ENDPOINT=http://localhost:4000`
- `REACT_APP_ENVIRONMENT=0`

## Local Full Stack Run Order
1. Start infra from workspace root:
```powershell
cd d:\21HOLDEM25 LOCAL
docker compose up -d
```
2. Start backend:
```powershell
cd d:\21HOLDEM25 LOCAL\Game-Backend
npm start
```
3. Start frontend:
```powershell
cd d:\21HOLDEM25 LOCAL\Game-Frontend
npm start
```

## Common Issues
- Browser opens but game cannot load data:
  check backend on `http://localhost:4000/ping`.
- Login or API calls fail:
  verify `REACT_APP_API_ENDPOINT` points to local backend.
- Port `3000` already in use:
  stop existing frontend process or choose alternate port.

## Versioning And Releases
- Semantic Versioning is used (`MAJOR.MINOR.PATCH`).
- Update `CHANGELOG.md` for all user-visible changes.
- Follow release steps in `docs/RELEASE.md`.
