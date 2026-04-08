// Tile Generator Server
// Usage: npm install && node server.js
// Opens at http://localhost:7700

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 7700;

const OUTPUT_DIR = path.join(__dirname, 'output');
const PRESETS_DIR = path.join(__dirname, 'presets');

// Ensure directories exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(PRESETS_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Save WebP to output/
app.post('/api/save-webp', (req, res) => {
  const { filename, dataUrl } = req.body;
  if (!filename || !dataUrl) return res.status(400).json({ error: 'Missing filename or dataUrl' });

  const safe = filename.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/\.webp$/i, '');
  const outPath = path.join(OUTPUT_DIR, safe + '.webp');
  const base64 = dataUrl.replace(/^data:image\/webp;base64,/, '');

  try {
    fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
    res.json({ ok: true, path: outPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save preset JSON
app.post('/api/save-preset', (req, res) => {
  const { name, config } = req.body;
  if (!name || !config) return res.status(400).json({ error: 'Missing name or config' });

  const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const outPath = path.join(PRESETS_DIR, safe + '.json');

  try {
    fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
    res.json({ ok: true, path: outPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List presets
app.get('/api/presets', (req, res) => {
  try {
    const files = fs.readdirSync(PRESETS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

// Load preset
app.get('/api/presets/:name', (req, res) => {
  const safe = req.params.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filePath = path.join(PRESETS_DIR, safe + '.json');

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(404).json({ error: 'Preset not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Tile Generator running at http://localhost:${PORT}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Presets directory: ${PRESETS_DIR}`);
});
