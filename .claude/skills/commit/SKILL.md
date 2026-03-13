# /commit

Use this before creating a commit.

## Goal

Make sure the repo is in a safe, reviewable state before committing changes.

## Required Checks

Run from the repo root:

```bash
npm run build
npm run test
npm run content:validate
```

Also run this if database setup or migrations changed:

```bash
npm run db:migrate
```

## Review Checklist

Before commit, verify:

- the change matches the current architecture in `AGENTS.md`
- authored content changes live under `game/content/`
- runtime save or auth changes live under `backend/`
- UI-only changes do not hardcode authoritative game data
- docs are updated if setup or workflow changed

## Commit Guidance

- keep the commit scoped to one logical change when possible
- do not commit failing builds or tests
- do not leave docs describing behavior that no longer exists

## If Unsure

Check:

- `README.md`
- `AGENTS.md`
- `docs/todo/initial/phases/_INITIAL.md`
