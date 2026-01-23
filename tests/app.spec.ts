import { test, expect } from "@playwright/test";
import { _electron } from "playwright";
import path from "path";

test("launch app and check title", async () => {
  // Launch Electron app
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, "..", "main.js")],
  });

  // Wait for the main window to open
  const window = await electronApp.firstWindow();

  // Perform a simple check: verify the window title
  await expect(window).toHaveTitle("Easy Student Checkout System (ESCS)");

  // Close the app safely
  await electronApp.close();
});

test("student management - add, select, and remove students", async () => {
  // Launch Electron app
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, "..", "main.js")],
  });

  // Wait for the main window to open (login screen)
  const window = await electronApp.firstWindow();

  // Register and login first
  const testEmail = `studenttest${Date.now()}@example.com`;
  await window.locator("#toggle-link").click();
  await window.locator("#email").fill(testEmail);
  await window.locator("#password").fill("testpassword123");
  await window.locator("#submit-btn").click();

  // Wait for main app to load
  await window.waitForSelector(".main-content", { timeout: 5000 });

  // Verify no students initially
  await expect(window.locator(".student-card")).toHaveCount(0);

  // Add first student
  await window.locator(".dynamic-btn.primary").click(); // Add Student button
  await window.locator("#add-student-name-input").fill("John Doe");
  await window.locator("#add-student-confirm").click();

  // Wait for student to be added and rendered
  await window.waitForSelector(".student-card", { timeout: 5000 });
  await expect(window.locator(".student-card")).toHaveCount(1);
  await expect(window.locator(".student-name").first()).toHaveText("John Doe");

  // Add second student
  await window.locator(".dynamic-btn.primary").click(); // Add Another Student button
  await window.locator("#add-student-name-input").fill("Jane Smith");
  await window.locator("#add-student-confirm").click();

  // Verify second student was added
  await expect(window.locator(".student-card")).toHaveCount(2);

  // Test student selection
  await window.locator(".student-card").first().click();
  await expect(window.locator(".student-card.selected")).toHaveCount(1);

  // Test multi-selection with Ctrl
  await window.keyboard.down("Control");
  await window.locator(".student-card").last().click();
  await window.keyboard.up("Control");
  await expect(window.locator(".student-card.selected")).toHaveCount(2);

  // Test select all
  await window.locator("#select-all-checkbox").check();
  await expect(window.locator(".student-card.selected")).toHaveCount(2);

  // Test deselect all
  await window.locator("#select-all-checkbox").uncheck();
  await expect(window.locator(".student-card.selected")).toHaveCount(0);

  // Test remove single student
  await window.locator(".student-card").first().click();
  await window.locator(".dynamic-btn.danger").click(); // Remove Student button
  await window.locator("#confirm-ok").click();

  // Verify one student remains
  await expect(window.locator(".student-card")).toHaveCount(1);
  await expect(window.locator(".student-name").first()).toHaveText(
    "Jane Smith",
  );

  // Test remove remaining student
  await window.locator(".student-card").first().click();
  await window.locator(".dynamic-btn.danger").click();
  await window.locator("#confirm-ok").click();

  // Verify no students remain
  await expect(window.locator(".student-card")).toHaveCount(0);

  // Close the app safely
  await electronApp.close();
});

