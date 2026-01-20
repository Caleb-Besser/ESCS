const { ipcRenderer } = require("electron");

function generateBarcodeSVG(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("jsbarcode-format", "CODE128");
  svg.setAttribute("jsbarcode-value", id);
  svg.setAttribute("class", "barcode-svg");
  svg.setAttribute("width", "180");
  svg.setAttribute("height", "60");
  return svg;
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

window.onload = async () => {
  const currentUser = await ipcRenderer.invoke("get-current-user");
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  const studentsContainer = document.getElementById("students");
  const selectedBooksContainer = document.getElementById("selected-books-list");
  const selectedStudentNameEl = document.getElementById(
    "selected-student-name",
  );
  const selectedStudentIdEl = document.getElementById("selected-student-id");
  const booksHeaderEl = document.getElementById("books-header");
  const logoutBtn = document.getElementById("logout-btn");
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  const sortButton = document.getElementById("sort-button");
  const sortMenu = document.getElementById("sort-menu");

  let selectedStudents = [];
  let currentSort = "name-asc";

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

      // Sync select all checkbox state
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
    const selected = allStudents.filter((s) => selectedStudents.includes(s.id));
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

    selectedBooksContainer.innerHTML = "";

    if (books.length === 0) {
      selectedBooksContainer.innerHTML = `<div class="book-card zero">No books checked out.</div>`;
    } else {
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
        selectedBooksContainer.appendChild(bookDiv);
      });
    }

    if (selected.length > 1) {
      selectedStudentNameEl.textContent = `${selected.length} Students Selected`;
      selectedStudentIdEl.textContent = "";
      booksHeaderEl.textContent = `Checked Out Books (${books.length})`;
    } else if (selected.length === 1) {
      selectedStudentNameEl.textContent = selected[0].name;
      selectedStudentIdEl.textContent = selected[0].id;
      booksHeaderEl.textContent = `Checked Out Books (${books.length})`;
    } else {
      selectedStudentNameEl.textContent = "Select a student";
      selectedStudentIdEl.textContent = "";
      booksHeaderEl.textContent = "Checked Out Books";
    }
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
  document.body.appendChild(barcodeInput);

  function focusBarcodeInput() {
    barcodeInput.value = "";
    barcodeInput.focus();
  }
  setTimeout(focusBarcodeInput, 500);

  let scanTimeout;

  barcodeInput.addEventListener("input", (e) => {
    const scanned = barcodeInput.value.trim();
    clearTimeout(scanTimeout);

    if (scanned) {
      scanTimeout = setTimeout(async () => {
        const allStudents = await ipcRenderer.invoke("get-students");
        const scannedStudent = allStudents.find((s) => s.id === scanned);

        if (scannedStudent) {
          document
            .querySelectorAll(".student-card.selected")
            .forEach((el) => el.classList.remove("selected"));
          const card = document.querySelector(
            `.student-card[data-student-id='${scanned}']`,
          );
          if (card) {
            card.classList.add("selected");
            selectedStudents = [scanned];
            renderSelectedBooks();
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          barcodeInput.value = "";
          setTimeout(focusBarcodeInput, 100);
          return;
        }

        if (selectedStudents.length !== 1) {
          showToast("Select a student first", "#ef4444");
          barcodeInput.value = "";
          setTimeout(focusBarcodeInput, 100);
          return;
        }

        const studentId = selectedStudents[0];
        const student = allStudents.find((s) => s.id === studentId);
        if (!student) return;

        const existingBook = student.books?.find((b) => b.isbn === scanned);

        if (existingBook) {
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
            );
            showToast(
              `✓ Checked in: ${existingBook.title || scanned}`,
              "#10b981",
            );
          }
        } else {
          showToast("Fetching book info...", "#3b82f6");
          let title = "Unknown Book";
          let author = "Unknown Author";
          let cover = "";

          try {
            const response = await fetch(
              `https://openlibrary.org/api/books?bibkeys=ISBN:${scanned}&format=json&jscmd=data`,
            );
            const data = await response.json();
            const bookKey = `ISBN:${scanned}`;

            if (data[bookKey]) {
              title = data[bookKey].title || title;
              author = data[bookKey].authors
                ? data[bookKey].authors[0].name
                : author;
              cover = data[bookKey].cover ? data[bookKey].cover.medium : "";
            }
          } catch (err) {
            console.error("API Error:", err);
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

        const updatedStudents = await ipcRenderer.invoke("get-students");
        studentsContainer.innerHTML = "";
        const sortedStudents = sortStudents(updatedStudents, currentSort);
        sortedStudents.forEach(addStudentToList);

        const activeCard = document.querySelector(
          `.student-card[data-student-id='${studentId}']`,
        );
        if (activeCard) activeCard.classList.add("selected");

        renderSelectedBooks();
        barcodeInput.value = "";
        setTimeout(focusBarcodeInput, 100);
      }, 200);
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

  document.getElementById("add-student").onclick = async () => {
    const nameInput = document.getElementById("new-student-name");
    const studentName = nameInput.value.trim();
    if (!studentName) return;

    const updated = await ipcRenderer.invoke("add-student", studentName);
    studentsContainer.innerHTML = "";
    selectedStudents = [];
    const sortedStudents = sortStudents(updated, currentSort);
    sortedStudents.forEach(addStudentToList);
    nameInput.value = "";
    renderSelectedBooks();
    setTimeout(focusBarcodeInput, 500);
  };

  document.getElementById("remove-student").onclick = async () => {
    if (!selectedStudents.length) return;
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
  };

  document.getElementById("print").onclick = async () => {
    if (!selectedStudents.length) return alert("Select at least one student.");
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
  };

  const style = document.createElement("style");
  style.textContent = `@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
  document.head.appendChild(style);
};
