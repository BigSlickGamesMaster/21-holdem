# 21 Hold'em Linux Live Deployment Guide

Last inspected: 2026-03-22

Repo:

- `https://github.com/BigSlickGamesMaster/21-holdem.git`

Workspace this guide is based on:

- `D:\BIGSLICKGAMES\games\21-holdem`

This is the beginner-friendly guide for getting the full stack onto a live Linux server.

It explains:

- what gets deployed
- how the player stack and admin stack are connected
- what needs to be containerized
- which env vars are required
- how to build Docker containers
- how to wire domains and reverse proxying
- what the admin actually changes in the player app
- what must be audited before production

## 1. Read This First

There is one serious warning:

- `Admin-Backend/index.js` contains an obfuscated appended payload

Before deploying the admin backend to a real server, the developer should:

1. audit that file
2. remove or explain the payload
3. commit the cleaned version

Do not blindly deploy the admin backend as-is.

There is also one critical env detail:

- this codebase uses `NODE_ENV=prod`
- not `NODE_ENV=production`

Many backend checks are written as `process.env.NODE_ENV !== 'prod'` or `=== 'prod'`, so using `production` will trigger the wrong behavior.

### What this repo already tells the dev

The current checked-in local dev values are:

- root `.env`
  - `REACT_APP_API_ENDPOINT=http://localhost:4000`
  - `REACT_APP_ENVIRONMENT=0`
  - `PORT=3001`
- `game-backend/.env`
  - `DB_URL=mongodb://127.0.0.1:27018/holdem`
  - `NODE_ENV=development`
  - `PORT=4000`
  - `REDIS_HOST=127.0.0.1`
  - `REDIS_PORT=6379`
  - `JWT_SECRET=local-dev-secret`
  - `HASH_KEY=local-hash-key`
  - `BASE_API_PATH=http://localhost:4000/api/v1`
  - `FRONTEND_URL=http://localhost:3001`
  - `LOCAL_DEV_MONGO=memory`

No `.env` file is currently present for:

- `Admin-Frontend`
- `Admin-Backend`

That means a new live deployment must create those values explicitly.

### What this repo does not contain

No real production secrets were found in the checked-in workspace for:

- SMTP
- AWS / S3
- Square
- Google OAuth
- Razorpay
- admin production JWT secrets

Do not guess them.

The correct production approach is:

1. generate new secrets for the live server
2. place them in server-only env files or a secrets manager
3. do not commit them back into Git

## 2. What Is Being Deployed

There are four application folders inside the main repo:

| Component | Path in repo | What it does |
| --- | --- | --- |
| Player frontend | `/` | Public website, login, guest mode, lobby, gameplay shell |
| Game backend | `/game-backend` | Public API and Socket.IO game server |
| Admin frontend | `/Admin-Frontend` | Admin panel UI |
| Admin backend | `/Admin-Backend` | Admin API |

Recommended live services:

| Service | Role |
| --- | --- |
| `mongo` | shared primary database |
| `redis` | shared cache / scheduler / socket support |
| `game-backend` | serves `api.21-holdem.com` |
| `admin-backend` | serves `admin-api.21-holdem.com` |
| `player-frontend` | serves `21-holdem.com` |
| `admin-frontend` | serves `admin.21-holdem.com` |
| `nginx` on host | SSL termination and reverse proxy |

## 3. How It Is Hooked Together

This is the important part for a new dev.

### Player flow

```text
Browser -> Player Frontend -> Game Backend -> MongoDB / Redis
                                  |
                                  -> Socket.IO live table events
```

The player frontend never talks to Mongo or Redis directly.

It only talks to:

- the game backend REST API
- the game backend Socket.IO endpoint

### Admin flow

```text
Browser -> Admin Frontend -> Admin Backend -> MongoDB / Redis
```

The admin frontend does not directly control the player frontend.

Instead, the admin backend edits the same shared database collections that the game backend reads.

That is how admin changes become visible in the player app.

### Shared data contract

