// barcodeScanner.js - Updated for new appState structure
import {
  getStudents,
  updateStudentBooks as firebaseUpdateStudentBooks,
} from "../firebaseDB.js";

function focusBarcodeInput() {
  if (appState.barcodeInput) {
    appState.barcodeInput.value = "";
    setTimeout(() => {
      appState.barcodeInput.focus();
    }, 50);
  }
}

function setupBarcodeScanner() {
  appState.barcodeInput = document.createElement("input");
  appState.barcodeInput.type = "text";
  appState.barcodeInput.style.position = "absolute";
  appState.barcodeInput.style.opacity = "0";
  appState.barcodeInput.style.pointerEvents = "none";
  appState.barcodeInput.id = "barcode-scanner-input";
  appState.barcodeInput.autocomplete = "off";
  appState.barcodeInput.autocorrect = "off";
  appState.barcodeInput.autocapitalize = "off";
  appState.barcodeInput.spellcheck = false;
  document.body.appendChild(appState.barcodeInput);

  let scanTimeout;
  let isProcessingScan = false;
  let lastScanTime = 0;

  document.addEventListener("click", (e) => {
    if (
      e.target.tagName !== "INPUT" &&
      e.target.tagName !== "TEXTAREA" &&
      e.target.tagName !== "BUTTON"
    ) {
      setTimeout(focusBarcodeInput, 100);
    }
  });

  window.addEventListener("focus", () => {
    setTimeout(focusBarcodeInput, 100);
  });

  setTimeout(focusBarcodeInput, 500);

  appState.barcodeInput.addEventListener("input", async (e) => {
    const scanned = appState.barcodeInput.value.trim();

    const now = Date.now();
    if (now - lastScanTime < 500) {
      appState.barcodeInput.value = "";
      return;
    }

    if (isProcessingScan || !scanned) {
      return;
    }

    clearTimeout(scanTimeout);

    scanTimeout = setTimeout(async () => {
      isProcessingScan = true;
      lastScanTime = Date.now();

      try {
        // Import functions dynamically
        const {
          showConfirm,
          showToast,
          showActionToast,
          addStudentToList,
          sortStudents,
          renderSelectedBooks,
        } = await import("./uiRenderer.js");
        const { updateDynamicControls } = await import("./app.js");

        // Check if scanning a student ID
        const scannedStudent = appState.allStudents.find(
          (s) => s.id === scanned,
        );

        // If scanning a student ID
        if (scannedStudent) {
          document.querySelectorAll(".student-card.selected").forEach((el) => {
            el.classList.remove("selected");
          });
          const card = document.querySelector(
            `.student-card[data-student-id='${scanned}']`,
          );
          if (card) {
            card.classList.add("selected");
            appState.selectedStudents = [scanned];

            // FIX: Update the student selection and top bar display
            // First, trigger the student selection update
            const event = new CustomEvent("studentSelectionChanged", {
              detail: { selectedCount: 1 },
            });
            window.dispatchEvent(event);

            // Update dynamic controls
            updateDynamicControls(1);

            // Update selected books display
            renderSelectedBooks();

            // FIX: IMPORT AND CALL updateSelectedStudentDisplay
            const { updateSelectedStudentDisplay } = await import("./app.js");
            updateSelectedStudentDisplay();

            // Scroll and show toast
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
            showToast(`✓ Selected: ${scannedStudent.name}`, "#10b981");
          }
          appState.barcodeInput.value = "";
          setTimeout(focusBarcodeInput, 100);
          isProcessingScan = false;
          return;
        }

        // If no student selected
        if (appState.selectedStudents.length !== 1) {
          showToast("Select a student first", "#ef4444");
          appState.barcodeInput.value = "";
          setTimeout(focusBarcodeInput, 100);
          isProcessingScan = false;
          return;
        }

        const studentId = appState.selectedStudents[0];
        const student = appState.allStudents.find((s) => s.id === studentId);
        if (!student) {
          appState.barcodeInput.value = "";
          setTimeout(focusBarcodeInput, 100);
          isProcessingScan = false;
          return;
        }

        // Check if book is already checked out
        const existingBook = student.books?.find((b) => b.isbn === scanned);

        // Check in section
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

            await firebaseUpdateStudentBooks(
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
          // Book check-out - UPDATED VERSION
          showToast("Fetching book info...", "#3b82f6");
          let title = "Unknown Book";
          let author = "Unknown Author";
          let cover = "";

          // First, check if this is in our custom barcodes (from Firebase)
          const customBarcodes = appState.customBarcodes || [];
          const customBook = customBarcodes.find((b) => b.isbn === scanned);

          if (customBook) {
            // Found in custom barcodes
            title = customBook.title || "Unknown Book";
            author = customBook.author || "Unknown Author";
            cover = customBook.cover || "";
            showToast(`Found in library: ${title}`, "#10b981");
          } else {
            // Check local storage as fallback (for backward compatibility)
            const localBarcodes = JSON.parse(
              localStorage.getItem("createdBarcodes") || "[]",
            );
            const localBook = localBarcodes.find((b) => b.isbn === scanned);

            if (localBook) {
              // Found in local storage
              title = localBook.title || "Unknown Book";
              author = localBook.author || "Unknown Author";
              cover = localBook.cover || "";
              showToast(`Found in local library: ${title}`, "#10b981");
            } else {
              // Not found locally, try Open Library API
              try {
                const response = await fetch(
                  `https://openlibrary.org/api/books?bibkeys=ISBN:${scanned}&format=json&jscmd=data`,
                  { timeout: 5000 },
                );
                if (response.ok) {
                  const data = await response.json();
                  const bookKey = `ISBN:${scanned}`;

                  if (data[bookKey]) {
                    title = data[bookKey].title || title;
                    author = data[bookKey].authors
                      ? data[bookKey].authors[0].name
                      : author;
                    cover = data[bookKey].cover
                      ? data[bookKey].cover.medium
                      : "";
                  } else {
                    // Not found in Open Library either - show action toast
                    showActionToast(
                      `Book with ISBN ${scanned} not found.`,
                      "#f59e0b",
                      "Add Book",
                      async () => {
                        // Import modal function
                        const { showCreateBarcodeModal } =
                          await import("./modalManager.js");

                        // Open the create barcode modal with ISBN pre-filled
                        const modal = document.getElementById(
                          "create-barcode-modal",
                        );
                        const isbnInput = document.getElementById("isbn-input");

                        if (modal && isbnInput) {
                          isbnInput.value = scanned;
                          modal.classList.add("show");

                          // Set focus to ISBN input
                          setTimeout(() => {
                            isbnInput.focus();
                          }, 100);
                        } else {
                          // Fallback: open regular modal
                          await showCreateBarcodeModal();
                        }
                      },
                    );

                    appState.barcodeInput.value = "";
                    setTimeout(() => {
                      focusBarcodeInput();
                      isProcessingScan = false;
                    }, 100);
                    return;
                  }
                } else {
                  // API error - show action toast
                  showActionToast(
                    "Could not fetch book information.",
                    "#ef4444",
                    "Add Manually",
                    async () => {
                      const { showCreateBarcodeModal } =
                        await import("./modalManager.js");
                      await showCreateBarcodeModal();
                    },
                  );

                  appState.barcodeInput.value = "";
                  setTimeout(() => {
                    focusBarcodeInput();
                    isProcessingScan = false;
                  }, 100);
                  return;
                }
              } catch (err) {
                console.error("API Error:", err);
                // Network error - show action toast
                showActionToast(
                  "Network error. Book not found.",
                  "#ef4444",
                  "Add Book",
                  async () => {
                    const { showCreateBarcodeModal } =
                      await import("./modalManager.js");
                    await showCreateBarcodeModal();
                  },
                );

                appState.barcodeInput.value = "";
                setTimeout(() => {
                  focusBarcodeInput();
                  isProcessingScan = false;
                }, 100);
                return;
              }
            }
          }

          const newBook = {
            isbn: scanned,
            title,
            author,
            cover,
            checkoutDate: new Date().toLocaleDateString(),
          };

          const updatedBooks = [...(student.books || []), newBook];
          await firebaseUpdateStudentBooks(studentId, updatedBooks);
          showToast(`✓ Checked out: ${title}`, "#0d9488");
        }

        // Refresh the student list
        const updatedStudents = await getStudents();
        appState.allStudents = updatedStudents;
        appState.studentsContainer.innerHTML = "";
        const sortedStudents = sortStudents(
          updatedStudents,
          appState.currentSort,
        );
        sortedStudents.forEach(addStudentToList);

        const activeCard = document.querySelector(
          `.student-card[data-student-id='${studentId}']`,
        );
        if (activeCard) {
          activeCard.classList.add("selected");
          appState.selectedStudents = [studentId];

          // FIX: Update the top bar display after book checkin/checkout
          const { updateSelectedStudentDisplay } = await import("./app.js");
          updateSelectedStudentDisplay();
        }

        renderSelectedBooks();
        updateDynamicControls(1);
      } catch (error) {
        console.error("Scan error:", error);
        // Import showToast if needed
        const { showToast } = await import("./uiRenderer.js");
        showToast("Error processing scan. Please try again.", "#ef4444");
      } finally {
        appState.barcodeInput.value = "";
        setTimeout(() => {
          focusBarcodeInput();
          isProcessingScan = false;
        }, 100);
      }
    }, 200);
  });

  appState.barcodeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const event = new Event("input", { bubbles: true });
      appState.barcodeInput.dispatchEvent(event);
    }
  });
}

export { setupBarcodeScanner, focusBarcodeInput };
