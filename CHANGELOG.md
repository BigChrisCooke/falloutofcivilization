# Changelog

## [Unreleased]

## [0.5.0] - 2026-03-26
[FEATURE] Full skill system — 20 skills across Combat, Active, and Passive categories derived from SPECIAL stats
[FEATURE] Tagged Skills selection after character creation — choose 3 skills that improve at 2x rate
[FEATURE] Skill point allocation UI with floating notification when unspent points are available
[FEATURE] Quest failure system — dialogue options can fail quests, with red styling and toast notifications
[FEATURE] Hidden quest objectives that reveal progressively as earlier steps complete
[FEATURE] New quests: "Get Your Head Checked" (Doc Mitchell), "Rescue Danny" (The King), and "Vault Repairs" (Overseer Hale)
[FEATURE] Inventory tag system — dialogue gates can require any item with a given tag (e.g. feed the dog any food item)
[FEATURE] Fog-of-war pathfinding — click undiscovered tiles to walk into the fog up to 20 tiles
[FEATURE] New saves start inside Vault 47 with opening narrative from Overseer Hale
[FEATURE] Character creation chains into quest completion, tagged skills, and skill allocation
[IMPROVEMENT] The King's Court and Dusty Spur dialogue trees significantly expanded with multi-state branching
[IMPROVEMENT] Dusty Spur layout reworked — bar runs along top row, NPCs spread across the floor
[IMPROVEMENT] "Old Timer" renamed to Doc Mitchell; Overseer Hale opening dialogue reworked
[IMPROVEMENT] Weapon categories standardized to Fallout skill names (Small Guns, Energy Weapons, etc.)
[IMPROVEMENT] Pip-Boy Stats tab now shows all 20 skills grouped by category with tagged-skill badges
[IMPROVEMENT] Item actions on interactables hidden until player examines first
[IMPROVEMENT] Quest-granting dialogue options auto-hidden when quest is already active, completed, or failed
[IMPROVEMENT] Quest complete toast shown as floating overlay on interior map
[IMPROVEMENT] Dialogue options that fail quests styled with red border warning
[IMPROVEMENT] Cue Ball added as a throwable weapon at the Dusty Spur pool table
[IMPROVEMENT] Bar tiles now impassable with darker visual color
[FIX] `consumeItem` now works with tag-gated inventory checks, not just specific item IDs
[FIX] `questFailed` condition now checked in dialogue conditional roots
[FIX] Failed quests now persist correctly across session reloads
[FIX] Inventory tag gate labels display the matched item name instead of blank

## [0.4.0] - 2026-03-25
[FEATURE] Companion token renders on both interior and overworld maps with assigned color
[FEATURE] Companion follows player movement, snapping to nearest unoccupied tile
[FEATURE] Entered-location tracking persisted per save (fog of war foundation)
[FIX] All 10 quests now have proper NPC turn-in dialogue with questComplete (8 were unreachable)
[FIX] Water for the Valley uses NPC turn-in instead of auto-completing on location entry
[IMPROVEMENT] Companion speech indicator only appears when companion has new story content
[IMPROVEMENT] Companion speech indicator shows name first ("Dex ...") instead of "... Dex"
[IMPROVEMENT] Recruited companion NPC suppressed from props layer to avoid duplicate rendering
[IMPROVEMENT] Quest target location highlighted with larger marker on overworld

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
