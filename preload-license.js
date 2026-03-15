const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('licenseAPI', {
  validate:     (key)         => ipcRenderer.invoke('license:validate', key),
  getStoredKey: ()            => ipcRenderer.invoke('license:getStoredKey'),
  openExternal: (url)         => ipcRenderer.invoke('license:openExternal', url),
  sendCode:     (email)       => ipcRenderer.invoke('license:sendCode', email),
  verifyCode:   (email, code) => ipcRenderer.invoke('license:verifyCode', email, code),
});
