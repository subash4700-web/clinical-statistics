const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appAPI', {
  getLicenseInfo:     ()      => ipcRenderer.invoke('license:getInfo'),
  deactivate:         ()      => ipcRenderer.invoke('license:deactivate'),
  openExternal:       (url)   => ipcRenderer.invoke('license:openExternal', url),
  onShowLicenseModal: (cb)    => ipcRenderer.on('show-license-modal', (_e) => cb()),
  previewReport:      (html, filename) => ipcRenderer.invoke('app:previewReport', html, filename),
});
