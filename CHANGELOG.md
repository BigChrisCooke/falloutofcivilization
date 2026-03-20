# Changelog

## [Unreleased]
[FEATURE] Companion token renders in interior actors layer with fixed assigned color (amber for Dex)
[FEATURE] Companion follows player to nearest unoccupied tile behind them, snapping to closest available in tight spaces
[IMPROVEMENT] Recruited companion NPC suppressed from props layer to avoid duplicate rendering

## [0.3.0] - 2026-03-20

[FEATURE] Post-quest dialogue — all 13 quest-granting NPCs across 11 interiors now have updated greetings after quest completion via `conditionalRoots` system
[FEATURE] Selected quest highlights its target location on the overworld (larger, brighter marker; other markers dim)
[IMPROVEMENT] Double-door exits now show a single "Leave" button instead of two
[IMPROVEMENT] Interactables support explicit x,y positioning to guarantee placement on specific tiles
[FIX] Renamed duplicate NPC "Rex (The Kings)" in Dusty Spur Tavern to "Frankie" to avoid confusion with the cyberdog Rex at King's Court

## [0.2.0] - 2026-03-20

[FEATURE] Quest completion system — quests grant karma, caps, items, and faction standing on completion with yellow flash notification
[FEATURE] Pip-Boy 3000 inventory with SPECIAL-stat-based item descriptions (40+ items with conditional humor text)
[FEATURE] Dialogue system with branching NPC conversations, SPECIAL stat gates, faction standing, and quest grants
[FEATURE] Character creation panel with SPECIAL stat allocation
[FEATURE] 19 new explorable locations with full interior maps, NPCs, loot, and interactables
[FEATURE] 10 authored quests with rewards (save-vault-47, ncr-raider-problem, kings-missing-courier, etc.)
[FEATURE] Hex pathfinding for overworld movement
[FEATURE] Save file deletion with trashcan icon and confirmation prompt
[FEATURE] Known locations panel shown in all maps (overworld and interiors)
[FEATURE] Quest selection persists across Pip-Boy open/close and highlights on overworld map
[FEATURE] Quest map markers auto-discovered when quest is granted
[IMPROVEMENT] Dialogue resets to first screen when leaving and re-entering an area
[IMPROVEMENT] Interior panel layout matches overworld — known locations on left, current tile on right
[IMPROVEMENT] Exit button only shown when within 1 tile of exit, renamed to plain English
[IMPROVEMENT] Clicking anywhere on a tile opens interaction for objects on that tile (no more misclicks on player sprite)
[IMPROVEMENT] Interactable placement algorithm pre-reserves NPC/loot/exit positions to prevent tile overlaps
[IMPROVEMENT] Tile matching prefers exact matches over substring matches for interactable placement
[FIX] Gas station repair kit now discoverable — added missing tile tokens and fixed tile matching
[FIX] Pool table in Dusty Spur Tavern no longer overlaps NPCs
[FIX] Moved overlapping loot items (Sunset Sarsaparilla, Nuka-Cola) off bar counter tiles
[FIX] Quest completion notification stays until clicked (no longer auto-dismisses)

## [0.1.0] - 2026-03-15

Initial vertical slice: registration, login, save creation, overworld stub, vault interior, SQLite persistence, and content validation.
