const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class Logger {
  constructor() {
    this.logDir = path.join(app.getPath("userData"), "logs");
    this.maxLogSize = 5 * 1024 * 1024; // 5MB
    this.maxLogFiles = 10;

    this.ensureLogDirectory();
    this.rotateLogs();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFilePath() {
    const date = new Date().toISOString().split("T")[0];
    return path.join(this.logDir, `escs-${date}.log`);
  }

  rotateLogs() {
    try {
      const files = fs
        .readdirSync(this.logDir)
        .filter((file) => file.startsWith("escs-") && file.endsWith(".log"))
        .map((file) => ({
          name: file,
          path: path.join(this.logDir, file),
          time: fs.statSync(path.join(this.logDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the most recent files
      if (files.length > this.maxLogFiles) {
        files.slice(this.maxLogFiles).forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error("Failed to rotate logs:", error);
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      logMessage += ` | ${JSON.stringify(data)}`;
    }

    return logMessage + "\n";
  }

  log(level, message, data = null) {
    const logMessage = this.formatMessage(level, message, data);

    // Console output
    const consoleMethod =
      level === "error" ? "error" : level === "warn" ? "warn" : "log";
    console[consoleMethod](logMessage.trim());

    // File output
    try {
      fs.appendFileSync(this.getLogFilePath(), logMessage, "utf8");

      // Check file size and rotate if needed
      const stats = fs.statSync(this.getLogFilePath());
      if (stats.size > this.maxLogSize) {
        this.rotateLogs();
      }
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  info(message, data = null) {
    this.log("info", message, data);
  }

  warn(message, data = null) {
    this.log("warn", message, data);
  }

  error(message, data = null) {
    this.log("error", message, data);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, data);
    }
  }
}

module.exports = new Logger();
