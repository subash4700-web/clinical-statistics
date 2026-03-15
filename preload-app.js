const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appAPI', {
  getLicenseInfo: ()      => ipcRenderer.invoke('license:getInfo'),
  deactivate:     ()      => ipcRenderer.invoke('license:deactivate'),
  onShowLicenseModal: (cb) => ipcRenderer.on('show-license-modal', (_e) => cb()),
});
