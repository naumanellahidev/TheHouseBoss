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
  // `next start` instance stalls requests past the timeout. The suite grew
  // again in Phases 4 and 5 (26 public pages x 9 widths, plus the admin and
  // content flows), and at 3 workers individual page loads started tipping
  // past 45s purely from contention — every one of them passing on its own.
  workers: process.env.CI ? 2 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,

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
      // Everything except the cross-browser file, which runs on all engines.
      testIgnore: /cross-browser\.spec\.ts/,
    },

    // Phase 7 task 6. Only tests/cross-browser.spec.ts runs here: duplicating
    // the whole suite across three engines on this machine costs half an hour
    // and tells us almost nothing new. WebKit is the one that matters — it is
    // Safari on macOS and every browser on iOS.
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /cross-browser\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: /cross-browser\.spec\.ts/,
    },
    {
      name: "chromium-cross",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /cross-browser\.spec\.ts/,
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
