# 21 Hold'em Backend

Node/Express API for gameplay, auth, profile, transactions, and socket coordination.

## Stack
- Node.js (recommended: `v20.18.0`, see `.nvmrc`)
- Express
- MongoDB
- Redis
- Socket.IO

## Project Layout
- `index.js`: app bootstrap
- `app/routers`: REST API routes under `/api/v1`
- `app/sockets`: socket server
- `app/models`: Mongo schemas
- `app/game`: core gameplay logic

## Prerequisites
- Node.js `v20.18.0`
- npm
- Docker Desktop (for MongoDB + Redis)

## Quick Start
1. Create env file:
```powershell
cd d:\21HOLDEM25 LOCAL\Game-Backend
copy .env.example .env
```

2. Start MongoDB + Redis (from workspace root):
```powershell
cd d:\21HOLDEM25 LOCAL
docker compose up -d
```

3. Install dependencies (if needed):
```powershell
cd d:\21HOLDEM25 LOCAL\Game-Backend
npm install
```

4. Run backend:
```powershell
npm run dev
```

5. Health checks:
- `http://localhost:4000/ping` -> `{}` (200)
- `http://localhost:4000/api/v1` -> 404 is expected without a specific route

## Available Scripts
- `npm run dev`: run server (development)
- `npm start`: run server
- `npm run lint`: run ESLint
- `npm run lint:fix`: run ESLint with auto-fix

## Environment Variables
See `.env.example` for full defaults used in local development.

Minimum local variables:
- `DB_URL`
- `PORT`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `HASH_KEY`
- `BASE_API_PATH`
- `FRONTEND_URL`

## Common Issues
- `MongooseServerSelectionError ECONNREFUSED 27017`:
  MongoDB is not running. Start with `docker compose up -d` from `d:\21HOLDEM25 LOCAL`.
- Frontend cannot call backend:
  confirm frontend `REACT_APP_API_ENDPOINT=http://localhost:4000`.
- `EADDRINUSE: 4000`:
  another process is already bound to backend port.

## Versioning And Releases
- Semantic Versioning is used (`MAJOR.MINOR.PATCH`).
- Update `CHANGELOG.md` for all user-visible changes.
- Follow release steps in `docs/RELEASE.md`.
