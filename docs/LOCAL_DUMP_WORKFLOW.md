# Local Dump Workflow

Use this flow when you need current production-like data locally without pointing the app at Atlas.

## Rule

- Do not set any app `.env` file back to an Atlas URI.
- Do not run the app directly against Atlas.
- Only use a backend-approved dump file or dump directory.

## What This Uses

- Local Docker MongoDB service from [docker-compose.yml](d:/BIGSLICKGAMES/games/Bigslickgames/docker-compose.yml)
- Local Docker Redis service from [docker-compose.yml](d:/BIGSLICKGAMES/games/Bigslickgames/docker-compose.yml)
- Restore helper [scripts/restore-holdem-dump.ps1](d:/BIGSLICKGAMES/games/Bigslickgames/scripts/restore-holdem-dump.ps1)

## Accepted Inputs

The restore helper supports either:

- a `mongodump` directory
- a compressed archive such as `dump.archive.gz`

Preferred source from backend owner:

```powershell
mongodump --uri "<approved-source-uri>" --archive="holdem.archive.gz" --gzip
```

## Restore Local Data

From the workspace root:

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames
.\scripts\restore-holdem-dump.ps1 -DumpPath "D:\backups\holdem.archive.gz" -StartAdminStack
```

If you receive a dump directory instead:

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames
.\scripts\restore-holdem-dump.ps1 -DumpPath "D:\backups\holdem-dump" -StartAdminStack
```

What the script does:

- starts local `mongodb` and `redis`
- drops the local `holdem` database
- restores the supplied dump into local MongoDB
- optionally starts `admin-backend` and `admin-frontend`

## URLs After Restore

- Admin frontend: `http://localhost:3001`
- Game frontend: `http://localhost:3100`

## Notes

- This workflow keeps the application pointed at local Docker MongoDB only.
- If you want to inspect game data as well, start the game services after restore:

```powershell
docker compose up -d game-backend game-frontend
```

- If the backend owner provides a new dump, rerun the restore script. It replaces the local database.