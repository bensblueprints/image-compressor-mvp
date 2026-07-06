// Core compression pipeline — pure Node, no Electron dependency.
// Used by both the Electron main process and the smoke test.
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const sharp = require('sharp');

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'];

// output format key -> file extension
const FORMAT_EXT = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
  avif: '.avif',
  tiff: '.tif'
};

const EXT_FORMAT = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
  '.avif': 'avif',
  '.tif': 'tiff',
  '.tiff': 'tiff'
};

function isSupported(filePath) {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/**
 * Compress (and optionally convert / resize) a single image.
 *
 * @param {string} inputPath absolute path to the source image
 * @param {object} options
 * @param {number}  [options.quality=75]      1–100
 * @param {string}  [options.format='original'] 'original' | 'jpeg' | 'png' | 'webp' | 'avif'
 * @param {number}  [options.maxDimension=0]  longest-edge cap in px, 0 = no resize
 * @param {string|null} [options.outputDir=null] target folder; null = alongside original with "_compressed" suffix
 * @param {boolean} [options.overwrite=true]  overwrite an existing output file
 * @returns {Promise<{inputPath,outputPath,beforeBytes,afterBytes,savedBytes,savedPct,format,width,height}>}
 */
async function compressImage(inputPath, options = {}) {
  const {
    quality = 75,
    format = 'original',
    maxDimension = 0,
    outputDir = null,
    overwrite = true
  } = options;

  if (!isSupported(inputPath)) {
    throw new Error(`Unsupported file type: ${path.basename(inputPath)}`);
  }

  const beforeBytes = (await fsp.stat(inputPath)).size;
  const inputExt = path.extname(inputPath).toLowerCase();
  const outFormat = format === 'original' ? EXT_FORMAT[inputExt] : format;
  if (!FORMAT_EXT[outFormat]) {
    throw new Error(`Unsupported output format: ${format}`);
  }

  const q = Math.min(100, Math.max(1, Math.round(quality)));
  let pipeline = sharp(inputPath, { failOn: 'none' }).rotate();

  if (maxDimension && maxDimension > 0) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  switch (outFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9, palette: true, quality: q });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: q, effort: 4 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality: q, effort: 4 });
      break;
    case 'tiff':
      pipeline = pipeline.tiff({ quality: q, compression: 'jpeg' });
      break;
  }

  const outputPath = buildOutputPath(inputPath, outFormat, outputDir);
  if (!overwrite && fs.existsSync(outputPath)) {
    throw new Error(`Output already exists: ${outputPath}`);
  }
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });

  const info = await pipeline.toFile(outputPath);
  const afterBytes = info.size;

  return {
    inputPath,
    outputPath,
    beforeBytes,
    afterBytes,
    savedBytes: beforeBytes - afterBytes,
    savedPct: beforeBytes > 0 ? ((beforeBytes - afterBytes) / beforeBytes) * 100 : 0,
    format: outFormat,
    width: info.width,
    height: info.height
  };
}

function buildOutputPath(inputPath, outFormat, outputDir) {
  const ext = FORMAT_EXT[outFormat];
  const base = path.basename(inputPath, path.extname(inputPath));
  if (outputDir) {
    const candidate = path.join(outputDir, base + ext);
    // never silently overwrite the source file itself
    if (path.resolve(candidate) === path.resolve(inputPath)) {
      return path.join(outputDir, `${base}_compressed${ext}`);
    }
    return candidate;
  }
  return path.join(path.dirname(inputPath), `${base}_compressed${ext}`);
}

/**
 * Compress a batch sequentially, reporting per-file progress.
 * @param {string[]} files
 * @param {object} options same as compressImage
 * @param {(result: object, index: number, total: number) => void} [onProgress]
 */
async function compressBatch(files, options = {}, onProgress) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    let result;
    try {
      result = await compressImage(files[i], options);
      result.ok = true;
    } catch (err) {
      result = { inputPath: files[i], ok: false, error: err.message };
    }
    results.push(result);
    if (onProgress) onProgress(result, i, files.length);
  }
  return results;
}

module.exports = { compressImage, compressBatch, isSupported, SUPPORTED_EXTENSIONS };
