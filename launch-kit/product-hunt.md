# Product Hunt Launch — Image Compressor

## Name
Image Compressor

## Tagline (60 chars max)
Unlimited local image compression. Pay once, own it forever.
<!-- 59 chars -->

## Description (260 chars max)
A desktop app that replaces TinyPNG Pro and every web compressor. Drag-drop unlimited batches of JPG/PNG/WebP/AVIF/TIFF, compress and convert 100% locally with sharp/libvips. No uploads, no limits, no subscription — $19 once. Open source (MIT).
<!-- 243 chars -->

## Full description

Every image compressor on the web works the same way: upload your files to someone else's server, wait, hit a limit, get asked for $X/month.

Image Compressor flips that. It's a native desktop app (Electron + sharp/libvips — the same engine behind most image CDNs) that compresses and converts images entirely on your machine:

- **Drag-drop unlimited batches** — JPG, PNG, WebP, AVIF, TIFF
- **Live savings dashboard** — before → after sizes and % saved per file and in total, with satisfying animated counters
- **Quality slider + format converter** — keep the original format or convert everything to WebP/AVIF for the modern web
- **Optional max-dimension resize** — cap the longest edge for web exports, never upscales
- **Output your way** — a chosen folder, or `_compressed` alongside originals (originals never touched)
- **Zero network calls** — your client photos and product shots never leave your disk

The source is MIT on GitHub. The $19 one-time purchase gets you the 1-click Windows installer — no Node, no npm, no setup. Pay once, own it forever.

## Maker first comment

Hey hunters 👋

I got tired of paying for TinyPNG Pro and still hitting limits. I run a bunch of e-commerce stores and blogs, and image prep was a constant tax: upload 20 files, wait, download a zip, repeat — and every product photo I compressed went through someone else's server first.

So I built the tool I actually wanted: a local desktop app where I can drop 500 photos, set quality 75 + WebP, and get everything back in seconds with a running total of megabytes saved. It uses sharp (libvips), which is the same library powering most image pipelines at real companies — this isn't a toy encoder.

Business model experiment: the code is fully open source (MIT). If you're comfortable with `npm i && npm start`, it's free forever. The $19 buys the 1-click installer and supports the "pay once, own it forever" suite I'm building — 50 tools that replace monthly SaaS subscriptions.

Would love feedback on the format defaults (should AVIF be the default over WebP yet?) and what batch features you'd want next — folder watching? CLI mode? Ask me anything.

## Gallery shots (5)

1. **Hero** — app open in dark mode with ~30 files processed, totals bar showing "142.6 MB → 18.3 MB · −87.2%", green savings badges down the list.
2. **Drag-drop moment** — dropzone in its highlighted (dragover) state with a stack of photo thumbnails being dragged in from Explorer.
3. **Controls close-up** — left panel: quality slider at 75, format picker open showing Keep original/JPG/PNG/WebP/AVIF, max-dimension field, output-location radios.
4. **Before/after split** — a real photo split down the middle, "2.4 MB JPG" vs "310 KB WebP", captioned "Can you see the difference? Neither can your visitors."
5. **Comparison card** — Image Compressor ($19 once, unlimited, local) vs TinyPNG Pro (subscription, upload caps, cloud) table as a branded graphic.
