const { ipcRenderer } = require("electron");

class StorageService {
  constructor() {
    this.ipcRenderer = ipcRenderer;
  }

  // Authentication methods
  async register(email, password, rememberMe) {
    return await this.ipcRenderer.invoke(
      "auth:register",
      email,
      password,
      rememberMe,
    );
  }

  async login(email, password, rememberMe) {
    return await this.ipcRenderer.invoke(
      "auth:login",
      email,
      password,
      rememberMe,
    );
  }

  async logout() {
    return await this.ipcRenderer.invoke("auth:logout");
  }

  async getCurrentUser() {
    return await this.ipcRenderer.invoke("auth:current-user");
  }

  // Student methods
  async getStudents() {
    return await this.ipcRenderer.invoke("students:get-all");
  }

  async addStudent(studentName) {
    return await this.ipcRenderer.invoke("students:add", studentName);
  }

  async removeStudents(idsToRemove) {
    return await this.ipcRenderer.invoke("students:remove", idsToRemove);
  }

  async updateStudentBooks(studentId, books, action = "update") {
    return await this.ipcRenderer.invoke(
      "students:update-books",
      studentId,
      books,
      action,
    );
  }

  async getStudentHistory(studentId) {
    return await this.ipcRenderer.invoke("students:get-history", studentId);
  }

  // System methods
  printPreview(html) {
    this.ipcRenderer.send("system:print-preview", html);
  }

  reloadToLogin() {
    this.ipcRenderer.send("system:reload-to-login");
  }

  getVersion() {
    return this.ipcRenderer.sendSync("system:get-version");
  }
}

module.exports = StorageService;