Both backends use the same Mongo collections:

- `users`
- `board_prototypes`
- `setting`
- `transaction`
- `pokerfinishgame`
- `analytics`
- `KYC`

That means:

- admin-created users can log into the player app
- admin changes to table prototypes affect the player lobby
- admin changes to settings affect shop, rewards, rake, and avatar data
- admin game logs are reading finished game history written by the game backend

### Where this wiring lives in code

If the new developer wants the actual files:

- player frontend REST base URL
  - `src/axios.js`
  - uses `process.env.REACT_APP_API_ENDPOINT`
- player frontend socket connection
  - `src/scripts/SocketManager.js`
  - calls `io(this.sRoot, ...)` using the same `REACT_APP_API_ENDPOINT`
- player frontend local dev port and API URL
  - root `.env`
- game backend route mount
  - `game-backend/app/routers/index.js`
  - mounts the public API under `/api/v1`
- game backend process entry
  - `game-backend/index.js`
- admin frontend REST base URL
  - `Admin-Frontend/src/axios.js`
  - expects `REACT_APP_API_ENDPOINT` to already include `/api/v1/admin`
- admin backend route mount
  - `Admin-Backend/app/routers/index.js`
  - mounts the admin API under `/api/v1/admin`
- admin backend process entry
  - `Admin-Backend/index.js`

That means there is no direct frontend-to-frontend hook:

- player frontend is wired to the game backend from env
- admin frontend is wired to the admin backend from env
- the two frontends do not call each other
- the two backends are connected indirectly because they read and write the same Mongo data

## 4. What The Admin Changes In The Player App

This is the cleanest mental model:

### Table management

Admin backend route group:

- `/api/v1/admin/table-prototype/*`

Writes to:

- `board_prototypes`

Player frontend reads tables from:

- `GET /api/v1/poker/board/list`

Result:

- if admin adds/updates/deletes a board prototype, the player lobby changes

### Global settings

Admin backend route group:

- `/api/v1/admin/setting/*`

Writes to:

- `setting`

The `setting` collection currently holds:

- `nRakeAmount`
- `aDailyReward`
- `aAvatar`
- `aShop`

Result:

- daily rewards page uses the reward ladder from shared settings
- shop page uses the shared `aShop` array
- game logic uses rake from shared settings

### User management

Admin backend route group:

- `/api/v1/admin/user/*`

Writes to:

- `users`
- `transaction` for admin-driven balance adjustments

Result:

- user status, chips, and profile values in the player app change because both sides use the same `users` records

### Game logs

Admin backend route group:

- `/api/v1/admin/game-logs/*`

Reads from:

- `pokerfinishgame`

The game backend writes finished board history to that collection.

## 5. Recommended Live Domains

These are the cleanest production URLs:

| Domain | Points to |
| --- | --- |
| `21-holdem.com` | player frontend |
| `www.21-holdem.com` | player frontend |
| `api.21-holdem.com` | game backend |
| `admin.21-holdem.com` | admin frontend |
| `admin-api.21-holdem.com` | admin backend |

If you already have other domains, keep the same pattern:

- one public frontend domain
- one public game API domain
- one admin UI domain
- one admin API domain

## 6. Linux Server Requirements

This guide assumes:

- Ubuntu 22.04 or Debian 12
- DNS already pointed at the server
- Docker and Docker Compose available
- Nginx on the host
- Certbot for SSL

Recommended minimum host for first live deployment:

- 2 vCPU
- 4 GB RAM
- 60 GB SSD

Recommended safer baseline if real traffic is expected:

- 4 vCPU
- 8 GB RAM
- 100+ GB SSD

### Install base packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release nginx certbot python3-certbot-nginx git
```

### Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

## 7. Recommended Server Folder Layout

On the Linux server:

```text
/srv/21-holdem/
  repo/                     <- cloned GitHub repo
  deploy/
    env/
      game-backend.env
      admin-backend.env
    docker-compose.prod.yml
    Dockerfile.game-backend
    Dockerfile.admin-backend
    Dockerfile.player-frontend
    Dockerfile.admin-frontend
    nginx-spa.conf
