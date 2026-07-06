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
  // Sprint B.4 vision-test — toHaveScreenshot global ayarlar
  expect: {
    toHaveScreenshot: {
      // CSS animation + WebGL pulse/breathing oscillation tolere et
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    // Deterministik viewport (snapshot diff için)
    viewport: { width: 1280, height: 800 },
    // WebGL'i gerçek GPU'da çalıştır (ANGLE/D3D11) — varsayılan SwiftShader
    // (yazılım raster) ağır sahnede rAF'ı boğar; Playwright locator çözümü
    // rAF-polling olduğundan TÜM tıklamalar timeout'a düşüyordu (6 Tem).
    // CI'da GPU yoksa Chromium SwiftShader'a kendisi geri düşer (zararsız).
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
    },
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
    // E2E auth bypass — backend olmadan auth gate'i atla (authStore E2E seam).
    // reuseExistingServer:false → flag'siz çalışan dev server'ı kullanma, taze başlat.
    env: { VITE_E2E: "1" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
