# Alignment Plan From `original.md`

This plan exists to align the current runnable base with the original game direction in `docs/todo/initial/original.md`.

## Original Vision Summary

The original direction is:

- an isometric, turn-based RPG
- on a hex map
- with fog of war and expanding exploration
- starting as a courier in a vault
- with interior maps for vaults, caves, buildings, and major landmarks
- with Fallout: New Vegas style faction, quest, and dialogue consequences
- with character-led progression and a secondary vault-growth loop

## Current Reality

The current repo is now a strong base, but it is still mostly a systems-and-shell vertical slice:

- auth works
- save/load works
- content files load
- overworld, vault, and one interior flow exist
- mobile shell exists
- tests, migrations, and AI workflow docs exist

What it does not yet prove:

- isometric or hex-based graphics
- fog of war
- exploration-driven map expansion
- meaningful turn-based movement
- dialogue consequences
- faction logic
- quest logic
- strong visual identity

## Main Gap

The biggest gap between the current repo and the original vision is not backend structure anymore.

It is presentation plus gameplay identity:

- we have the shell
- we do not yet have the visual and systemic feel of the intended game

So the next plan should prioritize:

1. visual exploration foundation
2. map-driven interaction
3. dialogue and faction consequence hooks
4. quest structure
5. progression hooks

## New Plan

## Phase A: Visual Exploration Foundation

Goal:

Turn the placeholder overworld into a real graphical exploration layer.

Deliver:

- render a real hex map instead of a text-like location list
- choose and commit to a first map renderer for the frontend
- support tile selection, hover, and current position
- show a courier marker on the map
- represent fog of war visually
- reveal nearby hexes as the player explores
- load map visuals from authored content instead of hardcoded frontend data

Why first:

This is the fastest way to make the repo feel like the original game instead of a backend demo with UI wrappers.

## Phase B: Interior Map Presentation

Goal:

Make entering a location feel like a real map transition, not just a data panel swap.

Deliver:

- define a graphical interior-map presentation layer
- support different interior themes for vaults, taverns, caves, and landmarks
- load interior map visuals from `game/content/`
- show exits, interactables, NPC placements, and loot markers visually
- improve the transition from overworld to interior and back

Why next:

The original vision depends heavily on locations becoming deeper, themed spaces when entered.

## Phase C: Exploration Systems

Goal:

Give the map a real exploration loop.

Deliver:

- fog of war reveal rules
- movement or action-cost rules for traveling
- discovered-location tracking tied to the visible map
- location discovery events
- a first pass on region expansion logic
- map state updates persisted in save data

Why next:

This is the systemic layer that makes the hex map matter.

## Phase D: Dialogue And Faction Hooks

Goal:

Start proving the Fallout-style consequence layer.

Deliver:

- a dialogue UI flow for NPC encounters
- content-driven dialogue definitions
- faction standing changes from dialogue or choices
- one or two real faction consequence examples
- one recruitable or companion-adjacent content hook

Why next:

The original pitch is not only about movement and maps. It is also about choices and faction relationships.

## Phase E: Quest Structure

Goal:

Introduce the three quest families named in `original.md`.

Deliver:

- one companion-style quest trigger
- one faction quest
- one retrieval quest
- quest state transitions in save data
- quest effects wired into dialogue, faction standing, and locations

Why next:

This is the step where the project stops being “exploration shell plus content” and becomes a real RPG framework.

## Phase F: Character And Vault Progression

Goal:

Align progression with the original vision.

Deliver:

- first pass on character skills
- progression hooks that affect dialogue or exploration
- a small perk or specialization structure
- vault-growth hooks that remain secondary to the courier’s progression
- one or two vault improvements that unlock useful support features

Why last in this sequence:

Progression should be built on top of movement, maps, locations, and quest/faction interaction, not before them.

## Recommended Immediate Next Milestone

Do not try to build all of the above at once.

The next milestone should be:

### Milestone 1: Make The Overworld Feel Like The Game

Deliver this first:

- a real graphical hex map
- a courier marker
- visible fog of war
- click-to-enter authored locations on the map
- improved location transition into one graphical interior

This milestone gives the strongest visible movement toward the original vision with the least ambiguity.

## Rules For The Next Plan

- keep authored content in `game/content/`
- keep rules and validation data-driven
- do not move authoritative gameplay logic into React components
- keep save-state changes in backend persistence
- make visual changes prove game identity, not just decorate existing panels

## Definition Of Success

This alignment plan is succeeding when:

- the first thing you see after login feels like a game world, not a form-driven shell
- the map visually communicates exploration and discovery
- entering locations feels like moving into a different playable space
- early dialogue and faction choices start affecting what happens next
- the repo still stays safe for Chris to build on with AI help
