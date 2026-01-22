const { ipcRenderer } = require("electron");

class LoginController {
  constructor() {
    this.isLoginMode = true;
    this.elements = {};
    this.isLoading = false;

    this.initialize();
  }

  initialize() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.focusEmailInput();
  }

  cacheElements() {
    this.elements = {
      form: document.getElementById("auth-form"),
      formTitle: document.getElementById("form-title"),
      btnText: document.getElementById("btn-text"),
      toggleText: document.getElementById("toggle-text"),
      toggleLink: document.getElementById("toggle-link"),
      errorMessage: document.getElementById("error-message"),
      submitBtn: document.getElementById("submit-btn"),
      rememberCheckbox: document.getElementById("remember-me"),
      emailInput: document.getElementById("email"),
      passwordInput: document.getElementById("password"),
    };
  }

  setupEventListeners() {
    this.elements.toggleLink.addEventListener("click", (e) =>
      this.toggleMode(e),
    );
    this.elements.form.addEventListener("submit", (e) => this.handleSubmit(e));

    // Input validation
    this.elements.emailInput.addEventListener("input", () => this.clearError());
    this.elements.passwordInput.addEventListener("input", () =>
      this.clearError(),
    );
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Toggle mode with Ctrl+M
      if (e.ctrlKey && e.key === "m") {
        e.preventDefault();
        this.toggleMode(e);
      }

      // Focus email with Ctrl+E
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        this.elements.emailInput.focus();
      }

      // Focus password with Ctrl+P
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        this.elements.passwordInput.focus();
      }
    });
  }

  toggleMode(e) {
    e.preventDefault();
    this.isLoginMode = !this.isLoginMode;

    this.updateUIForMode();
    this.clearForm();
    this.clearError();
    this.focusEmailInput();
  }

  updateUIForMode() {
    this.elements.formTitle.textContent = this.isLoginMode
      ? "Login"
      : "Register";
    this.elements.btnText.textContent = this.isLoginMode ? "Login" : "Register";
    this.elements.toggleText.textContent = this.isLoginMode
      ? "Don't have an account?"
      : "Already have an account?";
    this.elements.toggleLink.textContent = this.isLoginMode
      ? "Register"
      : "Login";
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isLoading) return;

    const email = this.elements.emailInput.value.trim();
    const password = this.elements.passwordInput.value;
    const rememberMe = this.elements.rememberCheckbox.checked;

    if (!this.validateInputs(email, password)) {
      return;
    }

    this.setLoading(true);

    try {
      const result = await ipcRenderer.invoke(
        this.isLoginMode ? "auth:login" : "auth:register",
        email,
        password,
        rememberMe,
      );

      if (result.success) {
        this.showSuccess("Redirecting to application...");
        setTimeout(() => {
          window.location.href = "../pages/index.html";
        }, 500);
      } else {
        this.showError(result.error || "Authentication failed");
        this.setLoading(false);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      this.showError("An unexpected error occurred. Please try again.");
      this.setLoading(false);
    }
  }

  validateInputs(email, password) {
    if (!email || !password) {
      this.showError("Please fill in all fields");
      return false;
    }

    if (!this.isValidEmail(email)) {
      this.showError("Please enter a valid email address");
      return false;
    }

    if (password.length < 6) {
      this.showError("Password must be at least 6 characters");
      return false;
    }

    return true;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.className = "error show";
  }

  showSuccess(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.className = "success show";
    setTimeout(() => {
      this.elements.errorMessage.classList.remove("show");
    }, 3000);
  }

  clearError() {
    this.elements.errorMessage.classList.remove("show");
  }

  setLoading(loading) {
    this.isLoading = loading;

    this.elements.submitBtn.disabled = loading;
    this.elements.emailInput.disabled = loading;
    this.elements.passwordInput.disabled = loading;
    this.elements.rememberCheckbox.disabled = loading;
    this.elements.toggleLink.style.pointerEvents = loading ? "none" : "auto";
    this.elements.toggleLink.style.opacity = loading ? "0.5" : "1";

    if (loading) {
      this.elements.btnText.innerHTML = `
        ${this.isLoginMode ? "Logging in..." : "Registering..."}
        <span class="loading-spinner"></span>
      `;
    } else {
      this.elements.btnText.textContent = this.isLoginMode
        ? "Login"
        : "Register";
    }
  }

  clearForm() {
    this.elements.emailInput.value = "";
    this.elements.passwordInput.value = "";
    this.elements.rememberCheckbox.checked = false;
  }

  focusEmailInput() {
    setTimeout(() => {
      this.elements.emailInput.focus();
      this.elements.emailInput.select();
    }, 100);
  }
}

module.exports = LoginController;
