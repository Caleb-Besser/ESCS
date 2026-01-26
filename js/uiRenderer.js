// uiRenderer.js - Fixed centering and multiple selection display
import { getStudentHistory as firebaseGetStudentHistory } from "../firebaseDB.js";
import { updateDynamicControls } from "./app.js";

// Global state
window.appState = window.appState || {
  studentsContainer: null,
  selectedBooksContainer: null,
  booksHeaderEl: null,
  logoutBtn: null,
  barcodeInput: null,
  selectedStudents: [],
  currentSort: "name-asc",
  allStudents: [],
};

// Add student to the list - RESTORED BETTER STYLING
function addStudentToList(student) {
  if (!appState.studentsContainer) return;

  const card = document.createElement("div");
  card.className = "student-card";
  card.dataset.studentId = student.id;

  const bookCount = student.books ? student.books.length : 0;
  const hasBooks = bookCount > 0;

  // REMOVED THE HISTORY BUTTON FROM THE CARD
  // Added back the book count indicator on the right
  card.innerHTML = `
    <div class="status-dot ${hasBooks ? "has-books" : "no-books"}"></div>
    <div class="student-info">
      <div class="student-name">${student.name}</div>
      <div class="student-id">ID: ${student.id}</div>
    </div>
    <div class="book-count ${bookCount === 0 ? "zero" : ""}">${bookCount}</div>
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

  // Update select all checkbox
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  if (selectAllCheckbox) {
    const allSelected =
      appState.selectedStudents.length === appState.allStudents.length;
    const someSelected = appState.selectedStudents.length > 0 && !allSelected;
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = someSelected;
  }

  // Update dynamic controls
  if (typeof updateDynamicControls === "function") {
    updateDynamicControls(appState.selectedStudents.length);
  }

  // Dispatch event for other modules
  const event = new CustomEvent("studentSelectionChanged", {
    detail: { selectedCount: appState.selectedStudents.length },
  });
  window.dispatchEvent(event);
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

  const selectedCount = appState.selectedStudents.length;

  // UPDATED: Always clear the books header - we're not using it anymore
  appState.booksHeaderEl.textContent = "";
  appState.booksHeaderEl.style.display = "none";

  if (selectedCount === 0) {
    // UPDATED: No student selected - just show empty state without the "Select a student" text
    appState.selectedBooksContainer.innerHTML = "";
    appState.selectedBooksContainer.style.display = "flex";
    appState.selectedBooksContainer.style.justifyContent = "center";
    appState.selectedBooksContainer.style.alignItems = "center";
    appState.selectedBooksContainer.style.width = "100%";
    appState.selectedBooksContainer.style.height = "100%";
    return;
  }

  if (selectedCount === 1) {
    // Single student selected
    const studentId = appState.selectedStudents[0];
    const student = appState.allStudents.find((s) => s.id === studentId);

    if (!student) {
      // Student not found
      appState.selectedBooksContainer.innerHTML = "";
      appState.selectedBooksContainer.style.display = "flex";
      appState.selectedBooksContainer.style.justifyContent = "center";
      appState.selectedBooksContainer.style.alignItems = "center";
      appState.selectedBooksContainer.style.width = "100%";
      return;
    }

    const bookCount = student.books ? student.books.length : 0;
    if (bookCount === 0) {
      // Create a centered container for the no-books message
      appState.selectedBooksContainer.innerHTML = "";
      appState.selectedBooksContainer.style.display = "flex";
      appState.selectedBooksContainer.style.justifyContent = "center";
      appState.selectedBooksContainer.style.alignItems = "center";
      appState.selectedBooksContainer.style.width = "100%";

      const messageDiv = document.createElement("div");
      messageDiv.className = "no-books-message";
      messageDiv.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <h3>No Books Checked Out</h3>
        <p>Scan a book barcode to check out books for this student</p>
      `;

      appState.selectedBooksContainer.appendChild(messageDiv);
    } else {
      // Show books in grid
      appState.selectedBooksContainer.innerHTML = "";
      appState.selectedBooksContainer.style.display = "grid";
      appState.selectedBooksContainer.style.gridTemplateColumns =
        "repeat(auto-fill, minmax(320px, 1fr))";
      appState.selectedBooksContainer.style.gap = "16px";
      appState.selectedBooksContainer.style.width = "100%";
      appState.selectedBooksContainer.style.maxWidth = "1400px";
      appState.selectedBooksContainer.style.margin = "0 auto";

      student.books.forEach((book) => {
        const bookCard = document.createElement("div");
        bookCard.className = "book-card";
        bookCard.innerHTML = `
          ${
            book.cover
              ? `<img src="${book.cover}" class="book-cover-img" alt="${book.title}">`
              : `<div class="book-cover-placeholder">📚</div>`
          }
          <div class="book-details">
            <div class="book-title">${book.title || "Unknown Book"}</div>
            <div class="book-author">${book.author || "Unknown Author"}</div>
            <div class="book-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Checked out: ${book.checkoutDate || "Unknown"}
            </div>
          </div>
        `;
        appState.selectedBooksContainer.appendChild(bookCard);
      });
    }
  } else {
    // Multiple students selected
    // Clear the books area or show a multi-selection message
    appState.selectedBooksContainer.innerHTML = "";
    appState.selectedBooksContainer.style.display = "flex";
    appState.selectedBooksContainer.style.justifyContent = "center";
    appState.selectedBooksContainer.style.alignItems = "center";
    appState.selectedBooksContainer.style.width = "100%";

    const messageDiv = document.createElement("div");
    messageDiv.className = "no-books-message";
    messageDiv.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      <h3>${selectedCount} Students Selected</h3>
      <p>Select a single student to view their checked-out books</p>
    `;

    appState.selectedBooksContainer.appendChild(messageDiv);
  }
}

function showToast(message, color = "#10b981") {
  const toast = document.createElement("div");
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${color}; color: white; padding: 16px 24px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// NEW: Action toast with button
function showActionToast(
  message,
  color = "#10b981",
  actionText = null,
  actionCallback = null,
) {
  const toast = document.createElement("div");
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${color}; color: white; padding: 12px 16px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; display: flex; align-items: center; gap: 12px;`;

  toast.innerHTML = `
    <span>${message}</span>
    ${actionText ? `<button style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px;">${actionText}</button>` : ""}
  `;

  document.body.appendChild(toast);

  if (actionText && actionCallback) {
    const actionBtn = toast.querySelector("button");
    actionBtn.addEventListener("click", () => {
      actionCallback();
      toast.remove();
    });
  }

  setTimeout(() => toast.remove(), 5000);
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

export {
  addStudentToList,
  updateStudentSelection,
  sortStudents,
  renderSelectedBooks,
  showToast,
  showActionToast, // Export the new function
  showConfirm,
};
