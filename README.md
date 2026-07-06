# Image Compressor

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)
![Electron](https://img.shields.io/badge/built%20with-Electron%20%2B%20sharp-9cf.svg)

**Unlimited local batch image compression & conversion. Pay once, own it forever.**

Stop uploading your images to random websites 20 at a time. Image Compressor runs 100% on your machine — drag in a thousand photos, pick a quality, and watch the megabytes melt away. No upload limits, no monthly bill, no cloud, no telemetry.

![screenshot](docs/screenshot.png)

## Features

- 🖼️ **Drag & drop batch processing** — JPG, PNG, WebP, AVIF, TIFF. Drop a whole shoot at once.
- 📉 **Live savings dashboard** — per-file and total before → after sizes with animated counters and % saved.
- 🎚️ **Quality slider** — full 1–100 control, powered by mozjpeg-grade encoders via [sharp](https://sharp.pixelplumbing.com/) (libvips).
- 🔁 **Format conversion** — keep the original format, or convert everything to JPG, PNG, WebP, or AVIF in one pass.
- 📐 **Max-dimension resize** — optionally cap the longest edge (perfect for web exports) without upscaling.
- 📁 **Flexible output** — write to a folder of your choice, or alongside originals with a `_compressed` suffix. Originals are never touched.
- 💾 **Settings persist** — your quality, format, and output preferences are remembered between sessions.
- 🔒 **100% local** — zero network calls. Your product shots, client photos, and family pictures never leave your disk.

## ☕ Skip the setup — get the 1-click installer

The source is free (MIT) and always will be. If you'd rather skip Node/npm and get a signed Windows installer with automatic updates:

**→ [Get the installer on Whop — $19, one time](https://whop.com/onetime-suite)**

## Quick start

```bash
npm i
npm start
```

Requires Node 18+ (sharp ships prebuilt binaries — no compiler needed).

Run the smoke test (generates real images and compresses them):

```bash
npm test
```

Build a Windows installer:

```bash
npm run dist
```

## Image Compressor vs TinyPNG Pro

| | **Image Compressor** | TinyPNG Pro / Web Pro |
|---|---|---|
| Price | **$19 once** | Subscription, forever (plus per-image API fees at volume) |
| Upload limits | **None — it's your CPU** | Capped per month / per file size |
| Max file size | **Whatever your RAM handles** | 75 MB cap |
| Privacy | **Images never leave your machine** | Every image uploaded to their servers |
| Batch size | **Unlimited** | Limited per batch |
| Formats | JPG, PNG, WebP, AVIF, TIFF | JPG, PNG, WebP, AVIF |
| Resize | ✅ longest-edge cap | ✅ |
| Works offline | ✅ | ❌ |
| Open source | ✅ MIT | ❌ |

Pay for a few months of any subscription compressor and you've already spent more than this app costs — and you still won't own anything.

## Tech stack

- **Electron** — main + preload (contextIsolation) + vanilla JS renderer, dark-mode UI
- **sharp** (libvips) — the fastest Node image library; mozjpeg, palette PNG, WebP, AVIF encoders
- **Zero runtime services** — settings in a plain JSON file, no database, no accounts

## Project layout

```
src/
  main.js         Electron main process (IPC, dialogs, batch runner)
  preload.js      contextBridge API surface
  compressor.js   pure-Node compression pipeline (also used by tests)
  settings.js     JSON settings store
renderer/         dark-mode UI (HTML/CSS/JS, no framework)
test/smoke.js     generates real fixtures & runs the actual pipeline
launch-kit/       Product Hunt copy, ads, go-to-market strategy
```

## License

[MIT](LICENSE) © 2026 Ben (bensblueprints)
