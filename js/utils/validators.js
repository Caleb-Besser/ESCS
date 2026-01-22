class Validators {
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateEmail(email) {
    if (!email || !email.trim()) {
      return { isValid: false, errors: ["Email is required"] };
    }

    if (!this.isValidEmail(email.trim())) {
      return { isValid: false, errors: ["Please enter a valid email address"] };
    }

    return { isValid: true, errors: [] };
  }

  static validatePassword(password) {
    if (!password) {
      return { isValid: false, errors: ["Password is required"] };
    }

    if (password.length < 6) {
      return {
        isValid: false,
        errors: ["Password must be at least 6 characters"],
      };
    }

    return { isValid: true, errors: [] };
  }

  static validateLoginForm(email, password) {
    const emailValidation = this.validateEmail(email);
    const passwordValidation = this.validatePassword(password);

    return {
      isValid: emailValidation.isValid && passwordValidation.isValid,
      errors: [...emailValidation.errors, ...passwordValidation.errors],
    };
  }

  static validateRegistrationForm(email, password, confirmPassword) {
    const emailValidation = this.validateEmail(email);
    const passwordValidation = this.validatePassword(password);

    let errors = [...emailValidation.errors, ...passwordValidation.errors];

    if (password !== confirmPassword) {
      errors.push("Passwords do not match");
    }

    return {
      isValid:
        emailValidation.isValid &&
        passwordValidation.isValid &&
        password === confirmPassword,
      errors,
    };
  }

  static validateStudentForm(name) {
    if (!name || !name.trim()) {
      return { isValid: false, errors: ["Student name is required"] };
    }

    if (name.trim().length < 2) {
      return {
        isValid: false,
        errors: ["Student name must be at least 2 characters"],
      };
    }

    if (name.trim().length > 100) {
      return {
        isValid: false,
        errors: ["Student name must be less than 100 characters"],
      };
    }

    return { isValid: true, errors: [] };
  }

  static validateBookForm(title, author, isbn) {
    let errors = [];

    if (!title || !title.trim()) {
      errors.push("Book title is required");
    }

    if (!author || !author.trim()) {
      errors.push("Book author is required");
    }

    if (!isbn || !isbn.trim()) {
      errors.push("ISBN is required");
    } else if (!this.isValidISBN(isbn.trim())) {
      errors.push("Please enter a valid ISBN");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static isValidISBN(isbn) {
    // Basic ISBN validation (supports ISBN-10 and ISBN-13)
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");

    if (cleanIsbn.length === 10) {
      return this.validateISBN10(cleanIsbn);
    } else if (cleanIsbn.length === 13) {
      return this.validateISBN13(cleanIsbn);
    }

    return false;
  }

  static validateISBN10(isbn) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]) * (10 - i);
    }

    const checkDigit = isbn[9] === "X" ? 10 : parseInt(isbn[9]);
    sum += checkDigit;

    return sum % 11 === 0;
  }

  static validateISBN13(isbn) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(isbn[12]);
  }

  static escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  static sanitizeInput(input) {
    if (typeof input !== "string") return input;
    return input.trim().replace(/[<>]/g, "");
  }

  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  static isPositiveNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = Validators;
