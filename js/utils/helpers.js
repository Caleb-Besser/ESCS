class Helpers {
  static formatDate(dateString, options = {}) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    };

    return date.toLocaleDateString("en-US", defaultOptions);
  }

  static formatDateTime(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  static truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  static capitalizeFirst(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static generateId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static isEmpty(obj) {
    return obj == null || Object.keys(obj).length === 0;
  }

  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = result[group] || [];
      result[group].push(item);
      return result;
    }, {});
  }

  static sortBy(array, key, order = "asc") {
    return array.sort((a, b) => {
      if (a[key] < b[key]) return order === "asc" ? -1 : 1;
      if (a[key] > b[key]) return order === "asc" ? 1 : -1;
      return 0;
    });
  }

  static filterBy(array, key, value) {
    return array.filter((item) => item[key] === value);
  }

  static findBy(array, key, value) {
    return array.find((item) => item[key] === value);
  }

  static removeBy(array, key, value) {
    return array.filter((item) => item[key] !== value);
  }
}

module.exports = Helpers;
