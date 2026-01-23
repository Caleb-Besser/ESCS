// playwright.config.js
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: null, // Maximize window
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: "chromium",
      use: {
        // Don't use devices preset - specify browser directly
        browserName: "chromium",
        viewport: null,
        launchOptions: {
          args: ["--start-maximized"],
        },
      },
    },
  ],

  webServer: {
    command: "npx serve . -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
