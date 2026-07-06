/* Renderer — vanilla JS, talks to main via window.api (preload bridge). */
const $ = (sel) => document.querySelector(sel);

const els = {
  dropzone: $('#dropzone'),
  browseBtn: $('#browseBtn'),
  fileList: $('#fileList'),
  quality: $('#quality'),
  qualityValue: $('#qualityValue'),
  format: $('#format'),
  maxDimension: $('#maxDimension'),
  folderRow: $('#folderRow'),
  folderPath: $('#folderPath'),
  pickFolder: $('#pickFolder'),
  compressBtn: $('#compressBtn'),
  clearBtn: $('#clearBtn'),
  totals: $('#totals'),
  totalBefore: $('#totalBefore'),
  totalAfter: $('#totalAfter'),
  totalSaved: $('#totalSaved')
};

let files = [];          // [{ path, name, el, status }]
let settings = {};
let busy = false;

/* ── formatting & animated counters ─────────────────── */
function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function animateValue(el, from, to, formatter, duration = 650) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = formatter(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ── settings ────────────────────────────────────────── */
async function loadSettings() {
  settings = await window.api.getSettings();
  els.quality.value = settings.quality;
  els.qualityValue.textContent = settings.quality;
  els.format.value = settings.format;
  els.maxDimension.value = settings.maxDimension || 0;
  document.querySelector(`input[name="outputMode"][value="${settings.outputMode}"]`).checked = true;
  els.folderRow.hidden = settings.outputMode !== 'folder';
  setFolderLabel(settings.outputDir);
}

function saveSettings(patch) {
  settings = { ...settings, ...patch };
  window.api.setSettings(patch);
}

function setFolderLabel(dir) {
  els.folderPath.textContent = dir || 'No folder selected';
  els.folderPath.title = dir || '';
}

els.quality.addEventListener('input', () => {
  els.qualityValue.textContent = els.quality.value;
});
els.quality.addEventListener('change', () => saveSettings({ quality: Number(els.quality.value) }));
els.format.addEventListener('change', () => saveSettings({ format: els.format.value }));
els.maxDimension.addEventListener('change', () => {
  const v = Math.max(0, Math.floor(Number(els.maxDimension.value) || 0));
  els.maxDimension.value = v;
  saveSettings({ maxDimension: v });
});
document.querySelectorAll('input[name="outputMode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    els.folderRow.hidden = radio.value !== 'folder';
    saveSettings({ outputMode: radio.value });
  });
});
els.pickFolder.addEventListener('click', async () => {
  const dir = await window.api.pickOutputDir();
  if (dir) {
    setFolderLabel(dir);
    saveSettings({ outputDir: dir });
  }
});

/* ── file intake ─────────────────────────────────────── */
function addFiles(paths) {
  const existing = new Set(files.map((f) => f.path));
  for (const p of paths) {
    if (!p || existing.has(p)) continue;
    existing.add(p);
    const item = { path: p, name: p.split(/[\\/]/).pop(), status: 'pending' };
    item.el = renderItem(item);
    files.push(item);
  }
  refreshUi();
}

function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'file-item';
  li.innerHTML = `
    <div class="file-meta">
      <div class="file-name"></div>
      <div class="file-sub"></div>
    </div>
    <div class="file-stats">
      <span class="before"></span>
      <span class="arrow" hidden>→</span>
      <span class="after"></span>
      <span class="badge pending">queued</span>
    </div>`;
  li.querySelector('.file-name').textContent = item.name;
  li.querySelector('.file-sub').textContent = item.path;
  els.fileList.appendChild(li);
  return li;
}

function refreshUi() {
  const pending = files.filter((f) => f.status === 'pending').length;
  els.compressBtn.textContent = busy
    ? 'Compressing…'
    : `Compress ${pending} image${pending === 1 ? '' : 's'}`;
  els.compressBtn.disabled = busy || pending === 0;
  els.clearBtn.hidden = files.length === 0 || busy;
  els.dropzone.classList.toggle('compact', files.length > 0);
}

