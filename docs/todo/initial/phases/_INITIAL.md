# Initial Phase Guide

Read this file before working from any file in `docs/todo/initial/phases/`.

## Core Purpose

The main goal of this project is to give Chris a base he can vibe program on to make the game better.

Chris is not a programmer, so the base must be strong enough that he can develop and build the game mostly blind without needing to reverse-engineer architecture, setup, or hidden rules.

## What This Means In Practice

Every phase should optimize for:

- clear structure
- safe defaults
- visible progress
- strong documentation
- minimal hidden setup
- repeatable commands
- fail-fast validation
- data-driven content
- guardrails that prevent easy breakage

## Constant Rules

- `client/` renders UI and calls backend APIs.
- `backend/` handles auth, persistence, API orchestration, and save handling.
- `game/` is the source of truth for rules, schemas, and authored content.
- Authored content must be data-driven, not hardcoded into UI flow.
- Runtime save state must stay separate from authored content files.

## Chris-Focused Requirements

The repo should be understandable and usable by someone who is creative and motivated but not deeply technical.

That means:

- setup must be documented
- commands must be obvious
- errors should fail fast and say what is wrong
- folder ownership should be clear
- content formats should be explicit
- example content should exist
- auth and save flows should already work
- AI support docs and skills should be present by the final phase

## How To Use The Phase Files

- Read this file first.
- Then read the active `PHASE-*.md` file.
- Update `_PROGRESS.md` whenever meaningful progress is made.
- Treat the phase files as execution guides, not vague idea lists.

## Success Standard

The repo is successful when Chris can clone it, set it up, run it, log in, load into the basic game shell, inspect the content structure, and keep building from there with AI help and without needing a programmer to reinterpret the base architecture for him.
