const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openPrintPreview: (html) => ipcRenderer.send("open-print-preview", html),
  getOldData: (userId) => ipcRenderer.invoke("get-old-data", userId),
});
