// ============================================================
// E2E Smoke — /3d-demo route (Sprint A)
// ============================================================
// 3D canvas tıklama Playwright'tan zor (WebGL içeriği DOM'a düşmez)
// — sadece route render edilebiliyor, canvas DOM'da var ve panel
// başlangıçta yok kontrolleri yapılır. Region etkileşimi vitest +
// manuel test'te doğrulanır.
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("Patient 3D demo route", () => {
  test("route açılır, başlık görünür", async ({ page }) => {
    await page.goto("/3d-demo");
    await expect(page).toHaveURL(/\/3d-demo/);
    // Lazy chunk + WebGL init için cömert timeout (paralelde worker yarışı)
    await expect(page.getByText(/Patient Body 3D/i)).toBeVisible({ timeout: 15_000 });
  });

  test("canvas DOM'da render edilir", async ({ page }) => {
    await page.goto("/3d-demo");
    // R3F Canvas <canvas> elementini DOM'a basar. WebGL context kurmaya
    // çalıştığı için "domcontentloaded" yerine "load"u bekliyoruz.
    await page.waitForLoadState("load");
    // CompactVitalsHUD de bir <canvas> basıyor → selector'ı 3D sahne canvas'ına
    // daralt (yoksa strict-mode 2 element çakışması).
    const canvas = page.getByTestId("patient-3d-canvas").locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });

  test("inspection panel başlangıçta render edilmez", async ({ page }) => {
    await page.goto("/3d-demo");
    await page.waitForLoadState("load");
    const panel = page.getByTestId("patient-3d-inspection-panel");
    await expect(panel).toHaveCount(0);
  });

  test("anatomik glTF asset 200 OK döner", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (r) => r.url().endsWith("/3d/patient-female-adult.glb") && r.status() === 200,
      { timeout: 15_000 },
    );
    await page.goto("/3d-demo");
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const contentLength = response.headers()["content-length"];
    if (contentLength) {
      // ~237 KB MPFB2 CC0 (meshopt). Alt sınır: truncate/0-byte yakala.
      expect(Number(contentLength)).toBeGreaterThan(100_000);
      // Üst sınır: ham/optimize edilmemiş master'ın yanlışlıkla gelmesini yakala.
      expect(Number(contentLength)).toBeLessThan(2_000_000);
    }
  });
});
