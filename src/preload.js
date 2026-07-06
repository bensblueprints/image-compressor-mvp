const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  pickOutputDir: () => ipcRenderer.invoke('dialog:pickOutputDir'),
  pickFiles: () => ipcRenderer.invoke('dialog:pickFiles'),
  filterSupported: (paths) => ipcRenderer.invoke('files:filterSupported', paths),
  compress: (files, options) => ipcRenderer.invoke('compress:run', { files, options }),
  showInFolder: (p) => ipcRenderer.invoke('shell:showInFolder', p),
  onProgress: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('compress:progress', listener);
    return () => ipcRenderer.removeListener('compress:progress', listener);
  },
  // Electron 32+ removed File.path — resolve dropped File objects here.
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return file && file.path ? file.path : null;
    }
  }
});
