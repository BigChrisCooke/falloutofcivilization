# Phase 2

Read `docs/todo/initial/phases/_INITIAL.md` first. It is a constant guide for this phase.

## Purpose

Phase 2 is the Chris handoff and AI-safety phase.

The goal is not just to have some AI docs in the repo. The goal is to make the project safe, legible, and guided enough that Chris can keep building the game with AI help without needing a programmer to reinterpret the architecture for him.

This is the final phase in the current initial plan.

## Why This Phase Exists

Phase 1 creates the runnable base.

Phase 2 makes that base usable by Chris in a sustainable way:

- the repo must explain itself
- the AI instructions must match reality
- the common workflows must be one-command and obvious
- the content system must be discoverable
- the safety rails must prevent easy architectural damage

## Primary Outcome

Chris can open the repo, follow the setup docs, use AI help, and safely make changes to content, shell UI, and basic systems without accidentally breaking auth, persistence, routing, or the data-driven content architecture.

## Preconditions

Before Phase 2 starts in earnest:

- Phase 1 runtime structure must exist.
- Build, test, migration, and content validation commands must work.
- The current repo structure must be real enough that documentation can describe reality instead of intent.

## Scope

### 1. Re-ground and verify the repo

Before writing or updating AI guidance:

- re-read `_INITIAL.md`
- re-check the real folder structure
- re-check the real commands
- re-check `AGENTS.md`
- re-check `README.md`
- re-check `.claude/skills/`

Do not write Phase 2 guidance from assumptions. It must describe the actual repo.

### 2. Align `AGENTS.md` with reality

Review and update `AGENTS.md` so it matches the built repository exactly.

It must correctly describe:

- actual workspace directories
- actual stack choices
- actual command names
- actual quality gates
- actual persistence shape
- actual authored content structure
- actual client or backend ownership boundaries

It must also explicitly protect these rules:

- `client/` renders and orchestrates UI only
- `backend/` owns auth, persistence, and API orchestration
- `game/` owns schemas, content definitions, and deterministic helpers
- authored content must remain data-driven
- runtime save state must stay out of authored content files

### 3. Add Claude Code workflow support

Create or update lightweight repo-specific support under `.claude/skills/`.

Minimum expected command-oriented support:

- `/test`
- `/build`
- `/commit`

These do not need to be elaborate. They do need to be accurate, safe, and useful.

Each should describe:

- when to use it
- the exact commands it runs
- what success looks like
- what to do if it fails
- what not to skip

### 4. Decide the actual skills Chris needs

Phase 2 should not create a huge skill library. It should create the smallest set of high-value aids that reduce confusion and prevent damaging edits.

The initial review should decide whether Chris needs docs or skills for:

- test and validation flow
- build verification
- safe commit flow
- content authoring
- map and location linking
- auth and session changes
- save and persistence changes
- client shell edits

Only add the ones that solve real confusion or risk.

### 5. Harden README and onboarding

Make sure `README.md` is strong enough for a non-programmer-assisted workflow.

It should clearly answer:

- how to install dependencies
- how to set up `.env`
- how to run migrations
- how to start the app
- what URLs to open
- how to run tests
- how to validate content
- where content files live
- where save data lives
- what to edit for content changes versus system changes

### 6. Add Chris-safe source-of-truth guidance

Document where Chris should make changes depending on intent.

Examples:

- adding a new location should point to `game/content/locations/`
- adding a new interior map should point to `game/content/maps/interiors/`
- changing login flow should point to `client/` and `backend/`, not content files
- changing persistence should point to migrations and backend repos/services

This guidance can live in `README.md`, `AGENTS.md`, `.claude/skills/`, or a small dedicated doc, but it must exist somewhere obvious.

### 7. Strengthen safety rails

Phase 2 should make the safe path the easy path.

That means:

- tests should be easy to run
- build checks should be easy to run
- content validation should be easy to run
- commit guidance should tell AI to run the right checks
- docs should warn against hardcoding content into UI components
- docs should warn against mixing save state with authored content
- docs should warn against changing architecture by accident

### 8. Review for blind-build usability

Assume Chris has intent but not deep technical judgment.

Review the repo from that perspective:

- can he find the right file to edit?
- can he tell content from runtime state?
- can he tell client from backend from game?
- can he recover from common mistakes?
- can AI find enough local guidance to help him correctly?

If the answer is no, the phase is not done.

## Concrete Deliverables

By the end of Phase 2, the repo should contain:

- an updated `AGENTS.md`
- a current `README.md`
- `.claude/skills/` guidance for `/test`
- `.claude/skills/` guidance for `/build`
- `.claude/skills/` guidance for `/commit`
- any small additional Chris-focused skill docs that prove necessary
- updated phase docs and progress tracking

## Suggested Execution Order

1. Re-read `_INITIAL.md`.
2. Verify the current repo structure and commands.
3. Update `AGENTS.md` to match reality.
4. Update `README.md` to remove ambiguity for first-time and repeat use.
5. Add `.claude/skills/` support for `/test`, `/build`, and `/commit`.
6. Add any missing skill docs for content authoring or safe edits.
7. Re-run the documented commands and make sure the docs still match them.
8. Update `_PROGRESS.md`.

## Exit Criteria

Phase 2 is complete when:

- `AGENTS.md` matches the actual repository and workflow
- `README.md` is accurate for first-time setup and daily use
- `.claude/skills/` contains working guidance for `/test`, `/build`, and `/commit`
- the repo gives Chris enough local guidance to safely edit content, shell UI, and basic systems
- AI instructions clearly protect the architecture boundaries
- the safe path is obvious and repeatable
- Chris can keep building with AI help without needing a programmer to reinterpret the base first

## Anti-Goals

Do not turn Phase 2 into:

- a giant abstract process document
- an overbuilt skill framework with low-value files
- AI instructions that describe a fantasy repo instead of the real one
- a replacement for Phase 1 implementation work

Phase 2 succeeds by making the existing project usable, safe, and extendable for Chris.
