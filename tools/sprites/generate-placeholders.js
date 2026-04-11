// Generate placeholder character sprite sheets for PixiJS.
// Usage (from tools/sprites/):
//   npm install
//   node generate-placeholders.js
//
// Outputs courier_placeholder.png/.json and npc_placeholder.png/.json
// to client/public/sprites/
//
// Layout: 4 frames wide × 6 direction rows tall = 192×384 px per sheet
// Directions (rows): ne, e, se, sw, w, nw
// Animation key format: idle_se, idle_ne, etc.

const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const FRAME_W = 48;
const FRAME_H = 64;
const FRAMES = 4;
const DIRS = ['ne', 'e', 'se', 'sw', 'w', 'nw'];

const DEST_DIR = path.join(__dirname, '../../client/public/sprites');

// RGBA hex colors
const COURIER = {
  shadow: 0x120d0a60,
  body:   0x8a4f39ff,
  head:   0xf0d4bfff,
  accent: 0x2f5a64ff,
  outline:0x2b1e16ff,
};

const NPC = {
  shadow: 0x120d0a60,
  body:   0x5e5e5eff,
  head:   0x9a8e80ff,
  accent: 0x444444ff,
  outline:0x1a1a1aff,
};

// Direction indicator offsets from body centre (dx, dy)
const DIR_OFFSETS = {
  ne: [  6, -6 ],
  e:  [ 10,  0 ],
  se: [  6,  6 ],
  sw: [ -6,  6 ],
  w:  [ -10, 0 ],
  nw: [ -6, -6 ],
};

// Idle bob per frame
const BOB = [0, -2, -3, -2];

function fillRect(img, x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      img.setPixelColor(color, x + dx, y + dy);
    }
  }
}

function fillCircle(img, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        img.setPixelColor(color, cx + dx, cy + dy);
      }
    }
  }
}

function drawFrame(img, palette, dir, frameIdx, x, y) {
  const cx = x + Math.floor(FRAME_W / 2);
  const cy = y + Math.floor(FRAME_H / 2);
  const bob = BOB[frameIdx];

  // Shadow (ellipse approximated as squashed circle)
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      if ((dx * dx) / (12 * 12) + (dy * dy) / (4 * 4) <= 1) {
        img.setPixelColor(palette.shadow, cx + dx, y + FRAME_H - 7 + dy);
      }
    }
  }

  // Body
  fillRect(img, cx - 8, cy + bob + 2, 16, 18, palette.body);

  // Head
  fillCircle(img, cx, cy + bob - 10, 9, palette.head);

  // Outline (1px border around body)
  for (let px = cx - 9; px <= cx + 8; px++) {
    img.setPixelColor(palette.outline, px, cy + bob + 1);
    img.setPixelColor(palette.outline, px, cy + bob + 20);
  }
  for (let py = cy + bob + 2; py <= cy + bob + 19; py++) {
    img.setPixelColor(palette.outline, cx - 9, py);
    img.setPixelColor(palette.outline, cx + 8, py);
  }

  // Direction indicator dot (3×3 square)
  const [dx, dy] = DIR_OFFSETS[dir];
  fillRect(img, cx + dx - 1, cy + bob + 10 + dy - 1, 3, 3, palette.accent);
}

async function generateSpritesheet(name, palette) {
  const W = FRAME_W * FRAMES;        // 192
  const H = FRAME_H * DIRS.length;   // 384

  const img = new Jimp(W, H, 0x00000000); // transparent

  const frames = {};
  const animations = {};

  for (let rowIdx = 0; rowIdx < DIRS.length; rowIdx++) {
    const dir = DIRS[rowIdx];
    const animFrameNames = [];

    for (let f = 0; f < FRAMES; f++) {
      const fx = f * FRAME_W;
      const fy = rowIdx * FRAME_H;

      drawFrame(img, palette, dir, f, fx, fy);

      const frameName = `${name}_${dir}_idle_${f}`;
      frames[frameName] = {
        frame: { x: fx, y: fy, w: FRAME_W, h: FRAME_H },
        spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
        sourceSize: { w: FRAME_W, h: FRAME_H },
        anchor: { x: 0.5, y: 0.85 },
      };
      animFrameNames.push(frameName);
    }

    animations[`idle_${dir}`] = animFrameNames;
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  const pngPath = path.join(DEST_DIR, `${name}_placeholder.png`);
  await img.writeAsync(pngPath);
  console.error(`  → ${pngPath}`);

  const jsonData = {
    frames,
    animations,
    meta: {
      image: `${name}_placeholder.png`,
      format: 'RGBA8888',
      size: { w: W, h: H },
      scale: '1',
    },
  };

  const jsonPath = path.join(DEST_DIR, `${name}_placeholder.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.error(`  → ${jsonPath}`);
}

(async () => {
  console.error('Generating placeholder sprite sheets...');
  await generateSpritesheet('courier', COURIER);
  await generateSpritesheet('npc', NPC);
  console.error('Done. 4 files written to client/public/sprites/');
})();