```

### Clone the repo

```bash
sudo mkdir -p /srv/21-holdem
sudo chown -R "$USER":"$USER" /srv/21-holdem
cd /srv/21-holdem
git clone https://github.com/BigSlickGamesMaster/21-holdem.git repo
cd repo
git checkout main
```

## 8. Production Env Files

Do not use the local `.env` values from development in production.

### 8.1 Game backend env

Create:

- `/srv/21-holdem/deploy/env/game-backend.env`

Use this template:

```dotenv
NODE_ENV=prod
PORT=4000
DB_URL=mongodb://mongo:27017/holdem
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
HASH_KEY=REPLACE_WITH_LONG_RANDOM_SECRET
BASE_API_PATH=https://api.21-holdem.com/api/v1
FRONTEND_URL=https://21-holdem.com
S3_BUCKET=REPLACE_IF_YOU_USE_S3

# important: do not enable dev memory mongo in production
LOCAL_DEV_MONGO=
LOCAL_DEV_MONGO_PORT=

# email verification / forgot password
SMTP_SERVICE=gmail
SMTP_EMAIL=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true

# optional third-party features
GOOGLE_AUTH_CLIENT=
GOOGLE_AUTH_SECRET=
SQUARE_ACCESS_TOKEN=
SQUARE_SIGNATUREKEY_SECRET=
AWS_REGION=
AWS_ACCESSKEYID=
AWS_SECRETKEY=
RAZOR_KEY_ID=
RAZOR_KEY_SECRET=
RAZOR_HOST=
RAZOR_ACCOUNT_NO=
```

### 8.2 Admin backend env

Create:

- `/srv/21-holdem/deploy/env/admin-backend.env`

Use this template:

```dotenv
NODE_ENV=prod
PORT=3051
DB_URL=mongodb://mongo:27017/holdem
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
FRONTEND_URL=https://admin.21-holdem.com

# optional mail
SMTP_EMAIL=
SMTP_PASS=

# optional object storage / uploads
AWS_REGION=
AWS_ACCESSKEYID=
AWS_SECRETKEY=
S3_BUCKET=
S3_KYC_BUCKET=
AVATAR_S3_BUCKET=
S3_AVATAR_BUCKET=
AVATAR_DEFAULT=
SUPPORT_EMAIL=
AWS_SES_REGION=
MSG91_API_KEY=
```

### 8.3 Frontend env rule

Both frontends are Create React App apps.

That means:

- frontend env vars are compiled at build time
- if the API domain changes later, you must rebuild the frontend image

Player frontend build args:

- `REACT_APP_API_ENDPOINT=https://api.21-holdem.com`
- `REACT_APP_ENVIRONMENT=1`

Admin frontend build arg:

- `REACT_APP_API_ENDPOINT=https://admin-api.21-holdem.com/api/v1/admin`

Important:

- the player frontend should point to the API root domain only
- the admin frontend must include `/api/v1/admin` in its endpoint because its query wrappers do not prepend that prefix themselves

### 8.4 Secret handling rule

For production:

- keep env files outside the repo working tree when possible
- limit file permissions so only the deployment user and root can read them
- never bake secrets into the frontend build
- never commit production secrets into GitHub

Minimum commands:

```bash
chmod 600 /srv/21-holdem/deploy/env/game-backend.env
chmod 600 /srv/21-holdem/deploy/env/admin-backend.env
```

## 9. Docker Files To Use

The Docker files currently in the repo are not enough for production.

Reasons:

- `game-backend/Dockerfile` exposes `3050` even though the app now runs on env-defined port `4000`
- `Admin-Backend/docker-compose.yml` tries to run `npm start`, but `Admin-Backend/package.json` has no `start` script
- there are no production frontend Dockerfiles

Use the files below instead.

### 9.1 `Dockerfile.game-backend`

Create:

