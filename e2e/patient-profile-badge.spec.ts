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

    // selectOption {label} regex eşleştirme — value attribute query'sinden
    // daha stabil (race condition'dan etkilenmez)
    const dropdown = page.locator("header select").first();
    // Bronşiyolit senaryo title: "8 Aylık Erkek Bebek — Hışıltı ve Solunum Sıkıntısı"
    await dropdown.selectOption({ label: /Aylık.*Bebek/i });
    await page.waitForTimeout(800);

    const newText = await badge.textContent();
    expect(newText).not.toBe(initialText);
    await expect(badge).toContainText(/Bebek/i);
  });

  test("Preeklampsi (32y gebe) senaryosu 'Gebe' etiketi ekler", async ({ page }) => {
    const badge = page.getByTestId("patient-profile-badge");
    const dropdown = page.locator("header select").first();
    // Preeklampsi senaryo title: "32 Yaş Kadın — 36 Haftalık Gebe, Baş Ağrısı ve Hipertansiyon"
    await dropdown.selectOption({ label: /Gebe.*Hipertansiyon|Hipertansiyon.*Gebe/i });
    await page.waitForTimeout(800);
    await expect(badge).toContainText(/Gebe/i);
    await expect(badge).toContainText(/Kadın/i);
  });

  test("Yaşlı hasta (iskemik inme 72y) → 'Yaşlı' etiketi", async ({ page }) => {
    const badge = page.getByTestId("patient-profile-badge");
    const dropdown = page.locator("header select").first();
    // İskemik inme title: "72 Yaş Kadın — Ani Gelişen Sağ Hemipleji"
    await dropdown.selectOption({ label: /Hemipleji/i });
    await page.waitForTimeout(800);
    await expect(badge).toContainText(/Yaşlı/i);
  });
});
