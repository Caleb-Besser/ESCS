const Book = require("../models/Book");

class ApiService {
  constructor() {
    this.baseUrl = "https://openlibrary.org";
  }

  async searchBooks(query, limit = 20) {
    try {
      const url = `${this.baseUrl}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=title,author_name,first_publish_year,isbn,cover_i,publisher,description`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.docs.map((doc) =>
        Book.fromApiResponse({
          title: doc.title,
          author: doc.author_name?.join(", "),
          publishedDate: doc.first_publish_year?.toString(),
          isbn: doc.isbn?.[0],
          cover_i: doc.cover_i,
          publisher: doc.publisher?.[0],
          description: doc.description?.value || doc.description,
        }),
      );
    } catch (error) {
      console.error("Book search error:", error);
      throw new Error("Failed to search books. Please try again.");
    }
  }

  async getBookDetails(isbn) {
    try {
      const url = `${this.baseUrl}/isbn/${isbn}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return Book.fromApiResponse(data);
    } catch (error) {
      console.error("Book details error:", error);
      throw new Error("Failed to get book details. Please try again.");
    }
  }

  async getBooksByAuthor(author, limit = 10) {
    try {
      const url = `${this.baseUrl}/search.json?author=${encodeURIComponent(author)}&limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.docs.map((doc) => Book.fromApiResponse(doc));
    } catch (error) {
      console.error("Author search error:", error);
      throw new Error("Failed to search books by author. Please try again.");
    }
  }
}

module.exports = ApiService;
