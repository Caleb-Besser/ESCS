// uiRenderer.js - Updated for Firebase
import { getStudentHistory as firebaseGetStudentHistory } from "../firebaseDB.js";

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

  // Add click handler for selection
  card.addEventListener("click", (e) => {
    if (e.target.closest(".history-btn")) return; // Don't select if clicking history

    const isSelected = appState.selectedStudents.includes(student.id);
    if (isSelected) {
      appState.selectedStudents = appState.selectedStudents.filter(
        (id) => id !== student.id,
      );
    } else {
      appState.selectedStudents = [student.id]; // Single selection
    }
    updateStudentSelection();
    renderSelectedBooks();
  });

  // Add history button handler
  const historyBtn = card.querySelector(".history-btn");
  historyBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await showStudentHistoryModal(student.id, student.name);
  });

  appState.studentsContainer.appendChild(card);
}

// Update student selection UI
function updateStudentSelection() {
  document.querySelectorAll(".student-card").forEach((card) => {
    const studentId = card.dataset.studentId;
    const isSelected = appState.selectedStudents.includes(studentId);
    card.classList.toggle("selected", isSelected);
  });
}

// Sort students
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

// Render selected books
function renderSelectedBooks() {
  if (!appState.selectedBooksContainer || !appState.booksHeaderEl) return;

  if (appState.selectedStudents.length === 0) {
    appState.booksHeaderEl.textContent = "Select a student to view their books";
    appState.selectedBooksContainer.innerHTML = "";
    return;
  }

  const studentId = appState.selectedStudents[0];
  // Note: This would need the students data, but we'll assume it's passed or available
  // For now, just show placeholder
  appState.booksHeaderEl.textContent = `Books for Student ${studentId}`;
  appState.selectedBooksContainer.innerHTML =
    "<p>Books will be displayed here</p>";
}

// Show toast notification
function showToast(message, color = "#10b981") {
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

// Show confirmation modal
function showConfirm(title, message, isDanger = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");

    titleEl.textContent = title;
    messageEl.textContent = message;

    if (isDanger) {
      okBtn.classList.add("danger");
    } else {
      okBtn.classList.remove("danger");
    }

    modal.classList.add("show");

    const handleOk = () => {
      modal.classList.remove("show");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
      resolve(true);
    };

    const handleCancel = () => {
      modal.classList.remove("show");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
      resolve(false);
    };

    okBtn.addEventListener("click", handleOk);
    cancelBtn.addEventListener("click", handleCancel);
  });
}

// Replace the history modal handler with this:
async function showStudentHistoryModal(studentId, studentName) {
  return new Promise(async (resolve) => {
    // Get history data from Firebase
    const history = await firebaseGetStudentHistory(studentId);

    // Create modal
    const modal = document.createElement("div");
    modal.className = "history-modal-overlay";
    modal.innerHTML = `
    <div class="history-modal">
      <div class="history-modal-header">
        <h3>${studentName}'s Reading History</h3>
        <button class="history-close-btn" id="history-close-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="history-modal-content">
        ${
          history.length === 0
            ? `<div class="no-history">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <h4>No Reading History</h4>
            <p>Books will appear here after they are checked in.</p>
          </div>`
            : `<div class="history-list">
            ${history
              .map(
                (book, index) => `
              <div class="history-item">
                <div class="history-item-header">
                  <span class="history-item-number">#${history.length - index}</span>
                  <span class="history-item-dates">
                    <span class="checkout-date">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3v18h18"></path>
                        <path d="m19 9-5 5-4-4-3 3"></path>
                      </svg>
                      Checked out: ${book.checkoutDate || "Unknown"}
                    </span>
                    <span class="checkin-date">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      Checked in: ${book.checkinDate || "Unknown"}
                    </span>
                  </span>
                </div>
                <div class="history-item-content">
                  ${
                    book.cover
                      ? `<img src="${book.cover}" class="history-book-cover" alt="${book.title}">`
                      : `<div class="history-book-cover-placeholder">📚</div>`
                  }
                  <div class="history-book-info">
                    <div class="history-book-title">${book.title || "Unknown Book"}</div>
                    <div class="history-book-author">${book.author || "Unknown Author"}</div>
                    <div class="history-book-isbn">ISBN: ${book.isbn || "N/A"}</div>
                  </div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>`
        }
      </div>
      <div class="history-modal-footer">
        <div class="history-stats">
          <span class="history-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Total Books: ${history.length}
          </span>
        </div>
        <button class="history-close-modal-btn" id="history-close-modal-btn">Close</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    setTimeout(() => {
      modal.classList.add("show");
    }, 10);

    const closeModal = () => {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.remove();
        resolve();
      }, 300);
    };

    document
      .getElementById("history-close-btn")
      .addEventListener("click", closeModal);
    document
      .getElementById("history-close-modal-btn")
      .addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    const handleEscape = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEscape);

    modal._cleanup = () => {
      document.removeEventListener("keydown", handleEscape);
    };
  });
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
