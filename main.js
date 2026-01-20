const { app, BrowserWindow, ipcMain } = require("electron");
const bcrypt = require("bcrypt");
const path = require("path");

let store; // Will hold the electron-store instance
let mainWindow; // Keep reference to main window

ipcMain.handle("update-student-books", (event, studentId, books) => {
  const currentUser = store.get("currentUser");
  if (!currentUser) return [];

  const userStudents = store.get(`users.${currentUser.id}.students`, []);
  const studentIndex = userStudents.findIndex((s) => s.id === studentId);

  if (studentIndex === -1) return userStudents;

  userStudents[studentIndex].books = books;
  store.set(`users.${currentUser.id}.students`, userStudents);

  return userStudents;
});

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

// Authentication handlers
ipcMain.handle("register", async (event, email, password, rememberMe) => {
  try {
    const users = store.get("authUsers", []);

    // Check if user already exists
    if (users.find((u) => u.email === email)) {
      return { success: false, error: "Email already registered" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();

    // Create new user
    users.push({
      id: userId,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    store.set("authUsers", users);

    // Initialize empty student list for this user
    store.set(`users.${userId}.students`, []);

    // Set current user session
    const sessionExpiry = rememberMe
      ? Date.now() + 15 * 24 * 60 * 60 * 1000 // 15 days
      : null;

    store.set("currentUser", {
      id: userId,
      email,
      expiry: sessionExpiry,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("login", async (event, email, password, rememberMe) => {
  try {
    const users = store.get("authUsers", []);
    const user = users.find((u) => u.email === email);

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return { success: false, error: "Invalid email or password" };
    }

    // Set current user session
    const sessionExpiry = rememberMe
      ? Date.now() + 15 * 24 * 60 * 60 * 1000 // 15 days
      : null;

    store.set("currentUser", {
      id: user.id,
      email: user.email,
      expiry: sessionExpiry,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("logout", () => {
  store.delete("currentUser");
  return { success: true };
});

ipcMain.on("reload-to-login", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile("login.html").then(() => {
      // Force focus after a short delay
      setTimeout(() => {
        mainWindow.focus();
        mainWindow.webContents.focus();
      }, 200);
    });
  }
});

ipcMain.handle("get-current-user", () => {
  const currentUser = store.get("currentUser", null);

  if (!currentUser) return null;

  // Check if session has expired
  if (currentUser.expiry && Date.now() > currentUser.expiry) {
    store.delete("currentUser");
    return null;
  }

  return currentUser;
});

// Student management handlers (now per-user)
ipcMain.handle("get-students", () => {
  const currentUser = store.get("currentUser");
  if (!currentUser) return [];

  return store.get(`users.${currentUser.id}.students`, []);
});

ipcMain.handle("add-student", (event, studentName) => {
  const currentUser = store.get("currentUser");
  if (!currentUser) return [];

  let students = store.get(`users.${currentUser.id}.students`, []);
  const randomId = Math.floor(10000000 + Math.random() * 90000000).toString();

  students.push({
    name: studentName,
    id: randomId,
    books: [],
  });

  store.set(`users.${currentUser.id}.students`, students);
  return students;
});

ipcMain.handle("remove-students", (event, idsToRemove) => {
  const currentUser = store.get("currentUser");
  if (!currentUser) return [];

  let students = store.get(`users.${currentUser.id}.students`, []);
  students = students.filter((student) => !idsToRemove.includes(student.id));

  store.set(`users.${currentUser.id}.students`, students);
  return students;
});

async function createWindow() {
  // Dynamically import electron-store
  const Store = (await import("electron-store")).default;
  store = new Store({
    cwd: path.join(__dirname, "data"), // Creates a 'data' folder in your project
    name: "user_data", // Saves as user_data.json
  });

  // MIGRATION: Move old students data if it exists
  const oldStudents = store.get("students");
  if (oldStudents && oldStudents.length > 0) {
    console.log("Found old student data, cleaning up...");
    // Delete the old data - users will start fresh
    store.delete("students");
    console.log("Old student data removed. Users will start with empty lists.");
  }
  app.setAppUserModelId("com.escs.checkout");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Easy Student Checkout System (ESCS)",

    icon: "./project_icon.ico",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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

  // Check if user is logged in and session is valid
  const currentUser = store.get("currentUser");

  if (currentUser) {
    // Check if session expired
    if (currentUser.expiry && Date.now() > currentUser.expiry) {
      store.delete("currentUser");
      mainWindow.loadFile("login.html");
    } else {
      mainWindow.loadFile("index.html");
    }
  } else {
    mainWindow.loadFile("login.html");
  }
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
