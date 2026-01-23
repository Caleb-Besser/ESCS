const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

// Handle print preview window
ipcMain.on("open-print-preview", (event, html) => {
  const previewWin = new BrowserWindow({
    width: 1000,
    height: 800,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  previewWin.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(html),
  );

  previewWin.on("closed", () => {
    console.log("Print preview window closed");
  });
});

// Handle getting old data from electron-store
ipcMain.handle("get-old-data", async () => {
  try {
    const { default: Store } = await import("electron-store");
    const store = new Store();
    const students = store.get("students");
    const history = store.get("history");
    return { students, history };
  } catch (error) {
    console.error("Error getting old data:", error);
    return { students: null, history: null };
  }
});
// Add this to your IPC handlers in main.js
ipcMain.handle("get-student-history", async (event, studentId) => {
  try {
    // You might need to get the user ID from the current session
    // This is a simplified version - adjust based on your auth setup
    const { default: Store } = await import("electron-store");
    const store = new Store();

    // Get history from the old storage or Firebase
    const history = store.get(`history_${studentId}`);
    return history || [];
  } catch (error) {
    console.error("Error getting student history via IPC:", error);
    return [];
  }
});

async function createWindow() {
  app.setAppUserModelId("com.escs.checkout");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Easy Student Checkout System (ESCS)",
    icon: "./project_icon.ico",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Maximize the window on startup
  mainWindow.maximize();

  // Handle window focus when page loads
  mainWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      mainWindow.focus();
      mainWindow.webContents.focus();
    }, 100);
  });

  // Always load login.html first, Firebase auth will handle the redirect
  // When user logs in, they'll navigate to index.html
  mainWindow.loadFile("login.html");

  // Optional: Open dev tools for debugging
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
