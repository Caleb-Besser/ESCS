console.log("Starting ESCS application...");
const { app, BrowserWindow, ipcMain, session } = require("electron");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

class Application {
  constructor() {
    this.mainWindow = null;
    this.store = null;
    this.isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  }

  async initialize() {
    try {
      await this.initializeStore();
      this.setupAppLifecycle();
      this.setupIPC();
      this.setupSecurity();
    } catch (error) {
      console.error("Failed to initialize application:", error);
      process.exit(1);
    }
  }

  async initializeStore() {
    const userDataPath = app.getPath("userData");
    const dataDir = path.join(userDataPath, "escs-data");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Dynamic import for electron-store (ES module)
    const { default: Store } = await import("electron-store");

    this.store = new Store({
      cwd: dataDir,
      name: "config",
      clearInvalidConfig: true,
      watch: true,
      defaults: {
        authUsers: [],
        sessions: {},
      },
    });

    console.log(`Data store initialized at: ${dataDir}`);
  }

  setupSecurity() {
    // Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; " +
              "script-src 'self' https://cdn.jsdelivr.net; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https:; " +
              "connect-src 'self' https://openlibrary.org;",
          ],
        },
      });
    });

    // Disable Node.js integration in renderer for security
    // Note: Your current code has nodeIntegration: true, which is insecure
    // Consider migrating to contextIsolation: true and preload scripts
  }

  setupAppLifecycle() {
    console.log("Setting up app lifecycle...");
    if (app.isReady()) {
      console.log("App is already ready, creating main window immediately");
      this.createMainWindow();
    } else {
      app.on("ready", () => {
        console.log("App ready event fired");
        this.createMainWindow();
      });
    }
    app.on("window-all-closed", () => this.handleWindowAllClosed());
    app.on("activate", () => this.handleActivate());
    app.on("before-quit", () => this.handleBeforeQuit());
  }

  setupIPC() {
    // Authentication handlers
    ipcMain.handle("auth:register", this.handleRegister.bind(this));
    ipcMain.handle("auth:login", this.handleLogin.bind(this));
    ipcMain.handle("auth:logout", this.handleLogout.bind(this));
    ipcMain.handle("auth:current-user", this.handleGetCurrentUser.bind(this));

    // Student handlers
    ipcMain.handle("students:get-all", this.handleGetStudents.bind(this));
    ipcMain.handle("students:add", this.handleAddStudent.bind(this));
    ipcMain.handle("students:remove", this.handleRemoveStudents.bind(this));
    ipcMain.handle(
      "students:update-books",
      this.handleUpdateStudentBooks.bind(this),
    );
    ipcMain.handle(
      "students:get-history",
      this.handleGetStudentHistory.bind(this),
    );

    // System handlers
    ipcMain.on("system:print-preview", this.handlePrintPreview.bind(this));
    ipcMain.on("system:reload-to-login", this.handleReloadToLogin.bind(this));
    ipcMain.on("system:get-version", (event) => {
      event.returnValue = app.getVersion();
    });
  }

  async handleRegister(event, email, password, rememberMe) {
    try {
      const users = this.store.get("authUsers", []);

      if (users.some((u) => u.email === email)) {
        return { success: false, error: "Email already registered" };
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newUser = {
        id: userId,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };

      users.push(newUser);
      this.store.set("authUsers", users);

      // Initialize user data
      this.store.set(`users.${userId}.students`, []);
      this.store.set(`users.${userId}.settings`, {
        theme: "light",
        notifications: true,
      });

      return this.createSession(userId, email, rememberMe);
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }
  }

  async handleLogin(event, email, password, rememberMe) {
    try {
      const users = this.store.get("authUsers", []);
      const user = users.find((u) => u.email === email);

      if (!user) {
        return { success: false, error: "Invalid email or password" };
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return { success: false, error: "Invalid email or password" };
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      this.store.set("authUsers", users);

      return this.createSession(user.id, user.email, rememberMe);
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed. Please try again." };
    }
  }

  createSession(userId, email, rememberMe) {
    const sessionExpiry = rememberMe
      ? Date.now() + 15 * 24 * 60 * 60 * 1000 // 15 days
      : Date.now() + 8 * 60 * 60 * 1000; // 8 hours

    const session = {
      id: userId,
      email,
      expiry: sessionExpiry,
      createdAt: Date.now(),
    };

    this.store.set("currentUser", session);

    return {
      success: true,
      user: { id: userId, email },
      expiresAt: sessionExpiry,
    };
  }

  handleLogout() {
    try {
      const currentUser = this.store.get("currentUser");
      if (currentUser) {
        // Add to audit log
        const auditLog = this.store.get("auditLog", []);
        auditLog.push({
          userId: currentUser.id,
          action: "logout",
          timestamp: new Date().toISOString(),
        });
        this.store.set("auditLog", auditLog);
      }

      this.store.delete("currentUser");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  }

  handleGetCurrentUser() {
    try {
      const currentUser = this.store.get("currentUser");
      if (!currentUser) return null;

      if (currentUser.expiry && Date.now() > currentUser.expiry) {
        this.store.delete("currentUser");
        return null;
      }

      return {
        id: currentUser.id,
        email: currentUser.email,
        expiresAt: currentUser.expiry,
      };
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  handleGetStudents() {
    try {
      const currentUser = this.store.get("currentUser");
      if (!currentUser) return [];

      return this.store.get(`users.${currentUser.id}.students`, []);
    } catch (error) {
      console.error("Error getting students:", error);
      return [];
    }
  }

  handleAddStudent(event, studentName) {
    try {
      const currentUser = this.store.get("currentUser");
      if (!currentUser) return [];

      const students = this.store.get(`users.${currentUser.id}.students`, []);
      const studentId = `stu_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const newStudent = {
        id: studentId,
        name: studentName.trim(),
        books: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      students.push(newStudent);
      this.store.set(`users.${currentUser.id}.students`, students);

      // Audit log
      const auditLog = this.store.get("auditLog", []);
      auditLog.push({
        userId: currentUser.id,
        action: "add_student",
        studentId,
        timestamp: new Date().toISOString(),
      });
      this.store.set("auditLog", auditLog);

      return students;
    } catch (error) {
      console.error("Error adding student:", error);
      throw new Error("Failed to add student");
    }
  }

  handleRemoveStudents(event, idsToRemove) {
    try {
      const currentUser = this.store.get("currentUser");
      if (!currentUser) return [];

      let students = this.store.get(`users.${currentUser.id}.students`, []);
      const removedCount = students.length;

      students = students.filter(
        (student) => !idsToRemove.includes(student.id),
      );
      this.store.set(`users.${currentUser.id}.students`, students);

      // Audit log
      const auditLog = this.store.get("auditLog", []);
      auditLog.push({
        userId: currentUser.id,
        action: "remove_students",
        removedCount: removedCount - students.length,
        timestamp: new Date().toISOString(),
      });
      this.store.set("auditLog", auditLog);

      return students;
    } catch (error) {
      console.error("Error removing students:", error);
      throw new Error("Failed to remove students");
    }
  }

  handleUpdateStudentBooks(event, studentId, books, action = "update") {
    try {
      const currentUser = this.store.get("currentUser");
      if (!currentUser) return [];

      const students = this.store.get(`users.${currentUser.id}.students`, []);
      const studentIndex = students.findIndex((s) => s.id === studentId);

      if (studentIndex === -1) return students;

      const oldStudent = students[studentIndex];

      if (action === "checkin" && oldStudent.books?.length > 0) {
        const history = this.store.get(
          `users.${currentUser.id}.history.${studentId}`,
          [],
        );

        const removedBooks = oldStudent.books.filter(
          (oldBook) => !books.find((newBook) => newBook.isbn === oldBook.isbn),
        );

        const now = new Date().toISOString();
        removedBooks.forEach((book) => {
          book.checkinDate = now;
          if (!book.checkoutDate) book.checkoutDate = now;
        });

        this.store.set(`users.${currentUser.id}.history.${studentId}`, [
          ...history,
          ...removedBooks,
        ]);
      }

      students[studentIndex].books = books;
      students[studentIndex].updatedAt = new Date().toISOString();
      this.store.set(`users.${currentUser.id}.students`, students);

      return students;
    } catch (error) {
      console.error("Error updating student books:", error);
      throw error;
    }
  }

  handleGetStudentHistory(event, studentId) {
    try {
      const currentUser = this.store.get("currentUser");
      if (!currentUser) return [];

      return this.store.get(`users.${currentUser.id}.history.${studentId}`, []);
    } catch (error) {
      console.error("Error getting student history:", error);
      return [];
    }
  }

  handlePrintPreview(event, html) {
    const previewWindow = new BrowserWindow({
      width: 1000,
      height: 800,
      title: "Print Preview - ESCS",
      show: true,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    previewWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );

    previewWindow.webContents.on("did-finish-load", () => {
      previewWindow.webContents
        .printToPDF({})
        .then((data) => {
          const pdfPath = path.join(
            app.getPath("downloads"),
            `escs-print-${Date.now()}.pdf`,
          );
          fs.writeFile(pdfPath, data, (err) => {
            if (err) console.error("Failed to save PDF:", err);
          });
        })
        .catch((err) => {
          console.error("Failed to generate PDF:", err);
        });
    });

    previewWindow.on("closed", () => {
      console.log("Print preview window closed");
    });
  }

  handleReloadToLogin() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.loadFile("pages/login.html").then(() => {
        setTimeout(() => {
          this.mainWindow.focus();
          this.mainWindow.webContents.focus();
        }, 200);
      });
    }
  }

  handleWindowAllClosed() {
    if (process.platform !== "darwin") {
      app.quit();
    }
  }

  handleActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow();
    }
  }

  handleBeforeQuit() {
    // Cleanup tasks before quit
    console.log("Application shutting down...");
  }

  async createMainWindow() {
    try {
      console.log("Creating main window...");
      app.setAppUserModelId("com.escs.checkout");

      this.mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: "Easy Student Checkout System (ESCS)",
        icon: path.join(__dirname, "assets", "project_icon.ico"),
        autoHideMenuBar: true,
        show: true, // Show immediately to debug
        webPreferences: {
          // WARNING: nodeIntegration is insecure. Consider migrating to preload scripts
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: false,
          spellcheck: false,
        },
      });

      console.log("Window created, loading initial page...");
      // Load and show
      await this.loadInitialPage();
      console.log("Initial page loaded, maximizing...");

      this.mainWindow.maximize();
      console.log("Maximized, showing window...");
      this.mainWindow.show();
      console.log("Window shown.");

      if (this.isDev) {
        this.mainWindow.webContents.openDevTools({ mode: "detach" });
      }

      this.setupWindowEvents();
    } catch (error) {
      console.error("Failed to create main window:", error);
    }
  }

  async loadInitialPage() {
    const currentUser = this.store.get("currentUser");
    const page =
      currentUser && (!currentUser.expiry || Date.now() < currentUser.expiry)
        ? "pages/index.html"
        : "pages/login.html";

    await this.mainWindow.loadFile(page);
  }

  setupWindowEvents() {
    this.mainWindow.webContents.on("did-finish-load", () => {
      setTimeout(() => {
        this.mainWindow.focus();
        this.mainWindow.webContents.focus();
      }, 100);
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    // Prevent navigation away from the app
    this.mainWindow.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith("file://")) {
        event.preventDefault();
      }
    });
  }
}

// Application entry point
const application = new Application();
application.initialize().catch(console.error);
