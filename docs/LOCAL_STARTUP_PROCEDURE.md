# Local Startup Procedure

Last verified: 2026-03-29

Safe data note:

- Do not point local services at Atlas.
- If you need fresh data, use the dump workflow in [docs/LOCAL_DUMP_WORKFLOW.md](d:/BIGSLICKGAMES/games/Bigslickgames/docs/LOCAL_DUMP_WORKFLOW.md).

This is the safe local bring-up procedure for this workspace after a PC restart.

Workspace root:

- `D:\BIGSLICKGAMES\games\Bigslickgames`

Use this when the stack was working before a reboot and just needs to be brought back up without editing tracked files.

## Goal

Bring the local stack back up with the same shape used in the last working session:

- MongoDB in Docker on `27017`
- Redis in Docker on `6379`
- Game backend on `4000`
- Admin backend on `3051`
- Main frontend on `3002`
- Admin frontend on `3003`

## Guardrails

Do this first before touching code:

- Do not rewrite `.env` files just to recover from a reboot.
- Do not edit frontend API files just to get a dev server open.
- Do not rebuild or rework Docker Compose unless Docker containers are genuinely missing.
- Do not start the `web` services from the repo compose files unless someone explicitly asks for the app to run in containers.
- Prefer terminal-only environment overrides for one-off startup needs.

This workspace is currently safest when:

- Docker provides MongoDB and Redis
- Node runs both backends locally
- CRA runs both frontends locally

## 1. Preflight Checks

From the workspace root in PowerShell:

```powershell
docker ps -a
```

What you want to see:

- a Mongo container already available locally
- a Redis container already available locally

Common running names seen in this workspace:

- `holdem_mongo`
- `holdem_redis`
- `mongodb-1`
- `redis`

Quick port checks:

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 27017,6379,4000,3051,3002,3003 } |
  Select-Object LocalAddress, LocalPort, OwningProcess |
  Sort-Object LocalPort
```

## 2. Start Docker Infra Only If Needed

If Mongo and Redis are already listening on `27017` and `6379`, leave them alone.

If they exist but are stopped, start the existing containers instead of recreating them:

```powershell
docker start holdem_mongo holdem_redis
```

If those names do not exist, check the older local names:

```powershell
docker start mongodb-1 redis
```

If neither name pair exists, then inspect `docker ps -a` and start the existing local Mongo and Redis containers by name.

## 3. Start Game Backend

Open a dedicated terminal and run:

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\game-backend
npm start
```

Expected healthy output includes:

- `Database connected`
- `Redis Connected Successfully`
- `Spinning on 4000`

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/ping
```

Expected result:

- HTTP `200`
- body `{}`

## 4. Start Admin Backend

Open a second terminal and run this exact command:

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\Admin-Backend
$env:AWS_REGION='us-east-1'
$env:AWS_SES_REGION='us-east-1'
$env:AWS_ACCESSKEYID='local-dev-key'
$env:AWS_SECRETKEY='local-dev-secret'
node index.js
```

Why the temporary AWS variables are needed:

- the current local `Admin-Backend/.env` has blank AWS fields
- the S3 client is created at startup
- without a region, the backend exits with `Error: Region is missing`

Expected healthy output includes:

- `Database connected`
- `Redis Connected Successfully`
- `Spinning on 3051`

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3051
```

Expected result:

- route error is acceptable
- a response like `{"message":"Route not found"}` proves the server is up

## 5. Start Main Frontend On 3002

Open a third terminal and run:

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames
$env:PORT='3002'
$env:BROWSER='none'
$env:REACT_APP_API_ENDPOINT='http://localhost:4000'
npm start
```

Notes:

- use `3002` when `3000` and `3001` are already busy
- `BROWSER='none'` prevents noisy auto-open behavior
- the API endpoint override avoids depending on whatever root `.env` last contained

Main app URL:

- `http://localhost:3002`

## 6. Start Admin Frontend On 3003

Open a fourth terminal and run:

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\Admin-Frontend
$env:PORT='3003'
$env:BROWSER='none'
$env:REACT_APP_API_ENDPOINT='http://localhost:3051'
npm start
```

Admin app URL:

- `http://localhost:3003`

Important limitation:

- `Admin-Frontend/src/axios.js` currently hardcodes its base URL path in a way that does not fully respect this environment variable during development startup
- this procedure is for safe restart only
- do not edit that file as part of normal reboot recovery unless a separate task explicitly asks for admin frontend API wiring cleanup

## 7. First-Load Expectations

After a reboot, CRA can take a while to become responsive.

Normal behavior:

- terminal shows `Starting the development server...`
- the port may listen before the page responds quickly
- first compile can take up to a minute or more on a cold start

This by itself is not a reason to change code or config.

## 8. Verification Checklist

Backends:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:4000/ping
Invoke-WebRequest -UseBasicParsing http://localhost:3051
```

Ports:

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 4000,3051,3002,3003 } |
  Select-Object LocalAddress, LocalPort, OwningProcess |
  Sort-Object LocalPort
```

Browser targets:

- main app: `http://localhost:3002`
- admin app: `http://localhost:3003`

## 9. Fast Failure Guide

### Docker is up but APIs are not

Start the two backends first. The frontends depend on them.

### `Error: Region is missing`

You started the admin backend without the temporary AWS environment variables.

Use the exact launch block from section 4.

### `3000` or `3001` is busy

Use:

- main frontend on `3002`
- admin frontend on `3003`

### Frontend port is listening but the page is slow

Wait for the first CRA compile to finish before changing anything.

### A compose `web` container is failing

Ignore it for normal reboot recovery.

This workspace was last recovered successfully using:

- Docker only for data services
- local Node processes for the app services

## 10. Shutdown

Stop the stack by terminating the individual terminals that were used to start:

- `game-backend`
- `Admin-Backend`
- root frontend
- `Admin-Frontend`

Do not remove containers as part of normal shutdown.

## 11. Safe Recovery Summary

If this is just a reboot recovery, the shortest safe sequence is:

```powershell
# terminal 1
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\game-backend
npm start

# terminal 2
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\Admin-Backend
$env:AWS_REGION='us-east-1'
$env:AWS_SES_REGION='us-east-1'
$env:AWS_ACCESSKEYID='local-dev-key'
$env:AWS_SECRETKEY='local-dev-secret'
node index.js

# terminal 3
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames
$env:PORT='3002'
$env:BROWSER='none'
$env:REACT_APP_API_ENDPOINT='http://localhost:4000'
npm start

# terminal 4
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\Admin-Frontend
$env:PORT='3003'
$env:BROWSER='none'
$env:REACT_APP_API_ENDPOINT='http://localhost:3051'
npm start
```

That is the documented restart path unless a future task explicitly changes the local topology.