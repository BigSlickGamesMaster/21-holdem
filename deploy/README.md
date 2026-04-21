# Prod-Like Local Stack

This folder provides a repo-local Docker stack that mirrors the production shape from `docs/LINUX_LIVE_DEPLOYMENT_GUIDE.md`, but uses local-safe ports so it can run beside existing dev services.

## Services

- MongoDB: `192.168.0.205:27019`
- Redis: `192.168.0.205:6382`
- Game backend: `http://192.168.0.205:4100`
- Admin backend: `http://192.168.0.205:4151`
- Player frontend: `http://192.168.0.205:3101`
- Admin frontend: `http://192.168.0.205:3102`

## Start

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\deploy
docker compose -f docker-compose.prod-like.yml up -d --build
```

## Stop

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\deploy
docker compose -f docker-compose.prod-like.yml down
```

## Logs

```powershell
Set-Location D:\BIGSLICKGAMES\games\Bigslickgames\deploy
docker compose -f docker-compose.prod-like.yml logs -f game-backend
docker compose -f docker-compose.prod-like.yml logs -f admin-backend
docker compose -f docker-compose.prod-like.yml logs -f player-frontend
docker compose -f docker-compose.prod-like.yml logs -f admin-frontend
```

## Notes

- This is a local production-like topology, not a real SSL/Nginx EC2 deployment.
- `NODE_ENV=prod` is used because the backends rely on that exact value.
- `Admin-Backend/index.js` should still be audited before any real deployment.
- Frontend API endpoints are compiled at image build time. If you change backend ports or domains, rebuild the frontend images.
