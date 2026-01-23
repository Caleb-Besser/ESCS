// Modal management functions

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

function showStudentHistoryModal(studentId, studentName) {
  return new Promise(async (resolve) => {
    // Get history data
    const history = await ipcRenderer.invoke("get-student-history", studentId);

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

function showCreateBarcodeModal() {
  return new Promise(async (resolve) => {
    const modal = document.getElementById("create-barcode-modal");
    const titleEl = document.getElementById("create-barcode-title");

    // Reset modal state
    titleEl.textContent = "Create Barcode";
    document.getElementById("isbn-step").style.display = "block";
    document.getElementById("manual-step").style.display = "none";
    document.getElementById("barcode-processing").style.display = "none";
    document.getElementById("barcode-success").style.display = "none";

    // Clear inputs
    document.getElementById("isbn-input").value = "";
    document.getElementById("title-input").value = "";
    document.getElementById("author-input").value = "";

    modal.classList.add("show");

    // Event listeners
    const setupEventListeners = () => {
      // ISBN step
      document.getElementById("isbn-cancel").onclick = () => {
        modal.classList.remove("show");
        resolve(null);
      };

      document.getElementById("isbn-submit").onclick = async () => {
        const isbn = document.getElementById("isbn-input").value.trim();
        if (!isbn) {
          showToast("Please enter an ISBN", "#ef4444");
          return;
        }
        await processISBN(isbn);
      };

      document.getElementById("no-isbn-btn").onclick = () => {
        document.getElementById("isbn-step").style.display = "none";
        document.getElementById("manual-step").style.display = "block";
        titleEl.textContent = "Enter Book Information";
      };

      // Manual step
      document.getElementById("manual-back").onclick = () => {
        document.getElementById("manual-step").style.display = "none";
        document.getElementById("isbn-step").style.display = "block";
        titleEl.textContent = "Create Barcode";
      };

      document.getElementById("manual-submit").onclick = async () => {
        const title = document.getElementById("title-input").value.trim();
        const author = document.getElementById("author-input").value.trim();
        if (!title || !author) {
          showToast("Please enter both title and author", "#ef4444");
          return;
        }
        await processManualEntry(title, author);
      };

      // Success step
      document.getElementById("success-close").onclick = () => {
        modal.classList.remove("show");
        resolve(null);
      };
    };

    const processISBN = async (isbn) => {
      document.getElementById("isbn-step").style.display = "none";
      document.getElementById("barcode-processing").style.display = "block";
      document.getElementById("processing-text").textContent =
        "Looking up book information...";

      try {
        let title = "Unknown Book";
        let author = "Unknown Author";
        let cover = "";

        const response = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
          { timeout: 5000 },
        );

        if (response.ok) {
          const data = await response.json();
          const bookKey = `ISBN:${isbn}`;

          if (data[bookKey]) {
            title = data[bookKey].title || title;
            author = data[bookKey].authors
              ? data[bookKey].authors[0].name
              : author;
            cover = data[bookKey].cover ? data[bookKey].cover.medium : "";
          }
        }

        // Generate barcode and save
        const barcodeId = isbn;
        await saveBookData({ isbn: barcodeId, title, author, cover });

        // Show success
        document.getElementById("barcode-processing").style.display = "none";
        document.getElementById("barcode-success").style.display = "block";
        document.getElementById("success-text").textContent =
          `Barcode created successfully for "${title}"`;

        // Generate barcode preview
        const previewContainer = document.getElementById("barcode-preview");
        previewContainer.innerHTML = "";
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("jsbarcode-format", "CODE128");
        svg.setAttribute("jsbarcode-value", barcodeId);
        svg.setAttribute("jsbarcode-displayValue", "true");
        svg.setAttribute("width", "200");
        svg.setAttribute("height", "80");
        previewContainer.appendChild(svg);

        if (window.JsBarcode) {
          window.JsBarcode(svg, barcodeId, {
            format: "CODE128",
            displayValue: true,
            height: 50,
            width: 2,
            fontSize: 12,
            margin: 5,
          });
        }
      } catch (error) {
        console.error("Error processing ISBN:", error);
        showToast("Error looking up book. Please try again.", "#ef4444");
        document.getElementById("barcode-processing").style.display = "none";
        document.getElementById("isbn-step").style.display = "block";
      }
    };

    const processManualEntry = async (title, author) => {
      document.getElementById("manual-step").style.display = "none";
      document.getElementById("barcode-processing").style.display = "block";
      document.getElementById("processing-text").textContent =
        "Generating barcode...";

      try {
        // Generate random barcode ID
        const barcodeId = Math.floor(
          100000000000 + Math.random() * 900000000000,
        ).toString();

        await saveBookData({ isbn: barcodeId, title, author, cover: "" });

        // Show success
        document.getElementById("barcode-processing").style.display = "none";
        document.getElementById("barcode-success").style.display = "block";
        document.getElementById("success-text").textContent =
          `Barcode created successfully for "${title}"`;

        // Generate barcode preview
        const previewContainer = document.getElementById("barcode-preview");
        previewContainer.innerHTML = "";
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("jsbarcode-format", "CODE128");
        svg.setAttribute("jsbarcode-value", barcodeId);
        svg.setAttribute("jsbarcode-displayValue", "true");
        svg.setAttribute("width", "200");
        svg.setAttribute("height", "80");
        previewContainer.appendChild(svg);

        if (window.JsBarcode) {
          window.JsBarcode(svg, barcodeId, {
            format: "CODE128",
            displayValue: true,
            height: 50,
            width: 2,
            fontSize: 12,
            margin: 5,
          });
        }
      } catch (error) {
        console.error("Error processing manual entry:", error);
        showToast("Error creating barcode. Please try again.", "#ef4444");
        document.getElementById("barcode-processing").style.display = "none";
        document.getElementById("manual-step").style.display = "block";
      }
    };

    const saveBookData = async (bookData) => {
      // For now, we'll store created barcodes in localStorage
      // In a real app, this might be stored on the server
      const createdBarcodes = JSON.parse(
        localStorage.getItem("createdBarcodes") || "[]",
      );
      createdBarcodes.push({
        ...bookData,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("createdBarcodes", JSON.stringify(createdBarcodes));
    };

    setupEventListeners();

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        modal.classList.remove("show");
        document.removeEventListener("keydown", handleEscape);
        resolve(null);
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Handle click outside
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
        document.removeEventListener("keydown", handleEscape);
        resolve(null);
      }
    };
  });
}

function showYourBarcodesModal() {
  return new Promise(async (resolve) => {
    const modal = document.getElementById("your-barcodes-modal");
    const content = document.getElementById("your-barcodes-content");
    const selectAllCheckbox = document.getElementById(
      "select-all-barcodes-checkbox",
    );
    const deleteBtn = document.getElementById("delete-selected-barcodes");
    const printBtn = document.getElementById("print-selected-barcodes");

    // Get barcodes from localStorage
    const barcodes = JSON.parse(
      localStorage.getItem("createdBarcodes") || "[]",
    );

    // Clear previous content
    content.innerHTML = "";

    if (barcodes.length === 0) {
      content.innerHTML = `
        <div class="no-barcodes">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 7h20M6 7v10M10 7v10M14 7v10M18 7v10"></path>
          </svg>
          <h4>No Barcodes Created Yet</h4>
          <p>Create barcodes using the "Create Barcode" option to get started</p>
        </div>
      `;
    } else {
      // Create barcode cards
      barcodes.forEach((barcode, index) => {
        const card = document.createElement("div");
        card.className = "barcode-card";
        card.dataset.index = index;

        card.innerHTML = `
          <input type="checkbox" class="barcode-select-checkbox" data-index="${index}">
          <svg class="barcode-svg" data-isbn="${barcode.isbn}"></svg>
          <div class="barcode-info">
            <div class="barcode-title">${barcode.title || "Unknown Book"}</div>
            <div class="barcode-author">${barcode.author || "Unknown Author"}</div>
            <div class="barcode-meta">
              <span class="barcode-isbn">ISBN: ${barcode.isbn}</span>
              <span class="barcode-date">Created: ${new Date(barcode.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="barcode-size-selector">
            <div class="barcode-size-dropdown">
              <button class="barcode-size-button" data-index="${index}" data-size="medium">
                Size: Medium
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="barcode-size-menu" data-index="${index}">
                <div class="barcode-size-option" data-size="small">Small (2.5")</div>
                <div class="barcode-size-option" data-size="medium">Medium (3")</div>
                <div class="barcode-size-option" data-size="large">Large (3.5")</div>
              </div>
            </div>
          </div>
        `;

        content.appendChild(card);

        // Generate barcode SVG
        const svg = card.querySelector(".barcode-svg");
        if (window.JsBarcode) {
          window.JsBarcode(svg, barcode.isbn, {
            format: "CODE128",
            displayValue: true,
            height: 40,
            width: 2,
            fontSize: 10,
            margin: 5,
          });
        }

        // Handle size dropdown
        const sizeButton = card.querySelector(".barcode-size-button");
        const sizeMenu = card.querySelector(".barcode-size-menu");

        if (sizeButton && sizeMenu) {
          sizeButton.addEventListener("click", (e) => {
            e.stopPropagation();
            // Close all other menus
            document.querySelectorAll(".barcode-size-menu").forEach((menu) => {
              if (menu !== sizeMenu) {
                menu.style.display = "none";
              }
            });
            sizeMenu.style.display =
              sizeMenu.style.display === "block" ? "none" : "block";
          });

          // Handle size option clicks
          sizeMenu
            .querySelectorAll(".barcode-size-option")
            .forEach((option) => {
              option.addEventListener("click", (e) => {
                e.stopPropagation();
                const newSize = option.dataset.size;
                const sizeText = option.textContent;
                sizeButton.innerHTML = `Size: ${sizeText.split(" ")[0]}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
                sizeButton.dataset.size = newSize;
                sizeMenu.style.display = "none";
              });
            });
        }
      });

      // Close size menus when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".barcode-size-dropdown")) {
          document.querySelectorAll(".barcode-size-menu").forEach((menu) => {
            menu.style.display = "none";
          });
        }
      });
    }

    // Reset state
    selectAllCheckbox.checked = false;
    updateActionButtons();

    modal.classList.add("show");

    // Event listeners
    const closeModal = () => {
      modal.classList.remove("show");
      resolve();
    };

    document.getElementById("your-barcodes-close-btn").onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    // Select all checkbox
    selectAllCheckbox.onchange = () => {
      const checkboxes = content.querySelectorAll(".barcode-select-checkbox");
      checkboxes.forEach((cb) => {
        cb.checked = selectAllCheckbox.checked;
        const card = cb.closest(".barcode-card");
        card.classList.toggle("selected", cb.checked);
      });
      updateActionButtons();
    };

    // Individual checkbox changes
    content.addEventListener("change", (e) => {
      if (e.target.classList.contains("barcode-select-checkbox")) {
        const card = e.target.closest(".barcode-card");
        card.classList.toggle("selected", e.target.checked);
        updateSelectAllState();
        updateActionButtons();
      }
    });

    // Delete selected
    deleteBtn.onclick = async () => {
      const selectedIndexes = Array.from(
        content.querySelectorAll(".barcode-select-checkbox:checked"),
      )
        .map((cb) => parseInt(cb.dataset.index))
        .sort((a, b) => b - a);

      if (selectedIndexes.length === 0) return;

      const confirmed = await showConfirm(
        "Delete Barcodes",
        `Delete ${selectedIndexes.length} barcode(s)? This action cannot be undone.`,
        true,
      );

      if (confirmed) {
        selectedIndexes.forEach((index) => {
          barcodes.splice(index, 1);
        });

        localStorage.setItem("createdBarcodes", JSON.stringify(barcodes));
        await showYourBarcodesModal();
      }
    };

    // Print selected
    printBtn.onclick = () => {
      const selectedCheckboxes = content.querySelectorAll(
        ".barcode-select-checkbox:checked",
      );

      if (selectedCheckboxes.length === 0) return;

      const selectedItems = Array.from(selectedCheckboxes).map((cb) => {
        const index = parseInt(cb.dataset.index);
        const sizeButton = content.querySelector(
          `.barcode-size-button[data-index="${index}"]`,
        );
        const size = sizeButton ? sizeButton.dataset.size : "medium";
        return {
          barcode: barcodes[index],
          size: size,
        };
      });

      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print Barcodes</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: letter; margin: 0.5in; }
        body { font-family: Arial, sans-serif; background: #fff; padding-top: 80px; }
        .barcodes-container { display: flex; flex-wrap: wrap; gap: 15px; justify-content: flex-start; }
        .barcode-item { border: 2px dotted #0f766e; border-radius: 8px; padding: 15px; text-align: center; page-break-inside: avoid; background: white; }
        .barcode-item.small { width: 2.5in; height: 1.5in; padding: 10px; }
        .barcode-item.medium { width: 3in; height: 2in; padding: 15px; }
        .barcode-item.large { width: 3.5in; height: 2.5in; padding: 20px; }
        .barcode-title { font-weight: bold; margin-bottom: 5px; font-size: 12px; color: #0f766e; }
        .barcode-item.small .barcode-title { font-size: 10px; }
        .barcode-item.large .barcode-title { font-size: 14px; }
        .barcode-author { color: #64748b; margin-bottom: 10px; font-size: 10px; }
        .barcode-item.small .barcode-author { font-size: 8px; }
        .barcode-item.large .barcode-author { font-size: 12px; }
        .barcode-svg { max-width: 100%; height: auto; margin-bottom: 5px; }
        .print-controls { position: fixed; top: 0; left: 0; width: 100%; background: #0f766e; padding: 15px; display: flex; justify-content: flex-end; z-index: 1000; }
        .print-btn { background: #0d9488; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .print-btn:hover { background: #0f766e; }
        @media print { body { padding-top: 0; } .no-print { display: none !important; } }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script></head><body>
      <div class="print-controls no-print"><button class="print-btn" onclick="window.print()">Print Barcodes</button></div>
      <div class="barcodes-container">`;

      selectedItems.forEach((item) => {
        const { barcode, size } = item;
        html += `
          <div class="barcode-item ${size}">
            <div class="barcode-title">${barcode.title || "Unknown Book"}</div>
            <div class="barcode-author">${barcode.author || "Unknown Author"}</div>
            <svg class="barcode-svg" data-isbn="${barcode.isbn}" data-size="${size}"></svg>
          </div>
        `;
      });

      html += `</div><script>
      document.querySelectorAll('.barcode-svg').forEach(svg => {
        const size = svg.getAttribute('data-size');
        let height = 45;
        let fontSize = 14;
        let margin = 5;

        if (size === 'small') {
          height = 30;
          fontSize = 10;
          margin = 3;
        } else if (size === 'large') {
          height = 60;
          fontSize = 16;
          margin = 8;
        }

        JsBarcode(svg, svg.getAttribute('data-isbn'), {
          format: 'CODE128',
          displayValue: true,
          height: height,
          width: 2,
          fontSize: fontSize,
          margin: margin
        });
      });
    <\/script></body></html>`;

      ipcRenderer.send("open-print-preview", html);
    };

    // Helper functions
    function updateSelectAllState() {
      const checkboxes = content.querySelectorAll(".barcode-select-checkbox");
      const checkedBoxes = content.querySelectorAll(
        ".barcode-select-checkbox:checked",
      );
      selectAllCheckbox.checked =
        checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
      selectAllCheckbox.indeterminate =
        checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
    }

    function updateActionButtons() {
      const selectedCount = content.querySelectorAll(
        ".barcode-select-checkbox:checked",
      ).length;
      deleteBtn.disabled = selectedCount === 0;
      printBtn.disabled = selectedCount === 0;
    }

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  });
}

export {
  showConfirm,
  showAddStudentModal,
  showStudentHistoryModal,
  showCreateBarcodeModal,
  showYourBarcodesModal,
};