test("book checkout and checkin via barcode scanning", async () => {
  // Launch Electron app
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, "..", "main.js")],
  });

  // Wait for the main window to open (login screen)
  const window = await electronApp.firstWindow();

  // Register and login first
  const testEmail = `booktest${Date.now()}@example.com`;
  await window.locator("#toggle-link").click();
  await window.locator("#email").fill(testEmail);
  await window.locator("#password").fill("testpassword123");
  await window.locator("#submit-btn").click();

  // Wait for main app to load
  await window.waitForSelector(".main-content", { timeout: 5000 });

  // Add a student
  await window.locator(".dynamic-btn.primary").click();
  await window.locator("#add-student-name-input").fill("Test Student");
  await window.locator("#add-student-confirm").click();

  // Initially, welcome message should be visible (no students selected)
  await expect(window.locator("#welcome-container")).toBeVisible();

  // Select the student
  await window.locator(".student-card").first().click();

  // After selecting student, welcome message should be hidden and no-books message should be shown
  await expect(window.locator("#welcome-container")).not.toBeVisible();
  await expect(window.locator(".no-books-message")).toBeVisible();

  // Simulate book checkout by inputting ISBN into barcode scanner
  const barcodeInput = window.locator("#barcode-scanner-input");
  await barcodeInput.fill("9780451526533"); // Example ISBN for "1984" by George Orwell
  await barcodeInput.press("Enter");

  // Wait for book to be added (API call might take time)
  await window.waitForTimeout(3000);

  // Verify book was checked out
  await expect(window.locator(".book-card")).toHaveCount(1);
  await expect(window.locator("#books-header")).toHaveText(
    "Checked Out Books (1)",
  );
  await expect(window.locator(".book-title")).toContainText("1984");

  // Verify student has books indicator
  await expect(
    window.locator(".student-card .status-dot.has-books"),
  ).toBeVisible();

  // Test check-in by scanning the same ISBN again
  await barcodeInput.fill("9780451526533");
  await barcodeInput.press("Enter");

  // Wait for check-in confirmation
  await window.waitForTimeout(1000);

  // Confirm check-in
  await window.locator("#confirm-ok").click();

  // Wait for book to be removed
  await window.waitForTimeout(2000);

  // Verify book was checked in
  await expect(window.locator(".book-card")).toHaveCount(0);
  await expect(window.locator(".no-books-message")).toBeVisible();

  // Verify student no longer has books
  await expect(
    window.locator(".student-card .status-dot.no-books"),
  ).toBeVisible();

  // Close the app safely
  await electronApp.close();
});

test("printing student ID cards", async () => {
  // Launch Electron app
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, "..", "main.js")],
  });

  // Wait for the main window to open (login screen)
  const window = await electronApp.firstWindow();

  // Register and login first
  const testEmail = `printtest${Date.now()}@example.com`;
  await window.locator("#toggle-link").click();
  await window.locator("#email").fill(testEmail);
  await window.locator("#password").fill("testpassword123");
  await window.locator("#submit-btn").click();

  // Wait for main app to load
  await window.waitForSelector(".main-content", { timeout: 5000 });

  // Add a student
  await window.locator(".dynamic-btn.primary").click();
  await window.locator("#add-student-name-input").fill("Print Test Student");
  await window.locator("#add-student-confirm").click();

  // Select the student
  await window.locator(".student-card").first().click();

  // Click print button
  await window.locator(".dynamic-btn.secondary").click();

  // Wait for print preview window to open (increase timeout for Electron IPC)
  await window.waitForTimeout(5000);

  // Verify print preview window opened (check if new window exists)
  const windows = electronApp.windows();
  expect(windows.length).toBeGreaterThan(1); // Should have main window + print preview

  // Close the app safely (this should close all windows)
  await electronApp.close();
});

