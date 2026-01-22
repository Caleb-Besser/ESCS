const ApiService = require("../services/ApiService");
const StorageService = require("../services/StorageService");
const Student = require("../models/Student");
const Book = require("../models/Book");
const logger = require("../utils/logger");
const Helpers = require("../utils/helpers");
const Validators = require("../utils/validators");

class MainController {
  constructor() {
    this.apiService = new ApiService();
    this.storageService = new StorageService();
    this.students = [];
    this.selectedStudent = null;
    this.searchTimeout = null;
    this.isLoading = false;

    this.initialize();
  }

  async initialize() {
    try {
      await this.checkAuthentication();
      this.cacheElements();
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      await this.loadStudents();
      this.updateUI();
      this.focusSearchInput();
    } catch (error) {
      logger.error("Failed to initialize MainController:", error);
      this.showError("Failed to initialize application");
    }
  }

  async checkAuthentication() {
    const user = await this.storageService.getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    this.currentUser = user;
  }

  cacheElements() {
    this.elements = {
      // Sidebar
      studentsList: document.getElementById("students"),
      selectAllCheckbox: document.getElementById("select-all-checkbox"),
      sortButton: document.getElementById("sort-button"),
      sortMenu: document.getElementById("sort-menu"),

      // Main content
      stateIndicator: document.getElementById("state-indicator"),
      welcomeContainer: document.getElementById("welcome-container"),
      booksHeader: document.getElementById("books-header"),
      booksList: document.getElementById("selected-books-list"),
      dynamicControls: document.getElementById("dynamic-controls"),

      // Modals
      confirmModal: document.getElementById("confirm-modal"),
      confirmTitle: document.getElementById("confirm-title"),
      confirmMessage: document.getElementById("confirm-message"),
      confirmCancel: document.getElementById("confirm-cancel"),
      confirmOk: document.getElementById("confirm-ok"),

      addStudentModal: document.getElementById("add-student-modal"),
      addStudentNameInput: document.getElementById("add-student-name-input"),
      addStudentCancel: document.getElementById("add-student-cancel"),
      addStudentConfirm: document.getElementById("add-student-confirm"),

      // Buttons
      logoutBtn: document.getElementById("logout-btn"),

      // Hidden elements
      printArea: document.getElementById("print-area"),
    };
  }

