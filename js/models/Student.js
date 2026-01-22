class Student {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || "";
    this.books = data.books || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  generateId() {
    return `stu_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  updateBooks(books) {
    this.books = books;
    this.updatedAt = new Date().toISOString();
  }

  addBook(book) {
    this.books.push(book);
    this.updatedAt = new Date().toISOString();
  }

  removeBook(isbn) {
    this.books = this.books.filter((book) => book.isbn !== isbn);
    this.updatedAt = new Date().toISOString();
  }

  hasBook(isbn) {
    return this.books.some((book) => book.isbn === isbn);
  }

  getCheckedOutBooks() {
    return this.books.filter((book) => !book.checkinDate);
  }

  getReturnedBooks() {
    return this.books.filter((book) => book.checkinDate);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      books: this.books,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromJSON(data) {
    return new Student(data);
  }
}

module.exports = Student;
