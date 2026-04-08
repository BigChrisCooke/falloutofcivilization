// Deploy generated terrain tiles to the game.
// Usage (from tools/tiles/):
//   node deploy-to-game.js
//
// Reads output/gen_*.webp and output/int_*.webp, copies to ../../client/public/tiles/gen/
// Prints updated TERRAIN_TILE_IMAGES and INTERIOR_TILE_IMAGES blocks to stdout
// for pasting into scene_visuals.ts

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const DEST_DIR   = path.join(__dirname, '../../client/public/tiles/gen');

// Maps output prefix → game terrain key (must match TERRAIN_TILE_IMAGES keys)
const PREFIX_TO_TERRAIN = {
  gen_sand:  'sand',
  gen_scrub: 'scrub',
  gen_road:  'road',
  gen_rock:  'rock',
  gen_mesa:  'mesa',
  gen_ridge: 'ridge',
  gen_water: 'water',
  gen_dry:   'dry_lake_bed',
};

// Maps output prefix → interior tile type (must match INTERIOR_TILE_IMAGES keys)
const INT_PREFIX_TO_INTERIOR = {
  int_floor: 'floor',
  int_metal: 'metal',
  int_rug:   'rug',
};

// Terrain key order (matches current scene_visuals.ts order)
const TERRAIN_ORDER   = ['sand', 'scrub', 'road', 'rock', 'mesa', 'ridge', 'water', 'dry_lake_bed'];
const INTERIOR_ORDER  = ['floor', 'metal', 'rug'];

// ── Read output/ ──────────────────────────────────────────────────
const genFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('gen_') && f.endsWith('.webp'));
const intFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('int_') && f.endsWith('.webp'));
const allFiles = [...genFiles, ...intFiles];

if (allFiles.length === 0) {
  console.error('No gen_*.webp or int_*.webp files found in output/. Run Auto-Gen All in the browser first.');
  process.exit(1);
}

// Group terrain files by terrain key
const byTerrain = {};
for (const terrain of TERRAIN_ORDER) byTerrain[terrain] = [];

for (const file of genFiles.sort()) {
  for (const [prefix, terrain] of Object.entries(PREFIX_TO_TERRAIN)) {
    if (file.startsWith(prefix + '_')) {
      byTerrain[terrain].push(file);
      break;
    }
  }
}

// Group interior files by interior type
const byInterior = {};
for (const it of INTERIOR_ORDER) byInterior[it] = [];

for (const file of intFiles.sort()) {
  for (const [prefix, interior] of Object.entries(INT_PREFIX_TO_INTERIOR)) {
    if (file.startsWith(prefix + '_')) {
      byInterior[interior].push(file);
      break;
    }
  }
}

// ── Copy all files to client/public/tiles/gen/ ───────────────────
fs.mkdirSync(DEST_DIR, { recursive: true });
let copied = 0;
for (const file of allFiles) {
  fs.copyFileSync(path.join(OUTPUT_DIR, file), path.join(DEST_DIR, file));
  copied++;
}
console.error(`Copied ${copied} files → client/public/tiles/gen/`);

// ── Helper: build a ts block for a Record<string, string[]> ──────
function buildTsBlock(exportName, order, byKey, publicPrefix) {
  const lines = [];
  lines.push(`export const ${exportName}: Record<string, string[]> = {`);
  for (const key of order) {
    const files = byKey[key] ?? [];
    if (!files.length) {
      console.error(`  (no files for "${key}" — leaving empty array)`);
      lines.push(`  ${key}: [],`);
      continue;
    }
    const paths = files.map(f => `"${publicPrefix}${f}"`);
    const joined = paths.join(', ');
    if (joined.length <= 90) {
      lines.push(`  ${key}: [${joined}],`);
    } else {
      lines.push(`  ${key}: [`);
      for (let i = 0; i < paths.length; i += 4) {
        lines.push(`    ${paths.slice(i, i + 4).join(', ')},`);
      }
      lines.push(`  ],`);
    }
  }
  lines.push('};');
  return lines.join('\n');
}

// ── Print both blocks ─────────────────────────────────────────────
console.log('// ─── Paste into client/src/lib/scene_visuals.ts ────────────────────────');
console.log('');
console.log(buildTsBlock('TERRAIN_TILE_IMAGES', TERRAIN_ORDER, byTerrain, '/tiles/gen/'));
console.log('');
console.log('// Note: rock and dry_lake_bed are added automatically in scene_visuals.ts');
console.log('// from TERRAIN_TILE_IMAGES. Only paste the keys below that have files.');
console.log(buildTsBlock('INTERIOR_TILE_IMAGES', INTERIOR_ORDER, byInterior, '/tiles/gen/'));