  setupEventListeners() {
    // Sidebar events
    this.elements.selectAllCheckbox.addEventListener("change", (e) =>
      this.handleSelectAll(e),
    );
    this.elements.sortButton.addEventListener("click", () =>
      this.toggleSortMenu(),
    );

    // Student events (delegated)
    this.elements.studentsList.addEventListener("click", (e) =>
      this.handleStudentClick(e),
    );
    this.elements.studentsList.addEventListener("change", (e) =>
      this.handleStudentCheckboxChange(e),
    );

    // Modal events
    this.elements.confirmCancel.addEventListener("click", () =>
      this.hideConfirmModal(),
    );
    this.elements.confirmOk.addEventListener("click", () =>
      this.handleConfirmAction(),
    );
    this.elements.confirmModal.addEventListener("click", (e) =>
      this.handleModalClick(e),
    );

    this.elements.addStudentCancel.addEventListener("click", () =>
      this.hideAddStudentModal(),
    );
    this.elements.addStudentConfirm.addEventListener("click", () =>
      this.handleAddStudent(),
    );
    this.elements.addStudentModal.addEventListener("click", (e) =>
      this.handleModalClick(e),
    );
    this.elements.addStudentNameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleAddStudent();
    });

    // Button events
    this.elements.logoutBtn.addEventListener("click", () =>
      this.handleLogout(),
    );

    // Search events (will be added when search is implemented)
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Add student: Ctrl+N
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        this.showAddStudentModal();
      }

      // Logout: Ctrl+L
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        this.handleLogout();
      }

      // Select all: Ctrl+A
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        this.elements.selectAllCheckbox.checked =
          !this.elements.selectAllCheckbox.checked;
        this.handleSelectAll({ target: this.elements.selectAllCheckbox });
      }

      // Escape to close modals
      if (e.key === "Escape") {
        this.hideAllModals();
      }
    });
  }

  async loadStudents() {
    try {
      this.setLoading(true);
      const studentsData = await this.storageService.getStudents();
      this.students = studentsData.map((studentData) =>
        Student.fromJSON(studentData),
      );
      this.renderStudents();
    } catch (error) {
      logger.error("Failed to load students:", error);
      this.showError("Failed to load students");
    } finally {
      this.setLoading(false);
    }
  }

  renderStudents() {
    const studentsHtml = this.students
      .map(
        (student) => `
      <div class="student-item" data-student-id="${student.id}" role="listitem">
        <label class="student-checkbox">
          <input type="checkbox" value="${student.id}" aria-label="Select ${student.name}">
          <span class="checkmark"></span>
        </label>
        <div class="student-info">
          <div class="student-name">${Validators.escapeHtml(student.name)}</div>
          <div class="student-books-count">${student.books.length} book${student.books.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
    `,
      )
      .join("");

    this.elements.studentsList.innerHTML = studentsHtml;
    this.updateSelectAllState();
  }

  updateSelectAllState() {
    const checkboxes = this.elements.studentsList.querySelectorAll(
      'input[type="checkbox"]',
    );
    const checkedBoxes = this.elements.studentsList.querySelectorAll(
      'input[type="checkbox"]:checked',
    );

    this.elements.selectAllCheckbox.checked =
      checkboxes.length > 0 && checkboxes.length === checkedBoxes.length;
    this.elements.selectAllCheckbox.indeterminate =
      checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
  }

  handleSelectAll(e) {
    const isChecked = e.target.checked;
    const checkboxes = this.elements.studentsList.querySelectorAll(
      'input[type="checkbox"]',
    );

    checkboxes.forEach((checkbox) => {
      checkbox.checked = isChecked;
    });

    this.updateUI();
  }

  handleStudentClick(e) {
    const studentItem = e.target.closest(".student-item");
    if (!studentItem) return;

    const studentId = studentItem.dataset.studentId;
    const student = this.students.find((s) => s.id === studentId);

    if (student) {
      this.selectStudent(student);
    }
  }

  handleStudentCheckboxChange(e) {
    this.updateSelectAllState();
    this.updateUI();
  }

  selectStudent(student) {
    // Remove previous selection
    document.querySelectorAll(".student-item.selected").forEach((item) => {
      item.classList.remove("selected");
    });

    // Add new selection
    const studentElement = document.querySelector(
      `[data-student-id="${student.id}"]`,
    );
    if (studentElement) {
      studentElement.classList.add("selected");
    }

    this.selectedStudent = student;
    this.updateUI();
  }

  updateUI() {
    const selectedCount = this.getSelectedStudentIds().length;
    const hasSelection = selectedCount > 0;
    const hasSingleSelection = selectedCount === 1;

    // Update state indicator
    if (hasSingleSelection && this.selectedStudent) {
      this.elements.stateIndicator.textContent = `Selected: ${this.selectedStudent.name}`;
      this.elements.stateIndicator.className = "state-indicator selected";
    } else if (hasSelection) {
      this.elements.stateIndicator.textContent = `${selectedCount} students selected`;
      this.elements.stateIndicator.className = "state-indicator multiple";
    } else {
      this.elements.stateIndicator.textContent = "No students selected";
      this.elements.stateIndicator.className = "state-indicator";
    }

    // Update books area
    if (hasSingleSelection && this.selectedStudent) {
      this.elements.booksHeader.textContent = `Books for ${this.selectedStudent.name}`;
      this.renderBooks(this.selectedStudent.books);
    } else {
      this.elements.booksHeader.textContent =
        "Select a student to view their books";
      this.elements.booksList.innerHTML = "";
    }

    // Update dynamic controls
    this.renderDynamicControls(hasSelection, hasSingleSelection);
  }

  renderBooks(books) {
    if (books.length === 0) {
      this.elements.booksList.innerHTML =
        '<div class="no-books">No books checked out</div>';
      return;
    }

    const booksHtml = books
      .map(
        (book) => `
      <div class="book-card" data-isbn="${book.isbn}">
        <div class="book-cover">
          ${book.coverUrl ? `<img src="${book.coverUrl}" alt="Cover of ${book.title}" loading="lazy">` : '<div class="no-cover">No Cover</div>'}
        </div>
        <div class="book-info">
          <h4 class="book-title">${Validators.escapeHtml(book.title)}</h4>
          <p class="book-author">by ${Validators.escapeHtml(book.author || "Unknown Author")}</p>
          <div class="book-details">
            <span class="book-isbn">ISBN: ${book.isbn}</span>
            <span class="book-date">Checked out: ${Helpers.formatDate(book.checkoutDate)}</span>
          </div>
        </div>
        <button class="book-return-btn" data-isbn="${book.isbn}" title="Return this book">
          Return
        </button>
      </div>
    `,
      )
      .join("");

    this.elements.booksList.innerHTML = booksHtml;

    // Add event listeners for return buttons
    this.elements.booksList
      .querySelectorAll(".book-return-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => this.handleReturnBook(e));
      });
  }

  renderDynamicControls(hasSelection, hasSingleSelection) {
    let controlsHtml = "";

    if (hasSelection) {
      controlsHtml += `
        <button id="remove-students-btn" class="action-btn danger">
          Remove Selected Students
        </button>
      `;
    }

    if (hasSingleSelection) {
      controlsHtml += `
        <button id="add-book-btn" class="action-btn primary">
          Add Book
        </button>
        <button id="print-report-btn" class="action-btn secondary">
          Print Report
        </button>
      `;
    }

    controlsHtml += `
      <button id="add-student-btn" class="action-btn success">
        Add Student
      </button>
    `;

    this.elements.dynamicControls.innerHTML = controlsHtml;

    // Add event listeners
    const addStudentBtn = document.getElementById("add-student-btn");
    if (addStudentBtn) {
      addStudentBtn.addEventListener("click", () => this.showAddStudentModal());
    }

    const removeStudentsBtn = document.getElementById("remove-students-btn");
    if (removeStudentsBtn) {
      removeStudentsBtn.addEventListener("click", () =>
        this.confirmRemoveStudents(),
      );
    }

    const addBookBtn = document.getElementById("add-book-btn");
    if (addBookBtn) {
      addBookBtn.addEventListener("click", () => this.showBookSearch());
    }

    const printReportBtn = document.getElementById("print-report-btn");
    if (printReportBtn) {
      printReportBtn.addEventListener("click", () => this.printStudentReport());
    }
  }

  getSelectedStudentIds() {
    const checkboxes = this.elements.studentsList.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    return Array.from(checkboxes).map((cb) => cb.value);
  }

  showAddStudentModal() {
    this.elements.addStudentModal.classList.add("show");
    this.elements.addStudentNameInput.focus();
  }

  hideAddStudentModal() {
    this.elements.addStudentModal.classList.remove("show");
    this.elements.addStudentNameInput.value = "";
  }

  async handleAddStudent() {
    const name = this.elements.addStudentNameInput.value.trim();

    const validation = Validators.validateStudentForm(name);
    if (!validation.isValid) {
      this.showError(validation.errors[0]);
      return;
    }

    try {
      this.setLoading(true);
      const updatedStudents = await this.storageService.addStudent(name);
      this.students = updatedStudents.map((studentData) =>
        Student.fromJSON(studentData),
      );
      this.renderStudents();
      this.hideAddStudentModal();
      this.showSuccess("Student added successfully");
    } catch (error) {
      logger.error("Failed to add student:", error);
      this.showError("Failed to add student");
    } finally {
      this.setLoading(false);
    }
  }

  confirmRemoveStudents() {
    const selectedIds = this.getSelectedStudentIds();
    if (selectedIds.length === 0) return;

    const message = `Are you sure you want to remove ${selectedIds.length} student${selectedIds.length > 1 ? "s" : ""}? This action cannot be undone.`;

    this.showConfirmModal("Remove Students", message, () =>
      this.removeStudents(selectedIds),
    );
  }

  async removeStudents(studentIds) {
    try {
      this.setLoading(true);
      const updatedStudents =
        await this.storageService.removeStudents(studentIds);
      this.students = updatedStudents.map((studentData) =>
        Student.fromJSON(studentData),
      );

      // Clear selection if selected student was removed
      if (
        this.selectedStudent &&
        studentIds.includes(this.selectedStudent.id)
      ) {
        this.selectedStudent = null;
      }

      this.renderStudents();
      this.updateUI();
      this.hideConfirmModal();
      this.showSuccess(
        `${studentIds.length} student${studentIds.length > 1 ? "s" : ""} removed`,
      );
    } catch (error) {
      logger.error("Failed to remove students:", error);
      this.showError("Failed to remove students");
    } finally {
      this.setLoading(false);
    }
  }

  showConfirmModal(title, message, confirmCallback) {
    this.elements.confirmTitle.textContent = title;
    this.elements.confirmMessage.textContent = message;
    this.confirmCallback = confirmCallback;
    this.elements.confirmModal.classList.add("show");
    this.elements.confirmOk.focus();
  }

  hideConfirmModal() {
    this.elements.confirmModal.classList.remove("show");
    this.confirmCallback = null;
  }

  handleConfirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
  }

  handleModalClick(e) {
    if (e.target.classList.contains("modal-overlay")) {
      this.hideAllModals();
    }
  }

  hideAllModals() {
    this.hideConfirmModal();
    this.hideAddStudentModal();
  }

  async handleLogout() {
    try {
      await this.storageService.logout();
      this.storageService.reloadToLogin();
    } catch (error) {
      logger.error("Logout error:", error);
      // Force reload anyway
      this.storageService.reloadToLogin();
    }
  }

  async handleReturnBook(e) {
    const isbn = e.target.dataset.isbn;
    if (!isbn || !this.selectedStudent) return;

    try {
      const updatedBooks = this.selectedStudent.books.filter(
        (book) => book.isbn !== isbn,
      );
      await this.storageService.updateStudentBooks(
        this.selectedStudent.id,
        updatedBooks,
        "checkin",
      );
      this.selectedStudent.books = updatedBooks;
      this.updateUI();
      this.showSuccess("Book returned successfully");
    } catch (error) {
      logger.error("Failed to return book:", error);
      this.showError("Failed to return book");
    }
  }

  showBookSearch() {
    // TODO: Implement book search modal
    this.showError("Book search not yet implemented");
  }

  printStudentReport() {
    if (!this.selectedStudent) return;

    // Generate HTML for printing
    const printHtml = this.generateStudentReportHtml(this.selectedStudent);
    this.elements.printArea.innerHTML = printHtml;
    this.storageService.printPreview(printHtml);
  }

  generateStudentReportHtml(student) {
    const currentDate = Helpers.formatDate(new Date());
    const checkedOutBooks = student.getCheckedOutBooks();
    const returnedBooks = student.getReturnedBooks();

    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center; color: #333;">Student Book Report</h1>
        <div style="border-bottom: 2px solid #333; margin: 20px 0; padding-bottom: 10px;">
          <h2 style="margin: 0; color: #666;">${Validators.escapeHtml(student.name)}</h2>
          <p style="margin: 5px 0; color: #888;">Report generated on ${currentDate}</p>
        </div>

        <div style="margin: 30px 0;">
          <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Currently Checked Out (${checkedOutBooks.length})</h3>
          ${
            checkedOutBooks.length > 0
              ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Title</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Author</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">ISBN</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Checkout Date</th>
                </tr>
              </thead>
              <tbody>
                ${checkedOutBooks
                  .map(
                    (book) => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${Validators.escapeHtml(book.title)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${Validators.escapeHtml(book.author || "Unknown")}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${book.isbn}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${Helpers.formatDate(book.checkoutDate)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          `
              : '<p style="color: #666; font-style: italic;">No books currently checked out</p>'
          }
        </div>

        ${
          returnedBooks.length > 0
            ? `
          <div style="margin: 30px 0;">
            <h3 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Return History (${returnedBooks.length})</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Title</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Author</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">ISBN</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Checkout Date</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Return Date</th>
                </tr>
              </thead>
              <tbody>
                ${returnedBooks
                  .map(
                    (book) => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${Validators.escapeHtml(book.title)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${Validators.escapeHtml(book.author || "Unknown")}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${book.isbn}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${Helpers.formatDate(book.checkoutDate)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${Helpers.formatDate(book.checkinDate)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
            : ""
        }

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px;">
          Generated by Easy Student Checkout System (ESCS) v${this.storageService.getVersion()}
        </div>
      </div>
    `;
  }

  toggleSortMenu() {
    // TODO: Implement sorting functionality
    this.showError("Sorting not yet implemented");
  }

  focusSearchInput() {
    // TODO: Implement search functionality
  }

  setLoading(loading) {
    this.isLoading = loading;
    document.body.classList.toggle("loading", loading);
  }

  showError(message) {
    // TODO: Implement proper error display
    alert(`Error: ${message}`);
  }

  showSuccess(message) {
    // TODO: Implement proper success display
    alert(`Success: ${message}`);
  }
}

module.exports = MainController;
