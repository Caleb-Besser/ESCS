// app.js - Updated with new sidebar structure
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
  getCustomBarcodes,
  saveCustomBarcode,
  syncLocalBarcodesToFirebase,
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
  showAddStudentModal,
  showStudentHistoryModal,
} from "./modalManager.js";

window.appState = {
  studentsContainer: null,
  selectedBooksContainer: null,
  openPrintPreview: null,
  booksHeaderEl: null,
  logoutBtn: null,
  barcodeInput: null,
  selectedStudents: [],
  dynamicControls: null,
  currentSort: "name",
  allStudents: [], // Add this to store all students
  customBarcodes: [], // Store custom barcodes from Firebase
};

// Function to update the selected student display in the top bar
function updateSelectedStudentDisplay() {
  const displayElement = document.getElementById("selected-student-display");
  const booksHeaderEl = document.getElementById("books-header");

  const selectedCount = appState.selectedStudents.length;

  if (selectedCount === 0) {
    // No student selected
    if (displayElement) {
      displayElement.textContent = "Select or scan a student";
      displayElement.style.color = "rgba(255, 255, 255, 0.7)";
      displayElement.style.fontStyle = "italic";
    }
    if (booksHeaderEl) {
      booksHeaderEl.textContent = ""; // Clear books header
    }
  } else if (selectedCount === 1) {
    // One student selected
    const studentId = appState.selectedStudents[0];
    const student = appState.allStudents.find((s) => s.id === studentId);
    if (student) {
      if (displayElement) {
        displayElement.textContent = `${student.name}'s Books`;
        displayElement.style.color = "rgba(255, 255, 255, 0.95)";
        displayElement.style.fontStyle = "normal";
      }
      if (booksHeaderEl) {
        booksHeaderEl.textContent = ""; // Clear books header since it's now in top bar
      }
    } else {
      if (displayElement) {
        displayElement.textContent = "Student not found";
        displayElement.style.color = "rgba(255, 255, 255, 0.7)";
        displayElement.style.fontStyle = "italic";
      }
      if (booksHeaderEl) {
        booksHeaderEl.textContent = "Student not found";
      }
    }
  } else {
    // Multiple students selected
    if (displayElement) {
      displayElement.textContent = `${selectedCount} students selected`;
      displayElement.style.color = "rgba(255, 255, 255, 0.95)";
      displayElement.style.fontStyle = "normal";
    }
    if (booksHeaderEl) {
      booksHeaderEl.textContent = `${selectedCount} Students Selected`;
    }
  }
}

// Function to add student (moved here to avoid circular dependencies)
async function addStudentDirect(name) {
  if (!name) return;
  try {
    const updated = await firebaseAddStudent(name);
    appState.allStudents = updated;
    appState.studentsContainer.innerHTML = "";
    appState.selectedStudents = [];
    const sortedStudents = sortStudents(updated, appState.currentSort);
    sortedStudents.forEach(addStudentToList);
    renderSelectedBooks();
    updateDynamicControls(0);
    updateSelectedStudentDisplay();
    setTimeout(focusBarcodeInput, 500);
    showToast("Student added successfully", "#10b981");
  } catch (error) {
    showToast("Error adding student", "#ef4444");
  }
}

// Function to remove students
async function removeStudentsDirect() {
  if (!appState.selectedStudents.length) {
    showToast("No students selected.", "#ef4444");
    return;
  }

  const confirmed = await showConfirm(
    "Remove Students",
    `Remove ${appState.selectedStudents.length} student(s)?`,
    true,
  );

  if (!confirmed) return;

  try {
    const updated = await firebaseRemoveStudents(appState.selectedStudents);
    appState.allStudents = updated;
    appState.studentsContainer.innerHTML = "";
    appState.selectedStudents = [];
    const sortedStudents = sortStudents(updated, appState.currentSort);
    sortedStudents.forEach(addStudentToList);
    renderSelectedBooks();
    updateDynamicControls(0);
    updateSelectedStudentDisplay();
    setTimeout(focusBarcodeInput, 500);
    showToast("Students removed successfully", "#10b981");
  } catch (error) {
    showToast("Error removing students", "#ef4444");
  }
}

