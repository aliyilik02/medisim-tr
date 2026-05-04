import { defineConfig, devices } from "@playwright/test";

// ============================================================
// Playwright E2E konfigürasyonu — Faz 11
// ============================================================
// Smoke testler `e2e/` altında. Vitest birim testleri `tests/` altında
// kalır, Playwright orayı taramaz.
//
// `webServer` Vite dev server'ı CI ve local için otomatik başlatır.
// CI'da install: `npx playwright install --with-deps chromium`
// ============================================================

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
