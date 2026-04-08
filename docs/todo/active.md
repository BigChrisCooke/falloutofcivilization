# Things to do
# Add things in here that you're actively working on
# Sometimes can be fleshed out and waiting for you to copy and paste to AI
To add a new battle type later: create arena_combat_service.ts, import the same pure functions from game/src/rules/combat.ts, follow the rollFn constructor pattern, add arena_combat_service.test.ts. No base class changes needed.

continue Convert PNG sand files to WebP format claude history tab

For the hex tile generator at:
http://localhost:7700/

There's a lot of variants for grass, but we need, sand, rocks, meza, mountains, boulders, broken road, dirt; as well as indoor tyles such as wood, metal, carpet, tiles.

How do we expand the scope of the hex tile generator to make all these options?

Also I'd like to have the option to randomize a bunch of options, and then select which to keep and which to reject, so that I can quickly come up with a large variety of tiles, without having to do each one manually.

Looks like Civ 4, 5, Northgard, and endless legend, with the bottom of the screen dialogue box from warhammer 40k mechanicus.
Here's the plan for the order of image work
C:\Users\Mr. Big Boss Chris\.claude\plans\cheerful-stargazing-quail.md

need a loading screen to "pre-fetch" all the images

"i have a lot of images for the game, first check if the web server is setup to handle multiple requests and if there is a bottleneck serving the images, second plan a loading screen so images can be prefetched with a progress bar"

2.) just cos it's turned based, don't need to wait and do nothing. Sea of Stars gives you the ability to click at the right time for a well-timed boost to damage.
learn from warhammer 40k mechanicus for turn based combat, with dialogue at the bottom of the screen, the ability to run and recharge Action Points, and use them to sprint or fire more powerful weapons.

have interactable arena mechanics (flammable and exploding things)


Make Scavenge in the Dusty Tavern, give you the dialogue option of joining you as your Companion if you feed him and pet him twice.