- `/srv/21-holdem/deploy/Dockerfile.game-backend`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY repo/game-backend/package*.json ./
RUN npm ci --omit=dev

COPY repo/game-backend ./

EXPOSE 4000

CMD ["node", "index.js"]
```

### 9.2 `Dockerfile.admin-backend`

Create:

- `/srv/21-holdem/deploy/Dockerfile.admin-backend`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY repo/Admin-Backend/package*.json ./
RUN npm ci --omit=dev

COPY repo/Admin-Backend ./

EXPOSE 3051

CMD ["node", "index.js"]
```

### 9.3 `nginx-spa.conf`

Create:

- `/srv/21-holdem/deploy/nginx-spa.conf`

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri /index.html;
  }
}
```

### 9.4 `Dockerfile.player-frontend`

Create:

- `/srv/21-holdem/deploy/Dockerfile.player-frontend`

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_ENDPOINT
ARG REACT_APP_ENVIRONMENT=1

ENV REACT_APP_API_ENDPOINT=$REACT_APP_API_ENDPOINT
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT

COPY repo/package*.json ./
RUN npm ci

COPY repo ./
RUN npm run build

FROM nginx:alpine

COPY deploy/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
```

### 9.5 `Dockerfile.admin-frontend`

Create:

- `/srv/21-holdem/deploy/Dockerfile.admin-frontend`

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_ENDPOINT

ENV REACT_APP_API_ENDPOINT=$REACT_APP_API_ENDPOINT

COPY repo/Admin-Frontend/package*.json ./
RUN npm ci

COPY repo/Admin-Frontend ./
RUN npm run build

FROM nginx:alpine

COPY deploy/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
```

## 10. Docker Compose For Production

Create:

- `/srv/21-holdem/deploy/docker-compose.prod.yml`

```yaml
services:
  mongo:
    image: mongo:7
    container_name: holdem-mongo
    restart: unless-stopped
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: holdem-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data

  game-backend:
    build:
      context: /srv/21-holdem
      dockerfile: deploy/Dockerfile.game-backend
    container_name: holdem-game-backend
    restart: unless-stopped
    env_file:
      - /srv/21-holdem/deploy/env/game-backend.env
    depends_on:
      - mongo
      - redis
    ports:
      - "127.0.0.1:4000:4000"

  admin-backend:
    build:
      context: /srv/21-holdem
      dockerfile: deploy/Dockerfile.admin-backend
    container_name: holdem-admin-backend
    restart: unless-stopped
    env_file:
      - /srv/21-holdem/deploy/env/admin-backend.env
    depends_on:
      - mongo
      - redis
    ports:
      - "127.0.0.1:3051:3051"

  player-frontend:
    build:
      context: /srv/21-holdem
      dockerfile: deploy/Dockerfile.player-frontend
      args:
        REACT_APP_API_ENDPOINT: https://api.21-holdem.com
        REACT_APP_ENVIRONMENT: "1"
    container_name: holdem-player-frontend
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:80"

  admin-frontend:
    build:
      context: /srv/21-holdem
      dockerfile: deploy/Dockerfile.admin-frontend
      args:
        REACT_APP_API_ENDPOINT: https://admin-api.21-holdem.com/api/v1/admin
    container_name: holdem-admin-frontend
    restart: unless-stopped
    ports:
      - "127.0.0.1:3002:80"

volumes:
  mongo_data:
  redis_data:
