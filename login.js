// login.js - Firebase Authentication using Modular SDK
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

let rememberMe = false;

window.onload = () => {
  console.log("Login page loaded");

  // Check if already logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User already logged in, redirecting to index");
      window.location.href = "index.html";
    }
  });

  // Setup form handlers
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const toggleText = document.getElementById("toggle-text");

  console.log("Login form:", loginForm);
  console.log("Register form:", registerForm);
  console.log("Toggle text:", toggleText);

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Toggle between login and register
  if (toggleText) {
    toggleText.addEventListener("click", toggleForms);
  }

  // Remember me checkbox
  const rememberCheckbox = document.getElementById("remember-me");
  if (rememberCheckbox) {
    rememberCheckbox.addEventListener("change", (e) => {
      rememberMe = e.target.checked;
    });
  }
};

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showToast("Please fill in all fields", "#ef4444");
    return;
  }

  const loginBtn = document.querySelector("#login-form button[type='submit']");
  const originalText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("Login successful:", userCredential.user);
    showToast("Login successful!", "#10b981");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Login failed";

    if (error.code === "auth/user-not-found") {
      errorMessage = "Email not registered";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format";
    } else if (error.code === "auth/invalid-credential") {
      errorMessage = "Invalid email or password";
    }

    showToast(errorMessage, "#ef4444");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = originalText;
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById("register-confirm").value;

  if (!email || !password || !confirmPassword) {
    showToast("Please fill in all fields", "#ef4444");
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match", "#ef4444");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "#ef4444");
    return;
  }

  const registerBtn = document.querySelector(
    "#register-form button[type='submit']",
  );
  const originalText = registerBtn.textContent;
  registerBtn.disabled = true;
  registerBtn.textContent = "Creating account...";

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("Registration successful:", userCredential.user);
    showToast("Account created successfully!", "#10b981");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    console.error("Registration error:", error);
    let errorMessage = "Registration failed";

    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Email already registered";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak";
    }

    showToast(errorMessage, "#ef4444");
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = originalText;
  }
}

function toggleForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm.style.display === "none") {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  } else {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  }
}

function showToast(message, color) {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: ${color}; color: white;
    padding: 16px 24px; border-radius: 8px; font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
