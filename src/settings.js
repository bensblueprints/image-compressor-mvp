// Tiny JSON settings store persisted in Electron userData.
const path = require('path');
const fs = require('fs');

const DEFAULTS = {
  quality: 75,
  format: 'original',      // original | jpeg | png | webp | avif
  maxDimension: 0,          // 0 = no resize
  outputMode: 'suffix',     // 'suffix' (alongside originals) | 'folder'
  outputDir: ''
};

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.data = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      this.data = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      this.data = { ...DEFAULTS };
    }
    return this.data;
  }

  get() {
    return this.data;
  }

  set(patch) {
    this.data = { ...this.data, ...patch };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist settings:', err.message);
    }
    return this.data;
  }
}

module.exports = { Settings, DEFAULTS };
