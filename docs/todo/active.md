# Things to do
# Add things in here that you're actively working on
# Sometimes can be fleshed out and waiting for you to copy and paste to AI
To add a new battle type later: create arena_combat_service.ts, import the same pure functions from game/src/rules/combat.ts, follow the rollFn constructor pattern, add arena_combat_service.test.ts. No base class changes needed.

1.) Choose a class with Doc Mitchell like it's TTRPG, don't get stuck in the stats table, that can happen in the background.

2.) just cos it's turned based, don't need to wait and do nothing. Sea of Stars gives you the ability to click at the right time for a well-times boost.

Make the Dusty Tavern a Companion choice

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