# Contributing (Frontend)

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
- `feat(game-ui): add raise+stand button state`
- `fix(lobby): prevent stale table list on reconnect`
- `docs(readme): add local startup flow`

Recommended types:
- `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Pull Request Checklist
- [ ] Branch rebased on latest `main`
- [ ] `CHANGELOG.md` updated (Unreleased section)
- [ ] New env variables documented in `.env.example` and README
- [ ] Local checks complete:
  - [ ] `npm run lint`
  - [ ] `npm run build`
  - [ ] Manual smoke test for login/lobby/table flow
- [ ] UI behavior changes documented in PR notes

## Versioning Rules
- Follow SemVer:
  - Patch: bug fixes only
  - Minor: backward-compatible features
  - Major: breaking UX/API contract changes
- Release procedure: `docs/RELEASE.md`

