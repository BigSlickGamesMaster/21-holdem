# Contributing (Backend)

## Branch Strategy
- Base branch: `main`
- Branch naming:
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `chore/<short-name>`
  - `docs/<short-name>`
  - `refactor/<short-name>`
  - `test/<short-name>`

## Commit Format
Use Conventional Commits:
- `feat(auth): add guest login rate limit`
- `fix(poker): prevent skipped turn after stand`
- `docs(readme): add local setup troubleshooting`

Recommended types:
- `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Pull Request Checklist
- [ ] Branch rebased on latest `main`
- [ ] `CHANGELOG.md` updated (Unreleased section)
- [ ] New env variables documented in `.env.example` and README
- [ ] Local checks complete:
  - [ ] `npm run lint`
  - [ ] Manual gameplay/auth regression tested
- [ ] API behavior changes documented

## Versioning Rules
- Follow SemVer:
  - Patch: bug fixes only
  - Minor: backward-compatible features
  - Major: breaking API/game behavior contracts
- Release procedure: `docs/RELEASE.md`

