// tests/basic-tests.js
const { test, expect } = require("@playwright/test");

test("App loads and shows ESCS title", async ({ page }) => {
  // Start from your login page
  await page.goto("http://localhost:3000/login.html");

  // Check title
  const title = await page.title();
  expect(title).toBe("ESCS - Login");

  console.log("✓ App loads correctly");
});

test("Login page has email and password fields", async ({ page }) => {
  await page.goto("http://localhost:3000/login.html");

  // Check for login form
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  const loginButton = page.locator("#login-btn");

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(loginButton).toBeVisible();

  console.log("✓ Login form has all fields");
});

test("Main app shows student list after login", async ({ page }) => {
  // This assumes you're already logged in
  // For testing, you might need to skip login or mock it

  await page.goto("http://localhost:3000/index.html");

  // Check for key elements
  await expect(page.locator('.app-name:has-text("ESCS")')).toBeVisible();
  await expect(page.locator(".student-list")).toBeVisible();
  await expect(page.locator(".books-area")).toBeVisible();

  console.log("✓ Main app layout loads");
});
