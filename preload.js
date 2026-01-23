const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openPrintPreview: (html) => ipcRenderer.send("open-print-preview", html),
  getStudentHistory: (studentId) =>
    ipcRenderer.invoke("get-student-history", studentId),

  getOldData: () => ipcRenderer.invoke("get-old-data"),
});
