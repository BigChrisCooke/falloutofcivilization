---
name: build
description: Run all tests, bump the version, update CHANGELOG.md, commit, and release. Use when the user is ready to release.
---

# Build Skill - Test, Version, Commit & Release

Full release pipeline: tests -> version bump -> changelog -> commit -> push -> verify.

**Arguments:** $ARGUMENTS

- No argument -> full build (run tests, version, commit, push, post-push tests)
- `quick` -> skip tests. Jump straight to step 2. Use when you know the code is clean.

## Steps

### 1. Run tests

```bash
npm run build
npm run test
npm run content:validate
```

If the release touches shared DB code, migrations, repos, or deployment/runtime config for the dual SQLite/Postgres path (for example `backend/src/db/`, `backend/src/repos/`, `backend/src/shared/config.ts`, `start.sh`, `render.yaml`, `Dockerfile`, `client/vite.config.ts`, `client/src/lib/runtime_config.ts`, or `client/public/runtime-config.js`), also run:

```bash
npm run db:migrate
```

If `TEST_DATABASE_URL` is available for this environment, also run:

```bash
npm run test:postgres
```

If `TEST_DATABASE_URL` is not available, explicitly report that the Postgres smoke check was skipped.

**If any checks fail, STOP immediately.** Report the failures to the user. Do not proceed with the release.

### 2. Determine version bump

Read `CHANGELOG.md` from the project root and inspect the `## [Unreleased]` section.

Auto-determine the bump type:
- If the changelog contains any `[FEATURE]` entry -> **minor** bump (0.x.0)
- If entries are only `[FIX]` and/or `[IMPROVEMENT]` -> **patch** bump (0.0.x)
- Explicitly contains a breaking change note -> **major** bump (x.0.0) *(rare - confirm with user)*

If the `[Unreleased]` section is empty or missing entries, ask the user if they still want to release.

### 3. Calculate new version

Read the current version from root `package.json` (`"version"` field).

Apply the bump:
- patch: `0.1.0` -> `0.1.1`
- minor: `0.1.0` -> `0.2.0`
- major: `0.1.0` -> `1.0.0`

### 4. Update CHANGELOG.md

In `CHANGELOG.md`:
1. Rename `## [Unreleased]` -> `## [X.Y.Z] - YYYY-MM-DD` (today's date in ISO format)
2. Add a fresh `## [Unreleased]` at the top (above the new versioned section)

Before finalising, do a polish pass:
- Remove duplicated or near-duplicated entries within the release
- Merge setup/follow-up lines that describe one improvement
- Keep entries concise; prefer short summaries over implementation detail

Example transformation:
```
# Changelog

## [Unreleased]
[FEATURE] New thing

## [0.1.0] - 2026-02-24
...
```
Becomes:
```
# Changelog

## [Unreleased]

## [0.2.0] - 2026-02-25
[FEATURE] New thing

## [0.1.0] - 2026-02-24
...
```

### 5. Update package.json version

Edit the root `package.json` and set `"version": "X.Y.Z"` to the new version.

### 6. Commit the release

```bash
git add CHANGELOG.md package.json
git commit -m "$(cat <<'EOF'
chore: release vX.Y.Z

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7. Push

Check the current branch:

```bash
git branch --show-current
```

**If on main:** push directly:
```bash
git push
```

**If on a feature branch:** push and create a PR to main, then merge it:
```bash
git push -u origin <branch>
gh pr create --title "Release vX.Y.Z" --body "$(cat <<'EOF'
## Release vX.Y.Z

### Changes
<paste the changelog entries for this version>

EOF
)"
gh pr merge --merge --delete-branch
git checkout main && git pull
```

### 8. Post-push verification

Run the tests again to confirm everything is green:
```bash
npm run build
npm run test
```

If step 1 required the dual-driver checks, rerun the relevant `npm run db:migrate` and `npm run test:postgres` verification here too, or report that Postgres verification remained skipped because `TEST_DATABASE_URL` was unavailable.

If tests fail, **report immediately** - do not hide the failure.

### 9. Report back

Tell the user:
- Previous version -> new version
- Bump type and why
- PR URL (if a PR was created) or direct push confirmation
- Test results (pre and post push)
- Any issues encountered
