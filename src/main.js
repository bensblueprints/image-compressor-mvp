const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { compressBatch, isSupported } = require('./compressor');
const { Settings } = require('./settings');

let mainWindow = null;
let settings = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1060,
    height: 760,
    minWidth: 780,
    minHeight: 560,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    title: 'Image Compressor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  settings = new Settings(app.getPath('userData'));
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpc() {
  ipcMain.handle('settings:get', () => settings.get());
  ipcMain.handle('settings:set', (_e, patch) => settings.set(patch));

  ipcMain.handle('dialog:pickOutputDir', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose output folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || !res.filePaths.length) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('dialog:pickFiles', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Add images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff'] }]
    });
    if (res.canceled) return [];
    return res.filePaths.filter(isSupported);
  });

  ipcMain.handle('files:filterSupported', (_e, paths) =>
    (paths || []).filter((p) => typeof p === 'string' && isSupported(p))
  );

  ipcMain.handle('compress:run', async (_e, { files, options }) => {
    const opts = {
      quality: options.quality,
      format: options.format,
      maxDimension: options.maxDimension,
      outputDir: options.outputMode === 'folder' && options.outputDir ? options.outputDir : null
    };
    return compressBatch(files, opts, (result, index, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('compress:progress', { result, index, total });
      }
    });
  });

  ipcMain.handle('shell:showInFolder', (_e, p) => {
    if (typeof p === 'string' && p.length) shell.showItemInFolder(p);
  });
}
