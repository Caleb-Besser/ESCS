const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openPrintPreview: (html) => ipcRenderer.send("open-print-preview", html),
  getOldData: () => ipcRenderer.invoke("get-old-data"),
});
