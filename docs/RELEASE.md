# Release Process (Frontend)

## Versioning
Frontend uses Semantic Versioning: `MAJOR.MINOR.PATCH`.

Use:
- Patch (`x.y.Z`): bug fixes
- Minor (`x.Y.z`): backward-compatible features
- Major (`X.y.z`): breaking behavior changes

## Release Checklist
1. Ensure working tree is clean:
```powershell
git status
```

2. Pull latest main and create release branch:
```powershell
git checkout main
git fetch origin
git pull origin main
git checkout -b chore/release-vX.Y.Z
```

3. Update:
- `CHANGELOG.md` (`[Unreleased]` -> `[X.Y.Z] - YYYY-MM-DD`)
- `package.json` version (`X.Y.Z`)

4. Validate locally:
```powershell
npm run lint
npm run build
```

5. Commit and merge:
```powershell
git add -A
git commit -m "chore(release): frontend vX.Y.Z"
```

6. Tag release:
```powershell
git tag frontend-vX.Y.Z
git push origin main
git push origin frontend-vX.Y.Z
```

## Hotfix Procedure
1. Branch from latest production tag:
```powershell
git checkout -b fix/hotfix-vX.Y.Z frontend-vX.Y.(Z-1)
```
2. Apply minimal fix, update changelog, run validation.
3. Release as next patch version.

