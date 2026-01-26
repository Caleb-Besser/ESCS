import {
  saveCustomBarcode,
  getCustomBarcodes,
  deleteCustomBarcodes,
} from "../firebaseDB.js";

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

async function showStudentHistoryModal(studentId, studentName) {
  return new Promise(async (resolve) => {
    // Import Firebase function to get history - FIXED IMPORT
    const { getStudentHistory } = await import("../firebaseDB.js");

    // Get history data from Firebase
    let history = [];
    try {
      history = await getStudentHistory(studentId);
    } catch (error) {
      console.error("Error fetching history:", error);
      // Continue with empty history
    }

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

        // Save to Firebase
        await saveBookData({ isbn, title, author, cover });

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
        svg.setAttribute("class", "barcode-svg-preview");
        svg.setAttribute("data-value", isbn);
        svg.setAttribute("width", "200");
        svg.setAttribute("height", "80");
        previewContainer.appendChild(svg);

        // Apply JsBarcode with MEDIUM size (3")
        if (window.JsBarcode) {
          try {
            JsBarcode(svg, isbn, {
              format: "CODE128",
              displayValue: true,
              height: 45, // Medium size
              width: 2, // Medium size
              fontSize: 14, // Medium size
              margin: 5, // Medium size
              background: "#ffffff",
            });
          } catch (error) {
            console.error("Error generating barcode:", error);
            // Fallback: Show barcode value as text
            svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#666">${isbn}</text>`;
          }
        } else {
          // JsBarcode not loaded yet
          svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#666">${isbn}</text>`;
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
        const isbn = Math.floor(
          100000000000 + Math.random() * 900000000000,
        ).toString();

        await saveBookData({ isbn, title, author, cover: "" });

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
        svg.setAttribute("class", "barcode-svg-preview");
        svg.setAttribute("data-value", isbn);
        svg.setAttribute("width", "200");
        svg.setAttribute("height", "80");
        previewContainer.appendChild(svg);

        // Apply JsBarcode with MEDIUM size (3")
        if (window.JsBarcode) {
          try {
            JsBarcode(svg, isbn, {
              format: "CODE128",
              displayValue: true,
              height: 45, // Medium size
              width: 2, // Medium size
              fontSize: 14, // Medium size
              margin: 5, // Medium size
              background: "#ffffff",
            });
          } catch (error) {
            console.error("Error generating barcode:", error);
            svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#666">${isbn}</text>`;
          }
        } else {
          svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#666">${isbn}</text>`;
        }
      } catch (error) {
        console.error("Error processing manual entry:", error);
        showToast("Error creating barcode. Please try again.", "#ef4444");
        document.getElementById("barcode-processing").style.display = "none";
        document.getElementById("manual-step").style.display = "block";
      }
    };

    const saveBookData = async (bookData) => {
      try {
        // Save to Firebase
        const savedBarcode = await saveCustomBarcode(bookData);

        // Also save to localStorage for backward compatibility
        const createdBarcodes = JSON.parse(
          localStorage.getItem("createdBarcodes") || "[]",
        );

        // Check if already exists in localStorage
        const exists = createdBarcodes.some((b) => b.isbn === bookData.isbn);
        if (!exists) {
          createdBarcodes.push({
            ...bookData,
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem(
            "createdBarcodes",
            JSON.stringify(createdBarcodes),
          );
        }

        // Update app state
        if (window.appState) {
          window.appState.customBarcodes = await getCustomBarcodes();
        }

        return savedBarcode;
      } catch (error) {
        console.error("Error saving barcode:", error);
        throw error;
      }
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

    modal.onclick = (e) => {
      // Only close if clicking directly on the modal overlay (not on content)
      if (e.target === modal) {
        modal.classList.remove("show");
        document.removeEventListener("keydown", handleEscape);
        resolve(null);
      }
    };

    // Also prevent the modal content from closing when clicking inside it
    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
      modalContent.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent clicks inside content from closing modal
      });
    }
  });
}

