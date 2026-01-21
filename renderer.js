const { ipcRenderer } = require("electron");

window.onload = async () => {
  try {
    const currentUser = await ipcRenderer.invoke("get-current-user");
    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }

    const studentsContainer = document.getElementById("students");
    const selectedBooksContainer = document.getElementById(
      "selected-books-list",
    );
    const booksHeaderEl = document.getElementById("books-header");
    booksHeaderEl.style.display = "none"; // Start hidden

    const logoutBtn = document.getElementById("logout-btn");
    const selectAllCheckbox = document.getElementById("select-all-checkbox");
    const sortButton = document.getElementById("sort-button");
    const sortMenu = document.getElementById("sort-menu");
    const stateIndicator = document.getElementById("state-indicator");

    if (!studentsContainer) return;

    let selectedStudents = [];
    let currentSort = "name-asc";

    function generateBarcodeSVG(id) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("jsbarcode-format", "CODE128");
      svg.setAttribute("jsbarcode-value", id);
      svg.setAttribute("class", "barcode-svg");
      svg.setAttribute("width", "180");
      svg.setAttribute("height", "60");
      return svg;
    }
    // Add this function to renderer.js (somewhere near the other functions)
    function showStudentHistoryModal(studentId, studentName) {
      return new Promise(async (resolve) => {
        // Get history data
        const history = await ipcRenderer.invoke(
          "get-student-history",
          studentId,
        );

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

        // Add animations
        setTimeout(() => {
          modal.classList.add("show");
        }, 10);

        // Close handlers
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

        // Escape key
        const handleEscape = (e) => {
          if (e.key === "Escape") closeModal();
        };
        document.addEventListener("keydown", handleEscape);

        // Cleanup
        modal._cleanup = () => {
          document.removeEventListener("keydown", handleEscape);
        };
      });
    }

    // Update the dynamic controls to include history button
    // DYNAMIC CONTROLS FUNCTION - SINGLE VERSION WITH HISTORY BUTTON
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

    // ADD STUDENT MODAL FUNCTION
    function showAddStudentModal() {
      return new Promise((resolve) => {
        const modal = document.getElementById("add-student-modal");
        const input = document.getElementById("add-student-name-input");
        const confirmBtn = document.getElementById("add-student-confirm");
        const cancelBtn = document.getElementById("add-student-cancel");

        input.value = "";
        modal.classList.add("show");

        const handleConfirm = () => {
          const name = input.value.trim();
          modal.classList.remove("show");
          confirmBtn.removeEventListener("click", handleConfirm);
          cancelBtn.removeEventListener("click", handleCancel);
          input.removeEventListener("keydown", handleKeyPress);
          resolve(name);
        };

        const handleCancel = () => {
          modal.classList.remove("show");
          confirmBtn.removeEventListener("click", handleConfirm);
          cancelBtn.removeEventListener("click", handleCancel);
          input.removeEventListener("keydown", handleKeyPress);
          resolve(null);
        };

        const handleKeyPress = (e) => {
          if (e.key === "Enter") {
            handleConfirm();
          } else if (e.key === "Escape") {
            handleCancel();
          }
        };

        confirmBtn.addEventListener("click", handleConfirm);
        cancelBtn.addEventListener("click", handleCancel);
        input.addEventListener("keydown", handleKeyPress);

        setTimeout(() => input.focus(), 100);
      });
    }

    // ADD STUDENT HELPER FUNCTION
    async function addStudent(studentName) {
      if (!studentName) return;

      const updated = await ipcRenderer.invoke("add-student", studentName);
      studentsContainer.innerHTML = "";
      selectedStudents = [];
      const sortedStudents = sortStudents(updated, currentSort);
      sortedStudents.forEach(addStudentToList);
      renderSelectedBooks();
      setTimeout(focusBarcodeInput, 500);
    }

    // HANDLE PRINT FUNCTION
    async function handlePrint() {
      if (!selectedStudents.length) {
        showToast("Select at least one student.", "#ef4444");
        return;
      }

      const all = await ipcRenderer.invoke("get-students");
      const toPrint = all.filter((s) => selectedStudents.includes(s.id));

      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print Student Cards</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: letter; margin: 0.5in; }
        body { font-family: Arial, sans-serif; background: #fff; padding-top: 80px; }
        .cards-container { display: flex; flex-wrap: wrap; gap: 0.25in; justify-content: flex-start; }
        .card { width: 3.375in; height: 2.125in; border: 2px dashed #333; border-radius: 8px; padding: 0.15in; display: flex; flex-direction: column; justify-content: center; align-items: center; page-break-inside: avoid; }
        .card-name { font-size: 18px; font-weight: bold; margin-bottom: 0.1in; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-barcode svg { max-width: 100%; height: auto; max-height: 1in; }
        .print-controls { position: fixed; top: 0; left: 0; width: 100%; background: #f1f5f9; padding: 15px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: flex-end; z-index: 1000; }
        .print-btn { background: #0d9488; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        @media print { body { padding-top: 0; } .no-print { display: none !important; } }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script></head><body>
      <div class="print-controls no-print"><button class="print-btn" onclick="window.print()">Print Cards</button></div>
      <div class="cards-container">`;

      toPrint.forEach((s) => {
        html += `<div class="card"><div class="card-name">${s.name}</div><div class="card-barcode"><svg class="barcode" data-id="${s.id}"></svg></div></div>`;
      });

      html += `</div><script>
      document.querySelectorAll('.barcode').forEach(svg => {
        JsBarcode(svg, svg.getAttribute('data-id'), { format: 'CODE128', displayValue: true, height: 45, width: 2, fontSize: 14, margin: 5 });
      });
    </script></body></html>`;

      ipcRenderer.send("open-print-preview", html);
    }

    // HANDLE REMOVE STUDENT FUNCTION
    async function handleRemoveStudent() {
      if (!selectedStudents.length) {
        showToast("No students selected.", "#ef4444");
        return;
      }

      const confirmed = await showConfirm(
        "Remove Students",
        `Remove ${selectedStudents.length} student(s)?`,
        true,
      );
      if (!confirmed) return;

      const updated = await ipcRenderer.invoke(
        "remove-students",
        selectedStudents,
      );
      studentsContainer.innerHTML = "";
      selectedStudents = [];
      const sortedStudents = sortStudents(updated, currentSort);
      sortedStudents.forEach(addStudentToList);
      renderSelectedBooks();
      setTimeout(focusBarcodeInput, 500);
    }

    logoutBtn.addEventListener("click", async () => {
      const confirmed = await showConfirm(
        "Logout",
        "Are you sure you want to logout?",
      );
      if (confirmed) {
        const result = await ipcRenderer.invoke("logout");
        if (result.success) {
          ipcRenderer.send("reload-to-login");
        }
      }
    });

    sortButton.addEventListener("click", (e) => {
      e.stopPropagation();
      sortMenu.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      sortMenu.classList.remove("show");
    });

    sortMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.querySelectorAll(".sort-option").forEach((option) => {
      option.addEventListener("click", async () => {
        currentSort = option.dataset.sort;
        document.querySelectorAll(".sort-option").forEach((opt) => {
          opt.classList.remove("active");
        });
        option.classList.add("active");
        sortMenu.classList.remove("show");

        const students = await ipcRenderer.invoke("get-students");
        studentsContainer.innerHTML = "";
        const sortedStudents = sortStudents(students, currentSort);
        sortedStudents.forEach(addStudentToList);
      });
    });

    function sortStudents(students, sortType) {
      const sorted = [...students];

      switch (sortType) {
        case "name-asc":
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case "name-desc":
          return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case "books-desc":
          return sorted.sort((a, b) => {
            const aBooks = a.books ? a.books.length : 0;
            const bBooks = b.books ? b.books.length : 0;
            return bBooks - aBooks;
          });
        case "books-asc":
          return sorted.sort((a, b) => {
            const aBooks = a.books ? a.books.length : 0;
            const bBooks = b.books ? b.books.length : 0;
            return aBooks - bBooks;
          });
        case "id-asc":
          return sorted.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        case "id-desc":
          return sorted.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        default:
          return sorted;
      }
    }

    // Select All Logic
    selectAllCheckbox.addEventListener("change", async (e) => {
      const allStudents = await ipcRenderer.invoke("get-students");
      const cards = document.querySelectorAll(".student-card");

      if (e.target.checked) {
        selectedStudents = allStudents.map((s) => s.id);
        cards.forEach((card) => card.classList.add("selected"));
      } else {
        selectedStudents = [];
        cards.forEach((card) => card.classList.remove("selected"));
      }
      renderSelectedBooks();
    });

    function showSkeletons(count = 4) {
      if (!studentsContainer) return;

      studentsContainer.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "student-skeleton";
        skeleton.innerHTML = `<div class="skeleton-bar"></div><div class="skeleton-bar short"></div>`;
        studentsContainer.appendChild(skeleton);
      }
    }

    showSkeletons();

    function addStudentToList(student) {
      const card = document.createElement("div");
      card.className = "student-card fade-in";
      card.dataset.studentId = student.id;

      const statusDot = document.createElement("div");
      const bookCount = student.books ? student.books.length : 0;
      statusDot.className =
        bookCount > 0 ? "status-dot has-books" : "status-dot no-books";
      card.appendChild(statusDot);

      const infoDiv = document.createElement("div");
      infoDiv.className = "student-info";
      const nameDiv = document.createElement("div");
      nameDiv.className = "student-name";
      nameDiv.textContent = student.name;
      infoDiv.appendChild(nameDiv);
      card.appendChild(infoDiv);

      const badge = document.createElement("div");
      badge.className = bookCount > 0 ? "book-count" : "book-count zero";
      badge.textContent = bookCount;
      card.appendChild(badge);

      const barcodeDiv = document.createElement("div");
      barcodeDiv.className = "barcode";
      const barcodeSVG = generateBarcodeSVG(student.id);
      barcodeDiv.appendChild(barcodeSVG);
      card.appendChild(barcodeDiv);

      card.addEventListener("click", (e) => {
        const id = card.dataset.studentId;

        if (e.ctrlKey || e.metaKey) {
          if (selectedStudents.includes(id)) {
            selectedStudents = selectedStudents.filter((sid) => sid !== id);
            card.classList.remove("selected");
          } else {
            selectedStudents.push(id);
            card.classList.add("selected");
          }
        } else {
          document.querySelectorAll(".student-card.selected").forEach((el) => {
            el.classList.remove("selected");
          });
          card.classList.add("selected");
          selectedStudents = [id];
        }

        const totalCards = document.querySelectorAll(".student-card").length;
        selectAllCheckbox.checked = selectedStudents.length === totalCards;

        renderSelectedBooks();
        focusBarcodeInput();
      });

      studentsContainer.appendChild(card);
      setTimeout(() => card.classList.remove("fade-in"), 400);

      if (window.JsBarcode) {
        window.JsBarcode(barcodeSVG, student.id, {
          format: "CODE128",
          displayValue: true,
        });
      }
    }

    async function renderSelectedBooks() {
      const allStudents = await ipcRenderer.invoke("get-students");
      const selected = allStudents.filter((s) =>
        selectedStudents.includes(s.id),
      );
      let books = [];

      selected.forEach((s) => {
        if (s.books && s.books.length) books = books.concat(s.books);
      });

      const seen = new Set();
      books = books.filter((b) => {
        if (seen.has(b.isbn)) return false;
        seen.add(b.isbn);
        return true;
      });

      // Get or create welcome container
      let welcomeContainer = document.getElementById("welcome-container");
      if (!welcomeContainer) {
        welcomeContainer = document.createElement("div");
        welcomeContainer.id = "welcome-container";
        welcomeContainer.className = "welcome-container";
        // Insert it in the main content area
        const mainContent = document.querySelector(".main-content");
        const booksArea = document.querySelector(".books-area");
        mainContent.insertBefore(welcomeContainer, booksArea);
      }

      // Get books grid
      const booksGrid = document.getElementById("selected-books-list");

      if (books.length === 0 && selected.length === 0) {
        // Show welcome message, hide books area
        welcomeContainer.style.display = "block";
        welcomeContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to ESCS</h2>
                <p>Select a student or add a new one to get started</p>
                <p class="hint">Use the sidebar to browse students or scan a barcode to select</p>
            </div>
        `;

        // Hide books area
        booksGrid.style.display = "none";
        booksGrid.innerHTML = "";
        booksHeaderEl.style.display = "none";
      } else if (books.length === 0 && selected.length > 0) {
        // Hide welcome message, show books area with no-books message
        welcomeContainer.style.display = "none";
        welcomeContainer.innerHTML = "";

        // Show books area with no-books message
        booksGrid.style.display = "grid";
        booksGrid.innerHTML = `
            <div class="no-books-message">
                <h3>No books checked out</h3>
                <p>Scan a book barcode to check out books to this student</p>
            </div>
        `;

        booksHeaderEl.style.display = "none";
      } else if (books.length > 0) {
        // Hide welcome message, show books area with books
        welcomeContainer.style.display = "none";
        welcomeContainer.innerHTML = "";

        // Show books area with books
        booksGrid.style.display = "grid";
        booksGrid.innerHTML = "";

        books.forEach((b) => {
          const bookDiv = document.createElement("div");
          bookDiv.className = "book-card";
          const coverHtml = b.cover
            ? `<img src="${b.cover}" class="book-cover-img" alt="Book Cover">`
            : `<div class="book-cover-placeholder">No Cover</div>`;

          bookDiv.innerHTML = `
                ${coverHtml}
                <div class="book-details">
                    <div class="book-title">${b.title || "Unknown Book"}</div>
                    <div class="book-author">${b.author || "ISBN: " + b.isbn}</div>
                    <div class="book-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Checked out ${b.checkoutDate || "N/A"}
                    </div>
                </div>
            `;
          booksGrid.appendChild(bookDiv);
        });

        booksHeaderEl.textContent = `Checked Out Books (${books.length})`;
        booksHeaderEl.style.display = "block";
      }

      // Update state indicator
      if (selected.length === 0) {
        stateIndicator.textContent = ""; // No text when no student
      } else if (selected.length === 1) {
        stateIndicator.textContent = ""; // No text when one student
      } else {
        stateIndicator.textContent = `${selected.length} students selected`;
      }

      // Update dynamic controls
      updateDynamicControls(selected.length);
      setTimeout(focusBarcodeInput, 50);
    }

    const students = await ipcRenderer.invoke("get-students");
    studentsContainer.innerHTML = "";
    if (students.length > 0) {
      const sortedStudents = sortStudents(students, currentSort);
      sortedStudents.forEach(addStudentToList);
    }
    renderSelectedBooks();

    // Set initial sort option as active
    document
      .querySelector(`.sort-option[data-sort="${currentSort}"]`)
      ?.classList.add("active");

    const barcodeInput = document.createElement("input");
    barcodeInput.type = "text";
    barcodeInput.style.position = "absolute";
    barcodeInput.style.opacity = "0";
    barcodeInput.style.pointerEvents = "none";
    barcodeInput.id = "barcode-scanner-input";
    barcodeInput.autocomplete = "off";
    barcodeInput.autocorrect = "off";
    barcodeInput.autocapitalize = "off";
    barcodeInput.spellcheck = false;
    document.body.appendChild(barcodeInput);

    let scanTimeout;
    let isProcessingScan = false;
    let lastScanTime = 0;

    function focusBarcodeInput() {
      if (barcodeInput) {
        barcodeInput.value = "";
        setTimeout(() => {
          barcodeInput.focus();
        }, 50);
      }
    }

    // Set up a global focus handler
    document.addEventListener("click", (e) => {
      // Only refocus if clicking on non-input elements
      if (
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA" &&
        e.target.tagName !== "BUTTON"
      ) {
        setTimeout(focusBarcodeInput, 100);
      }
    });

    // Also focus when window gains focus
    window.addEventListener("focus", () => {
      setTimeout(focusBarcodeInput, 100);
    });

    setTimeout(focusBarcodeInput, 500);

    barcodeInput.addEventListener("input", (e) => {
      const scanned = barcodeInput.value.trim();

      // Prevent multiple scans in quick succession
      const now = Date.now();
      if (now - lastScanTime < 500) {
        // 500ms debounce
        barcodeInput.value = "";
        return;
      }

      // Prevent processing if already processing
      if (isProcessingScan || !scanned) {
        return;
      }

      clearTimeout(scanTimeout);

      scanTimeout = setTimeout(async () => {
        isProcessingScan = true;
        lastScanTime = Date.now();

        try {
          const allStudents = await ipcRenderer.invoke("get-students");
          const scannedStudent = allStudents.find((s) => s.id === scanned);

          // If scanning a student ID
          if (scannedStudent) {
            document
              .querySelectorAll(".student-card.selected")
              .forEach((el) => {
                el.classList.remove("selected");
              });
            const card = document.querySelector(
              `.student-card[data-student-id='${scanned}']`,
            );
            if (card) {
              card.classList.add("selected");
              selectedStudents = [scanned];
              renderSelectedBooks();
              card.scrollIntoView({ behavior: "smooth", block: "nearest" });
              showToast(`✓ Selected: ${scannedStudent.name}`, "#10b981");
            }
            barcodeInput.value = "";
            setTimeout(focusBarcodeInput, 100);
            isProcessingScan = false;
            return;
          }

          // If no student selected
          if (selectedStudents.length !== 1) {
            showToast("Select a student first", "#ef4444");
            barcodeInput.value = "";
            setTimeout(focusBarcodeInput, 100);
            isProcessingScan = false;
            return;
          }

          const studentId = selectedStudents[0];
          const student = allStudents.find((s) => s.id === studentId);
          if (!student) {
            barcodeInput.value = "";
            setTimeout(focusBarcodeInput, 100);
            isProcessingScan = false;
            return;
          }

          // Check if book is already checked out
          const existingBook = student.books?.find((b) => b.isbn === scanned);

          if (existingBook) {
            // Book check-in
            const confirmCheckin = await showConfirm(
              "Check In Book",
              `Check in: ${existingBook.title || scanned}?\nStudent: ${student.name}`,
            );

            if (confirmCheckin) {
              const updatedBooks = student.books.filter(
                (b) => b.isbn !== scanned,
              );
              await ipcRenderer.invoke(
                "update-student-books",
                studentId,
                updatedBooks,
                "checkin",
              );
              showToast(
                `✓ Checked in: ${existingBook.title || scanned}`,
                "#10b981",
              );
            }
          } else {
            // Book check-out
            showToast("Fetching book info...", "#3b82f6");
            let title = "Unknown Book";
            let author = "Unknown Author";
            let cover = "";

            try {
              const response = await fetch(
                `https://openlibrary.org/api/books?bibkeys=ISBN:${scanned}&format=json&jscmd=data`,
                { timeout: 5000 }, // 5 second timeout
              );
              if (response.ok) {
                const data = await response.json();
                const bookKey = `ISBN:${scanned}`;

                if (data[bookKey]) {
                  title = data[bookKey].title || title;
                  author = data[bookKey].authors
                    ? data[bookKey].authors[0].name
                    : author;
                  cover = data[bookKey].cover ? data[bookKey].cover.medium : "";
                }
              }
            } catch (err) {
              console.error("API Error:", err);
              // Continue with default values
            }

            const newBook = {
              isbn: scanned,
              title,
              author,
              cover,
              checkoutDate: new Date().toLocaleDateString(),
            };

            const updatedBooks = [...(student.books || []), newBook];
            await ipcRenderer.invoke(
              "update-student-books",
              studentId,
              updatedBooks,
            );
            showToast(`✓ Checked out: ${title}`, "#0d9488");
          }

          // Refresh the student list
          const updatedStudents = await ipcRenderer.invoke("get-students");
          studentsContainer.innerHTML = "";
          const sortedStudents = sortStudents(updatedStudents, currentSort);
          sortedStudents.forEach(addStudentToList);

          // Re-select the current student
          const activeCard = document.querySelector(
            `.student-card[data-student-id='${studentId}']`,
          );
          if (activeCard) {
            activeCard.classList.add("selected");
            // Ensure the student stays selected
            selectedStudents = [studentId];
          }

          renderSelectedBooks();
        } catch (error) {
          console.error("Scan error:", error);
          showToast("Error processing scan. Please try again.", "#ef4444");
        } finally {
          barcodeInput.value = "";
          setTimeout(() => {
            focusBarcodeInput();
            isProcessingScan = false;
          }, 100);
        }
      }, 200); // Increased timeout to 200ms for better reliability
    });
    barcodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Trigger the input event manually
        const event = new Event("input", { bubbles: true });
        barcodeInput.dispatchEvent(event);
      }
    });

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

    const style = document.createElement("style");
    style.textContent = `
    @keyframes slideIn { 
      from { transform: translateX(400px); opacity: 0; } 
      to { transform: translateX(0); opacity: 1; } 
    }
    
    .student-skeleton {
      padding: 16px;
      margin: 4px 0;
      border-radius: 8px;
      background: white;
    }
    
    .skeleton-bar {
      height: 16px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .skeleton-bar.short {
      width: 60%;
    }
    
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
    document.head.appendChild(style);
  } catch (error) {
    console.error("Error in main script:", error);
    // Show an error message to the user
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
  document.body.classList.add("barcode-scanner-ready");

  // Focus barcode input whenever student selection changes
  window.addEventListener("studentSelected", () => {
    setTimeout(focusBarcodeInput, 100);
  });
};
