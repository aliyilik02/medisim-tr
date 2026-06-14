// ============================================================
// E2E — Dikey Dilim (/hasta/:id) + Demo Emekliliği
// ============================================================
// Stratejik değerlendirme ① (dikey dilim) + sorun #3 (fragmentasyon):
//   - /hasta/:id pahalı katman canonical akışı yüklenir
//   - saf özellik-vitrini demoları /senaryolar'a yönlenir
//   - senaryo listesi iki katmanı (2D / 3D) sunar
// ============================================================

import { test, expect } from "@playwright/test";

const ANAFLAKSI = "acil-anaflaksi-001";

test.describe("dikey dilim — /hasta/:id", () => {
  test("hasta sahnesi yüklenir — 3D oda + köşe monitör + skor", async ({
    page,
  }) => {
    await page.goto(`/hasta/${ANAFLAKSI}`);
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    // 3D oda canvas
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({
      timeout: 10_000,
    });
    // Köşe başucu monitörü
    await expect(page.getByTestId("vital-monitor-screen")).toBeVisible();
    // Otomatik başlatma (autoStartMode) → seans skoru
    await expect(page.getByTestId("session-score")).toBeVisible();
    // Vaka akışı paneli
    await expect(page.getByTestId("vaka-panel")).toBeVisible();
  });

  test("paramlı seansta senaryo dropdown'u gizli", async ({ page }) => {
    await page.goto(`/hasta/${ANAFLAKSI}`);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    // /hasta/:id sabit senaryo → dropdown yok (sadece /senaryo-yatak dev modunda)
    await expect(page.locator("header select")).toHaveCount(0);
  });
});

test.describe("demo emekliliği — saf vitrinler /senaryolar'a yönlenir", () => {
  for (const route of [
    "/3d-demo",
    "/dialog-demo",
    "/faz2-demo",
    "/animasyon-demo",
    "/monitor-demo",
    "/ventilator-demo",
  ]) {
    test(`${route} → /senaryolar`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("load");
      await expect(page).toHaveURL(/\/senaryolar$/);
    });
  }
});

test.describe("senaryo listesi — iki katman", () => {
  test("yayında senaryo kartında 2D + 3D bağlantısı", async ({ page }) => {
    await page.goto("/senaryolar");
    // Kart başlığı render olana kadar bekle
    await expect(
      page.getByRole("heading", { name: /STEMI/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    // İki katman: ucuz /oyna + pahalı /hasta bağlantıları
    await expect(page.locator('a[href^="/oyna/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/hasta/"]').first()).toBeVisible();
  });
});
