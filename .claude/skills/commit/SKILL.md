---
name: commit
description: Commit the current session's changes with a structured message and update CHANGELOG.md [Unreleased] section. Use when the user asks to commit their work.
---

# Commit Skill - Stage, Changelog & Commit

Commit the current session's changes and record them in the changelog.

## Steps

### 1. Understand what changed

Run these to see all modified files:

```bash
git status
git diff HEAD
```

### 2. Identify session-relevant files

Cross-reference the changed files with the **current conversation history** to determine which files belong to this work session.

- Stage only the files related to the current session using `git add <file> <file> ...`
- **Never** run `git add -A` or `git add .` blindly
- If you find changed files that are **not** related to the current session, **list them clearly** in your response but do NOT stage them - the user may have unrelated in-progress work

### 3. Categorise the changes

Review the staged diff (`git diff --cached`) and categorise changes using exactly these tags:

| Tag | When to use |
|-----|-------------|
| `[FEATURE]` | New functionality added |
| `[IMPROVEMENT]` | Enhancement to existing functionality, UX improvement, performance |
| `[FIX]` | Bug fix, error correction, broken behaviour resolved |

Write 1 line per distinct change. Be specific but concise. Examples:
```
[FEATURE] Alliance ownership transfer with confirmation dialog
[IMPROVEMENT] World map rendering optimised for mobile WebView
[FIX] Colonise button no longer appears on already-owned islands
```

### 4. Update CHANGELOG.md

Read `CHANGELOG.md` from the project root.

Find the `## [Unreleased]` section (always at the top) and append new entries directly under it - one `[TAG] message` per line. Do not add sub-headings like `### Added`. Do not duplicate entries that are already listed.

Before writing entries, do a quick dedupe pass:
- Read the current `## [Unreleased]` lines first
- Check whether the same change is already covered with different wording
- Prefer replacing two narrow lines with one broader line when that improves readability

`[Unreleased]` is just a staging area - it gets promoted to a real version every time the `build` skill runs. Nothing lives there permanently.

If `## [Unreleased]` does not exist, add it at the top of the file after the `# Changelog` heading.

If `CHANGELOG.md` does not exist, create it:
```markdown
# Changelog

## [Unreleased]
```

Stage the updated changelog:
```bash
git add CHANGELOG.md
```

### 5. Run quality checks

Run from the repo root:

```bash
npm run build
npm run test
npm run content:validate
```

Also run this if the session touched shared DB code, migrations, repos, or deployment/runtime config for the SQLite/Postgres path:

```bash
npm run db:migrate
```

If `TEST_DATABASE_URL` is available and the session touched Postgres-sensitive code or release wiring, also run:

```bash
npm run test:postgres
```

If `TEST_DATABASE_URL` is not available, say that the Postgres smoke check was skipped instead of implying both drivers were verified.

Do not commit if the relevant checks fail.

### 6. Write a conventional commit message

Determine the primary change type for the commit subject:
- Mostly new features -> `feat:`
- Mostly fixes -> `fix:`
- Refactors / maintenance -> `chore:`
- Documentation -> `docs:`
- Tests -> `test:`

Write a short subject line (50 chars max) plus an optional body listing the main changes.

### 7. Commit

```bash
git commit -m "$(cat <<'EOF'
<subject line here>

<optional body listing key changes>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Do NOT push.** Pushing is handled by the `build` skill.

### 8. Report back

Tell the user:
- Which files were staged and committed
- Which files (if any) were skipped as unrelated
- The changelog entries added
- The commit hash
