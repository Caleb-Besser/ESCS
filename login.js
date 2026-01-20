const { ipcRenderer } = require("electron");

window.onload = async () => {
  let isLoginMode = true;

  // Get elements immediately when script runs
  const form = document.getElementById("auth-form");
  const formTitle = document.getElementById("form-title");
  const btnText = document.getElementById("btn-text");
  const toggleText = document.getElementById("toggle-text");
  const toggleLink = document.getElementById("toggle-link");
  const errorMessage = document.getElementById("error-message");
  const submitBtn = document.getElementById("submit-btn");
  const rememberCheckbox = document.getElementById("remember-me");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("show");
    setTimeout(() => {
      errorMessage.classList.remove("show");
    }, 5000);
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    emailInput.disabled = loading;
    passwordInput.disabled = loading;

    if (loading) {
      btnText.textContent = isLoginMode ? "Logging in..." : "Registering...";
    } else {
      btnText.textContent = isLoginMode ? "Login" : "Register";
    }
  }

  toggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    formTitle.textContent = isLoginMode ? "Login" : "Register";
    btnText.textContent = isLoginMode ? "Login" : "Register";
    toggleText.textContent = isLoginMode
      ? "Don't have an account?"
      : "Already have an account?";
    toggleLink.textContent = isLoginMode ? "Register" : "Login";
    errorMessage.classList.remove("show");
    emailInput.value = "";
    passwordInput.value = "";
    rememberCheckbox.checked = false;
    emailInput.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberCheckbox.checked;

    if (!email || !password) {
      showError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await ipcRenderer.invoke(
        isLoginMode ? "login" : "register",
        email,
        password,
        rememberMe,
      );

      if (result.success) {
        // Delay slightly before navigating
        setTimeout(() => {
          window.location.href = "index.html";
        }, 100);
      } else {
        showError(result.error || "An error occurred");
        setLoading(false);
      }
    } catch (error) {
      showError("An unexpected error occurred");
      setLoading(false);
    }
  });

  // Force focus on email input after a short delay
  setTimeout(() => {
    emailInput.focus();
  }, 200);
};