test("student sorting functionality", async () => {
  // Launch Electron app
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, "..", "main.js")],
  });

  // Wait for the main window to open (login screen)
  const window = await electronApp.firstWindow();

  // Register and login first
  const testEmail = `sorttest${Date.now()}@example.com`;
  await window.locator("#toggle-link").click();
  await window.locator("#email").fill(testEmail);
  await window.locator("#password").fill("testpassword123");
  await window.locator("#submit-btn").click();

  // Wait for main app to load
  await window.waitForSelector(".main-content", { timeout: 5000 });

  // Add multiple students with different names
  const students = ["Charlie Brown", "Alice Smith", "Bob Johnson"];
  for (const studentName of students) {
    await window.locator(".dynamic-btn.primary").click();
    await window.locator("#add-student-name-input").fill(studentName);
    await window.locator("#add-student-confirm").click();
  }

  // Verify students were added
  await expect(window.locator(".student-card")).toHaveCount(3);

  // Test sorting by name (A-Z) - should be default
  let studentNames = await window.locator(".student-name").allTextContents();
  expect(studentNames).toEqual(["Alice Smith", "Bob Johnson", "Charlie Brown"]);

  // Click sort button and select Name (Z-A)
  await window.locator("#sort-button").click();
  await window.locator('.sort-option[data-sort="name-desc"]').click();

  // Verify reverse alphabetical order
  await window.waitForTimeout(500);
  studentNames = await window.locator(".student-name").allTextContents();
  expect(studentNames).toEqual(["Charlie Brown", "Bob Johnson", "Alice Smith"]);

  // Test sorting by ID (assuming IDs are assigned sequentially)
  await window.locator("#sort-button").click();
  await window.locator('.sort-option[data-sort="id-desc"]').click();

  // Verify students are sorted by ID descending (newest first)
  await window.waitForTimeout(500);
  // The order should be reversed from creation order

  // Close the app safely
  await electronApp.close();
});

test("logout functionality", async () => {
  // Launch Electron app
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, "..", "main.js")],
  });

  // Wait for the main window to open (login screen)
  const window = await electronApp.firstWindow();

  // Register and login first
  const testEmail = `logouttest${Date.now()}@example.com`;
  await window.locator("#toggle-link").click();
  await window.locator("#email").fill(testEmail);
  await window.locator("#password").fill("testpassword123");
  await window.locator("#submit-btn").click();

  // Wait for main app to load
  await window.waitForSelector(".main-content", { timeout: 5000 });

  // Verify we're logged in
  await expect(window.locator(".app-name")).toHaveText("ESCS");

  // Click logout button
  await window.locator("#logout-btn").click();

  // Confirm logout in modal
  await window.locator("#confirm-ok").click();

  // Wait for redirect to login screen
  await window.waitForTimeout(2000);

  // Verify we're back to login screen - check URL and form title
  await expect(window).toHaveURL(/login\.html/);
  await expect(window.locator("#form-title")).toHaveText("Login");

  // Close the app safely
  await electronApp.close();
});

test("user registration and login flow", async () => {
  // Launch Electron app
  const electronApp = await _electron.launch({
    args: [path.join(__dirname, "..", "main.js")],
  });

  // Wait for the main window to open (login screen)
  const window = await electronApp.firstWindow();

  // Verify we're on login screen
  await expect(window).toHaveTitle("Easy Student Checkout System (ESCS)");
  await expect(window.locator("#form-title")).toHaveText("Login");

  // Switch to registration form
  await window.locator("#toggle-link").click();
  await expect(window.locator("#form-title")).toHaveText("Register");

  // Fill registration form
  const testEmail = `test${Date.now()}@example.com`;
  await window.locator("#email").fill(testEmail);
  await window.locator("#password").fill("testpassword123");
  await window.locator("#remember-me").check();

  // Submit registration
  await window.locator("#submit-btn").click();

  // Wait for transition to main app (should auto-login after registration)
  await window.waitForSelector(".main-content", { timeout: 5000 });

  // Verify we're logged in and on main screen
  await expect(window.locator(".app-name")).toHaveText("ESCS");
  await expect(window.locator("#logout-btn")).toBeVisible();

  // Logout to test login flow
  await window.locator("#logout-btn").click();

  // Confirm logout
  await window.locator("#confirm-ok").click();

  // Should be back to login screen
  await expect(window.locator("#form-title")).toHaveText("Login");

  // Test login with registered user
  await window.locator("#email").fill(testEmail);
  await window.locator("#password").fill("testpassword123");
  await window.locator("#submit-btn").click();

  // Wait for main app to load
  await window.waitForSelector(".main-content", { timeout: 5000 });
  await expect(window.locator(".app-name")).toHaveText("ESCS");

  // Close the app safely
  await electronApp.close();
});
