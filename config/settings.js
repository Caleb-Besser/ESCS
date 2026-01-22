const Store = require("electron-store");

class SettingsManager {
  constructor() {
    this.store = new Store({
      name: "settings",
      defaults: {
        scanner: {
          soundEnabled: true,
          autoFocus: true,
          debounceTime: 200,
        },
        ui: {
          theme: "light",
          animations: true,
          compactMode: false,
        },
        printing: {
          defaultOrientation: "portrait",
          cardSize: "id",
          showBorders: true,
        },
        backup: {
          autoBackup: true,
          backupInterval: 24, // hours
          keepBackups: 7, // days
        },
      },
    });
  }

  get(key, defaultValue = null) {
    return this.store.get(key, defaultValue);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  delete(key) {
    this.store.delete(key);
  }

  reset() {
    this.store.clear();
  }

  getAll() {
    return this.store.store;
  }

  // Scanner settings
  getScannerSettings() {
    return this.get("scanner");
  }

  updateScannerSettings(updates) {
    const current = this.getScannerSettings();
    this.set("scanner", { ...current, ...updates });
  }

  // UI settings
  getUISettings() {
    return this.get("ui");
  }

  updateUISettings(updates) {
    const current = this.getUISettings();
    this.set("ui", { ...current, ...updates });
  }
}

module.exports = new SettingsManager();