// app.js - Updated printStudents function with medium barcode size
async function printStudents() {
  if (!appState.selectedStudents.length) {
    showToast("Select at least one student.", "#ef4444");
    return;
  }

  try {
    const studentsToPrint = appState.allStudents.filter((s) =>
      appState.selectedStudents.includes(s.id),
    );

    console.log("Printing students:", studentsToPrint);
    showToast(`Preparing to print ${studentsToPrint.length} ID(s)`, "#3b82f6");

    // Create print HTML - ID card layout with medium barcode size (3")
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print Student IDs</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { 
          size: letter; 
          margin: 0.25in;
        }
        body { 
          font-family: Arial, sans-serif; 
          background: #fff; 
          padding-top: 40px;
        }
        .print-cards-page {
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: flex-start;
          gap: 0;
        }
        .id-card {
          width: 3.375in;  /* Standard ID card width */
          height: 2.125in; /* Standard ID card height */
          border: 2px dotted #000;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          page-break-inside: avoid;
          margin: 0.125in;
          background: white;
        }
        .student-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #000;
          text-align: center;
          width: 100%;
        }
        .barcode-container {
          width: 100%;
          margin: 8px 0;
          display: flex;
          justify-content: center;
        }
        .student-id {
          font-size: 12px;
          color: #333;
          margin-top: 5px;
          text-align: center;
          letter-spacing: 1px;
        }
        .print-controls {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background: #0f766e;
          padding: 15px;
          display: flex;
          justify-content: flex-end;
          z-index: 1000;
        }
        .print-btn {
          background: #0d9488;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        }
        .print-btn:hover {
          background: #0f766e;
        }
        @media print {
          body { 
            padding-top: 0; 
            padding: 0;
            margin: 0;
          }
          .no-print { 
            display: none !important; 
          }
          .print-cards-page {
            gap: 0;
            margin: 0;
          }
          .id-card {
            border: 2px dotted #000 !important;
            margin: 0.125in !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Ensure exactly 8 cards per page */
          .print-cards-page {
            page-break-after: always;
            height: 10.5in; /* Account for page margins */
          }
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      </head><body>
      <div class="print-controls no-print">
        <button class="print-btn" onclick="window.print()">Print IDs</button>
        <button class="print-btn" style="margin-left: 10px; background: #6b7280;" onclick="window.close()">Close</button>
      </div>
      <div class="print-cards-page">`;

    // Group students into pages of 8 cards each
    for (let i = 0; i < studentsToPrint.length; i++) {
      const student = studentsToPrint[i];

      // Start new page after every 8 cards
      if (i > 0 && i % 8 === 0) {
        html += `</div><div class="print-cards-page">`;
      }

      html += `
        <div class="id-card">
          <div class="student-name">${student.name}</div>
          <div class="barcode-container">
            <svg class="student-barcode" data-id="${student.id}" style="width: 100%; height: 60px;"></svg>
          </div>
          <div class="student-id">ID: ${student.id}</div>
        </div>
      `;
    }

    html += `</div><script>
      // Generate barcodes for all student cards with MEDIUM size (3")
      document.querySelectorAll('.student-barcode').forEach(svg => {
        const studentId = svg.getAttribute('data-id');
        try {
          JsBarcode(svg, studentId, {
            format: 'CODE128',
            displayValue: true, // Show the text under barcode (like medium size)
            height: 45, // Medium size height (same as medium book barcodes)
            width: 2, // Medium size width
            fontSize: 14, // Medium size font
            margin: 5, // Medium size margin
            background: 'transparent',
            lineColor: '#000000'
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
          // Fallback: Show ID as text
          svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#000" font-size="14">' + studentId + '</text>';
        }
      });
      
      // Focus the print button for better UX
      window.addEventListener('load', function() {
        setTimeout(function() {
          const printBtn = document.querySelector('.print-btn');
          if (printBtn) printBtn.focus();
        }, 100);
      });
    <\/script></body></html>`;

    // Open print preview window
    openPrintPreview(html);
  } catch (error) {
    console.error("Error preparing print:", error);
    showToast("Error preparing print", "#ef4444");
  }
}

// Add this helper function to app.js
function openPrintPreview(html) {
  // For Electron app
  if (window.electronAPI) {
    window.electronAPI.openPrintPreview(html);
  } else {
    // For browser fallback
    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
appState.openPrintPreview = openPrintPreview;
window.openPrintPreview = openPrintPreview;

// Update dynamic controls
export function updateDynamicControls(selectedCount) {
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
        await addStudentDirect(studentName);
      }
    });
    controlsContainer.appendChild(addBtn);
  } else if (selectedCount === 1) {
    // Add History Button
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
      const studentId = appState.selectedStudents[0];
      const student = appState.allStudents.find((s) => s.id === studentId);
      if (student) {
        await showStudentHistoryModal(studentId, student.name);
      }
    });
    controlsContainer.appendChild(historyBtn);

    // Print Button
    const printBtn = document.createElement("button");
    printBtn.className = "dynamic-btn secondary";
    printBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <path d="M6 14h12v8H6z"/>
      </svg>
      Print Student ID
    `;
    printBtn.addEventListener("click", printStudents);
    controlsContainer.appendChild(printBtn);

    // Remove Button
    const removeBtn = document.createElement("button");
    removeBtn.className = "dynamic-btn danger";
    removeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      Remove Student
    `;
    removeBtn.addEventListener("click", removeStudentsDirect);
    controlsContainer.appendChild(removeBtn);
  } else {
    // Multiple students selected
    const printBtn = document.createElement("button");
    printBtn.className = "dynamic-btn secondary";
    printBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <path d="M6 14h12v8H6z"/>
      </svg>
      Print Student IDs (${selectedCount})
    `;
    printBtn.addEventListener("click", printStudents);
    controlsContainer.appendChild(printBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "dynamic-btn danger";
    removeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      Remove Students (${selectedCount})
    `;
    removeBtn.addEventListener("click", removeStudentsDirect);
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
        await addStudentDirect(studentName);
      }
    });
    controlsContainer.appendChild(addBtn);
  }
}

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

    // Sync local barcodes to Firebase
    console.log("Syncing local barcodes to Firebase...");
    const syncResult = await syncLocalBarcodesToFirebase();
    if (syncResult.synced > 0) {
      showToast(
        `Migrated ${syncResult.synced} local barcode(s) to cloud`,
        "#3b82f6",
      );
    }

    // Load custom barcodes from Firebase
    appState.customBarcodes = await getCustomBarcodes();

    // Initialize DOM elements
    appState.studentsContainer = document.getElementById("students");
    appState.selectedBooksContainer = document.getElementById(
      "selected-books-list",
    );
    appState.booksHeaderEl = document.getElementById("books-header");
    appState.logoutBtn = document.getElementById("logout-btn");
    appState.selectAllCheckbox = document.getElementById("select-all-checkbox");
    appState.selectAllHeaderBtn = document.getElementById(
      "select-all-header-btn",
    );
    appState.sortHeaderBtn = document.getElementById("sort-header-btn");
    appState.sortMenu = document.getElementById("sort-menu");
    appState.barcodeButton = document.getElementById("barcode-button");
    appState.barcodeMenu = document.getElementById("barcode-menu");
    appState.dynamicControls = document.getElementById("dynamic-controls");

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
    appState.allStudents = students;
    appState.studentsContainer.innerHTML = "";
    if (students.length > 0) {
      const sortedStudents = sortStudents(students, appState.currentSort);
      sortedStudents.forEach(addStudentToList);
    }
    renderSelectedBooks();
    updateDynamicControls(0);
    updateSelectedStudentDisplay(); // Initialize the selected student display

    // Set initial sort option as active
    document
      .querySelector(`.sort-option[data-sort="${appState.currentSort}"]`)
      ?.classList.add("active");

    // REMOVED: No longer adding the barcode scanner ready class
    // document.body.classList.add("barcode-scanner-ready");

    // Focus barcode input whenever student selection changes
    window.addEventListener("studentSelectionChanged", () => {
      updateSelectedStudentDisplay();
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

  // NEW: Select All Header Button (handles the whole left side click)
  appState.selectAllHeaderBtn.addEventListener("click", (e) => {
    // Don't trigger if clicking directly on the checkbox
    if (e.target.type === "checkbox") return;

    const selectAllCheckbox = appState.selectAllCheckbox;
    selectAllCheckbox.checked = !selectAllCheckbox.checked;

    // Trigger the change event
    const event = new Event("change");
    selectAllCheckbox.dispatchEvent(event);
  });

  // Select All Logic (checkbox)
  appState.selectAllCheckbox.addEventListener("change", async (e) => {
    if (e.target.checked) {
      appState.selectedStudents = appState.allStudents.map((s) => s.id);
    } else {
      appState.selectedStudents = [];
    }

    // Update UI
    document.querySelectorAll(".student-card").forEach((card) => {
      card.classList.toggle("selected", e.target.checked);
    });

    renderSelectedBooks();
    updateDynamicControls(appState.selectedStudents.length);
    updateSelectedStudentDisplay();
  });

  // NEW: Sort Header Button
  appState.sortHeaderBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    appState.sortMenu.classList.toggle("show");
  });

  // Close menus when clicking elsewhere
  document.addEventListener("click", () => {
    appState.sortMenu.classList.remove("show");
    appState.barcodeMenu.classList.remove("show");
  });

  appState.sortMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Sort options
  document.querySelectorAll(".sort-option").forEach((option) => {
    option.addEventListener("click", async () => {
      appState.currentSort = option.dataset.sort;
      document.querySelectorAll(".sort-option").forEach((opt) => {
        opt.classList.remove("active");
      });
      option.classList.add("active");
      appState.sortMenu.classList.remove("show");

      appState.studentsContainer.innerHTML = "";
      const sortedStudents = sortStudents(
        appState.allStudents,
        appState.currentSort,
      );
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
}

// Export functions needed by other modules
export {
  getStudents,
  firebaseAddStudent as addStudent,
  firebaseRemoveStudents as removeStudents,
  firebaseUpdateStudentBooks as updateStudentBooks,
  firebaseGetStudentHistory as getStudentHistory,
  addStudentDirect as addStudentGlobal,
  updateSelectedStudentDisplay,
};
