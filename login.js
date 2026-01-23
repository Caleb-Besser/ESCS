// login.js - Firebase Authentication using Modular SDK
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
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

  // Google Login button listener
  const googleLoginBtn = document.getElementById("google-login-btn");
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", handleGoogleLogin);
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

// NEW: Google Login Function
async function handleGoogleLogin() {
  try {
    const provider = new GoogleAuthProvider();

    // Add scopes if needed (optional)
    provider.addScope("profile");
    provider.addScope("email");

    // Show loading state
    const googleBtn = document.getElementById("google-login-btn");
    const originalText = googleBtn.innerHTML;
    googleBtn.innerHTML = `
      <div class="loading" style="border: 2px solid #4285F4; border-top-color: transparent; width: 18px; height: 18px;"></div>
      Signing in...
    `;
    googleBtn.disabled = true;

    const result = await signInWithPopup(auth, provider);
    console.log("Google login successful:", result.user);

    // Get the user's ID token (optional, for backend verification)
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;

    showToast("Signed in with Google!", "#10b981");

    // Redirect to main app
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    console.error("Google login error:", error);

    let errorMessage = "Google login failed";

    if (error.code === "auth/popup-blocked") {
      errorMessage =
        "Popup blocked by browser. Please allow popups for this site.";
    } else if (error.code === "auth/popup-closed-by-user") {
      errorMessage = "Popup closed. Please try again.";
    } else if (error.code === "auth/cancelled-popup-request") {
      // User cancelled, no need to show error
      return;
    } else if (error.code === "auth/account-exists-with-different-credential") {
      errorMessage =
        "An account already exists with the same email address but different sign-in credentials.";
    }

    showToast(errorMessage, "#ef4444");

    // Reset button
    const googleBtn = document.getElementById("google-login-btn");
    googleBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    `;
    googleBtn.disabled = false;
  }
}

// EXISTING showToast function (DON'T REMOVE THIS!)
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
