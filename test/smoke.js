// Smoke test — generates real fixtures with sharp, runs the actual pipeline,
// asserts outputs exist, are smaller, and are the correct format.
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const sharp = require('sharp');
const { compressImage, compressBatch, isSupported } = require('../src/compressor');

const TMP = path.join(__dirname, '.tmp');

async function makeFixtures() {
  try {
    fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3 });
  } catch { /* stale handles on Windows — overwrite in place */ }
  fs.mkdirSync(TMP, { recursive: true });

  // Large noisy PNG (noise compresses poorly as PNG → big file, lots to save)
  const w = 1600, h = 1200;
  const noise = Buffer.alloc(w * h * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = Math.floor(Math.random() * 256);
  const pngPath = path.join(TMP, 'noisy.png');
  await sharp(noise, { raw: { width: w, height: h, channels: 3 } })
    .png({ compressionLevel: 0 })
    .toFile(pngPath);

  // JPG fixture — smooth gradient-ish image saved at high quality
  const jpgPath = path.join(TMP, 'photo.jpg');
  await sharp({
    create: { width: 1920, height: 1080, channels: 3, background: { r: 40, g: 90, b: 160 } }
  })
    .composite([{
      input: Buffer.from(
        `<svg width="1920" height="1080">
           <defs><radialGradient id="g"><stop offset="0%" stop-color="#ffd166"/><stop offset="100%" stop-color="#118ab2"/></radialGradient></defs>
           <rect width="1920" height="1080" fill="url(#g)"/>
           <circle cx="600" cy="500" r="300" fill="#ef476f" opacity="0.7"/>
           <text x="200" y="200" font-size="120" fill="#fff">Smoke Test</text>
         </svg>`
      ),
      top: 0, left: 0
    }])
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toFile(jpgPath);

  return { pngPath, jpgPath };
}

(async () => {
  console.log('Image Compressor — smoke test\n');
  const { pngPath, jpgPath } = await makeFixtures();
  const pngBefore = fs.statSync(pngPath).size;
  const jpgBefore = fs.statSync(jpgPath).size;
  console.log(`fixtures: noisy.png ${(pngBefore / 1024).toFixed(0)} KB, photo.jpg ${(jpgBefore / 1024).toFixed(0)} KB`);

  assert.ok(isSupported(pngPath) && isSupported(jpgPath), 'fixtures should be supported types');
  assert.ok(!isSupported(path.join(TMP, 'x.gif')), 'gif should be unsupported');

  // 1) PNG → WebP at quality 70 (the exact scenario from the spec)
  const outDir = path.join(TMP, 'out');
  const r1 = await compressImage(pngPath, { quality: 70, format: 'webp', outputDir: outDir });
  assert.ok(fs.existsSync(r1.outputPath), 'webp output should exist');
  assert.strictEqual(path.extname(r1.outputPath), '.webp', 'output should have .webp extension');
  assert.ok(r1.afterBytes < r1.beforeBytes, `webp should be smaller (${r1.afterBytes} < ${r1.beforeBytes})`);
  const meta1 = await sharp(r1.outputPath).metadata();
  assert.strictEqual(meta1.format, 'webp', 'output should really be webp');
  assert.strictEqual(meta1.width, 1600, 'no resize requested — width preserved');
  console.log(`1. PNG→WebP q70:       ${fmt(r1)}`);

  // 2) JPG recompressed in place ("keep original" + _compressed suffix)
  const r2 = await compressImage(jpgPath, { quality: 70, format: 'original' });
  assert.ok(fs.existsSync(r2.outputPath), 'jpg output should exist');
  assert.ok(r2.outputPath.includes('_compressed'), 'suffix mode should append _compressed');
  assert.strictEqual(path.dirname(r2.outputPath), path.dirname(jpgPath), 'suffix mode stays alongside original');
  assert.ok(r2.afterBytes < r2.beforeBytes, 'recompressed jpg should be smaller');
  assert.strictEqual((await sharp(r2.outputPath).metadata()).format, 'jpeg', 'output should still be jpeg');
  console.log(`2. JPG q70 (suffix):   ${fmt(r2)}`);

  // 3) Max-dimension resize
  const r3 = await compressImage(jpgPath, { quality: 70, format: 'webp', maxDimension: 800, outputDir: outDir });
  const meta3 = await sharp(r3.outputPath).metadata();
  assert.ok(Math.max(meta3.width, meta3.height) <= 800, `longest edge should be ≤800, got ${meta3.width}x${meta3.height}`);
  console.log(`3. JPG→WebP max 800px: ${fmt(r3)} (${meta3.width}×${meta3.height})`);

  // 4) Batch API with progress callbacks + one bad file
  const badPath = path.join(TMP, 'missing.png');
  let progressCalls = 0;
  const results = await compressBatch([pngPath, jpgPath, badPath], { quality: 70, format: 'avif', outputDir: outDir }, () => progressCalls++);
  assert.strictEqual(results.length, 3, 'batch returns a result per file');
  assert.strictEqual(progressCalls, 3, 'progress fires per file');
  assert.ok(results[0].ok && results[1].ok, 'good files succeed');
  assert.ok(!results[2].ok && results[2].error, 'missing file reports an error without aborting the batch');
  assert.strictEqual((await sharp(results[0].outputPath).metadata()).format, 'heif', 'avif output detected (heif container)');
  console.log(`4. Batch→AVIF:         ${fmt(results[0])} / ${fmt(results[1])} / bad file handled`);

  try {
    fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // Windows can hold handles briefly; leftover fixtures are gitignored.
  }
  console.log('\nAll smoke tests passed.');
})().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err.message);
  process.exit(1);
});

function fmt(r) {
  return `${(r.beforeBytes / 1024).toFixed(0)} KB → ${(r.afterBytes / 1024).toFixed(0)} KB (−${r.savedPct.toFixed(1)}%)`;
}