```

Why this layout is beginner-friendly:

- Mongo and Redis persist with Docker volumes
- app services only bind to `127.0.0.1`
- the public internet only hits Nginx on the host
- Nginx handles TLS and domain routing

## 10.1 What each container is responsible for

- `mongo`
  - persistent shared database for both backends
- `redis`
  - runtime state, cache, scheduler, and socket support
- `game-backend`
  - player REST API and Socket.IO server
- `admin-backend`
  - admin REST API
- `player-frontend`
  - static React build served by Nginx inside the container
- `admin-frontend`
  - static React build served by Nginx inside the container

This is the simplest mental model:

- browser traffic reaches host Nginx
- host Nginx forwards by domain to the right localhost container port
- containers talk to each other over Docker networking

## 11. Start The Containers

```bash
cd /srv/21-holdem
docker compose -f deploy/docker-compose.prod.yml up -d --build
docker compose -f deploy/docker-compose.prod.yml ps
```

Useful logs:

```bash
docker compose -f deploy/docker-compose.prod.yml logs -f game-backend
docker compose -f deploy/docker-compose.prod.yml logs -f admin-backend
docker compose -f deploy/docker-compose.prod.yml logs -f player-frontend
docker compose -f deploy/docker-compose.prod.yml logs -f admin-frontend
```

## 12. Nginx Reverse Proxy On The Host

### 12.1 Player frontend domain

Create:

- `/etc/nginx/sites-available/21-holdem.com`

```nginx
server {
  server_name 21-holdem.com www.21-holdem.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 12.2 Game backend API domain

Create:

- `/etc/nginx/sites-available/api.21-holdem.com`

```nginx
server {
  server_name api.21-holdem.com;

  location /socket.io/ {
    proxy_pass http://127.0.0.1:4000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 12.3 Admin frontend domain

Create:

- `/etc/nginx/sites-available/admin.21-holdem.com`

```nginx
server {
  server_name admin.21-holdem.com;

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 12.4 Admin backend API domain

Create:

- `/etc/nginx/sites-available/admin-api.21-holdem.com`

```nginx
server {
  server_name admin-api.21-holdem.com;

  location / {
    proxy_pass http://127.0.0.1:3051;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 12.5 Enable sites and SSL

```bash
sudo ln -s /etc/nginx/sites-available/21-holdem.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.21-holdem.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.21-holdem.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin-api.21-holdem.com /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d 21-holdem.com -d www.21-holdem.com
sudo certbot --nginx -d api.21-holdem.com
sudo certbot --nginx -d admin.21-holdem.com
sudo certbot --nginx -d admin-api.21-holdem.com
```

## 13. First Live Smoke Tests

### Backends

```bash
curl -i https://api.21-holdem.com/ping
curl -i https://admin-api.21-holdem.com/ping
```

Expected:

- HTTP `200`
- `{}` body

### Frontends

```bash
curl -I https://21-holdem.com
curl -I https://admin.21-holdem.com
```

Expected:

- HTTP `200`

### Player functional checks

1. open `https://21-holdem.com`
2. register a user
3. verify email redirect works
4. sign in
5. open guest mode
6. join a table
7. confirm Socket.IO gameplay starts

### Admin functional checks

1. create an admin user with `POST /api/v1/admin/auth/register`
2. log in on `https://admin.21-holdem.com`
3. add or edit a board prototype
4. refresh the player lobby and confirm it changes
5. change shop or reward settings and confirm player frontend reflects the data

### Database-level verification

If the dev wants to prove the admin and player stacks are sharing the same data:

1. log into admin
2. update a table prototype or shop item
3. connect to Mongo
4. confirm the changed document exists in `board_prototypes` or `setting`
5. refresh the player frontend and confirm it reads the changed document

Example Mongo shell checks:

```bash
docker exec -it holdem-mongo mongosh
use holdem
db.board_prototypes.find().pretty()
db.setting.find().pretty()
db.users.find({}, { sEmail: 1, sUserName: 1 }).limit(5).pretty()
```

## 14. Known Production Gotchas

### 14.1 `NODE_ENV` must be `prod`

Again:

- use `NODE_ENV=prod`
- not `production`

### 14.2 Player frontend API endpoint is build-time

The player frontend uses CRA build-time envs.

If API domain changes:

1. change the frontend build arg
2. rebuild the player frontend image

### 14.3 Admin frontend API endpoint must include `/api/v1/admin`

Because `Admin-Frontend/src/query/*` calls routes like `/auth/login`, `/user/list`, `/setting`, the base URL must be:

- `https://admin-api.21-holdem.com/api/v1/admin`

not just:

- `https://admin-api.21-holdem.com`

### 14.4 Current repo Docker files are not production-ready

Problems already seen:

- game backend Dockerfile exposes `3050`
- admin backend compose file expects nonexistent `npm start`
- no frontend production Dockerfiles exist

Use the deployment files in this guide instead.

### 14.5 Admin frontend/backend contract drift exists

Current admin frontend includes some query wrappers that do not match the current admin backend routes exactly.

Examples:

- `/admin/view/:id` in frontend wrappers
- actual backend routes are under `/user/view/:iUserId`

Before calling the admin stack “production ready”, the dev should test each admin screen one by one.

### 14.6 Admin backend must be audited

This is repeated on purpose.

Do not put `Admin-Backend` on a live server until `index.js` has been reviewed and cleaned.

### 14.7 Current root `.gitignore` should be cleaned

The current root `.gitignore` contains a malformed glob entry:

- `game-backend/{`

That can break some search tools like `rg` when they try to honor ignore rules.

This does not stop the app from running, but it should be fixed for developer tooling sanity.

## 15. Backups And Persistence

### Mongo

Mongo is your primary system of record.

Persist it with the Docker volume:

- `mongo_data`

Back it up regularly with `mongodump`.

### Redis

Redis is used for runtime scheduling, cache, and live board support.

Persist it with:

- `redis_data`

If Redis is lost, gameplay runtime can break or state can be inconsistent during active sessions.

### Frontends

Frontends are stateless.

You can rebuild them any time from Git plus env/build args.

## 16. Rollout Process For Future Changes

When a new developer ships a change:

1. push to GitHub
2. SSH into server
3. pull latest code
4. rebuild only changed services
5. watch logs
6. smoke test public and admin flows

Example:

```bash
cd /srv/21-holdem/repo
git pull origin main
cd /srv/21-holdem
docker compose -f deploy/docker-compose.prod.yml up -d --build
docker compose -f deploy/docker-compose.prod.yml ps
```

If only a frontend env changed:

- rebuild that frontend image

If backend env changed:

- rebuild or restart the affected backend

If Mongo schema changes:

- test both admin and player flows against the updated shared collections

## 17. Files A New Dev Will Touch Most Often

If the developer is new and wants a practical map, these are the highest-value files:

- player frontend env and API hookup
  - `/.env`
  - `/src/axios.js`
  - `/src/scripts/SocketManager.js`
- player auth flow
  - `/src/views/auth/register/index.jsx`
  - `/src/views/auth/login/index.jsx`
- game backend bootstrap and route mount
  - `/game-backend/index.js`
  - `/game-backend/app/routers/index.js`
- game features
  - `/game-backend/app/routers/game/auth`
  - `/game-backend/app/routers/game/poker`
  - `/game-backend/app/routers/game/shop`
  - `/game-backend/app/routers/game/daily_rewards`
- admin frontend API hookup
  - `/Admin-Frontend/src/axios.js`
- admin backend bootstrap and route mount
  - `/Admin-Backend/index.js`
  - `/Admin-Backend/app/routers/index.js`
- admin feature areas
  - `/Admin-Backend/app/routers/admin/users`
  - `/Admin-Backend/app/routers/admin/table-prototype`
  - `/Admin-Backend/app/routers/admin/setting`
  - `/Admin-Backend/app/routers/admin/gameLogs`

If the dev only wants to understand how the app is wired together, these file groups are enough to start.

## 18. Short Version For The Dev

If the dev only reads one section, let it be this:

1. Deploy six things: Mongo, Redis, player frontend, game backend, admin frontend, admin backend.
2. Put Nginx on the Linux host in front of them for SSL and domain routing.
3. Player frontend talks only to game backend.
4. Admin frontend talks only to admin backend.
5. Admin changes reach the player app because both backends share the same Mongo collections.
6. Use `NODE_ENV=prod`.
7. Build the frontends with the correct API URLs baked in.
8. Audit `Admin-Backend/index.js` before production.