Use Buffs, debuffs, status effects, perks, all stacking, and change with companion (who's sub class you can choose for some interesting options)

Need to do indoor tiles

Need to update all other tiles

More variety

Need character graphics

I'm worried about these new, more detailed graphics making the game load slower online. Is there a more efficient way to load them quickly, happy to lose some image quality, or only load the tiles nearest to the player, rather than pre-load them all at once. What's best practice for this  type of isometric exploration RPG?

with 100 separate PNGs at ~34 MB, you've got three distinct problems stacking on top of each other. Here's the priority order:
1 is done!
1. Convert to WebP (biggest bang for least effort)
You said you're happy to lose some image quality. WebP typically cuts PNG file sizes by 60–80%. Your 34 MB would likely drop to ~7–12 MB. Zero code changes needed — just replace the files.


# One-liner with cwebp (install via: brew install webp or choco install webp)
for f in client/public/tiles/*.png; do cwebp -q 80 "$f" -o "${f%.png}.webp"; done
Then update the path references from .png → .webp in scene_visuals.ts. PixiJS handles WebP natively — nothing else changes.

Quality setting: -q 80 is nearly indistinguishable from lossless for pixel-art style tiles. Drop to -q 65 if you want maximum size reduction.

2. Texture Atlas (biggest performance win, moderate effort)
Right now you have 100 separate GPU texture uploads and 100 HTTP requests. A spritesheet packs them into one image with one HTTP request and one GPU upload. PixiJS was literally designed around this.

Tool: free-tex-packer (free, GUI or CLI):


npm install -g free-tex-packer-core
# Packs all tiles into atlas.png + atlas.json
free-tex-packer-core --source client/public/tiles/ --output client/public/ --name atlas
Then in scene_visuals.ts, replace the loop of Assets.load() calls with:


await Assets.load('/atlas.json');  // one load, all textures registered
// Then: Texture.from('dirt_1') works exactly as before
This eliminates the sequential loading waterfall — instead of 100 serial round-trips, it's one.

3. Viewport Culling (medium effort, reduces render cost in-session)
The current code creates sprites for every tile on the map regardless of whether they're visible. For a 20×20 map that's fine, but your overworld is larger.

The pattern: only create/show Sprite objects for tiles within the camera viewport, and destroy/hide them as the player moves. PixiJS Container's cullable property and CullingMixin can do this automatically:


container.cullable = true; // PixiJS v8 — skips render for off-screen sprites
This is a one-liner for render culling. Full object pooling (create/destroy sprites as you pan) is more work and only worth it if you have 50×50+ maps.

Recommended Order
Step	Effort	Impact
Convert PNGs → WebP	1 hour	34 MB → ~8 MB, faster initial load
Texture atlas	Half day	100 requests → 1, eliminates serial waterfall
container.cullable = true	10 minutes	Reduces GPU overdraw while panning
Lazy chunk loading	2–3 days	Only worth it if atlas still too large
Start with WebP + atlas — those two together will make the load feel near-instant even on a slow connection. Culling is a nice-to-have on top.



starter framework for RPG systems
# Hex RPG Starter Framework (Godot - GDScript style pseudo-code)
# This is a clean, modular starting point for a turn-based hex RPG

# =========================
# CORE GAME MANAGER
# =========================
class_name GameManager

var current_state = "player_turn"
var turn_order = []
var current_unit_index = 0

func start_battle(units):
    turn_order = units
    current_unit_index = 0
    next_turn()

func next_turn():
    if turn_order.size() == 0:
        return

    var unit = turn_order[current_unit_index]
    current_unit_index = (current_unit_index + 1) % turn_order.size()

    if unit.is_player:
        current_state = "player_turn"
    else:
        current_state = "enemy_turn"
        unit.take_ai_turn()

# =========================
# UNIT SYSTEM
# =========================
class_name Unit

var name = ""
var hp = 100
var max_hp = 100
var ap = 2
var position = Vector2()
var is_player = true

func move_to(target_hex):
    position = target_hex

func take_damage(amount):
    hp -= amount
    if hp <= 0:
        die()

func die():
    queue_free()

func take_ai_turn():
    # Simple AI placeholder
    print(name + " takes AI turn")

# =========================
# HEX GRID SYSTEM
# =========================
class_name HexGrid

var tiles = {}

func get_neighbors(hex):
    var directions = [
        Vector2(1, 0), Vector2(-1, 0),
        Vector2(0, 1), Vector2(0, -1),
        Vector2(1, -1), Vector2(-1, 1)
    ]

    var results = []
    for dir in directions:
        results.append(hex + dir)
    return results

func distance(a, b):
    return max(abs(a.x - b.x), abs(a.y - b.y))

# =========================
# COMBAT SYSTEM
# =========================
class_name CombatSystem

func attack(attacker: Unit, defender: Unit):
    var damage = calculate_damage(attacker, defender)
    defender.take_damage(damage)

func calculate_damage(attacker, defender):
    return 10  # placeholder

# =========================
# ABILITY SYSTEM
# =========================
class_name Ability

var name = ""
var cost = 1

func execute(user: Unit, target: Unit):
    pass

class_name AttackAbility
extends Ability

func execute(user, target):
    target.take_damage(10)

# =========================
# DIALOGUE SYSTEM
# =========================
class_name DialogueNode

var text = ""
var choices = []

class Choice:
    var text = ""
    var next_node = null

class_name DialogueSystem

var current_node = null

func start_dialogue(node):
    current_node = node
    show_node()

func show_node():
    print(current_node.text)
    for choice in current_node.choices:
        print(choice.text)

func choose(index):
    current_node = current_node.choices[index].next_node
    show_node()

# =========================
# INPUT HANDLER
# =========================
class_name InputHandler

func handle_click(hex_position):
    print("Clicked hex: ", hex_position)

# =========================
# GAME LOOP EXAMPLE
# =========================
func example_setup():
    var player = Unit.new()
    player.name = "Player"
    player.is_player = true

    var enemy = Unit.new()
    enemy.name = "Enemy"
    enemy.is_player = false

    var game = GameManager.new()
    game.start_battle([player, enemy])
I’ve built you a clean, modular starter framework in the canvas. This isn’t just random code—it’s structured the way real games scale without collapsing.

Let me walk you through how to actually use this (this part matters more than the code).

🧠 How This Framework Thinks

This is split into independent systems:

GameManager → controls turn flow
Unit → characters (player + enemies)
HexGrid → movement + positioning logic
CombatSystem → damage rules
Ability → skills/actions
DialogueSystem → branching conversations
InputHandler → player interaction

👉 That separation is what stops your game from turning into spaghetti.

🎮 What You Should Build Next (in order)

Don’t try to “finish the game.” That’s how people fail.

Step 1 — Make turns visible
Print whose turn it is
Cycle player → enemy → player

👉 Goal: see the loop working

Step 2 — Click → Move on hex grid
Connect InputHandler → Unit.move_to()
Highlight valid hexes (even just print for now)

👉 Goal: player can move

Step 3 — Add basic combat
Click enemy → call CombatSystem.attack()

👉 Goal: you can damage something

Step 4 — Add 1 ability
Use AttackAbility
Hook into UI or key press

👉 Goal: system becomes extensible

Step 5 — Dialogue prototype
Create 2–3 DialogueNodes
Branch choices

👉 Goal: prove narrative system works

⚠️ Where You’ll Mess This Up (and how to avoid it)

Let me be blunt—these are the traps:

❌ 1. Mixing systems together

Don’t put combat logic inside Unit.
Don’t put dialogue inside GameManager.

👉 Keep systems separate or you’ll regret it fast.

❌ 2. Overbuilding too early

No inventories
No skill trees
No save system

👉 Earn complexity only after core loop works

❌ 3. Ignoring visual feedback

Even basic:

print statements
simple highlights

👉 If you can’t see the system, you can’t debug it

🔥 Biggest Upgrade You Can Add Next

Once this works, I’d push you to add:

A* Pathfinding on hex grid

That’s when your game starts feeling real

🧭 Strategic Advice (important)

Right now you’re not “making a game.”

You’re building:

a reusable RPG engine for yourself

If you get this right:

New abilities = trivial
New enemies = trivial
New levels = trivial

If you get it wrong:

Every feature = pain
If you want next step

I can take this further and give you:

1. Visual scene structure in Godot Engine

(how to wire nodes properly)

2. Proper hex coordinate system (cube coords vs axial)
3. AI behavior system (so enemies aren’t dumb)
4. UI layer (abilities, dialogue, combat log)
