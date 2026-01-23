// app.js - Updated for Firebase
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getStudents,
  addStudent as firebaseAddStudent,
  removeStudents as firebaseRemoveStudents,
  updateStudentBooks as firebaseUpdateStudentBooks,
  getStudentHistory as firebaseGetStudentHistory,
} from "../firebaseDB.js";
import { migrateOldData } from "../migration.js";
import { auth, db } from "../firebase.js";
import { setupBarcodeScanner, focusBarcodeInput } from "./barcodeScanner.js";
import {
  addStudentToList,
  updateStudentSelection,
  sortStudents,
  renderSelectedBooks,
  showToast,
  showConfirm,
} from "./uiRenderer.js";
import { showSkeletons } from "./utils.js";
import {
  showCreateBarcodeModal,
  showYourBarcodesModal,
} from "./modalManager.js";

window.appState = {
  studentsContainer: null,
  selectedBooksContainer: null,
  booksHeaderEl: null,
  logoutBtn: null,
  barcodeInput: null,
  selectedStudents: [],
  dynamicControls: null, // ADDED THIS LINE
  currentSort: "name",
};

window.onload = async () => {
  try {
    // Check authentication state
    const currentUser = await new Promise((resolve) => {
      auth.onAuthStateChanged((user) => {
        resolve(user);
      });
    });

    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }

    // Run migration if this is the first time logging in
    console.log("Checking for old data to migrate...");
    const wasMigrated = await migrateOldData();
    if (wasMigrated) {
      showToast("Old data migrated successfully! 🎉", "#10b981");
    }

    // Initialize DOM elements
    appState.studentsContainer = document.getElementById("students");
    appState.selectedBooksContainer = document.getElementById(
      "selected-books-list",
    );
    appState.booksHeaderEl = document.getElementById("books-header");
    appState.logoutBtn = document.getElementById("logout-btn");
    appState.selectAllCheckbox = document.getElementById("select-all-checkbox");
    appState.sortButton = document.getElementById("sort-button");
    appState.sortMenu = document.getElementById("sort-menu");
    appState.barcodeButton = document.getElementById("barcode-button");
    appState.barcodeMenu = document.getElementById("barcode-menu");
    appState.stateIndicator = document.getElementById("state-indicator");
    appState.dynamicControls = document.getElementById("dynamic-controls"); // THIS SHOULD NOW WORK

    if (!appState.studentsContainer) return;

    // Initialize state
    appState.selectedStudents = [];
    appState.currentSort = "name-asc";

    // Setup event listeners
    setupEventListeners();

    // Setup barcode scanner
    setupBarcodeScanner();

    // Load initial data
    showSkeletons();
    const students = await getStudents();
    appState.studentsContainer.innerHTML = "";
    if (students.length > 0) {
      const sortedStudents = sortStudents(students, appState.currentSort);
      sortedStudents.forEach(addStudentToList);
    }
    renderSelectedBooks();

    // Set initial sort option as active
    document
      .querySelector(`.sort-option[data-sort="${appState.currentSort}"]`)
      ?.classList.add("active");

    document.body.classList.add("barcode-scanner-ready");

    // Focus barcode input whenever student selection changes
    window.addEventListener("studentSelected", () => {
      setTimeout(focusBarcodeInput, 100);
    });
  } catch (error) {
    console.error("Error in main script:", error);
    const studentsContainer = document.getElementById("students");
    if (studentsContainer) {
      studentsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc2626;">
          <h3>Error loading students</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px;">
            Reload Page
          </button>
        </div>
      `;
    }
  }
};

function updateDynamicControls(selectedCount) {
  const controlsContainer = document.getElementById("dynamic-controls");
  if (!controlsContainer) return;

  controlsContainer.innerHTML = "";

  if (selectedCount === 0) {
    const addBtn = document.createElement("button");
    addBtn.className = "dynamic-btn primary";
    addBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Add Student
    `;
    addBtn.addEventListener("click", async () => {
      const studentName = await showAddStudentModal();
      if (studentName) {
        await addStudent(studentName);
      }
    });
    controlsContainer.appendChild(addBtn);
  } else if (selectedCount === 1) {
    // Add History Button FIRST
    const historyBtn = document.createElement("button");
    historyBtn.className = "dynamic-btn info";
    historyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      View Reading History
    `;
    historyBtn.addEventListener("click", async () => {
      const studentId = selectedStudents[0];
      const allStudents = await ipcRenderer.invoke("get-students");
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        await showStudentHistoryModal(studentId, student.name);
      }
    });
    controlsContainer.appendChild(historyBtn);

    const printBtn = document.createElement("button");
    printBtn.className = "dynamic-btn secondary";
    printBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <path d="M6 14h12v8H6z"/>
      </svg>
      Print Student ID
    `;
    printBtn.addEventListener("click", () => {
      handlePrint();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "dynamic-btn danger";
    removeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      Remove Student
    `;
    removeBtn.addEventListener("click", () => {
      handleRemoveStudent();
    });

    controlsContainer.appendChild(printBtn);
    controlsContainer.appendChild(removeBtn);
  } else {
    const printBtn = document.createElement("button");
    printBtn.className = "dynamic-btn secondary";
    printBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <path d="M6 14h12v8H6z"/>
      </svg>
      Print Student IDs (${selectedCount})
    `;
    printBtn.addEventListener("click", () => {
      handlePrint();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "dynamic-btn danger";
    removeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      Remove Students (${selectedCount})
    `;
    removeBtn.addEventListener("click", () => {
      handleRemoveStudent();
    });

    controlsContainer.appendChild(printBtn);
    controlsContainer.appendChild(removeBtn);
  }

  if (selectedCount > 0) {
    const addBtn = document.createElement("button");
    addBtn.className = "dynamic-btn primary";
    addBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Add Another Student
    `;
    addBtn.addEventListener("click", async () => {
      const studentName = await showAddStudentModal();
      if (studentName) {
        await addStudent(studentName);
      }
    });
    controlsContainer.appendChild(addBtn);
  }
}

function setupEventListeners() {
  // Logout button
  appState.logoutBtn.addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "Logout",
      "Are you sure you want to logout?",
    );
    if (confirmed) {
      try {
        await auth.signOut();
        window.location.href = "login.html";
      } catch (error) {
        console.error("Logout error:", error);
        showToast("Error logging out", "#ef4444");
      }
    }
  });

  // Sort button and menu
  appState.sortButton.addEventListener("click", (e) => {
    e.stopPropagation();
    appState.sortMenu.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    appState.sortMenu.classList.remove("show");
    appState.barcodeMenu.classList.remove("show");
  });

  appState.sortMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.querySelectorAll(".sort-option").forEach((option) => {
    option.addEventListener("click", async () => {
      appState.currentSort = option.dataset.sort;
      document.querySelectorAll(".sort-option").forEach((opt) => {
        opt.classList.remove("active");
      });
      option.classList.add("active");
      appState.sortMenu.classList.remove("show");

      const students = await getStudents();
      appState.studentsContainer.innerHTML = "";
      const sortedStudents = sortStudents(students, appState.currentSort);
      sortedStudents.forEach(addStudentToList);
    });
  });

  // Barcode dropdown event listeners
  appState.barcodeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    appState.barcodeMenu.classList.toggle("show");
    appState.sortMenu.classList.remove("show");
  });

  appState.barcodeMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.querySelectorAll(".barcode-option").forEach((option) => {
    option.addEventListener("click", async () => {
      const action = option.dataset.action;
      appState.barcodeMenu.classList.remove("show");

      if (action === "create") {
        await showCreateBarcodeModal();
      } else if (action === "your-barcodes") {
        await showYourBarcodesModal();
      }
    });
  });

  // Select All Logic
  appState.selectAllCheckbox.addEventListener("change", async (e) => {
    const allStudents = await getStudents();
    const cards = document.querySelectorAll(".student-card");

    if (e.target.checked) {
      appState.selectedStudents = allStudents.map((s) => s.id);
      cards.forEach((card) => card.classList.add("selected"));
    } else {
      appState.selectedStudents = [];
      cards.forEach((card) => card.classList.remove("selected"));
    }
    renderSelectedBooks();
  });
}

// Export Firebase functions for use in other modules
export {
  getStudents,
  firebaseAddStudent as addStudent,
  firebaseRemoveStudents as removeStudents,
  firebaseUpdateStudentBooks as updateStudentBooks,
  firebaseGetStudentHistory as getStudentHistory,
};
