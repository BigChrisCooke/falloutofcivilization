# /build

Use this when you need to verify the repo still compiles cleanly after changes.

## Run From

Run from the repo root.

## Command

```bash
npm run build
```

## What It Covers

- `game` TypeScript build
- `backend` TypeScript build
- `frontend` Astro build

## Success Looks Like

- all workspaces build successfully
- no TypeScript errors
- no Astro build errors

## If It Fails

- fix the first real error before chasing later ones
- if the failure is in `frontend/`, do not patch backend files blindly
- if the failure is in `backend/`, check imports, types, and config paths
- if the failure is in `game/`, check schema and loader changes first

## Pair With

Usually pair `/build` with:

```bash
npm run test
```
