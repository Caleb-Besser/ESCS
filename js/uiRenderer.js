// uiRenderer.js - Updated for Firebase & Dynamic Controls
import { getStudentHistory as firebaseGetStudentHistory } from "../firebaseDB.js";
import { handlePrint, handleRemoveStudent } from "./studentManager.js";

// Global state
window.appState = window.appState || {
  studentsContainer: null,
  selectedBooksContainer: null,
  booksHeaderEl: null,
  logoutBtn: null,
  barcodeInput: null,
  selectedStudents: [],
  currentSort: "name-asc",
};

// Add student to the list
function addStudentToList(student) {
  if (!appState.studentsContainer) return;

  const card = document.createElement("div");
  card.className = "student-card";
  card.dataset.studentId = student.id;

  const bookCount = student.books ? student.books.length : 0;
  const hasBooks = bookCount > 0;

  card.innerHTML = `
    <div class="student-info">
      <div class="student-name">${student.name}</div>
      <div class="student-meta">
        <span class="student-id">ID: ${student.id}</span>
        <span class="student-books ${hasBooks ? "has-books" : ""}">${bookCount} book${bookCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
    <div class="student-actions">
      <button class="history-btn" title="View Reading History">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3v18h18"></path>
          <path d="m19 9-5 5-4-4-3 3"></path>
        </svg>
      </button>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest(".history-btn")) return;

    const isSelected = appState.selectedStudents.includes(student.id);
    if (isSelected) {
      appState.selectedStudents = appState.selectedStudents.filter(
        (id) => id !== student.id,
      );
    } else {
      // Logic for multi-select (holding Ctrl) or single-select
      if (e.ctrlKey || e.metaKey) {
        appState.selectedStudents.push(student.id);
      } else {
        appState.selectedStudents = [student.id];
      }
    }
    updateStudentSelection();
    renderSelectedBooks();
  });

  const historyBtn = card.querySelector(".history-btn");
  historyBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await showStudentHistoryModal(student.id, student.name);
  });

  appState.studentsContainer.appendChild(card);
}

// Update student selection UI and render dynamic buttons
function updateStudentSelection() {
  // Update card styles
  document.querySelectorAll(".student-card").forEach((card) => {
    const studentId = card.dataset.studentId;
    const isSelected = appState.selectedStudents.includes(studentId);
    card.classList.toggle("selected", isSelected);
  });

  // Render Dynamic Buttons at the bottom
  const container = appState.dynamicControls;
  if (!container) return;

  if (appState.selectedStudents.length > 0) {
    container.innerHTML = `
      <div class="dynamic-actions-bar">
        <span class="selection-count">${appState.selectedStudents.length} selected</span>
        <div class="action-buttons">
          <button id="print-selected-btn" class="btn-primary">Print Barcodes</button>
          <button id="remove-selected-btn" class="btn-danger">Remove</button>
        </div>
      </div>
    `;

    // Re-attach listeners to the new dynamic buttons
    document
      .getElementById("print-selected-btn")
      .addEventListener("click", handlePrint);
    document
      .getElementById("remove-selected-btn")
      .addEventListener("click", handleRemoveStudent);
  } else {
    container.innerHTML = "";
  }
}

function sortStudents(students, sortType) {
  const sorted = [...students];
  switch (sortType) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "books-asc":
      return sorted.sort(
        (a, b) => (a.books?.length || 0) - (b.books?.length || 0),
      );
    case "books-desc":
      return sorted.sort(
        (a, b) => (b.books?.length || 0) - (a.books?.length || 0),
      );
    case "id-asc":
      return sorted.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    case "id-desc":
      return sorted.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    default:
      return sorted;
  }
}

function renderSelectedBooks() {
  if (!appState.selectedBooksContainer || !appState.booksHeaderEl) return;

  if (appState.selectedStudents.length === 0) {
    appState.booksHeaderEl.textContent = "Select a student to view their books";
    appState.selectedBooksContainer.innerHTML = "";
    return;
  }

  const studentId = appState.selectedStudents[0];
  appState.booksHeaderEl.textContent = `Books for Student ${studentId}`;
  appState.selectedBooksContainer.innerHTML = "<p>Books logic pending...</p>";
}

function showToast(message, color = "#10b981") {
  const toast = document.createElement("div");
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${color}; color: white; padding: 16px 24px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showConfirm(title, message, isDanger = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    const okBtn = document.getElementById("confirm-ok");
    isDanger ? okBtn.classList.add("danger") : okBtn.classList.remove("danger");

    modal.classList.add("show");
    const cleanup = (val) => {
      modal.classList.remove("show");
      resolve(val);
    };
    okBtn.onclick = () => cleanup(true);
    document.getElementById("confirm-cancel").onclick = () => cleanup(false);
  });
}

async function showStudentHistoryModal(studentId, studentName) {
  const history = await firebaseGetStudentHistory(studentId);
  const modal = document.createElement("div");
  modal.className = "history-modal-overlay";
  modal.innerHTML = `
    <div class="history-modal">
      <div class="history-modal-header"><h3>${studentName}'s History</h3></div>
      <div class="history-modal-content">${history.length === 0 ? "<p>No history found.</p>" : "History list goes here."}</div>
      <div class="history-modal-footer"><button id="close-history">Close</button></div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("close-history").onclick = () => modal.remove();
}

export {
  addStudentToList,
  updateStudentSelection,
  sortStudents,
  renderSelectedBooks,
  showToast,
  showConfirm,
  showStudentHistoryModal,
};
