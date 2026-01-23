// test-helpers.js
// Simple utilities you can use in browser console or tests

const TestHelpers = {
  // Mock a student for testing
  createMockStudent(name = "Test Student") {
    const id = Math.floor(10000000 + Math.random() * 90000000).toString();
    return {
      id,
      name,
      books: [],
    };
  },

  // Mock book data
  createMockBook(isbn = "9781234567890") {
    return {
      isbn,
      title: "Test Book Title",
      author: "Test Author",
      checkoutDate: new Date().toLocaleDateString(),
    };
  },

  // Run basic app checks
  runSmokeCheck() {
    console.log("🔍 Running smoke checks...");

    const checks = [
      { name: "appState exists", check: () => !!window.appState },
      {
        name: "Students container",
        check: () => !!document.getElementById("students"),
      },
      {
        name: "Books area",
        check: () => !!document.getElementById("selected-books-list"),
      },
      {
        name: "Barcode input",
        check: () => !!document.getElementById("barcode-scanner-input"),
      },
    ];

    let passed = 0;
    checks.forEach((check) => {
      if (check.check()) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name} FAILED`);
      }
    });

    console.log(`\n${passed}/${checks.length} checks passed`);
    return passed === checks.length;
  },

  // Test print function
  testPrintFunction() {
    console.log("🖨️ Testing print function...");

    if (!window.printStudents) {
      console.log("❌ printStudents function not found");
      return false;
    }

    // Add a test student
    const testStudent = this.createMockStudent("Print Test Student");
    window.appState.allStudents = [testStudent];
    window.appState.selectedStudents = [testStudent.id];

    // Mock the print preview
    const originalOpenPrintPreview = window.openPrintPreview;
    let printWasCalled = false;

    window.openPrintPreview = function (html) {
      printWasCalled = true;
      console.log("✅ Print preview would open");
      console.log("📄 HTML length:", html.length);
      console.log(
        "👤 Contains student name:",
        html.includes("Print Test Student"),
      );
      console.log("🔢 Contains student ID:", html.includes(testStudent.id));

      // Restore original function
      window.openPrintPreview = originalOpenPrintPreview;
    };

    try {
      window.printStudents();
      console.log("✅ printStudents executed without error");
      return printWasCalled;
    } catch (error) {
      console.log("❌ Error in printStudents:", error.message);
      return false;
    }
  },
};

// Make it globally available
window.TestHelpers = TestHelpers;
console.log("TestHelpers loaded. Available as window.TestHelpers");
