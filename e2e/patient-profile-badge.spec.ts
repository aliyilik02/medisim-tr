// ============================================================
// E2E — Hasta profil rozeti (Sprint B.7)
// ============================================================
// PatientDialog3DPage header'ındaki `patient-profile-badge` rozetinin
// senaryo dropdown geçişine göre güncellendiğini doğrular.
//
// Canvas mount beklemediği için diğer 3D testlerden flaky değil — saf
// DOM assertion. Hasta profil derive akışı düzgün çalışıyorsa rozet
// doğru label gösterir.
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("patient profile badge — header chip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dialog-3d-demo");
    await page.waitForLoadState("load");
    await page.waitForSelector('[data-testid="patient-profile-badge"]', {
      timeout: 15_000,
    });
  });

  test("rozet görünür ve başlangıç senaryosunda yaş+cinsiyet etiketi var", async ({ page }) => {
    const badge = page.getByTestId("patient-profile-badge");
    await expect(badge).toBeVisible();
    // STEMI default senaryosu (62y M) — "62 yaş Erkek" benzeri
    await expect(badge).toContainText(/yaş|Bebek/i);
    await expect(badge).toContainText(/Erkek|Kadın/i);
  });

  test("Bronşiyolit (8 ay) seçimi rozeti 'Bebek' olarak günceller", async ({ page }) => {
    const badge = page.getByTestId("patient-profile-badge");
    const initialText = await badge.textContent();

    // Senaryo dropdown'dan Bronşiyolit seç (id: pediatri-bronsiyolit-001)
    const bronsiyolitValue = await page
      .locator("select option")
      .filter({ hasText: /bronşiyolit/i })
      .first()
      .getAttribute("value");
    if (bronsiyolitValue) {
      await page.selectOption("select", bronsiyolitValue);
      await page.waitForTimeout(500);

      const newText = await badge.textContent();
      expect(newText).not.toBe(initialText);
      await expect(badge).toContainText(/Bebek/i);
    }
  });

  test("Preeklampsi (32y gebe) senaryosu 'Gebe' etiketi ekler", async ({ page }) => {
    const badge = page.getByTestId("patient-profile-badge");
    const preeklampsiValue = await page
      .locator("select option")
      .filter({ hasText: /preeklampsi/i })
      .first()
      .getAttribute("value");
    if (preeklampsiValue) {
      await page.selectOption("select", preeklampsiValue);
      await page.waitForTimeout(500);
      await expect(badge).toContainText(/Gebe/i);
      await expect(badge).toContainText(/Kadın/i);
    }
  });

  test("Yaşlı hasta (iskemik inme 72y) → 'Yaşlı' etiketi", async ({ page }) => {
    const badge = page.getByTestId("patient-profile-badge");
    const inmeValue = await page
      .locator("select option")
      .filter({ hasText: /inme/i })
      .first()
      .getAttribute("value");
    if (inmeValue) {
      await page.selectOption("select", inmeValue);
      await page.waitForTimeout(500);
      await expect(badge).toContainText(/Yaşlı/i);
    }
  });
});