async function showYourBarcodesModal() {
  return new Promise(async (resolve) => {
    const modal = document.getElementById("your-barcodes-modal");
    const content = document.getElementById("your-barcodes-content");
    const selectAllCheckbox = document.getElementById(
      "select-all-barcodes-checkbox",
    );
    const deleteBtn = document.getElementById("delete-selected-barcodes");
    const printBtn = document.getElementById("print-selected-barcodes");

    // Get barcodes from Firebase
    let barcodes = [];
    try {
      barcodes = await getCustomBarcodes();
    } catch (error) {
      console.error("Error loading barcodes from Firebase:", error);
      // Fallback to localStorage for backward compatibility
      barcodes = JSON.parse(localStorage.getItem("createdBarcodes") || "[]");
    }

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
      // Create barcode cards (SIMPLE VERSION - no individual size selectors)
      barcodes.forEach((barcode, index) => {
        const card = document.createElement("div");
        card.className = "barcode-card";
        card.dataset.index = index;
        card.dataset.id = barcode.id || index; // Use Firebase ID or index
        card.dataset.isbn = barcode.isbn;

        card.innerHTML = `
      <input type="checkbox" class="barcode-select-checkbox" data-index="${index}" data-id="${barcode.id || index}">
      <div class="barcode-svg-container"></div>
      <div class="barcode-info">
        <div class="barcode-title">${barcode.title || "Unknown Book"}</div>
        <div class="barcode-author">${barcode.author || "Unknown Author"}</div>
        <div class="barcode-meta">
          <span class="barcode-isbn">ISBN: ${barcode.isbn}</span>
          <span class="barcode-date">Created: ${new Date(barcode.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    `;

        content.appendChild(card);

        // Generate barcode SVG with MEDIUM size (3")
        const svgContainer = card.querySelector(".barcode-svg-container");
        if (window.JsBarcode && svgContainer) {
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
          );
          svg.setAttribute("class", "barcode-svg");
          svg.setAttribute("data-isbn", barcode.isbn);
          svg.setAttribute("width", "180");
          svg.setAttribute("height", "60");
          svgContainer.appendChild(svg);

          try {
            JsBarcode(svg, barcode.isbn, {
              format: "CODE128",
              displayValue: true,
              height: 45, // Medium size
              width: 2, // Medium size
              fontSize: 14, // Medium size
              margin: 5, // Medium size
              background: "#ffffff",
            });
          } catch (error) {
            console.error("Error generating barcode for list:", error);
            svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="10">${barcode.isbn}</text>`;
          }
        } else if (svgContainer) {
          // Fallback if JsBarcode not loaded
          svgContainer.innerHTML = `<div style="text-align: center; color: #666; font-size: 10px;">${barcode.isbn}</div>`;
        }
      });

      // Reset state
      selectAllCheckbox.checked = false;
      updateActionButtons();

      // *** ADD SIZE SELECTOR TO ACTIONS BAR - FIXED: Check if it already exists ***
      const actionsContainer = document.getElementById("your-barcodes-actions");
      if (actionsContainer) {
        // Check if size selector already exists
        let sizeSelectorContainer = document.querySelector(
          ".size-selector-container",
        );

        // If it doesn't exist, create it
        if (!sizeSelectorContainer) {
          sizeSelectorContainer = document.createElement("div");
          sizeSelectorContainer.className = "size-selector-container";
          sizeSelectorContainer.innerHTML = `
      <div class="size-selector" id="size-selector-wrapper">
        <label for="barcode-size">Label Size:</label>
        <select id="barcode-size" class="size-select">
          <option value="small">Small (2.5")</option>
          <option value="medium" selected>Medium (3")</option>
          <option value="large">Large (3.5")</option>
        </select>
      </div>
    `;

          // Insert it between the "Select All" and action buttons
          const selectAllDiv = actionsContainer.querySelector(
            ".select-all-barcodes",
          );
          const actionButtonsDiv = actionsContainer.querySelector(
            ".barcode-action-buttons",
          );

          if (selectAllDiv && actionButtonsDiv) {
            actionsContainer.insertBefore(
              sizeSelectorContainer,
              actionButtonsDiv,
            );
          }
        } else {
          // If it already exists, just reset the select value to medium
          const sizeSelect = document.getElementById("barcode-size");
          if (sizeSelect) {
            sizeSelect.value = "medium";
          }
        }

        // Add event listeners (only once)
        const sizeSelect = document.getElementById("barcode-size");
        const sizeSelectorWrapper = document.getElementById(
          "size-selector-wrapper",
        );

        if (sizeSelect && !sizeSelect.hasAttribute("data-events-bound")) {
          sizeSelect.setAttribute("data-events-bound", "true");

          sizeSelect.addEventListener("click", function (e) {
            e.stopPropagation();
          });

          sizeSelect.addEventListener("mousedown", function (e) {
            e.stopPropagation();
          });

          sizeSelect.addEventListener("change", function (e) {
            e.stopPropagation();
          });
        }

        if (
          sizeSelectorWrapper &&
          !sizeSelectorWrapper.hasAttribute("data-events-bound")
        ) {
          sizeSelectorWrapper.setAttribute("data-events-bound", "true");
          sizeSelectorWrapper.addEventListener("click", function (e) {
            e.stopPropagation();
          });
        }
      }
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

    // Fix the modal click handler to not close when clicking on select dropdown
    modal.onclick = (e) => {
      // Check if click is on the modal overlay (not the content)
      // and NOT on the size selector
      if (e.target === modal) {
        const sizeSelect = document.getElementById("barcode-size");
        const sizeSelectorWrapper = document.getElementById(
          "size-selector-wrapper",
        );

        // Don't close if clicking near the select dropdown
        if (
          !sizeSelect ||
          !sizeSelectorWrapper ||
          (!sizeSelect.contains(e.target) &&
            !sizeSelectorWrapper.contains(e.target))
        ) {
          closeModal();
        }
      }
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
      const selectedCheckboxes = content.querySelectorAll(
        ".barcode-select-checkbox:checked",
      );

      if (selectedCheckboxes.length === 0) return;

      const confirmed = await showConfirm(
        "Delete Barcodes",
        `Delete ${selectedCheckboxes.length} barcode(s)? This action cannot be undone.`,
        true,
      );

      if (confirmed) {
        try {
          // Get IDs to delete
          const idsToDelete = Array.from(selectedCheckboxes)
            .map((cb) => cb.dataset.id)
            .filter((id) => id); // Filter out undefined/null

          // Delete from Firebase
          await deleteCustomBarcodes(idsToDelete);

          // Also remove from localStorage for consistency
          const localBarcodes = JSON.parse(
            localStorage.getItem("createdBarcodes") || "[]",
          );
          const isbnsToDelete = Array.from(selectedCheckboxes).map(
            (cb) => cb.closest(".barcode-card").dataset.isbn,
          );

          const updatedLocalBarcodes = localBarcodes.filter(
            (b) => !isbnsToDelete.includes(b.isbn),
          );
          localStorage.setItem(
            "createdBarcodes",
            JSON.stringify(updatedLocalBarcodes),
          );

          // Refresh the modal
          await showYourBarcodesModal();
          showToast("Barcodes deleted successfully", "#10b981");
        } catch (error) {
          console.error("Error deleting barcodes:", error);
          showToast("Error deleting barcodes", "#ef4444");
        }
      }
    };

    // Print selected
    printBtn.onclick = () => {
      const selectedCheckboxes = content.querySelectorAll(
        ".barcode-select-checkbox:checked",
      );

      if (selectedCheckboxes.length === 0) return;

      // Get selected size from the global selector
      const sizeSelector = document.getElementById("barcode-size");
      const selectedSize = sizeSelector ? sizeSelector.value : "medium";

      const selectedItems = Array.from(selectedCheckboxes).map((cb) => {
        const index = parseInt(cb.dataset.index);
        return {
          barcode: barcodes[index],
          size: selectedSize, // Use the global size for all selected barcodes
        };
      });

      // UPDATED PRINT HTML - With dotted lines and book titles
      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print Barcodes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { 
      size: letter; 
      margin: 0.5in;
    }
    body { 
      font-family: Arial, sans-serif; 
      background: #fff; 
      padding-top: 80px;
    }
    .barcodes-container { 
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(3.5in, 1fr));
      gap: 0.25in;
      justify-content: center;
      align-items: flex-start;
    }
    .barcode-item { 
      page-break-inside: avoid; 
      break-inside: avoid;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px dotted #ccc;
      border-radius: 4px;
      padding: 10px;
      position: relative;
      overflow: hidden;
    }
    .barcode-item.small { 
      width: 2.5in; 
      height: 1.25in;
      padding: 8px;
    }
    .barcode-item.medium { 
      width: 3in; 
      height: 1.5in;
      padding: 10px;
    }
    .barcode-item.large { 
      width: 3.5in; 
      height: 1.75in;
      padding: 12px;
    }
    .barcode-title {
      font-size: 10px;
      color: #333;
      text-align: center;
      margin-bottom: 5px;
      line-height: 1.2;
      max-height: 2.2em;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      width: 100%;
      font-weight: 500;
    }
    .barcode-item.small .barcode-title { 
      font-size: 8px;
      margin-bottom: 3px;
      max-height: 1.8em;
    }
    .barcode-item.large .barcode-title { 
      font-size: 11px;
      margin-bottom: 6px;
    }
    .barcode-number {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      color: #333;
      text-align: center;
      margin-top: 5px;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .barcode-item.small .barcode-number { 
      font-size: 8px;
      margin-top: 3px;
    }
    .barcode-item.large .barcode-number { 
      font-size: 12px;
      margin-top: 6px;
    }
    .barcode-svg { 
      width: 100%;
      height: auto;
      flex: 1;
      min-height: 0;
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
      .barcodes-container {
        gap: 0.2in;
        grid-template-columns: repeat(3, 3.5in); /* 3 per row for printing */
      }
      .barcode-item {
        border: 2px dotted #000 !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      /* Ensure consistent layout for printing */
      .barcode-item.small {
        width: 2.5in !important;
        height: 1.25in !important;
      }
      .barcode-item.medium {
        width: 3in !important;
        height: 1.5in !important;
      }
      .barcode-item.large {
        width: 3.5in !important;
        height: 1.75in !important;
      }
    }
    @media screen {
      .barcode-item {
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.2s;
      }
      .barcode-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script></head><body>
  <div class="print-controls no-print">
    <button class="print-btn" onclick="window.print()">Print Barcodes</button>
    <button class="print-btn" style="margin-left: 10px; background: #6b7280;" onclick="window.close()">Close</button>
  </div>
  <div class="barcodes-container">`;

      selectedItems.forEach((item) => {
        const { barcode, size } = item;
        // Truncate title if too long
        const title = barcode.title || "Unknown Book";
        const shortTitle =
          title.length > 40 ? title.substring(0, 37) + "..." : title;

        html += `
      <div class="barcode-item ${size}">
        <div class="barcode-title">${shortTitle}</div>
        <svg class="barcode-svg" data-isbn="${barcode.isbn}" data-size="${size}"></svg>
        <div class="barcode-number">${barcode.isbn}</div>
      </div>
    `;
      });

      html += `</div><script>
    document.querySelectorAll('.barcode-svg').forEach(svg => {
      const size = svg.getAttribute('data-size');
      let height = 45; // Default medium size
      let fontSize = 10;
      let margin = 5;
      let displayValue = false; // Don't show number under barcode

      if (size === 'small') {
        height = 35;
        fontSize = 8;
        margin = 3;
      } else if (size === 'large') {
        height = 55;
        fontSize = 12;
        margin = 8;
      }

      try {
        JsBarcode(svg, svg.getAttribute('data-isbn'), {
          format: 'CODE128',
          displayValue: displayValue, // Hide number under barcode
          height: height,
          width: 2,
          fontSize: fontSize,
          margin: margin,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
        // Fallback: Show barcode value as text
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#000" font-size="' + fontSize + '">' + svg.getAttribute('data-isbn') + '</text>';
      }
    });
    
    // Focus the print button for better UX
    window.addEventListener('load', function() {
      setTimeout(function() {
        const printBtn = document.querySelector('.print-btn');
        if (printBtn) printBtn.focus();
      }, 100);
    });
    
    // Auto-print after a short delay (optional)
    // setTimeout(function() {
    //   window.print();
    // }, 500);
  <\/script></body></html>`;

      // Use the same print function
      window.openPrintPreview(html);
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
