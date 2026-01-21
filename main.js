const { app, BrowserWindow, ipcMain } = require("electron");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs"); // Add this at the top

let store;
let mainWindow;

// FIXED: Initialize store with proper user data path
async function initializeStore() {
  const Store = (await import("electron-store")).default;

  // Use app.getPath('userData') which always works in packaged apps
  const userDataPath = app.getPath("userData");
  const dataDir = path.join(userDataPath, "escs-data");

  // Ensure directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  store = new Store({
    cwd: dataDir, // Store data in proper user data directory
    name: "user_data",
    clearInvalidConfig: true,
    serialize: (value) => JSON.stringify(value, null, 2),
    deserialize: JSON.parse,
  });

  console.log("Store initialized at:", dataDir);
}

// All your IPC handlers remain the same, just add better error handling

// In main.js, update the update-student-books handler
ipcMain.handle(
  "update-student-books",
  (event, studentId, books, action = "update") => {
    try {
      const currentUser = store.get("currentUser");
      if (!currentUser) return [];

      const userStudents = store.get(`users.${currentUser.id}.students`, []);
      const studentIndex = userStudents.findIndex((s) => s.id === studentId);

      if (studentIndex === -1) return userStudents;

      // If checking in a book (removing from current), save to history
      const oldStudent = userStudents[studentIndex];
      if (
        action === "checkin" &&
        oldStudent.books &&
        oldStudent.books.length > 0
      ) {
        // Get history array or initialize it
        const history = store.get(
          `users.${currentUser.id}.history.${studentId}`,
          [],
        );

        // Find which books were checked in (books that are no longer in the new list)
        const removedBooks = oldStudent.books.filter(
          (oldBook) => !books.find((newBook) => newBook.isbn === oldBook.isbn),
        );

        // Add checkout date and checkin date to removed books
        const now = new Date().toLocaleDateString();
        removedBooks.forEach((book) => {
          book.checkinDate = now;
          if (!book.checkoutDate) {
            book.checkoutDate = now; // If for some reason it's missing
          }
        });

        // Add to history
        const updatedHistory = [...history, ...removedBooks];
        store.set(
          `users.${currentUser.id}.history.${studentId}`,
          updatedHistory,
        );
      }

      // Update current books
      userStudents[studentIndex].books = books;
      store.set(`users.${currentUser.id}.students`, userStudents);

      return userStudents;
    } catch (error) {
      console.error("Error updating student books:", error);
      throw error;
    }
  },
);

// Add new handler to get student history
ipcMain.handle("get-student-history", (event, studentId) => {
  try {
    const currentUser = store.get("currentUser");
    if (!currentUser) return [];

    return store.get(`users.${currentUser.id}.history.${studentId}`, []);
  } catch (error) {
    console.error("Error getting student history:", error);
    return [];
  }
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

// Authentication handlers with error handling
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
    console.error("Registration error:", error);
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
    console.error("Login error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("logout", () => {
  try {
    store.delete("currentUser");
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: error.message };
  }
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
  try {
    const currentUser = store.get("currentUser", null);

    if (!currentUser) return null;

    // Check if session has expired
    if (currentUser.expiry && Date.now() > currentUser.expiry) {
      store.delete("currentUser");
      return null;
    }

    return currentUser;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
});

// Student management handlers (now per-user)
ipcMain.handle("get-students", () => {
  try {
    const currentUser = store.get("currentUser");
    if (!currentUser) return [];

    return store.get(`users.${currentUser.id}.students`, []);
  } catch (error) {
    console.error("Error getting students:", error);
    return [];
  }
});

ipcMain.handle("add-student", (event, studentName) => {
  try {
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
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
});

ipcMain.handle("remove-students", (event, idsToRemove) => {
  try {
    const currentUser = store.get("currentUser");
    if (!currentUser) return [];

    let students = store.get(`users.${currentUser.id}.students`, []);
    students = students.filter((student) => !idsToRemove.includes(student.id));

    store.set(`users.${currentUser.id}.students`, students);
    return students;
  } catch (error) {
    console.error("Error removing students:", error);
    throw error;
  }
});

async function createWindow() {
  // Initialize store before creating window
  await initializeStore();

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
