import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Browsers are NOT installed into the default Windows location on this
 * machine — C: is nearly full. Install them once with:
 *
 *   PLAYWRIGHT_BROWSERS_PATH=D:/ms-playwright npx playwright install chromium
 *
 * and keep PLAYWRIGHT_BROWSERS_PATH set in the shell that runs the tests.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // This machine is disk- and memory-constrained; 7 workers against one
  // `next start` instance stalls requests past the timeout.
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 45_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Signs in once and saves the session; the admin suite reuses it. A
    // magic-link token is single-use, so generating one per test made the
    // suite race against itself.
    { name: "setup", testMatch: /admin\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
