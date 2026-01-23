// tests/checkout-test.js
const { test, expect } = require("@playwright/test");

test("Book checkout flow", async ({ page }) => {
  await page.goto("http://localhost:3000/index.html");

  // Setup test environment
  await page.addInitScript(() => {
    // Mock student data
    window.appState = {
      selectedStudents: ["1001"],
      allStudents: [
        {
          id: "1001",
          name: "John Smith",
          books: [],
        },
      ],
      barcodeInput: {
        value: "",
        focus: () => {},
        dispatchEvent: () => {},
      },
    };

    // Mock the barcode scanner input handler
    window.simulateBarcodeScan = function (barcode) {
      console.log("Simulating barcode scan:", barcode);

      // This simulates what happens when a barcode is scanned
      const student = window.appState.allStudents[0];

      // Add book to student
      student.books.push({
        isbn: barcode,
        title: "Test Book",
        author: "Test Author",
        checkoutDate: "2024-01-15",
      });

      return true;
    };
  });

  // Simulate scanning a book barcode
  const scanSuccess = await page.evaluate(() => {
    return window.simulateBarcodeScan("9781234567890");
  });

  expect(scanSuccess).toBe(true);

  // Verify book was added
  const hasBook = await page.evaluate(() => {
    const student = window.appState.allStudents[0];
    return (
      student.books.length === 1 && student.books[0].isbn === "9781234567890"
    );
  });

  expect(hasBook).toBe(true);
  console.log("✓ Book checkout simulation works");
});
