class Book {
  constructor(data = {}) {
    this.isbn = data.isbn || "";
    this.title = data.title || "";
    this.author = data.author || "";
    this.publishedDate = data.publishedDate || "";
    this.publisher = data.publisher || "";
    this.description = data.description || "";
    this.coverUrl = data.coverUrl || "";
    this.checkoutDate = data.checkoutDate || null;
    this.checkinDate = data.checkinDate || null;
  }

  static fromApiResponse(data) {
    return new Book({
      isbn: data.isbn || data.isbn_13 || data.isbn_10,
      title: data.title,
      author: data.author_name ? data.author_name.join(", ") : data.author,
      publishedDate: data.first_publish_year?.toString() || data.publish_date,
      publisher: data.publisher?.[0] || data.publisher,
      description: data.description?.value || data.description,
      coverUrl: data.cover_i
        ? `https://covers.openlibrary.org/b/id/${data.cover_i}-M.jpg`
        : "",
    });
  }

  checkout() {
    this.checkoutDate = new Date().toISOString();
    this.checkinDate = null;
  }

  checkin() {
    this.checkinDate = new Date().toISOString();
  }

  isCheckedOut() {
    return this.checkoutDate && !this.checkinDate;
  }

  isReturned() {
    return this.checkinDate !== null;
  }

  toJSON() {
    return {
      isbn: this.isbn,
      title: this.title,
      author: this.author,
      publishedDate: this.publishedDate,
      publisher: this.publisher,
      description: this.description,
      coverUrl: this.coverUrl,
      checkoutDate: this.checkoutDate,
      checkinDate: this.checkinDate,
    };
  }

  static fromJSON(data) {
    return new Book(data);
  }
}

module.exports = Book;
