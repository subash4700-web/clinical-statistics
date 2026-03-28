const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronSavePDF', () => {
  ipcRenderer.invoke('app:savePdfFromPreview').then(function(filePath) {
    if (filePath) {
      document.querySelector('button').textContent = 'Saved!';
      setTimeout(function() {
        document.querySelector('button').textContent = 'Save as PDF';
      }, 2000);
    }
  });
});
