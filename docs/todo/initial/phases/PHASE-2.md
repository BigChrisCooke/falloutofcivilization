# Phase 2

Read `docs/todo/initial/phases/_INITIAL.md` first. It is a constant guide for this phase.

## Purpose

Align all AI-assisted workflow, skills, documentation, and safety rails so Chris can keep building on the project safely and with minimal technical guesswork.

This is the final phase in the current initial plan.

## Primary Outcome

The repo includes the right AI-oriented instructions, guardrails, command flows, and documentation so Chris can vibe program on the project safely without losing architectural consistency or breaking the base platform accidentally.

## Scope

### 1. Agent alignment

- Review and update `AGENTS.md` against the real repository structure and workflows.
- Make sure `AGENTS.md` matches the built project, not just intended architecture.
- Make sure the architecture rules, workflow commands, and quality gates are accurate.

### 2. Claude Code workflow support

- Add or update Claude Code support under `.claude/skills/`.
- Provide support for `/test`.
- Provide support for `/build`.
- Provide support for `/commit`.
- Make sure each workflow is explicit, safe, and based on real commands in this repo.

### 3. Skill review for Chris

- Review what skills Chris actually needs to keep moving without deep programming knowledge.
- Add lightweight skill docs for the highest-value tasks.
- Focus on skills that reduce ambiguity and prevent bad edits.

Suggested areas to cover:

- testing and validation
- build verification
- safe commit workflow
- auth and session changes
- content authoring and validation
- map and location content wiring
- frontend shell changes
- save and persistence changes

### 4. Documentation hardening

- Make sure `README.md` is complete for first-time setup and everyday use.
- Make sure docs point to the right source-of-truth files.
- Make sure the phase docs and progress tracker stay current.
- Add practical examples where Chris is likely to need them.

### 5. Safety and maintenance rails

- Make sure validation catches malformed content early.
- Make sure tests and build commands are the default safety path before commits.
- Make sure the repo does not rely on undocumented manual steps.
- Make sure AI instructions steer changes toward data-driven content and away from hardcoded gameplay logic.

## Exit Criteria

- `AGENTS.md` matches the real repository and workflow.
- `.claude/skills/` contains the needed guidance or command docs for `/test`, `/build`, and `/commit`.
- Chris-facing setup and workflow docs are accurate and easy to follow.
- The repo has clear AI-friendly guidance for safe changes to auth, frontend shell, content, and persistence.
- The project can be extended by Chris with AI help without requiring a programmer to reinterpret the foundations first.
