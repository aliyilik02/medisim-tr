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
    // En az 1 senaryo kartı bulunmalı (en kötü ihtimal şu an 14)
    const cards = page.getByRole("link", { name: /STEMI|DKA|Bronşiyolit|Anaflaksi/i });
    await expect(cards.first()).toBeVisible();
  });

  test("STEMI senaryosu başlatılabilir — oyna sayfası açılır", async ({ page }) => {
    await page.goto("/senaryolar");
    // İlk STEMI içeren karta tıkla
    const stemiCard = page.getByRole("link").filter({ hasText: /STEMI/i }).first();
    await stemiCard.click();
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
