// ============================================================
// E2E Smoke Testleri — MediSim TR (Faz 11)
// ============================================================
// Amaç: prod hata olduğunda en kısa zamanda yakalamak. Senaryo
// içeriği ve klinik mantık birim testlerde — burada sadece
// "uygulama yükleniyor + temel akış çalışıyor" doğrulanır.
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("Ana akış", () => {
  test("ana sayfa yüklenir, başlık ve marka görünür", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MediSim/i);
    // Header'da marka
    await expect(page.getByText(/MediSim/).first()).toBeVisible();
  });

  test("senaryolar sayfasına navigasyon — kart listesi yüklenir", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Senaryolar/i }).first().click();
    await expect(page).toHaveURL(/\/senaryolar/);
    // En az 1 senaryo kartı başlığı görünmeli (kart artık tek link değil —
    // başlık + iki katman aksiyon: 2D Oyna / 3D Hasta)
    await expect(page.getByRole("heading", { name: /STEMI/i }).first()).toBeVisible();
    // İki katman bağlantısı kartta mevcut
    await expect(page.locator('a[href^="/oyna/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/hasta/"]').first()).toBeVisible();
  });

  test("STEMI senaryosu başlatılabilir — 2D oyna sayfası açılır", async ({ page }) => {
    await page.goto("/senaryolar");
    // STEMI kartının 2D Oyna bağlantısı (href ile kesin hedef)
    await page.locator('a[href="/oyna/kardiyoloji-stemi-001"]').first().click();
    await expect(page).toHaveURL(/\/oyna\/kardiyoloji-stemi-001/);
    // Hasta paneli render olmuş olmalı
    await expect(page.getByText(/yaş/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Geçmiş ve editör sayfaları smoke", () => {
  test("geçmiş sayfası yüklenir (boş state olabilir)", async ({ page }) => {
    await page.goto("/gecmis");
    // 404 değil
    await expect(page).toHaveURL(/\/gecmis/);
  });

  test("senaryo editörü yüklenir", async ({ page }) => {
    await page.goto("/senaryo-editor");
    await expect(page).toHaveURL(/\/senaryo-editor/);
  });
});