/* drag & drop */
['dragenter', 'dragover'].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.add('dragover');
  })
);
['dragleave', 'drop'].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('dragover');
  })
);
els.dropzone.addEventListener('drop', async (e) => {
  const paths = [...e.dataTransfer.files].map((f) => window.api.pathForFile(f)).filter(Boolean);
  const supported = await window.api.filterSupported(paths);
  addFiles(supported);
});
// prevent the window itself navigating on stray drops
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

els.browseBtn.addEventListener('click', async () => {
  addFiles(await window.api.pickFiles());
});

els.clearBtn.addEventListener('click', () => {
  files = [];
  els.fileList.innerHTML = '';
  els.totals.hidden = true;
  totals = { before: 0, after: 0 };
  refreshUi();
});

/* ── compression ─────────────────────────────────────── */
let totals = { before: 0, after: 0 };

window.api.onProgress(({ result }) => {
  const item = files.find((f) => f.path === result.inputPath && f.status === 'working');
  if (!item) return;
  applyResult(item, result);
});

function applyResult(item, result) {
  const badge = item.el.querySelector('.badge');
  if (!result.ok) {
    item.status = 'error';
    badge.className = 'badge error';
    badge.textContent = 'error';
    item.el.querySelector('.file-sub').textContent = result.error;
    return;
  }
  item.status = 'done';
  item.el.classList.add('done', 'clickable');
  item.el.title = 'Click to reveal in folder';
  item.el.addEventListener('click', () => window.api.showInFolder(result.outputPath));
  item.el.querySelector('.file-sub').textContent =
    `${result.outputPath}  ·  ${result.width}×${result.height} ${result.format.toUpperCase()}`;

  const beforeEl = item.el.querySelector('.before');
  const afterEl = item.el.querySelector('.after');
  item.el.querySelector('.arrow').hidden = false;
  beforeEl.textContent = fmtBytes(result.beforeBytes);
  animateValue(afterEl, result.beforeBytes, result.afterBytes, fmtBytes);

  const pct = result.savedPct;
  if (pct >= 0.5) {
    badge.className = 'badge saved';
    animateValue(badge, 0, pct, (v) => `−${v.toFixed(1)}%`);
  } else {
    badge.className = 'badge grew';
    badge.textContent = pct < 0 ? `+${Math.abs(pct).toFixed(1)}%` : '±0%';
  }

  // totals
  const prevBefore = totals.before;
  const prevAfter = totals.after;
  totals.before += result.beforeBytes;
  totals.after += result.afterBytes;
  els.totals.hidden = false;
  animateValue(els.totalBefore, prevBefore, totals.before, fmtBytes);
  animateValue(els.totalAfter, prevAfter, totals.after, fmtBytes);
  const prevPct = prevBefore > 0 ? ((prevBefore - prevAfter) / prevBefore) * 100 : 0;
  const newPct = totals.before > 0 ? ((totals.before - totals.after) / totals.before) * 100 : 0;
  animateValue(els.totalSaved, prevPct, newPct, (v) => `−${v.toFixed(1)}%`);
}

els.compressBtn.addEventListener('click', async () => {
  const queue = files.filter((f) => f.status === 'pending');
  if (!queue.length || busy) return;

  if (settings.outputMode === 'folder' && !settings.outputDir) {
    const dir = await window.api.pickOutputDir();
    if (!dir) return;
    setFolderLabel(dir);
    saveSettings({ outputDir: dir });
  }

  busy = true;
  refreshUi();
  queue.forEach((f) => {
    f.status = 'working';
    const badge = f.el.querySelector('.badge');
    badge.className = 'badge working';
    badge.textContent = '…';
  });

  const options = {
    quality: Number(els.quality.value),
    format: els.format.value,
    maxDimension: Math.max(0, Math.floor(Number(els.maxDimension.value) || 0)),
    outputMode: settings.outputMode,
    outputDir: settings.outputDir
  };

  try {
    const results = await window.api.compress(queue.map((f) => f.path), options);
    // catch any file the progress event missed
    for (const r of results) {
      const item = files.find((f) => f.path === r.inputPath && f.status === 'working');
      if (item) applyResult(item, r);
    }
  } finally {
    busy = false;
    refreshUi();
  }
});

loadSettings().then(refreshUi);
