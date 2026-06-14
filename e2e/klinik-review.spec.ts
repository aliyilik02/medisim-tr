// ============================================================
// E2E — Klinik Review Dashboard (/klinik-review, Faz ④)
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("klinik review dashboard", () => {
  test("dashboard yüklenir — başlık + senaryo listesi + review paneli", async ({
    page,
  }) => {
    await page.goto("/klinik-review");
    await page.waitForLoadState("load");
    await expect(page.getByRole("heading", { name: /Klinik Review/i })).toBeVisible();
    // Sol listede senaryo seçilebilir (STEMI)
    await page.getByRole("button", { name: /STEMI/i }).first().click();
    // Sağ panel: otomatik kontroller + kalıcılaştırma snippet'i görünür
    await expect(page.getByText(/Otomatik Kontroller/i)).toBeVisible();
    await expect(page.getByText(/clinical_review:/i)).toBeVisible();
  });

  test("review çalışması yerel kaydedilir (localStorage)", async ({ page }) => {
    await page.goto("/klinik-review");
    await page.waitForLoadState("load");
    await page.getByRole("button", { name: /STEMI/i }).first().click();
    await page.getByTestId("review-save").click();
    // localStorage'a yazıldı
    const stored = await page.evaluate(() =>
      localStorage.getItem("medisim.clinical_review")
    );
    expect(stored).toBeTruthy();
    expect(stored).toContain("kardiyoloji-stemi-001");
  });

  test("senaryo listesi kartında klinik durum rozeti görünür", async ({ page }) => {
    await page.goto("/senaryolar");
    await expect(
      page.getByRole("heading", { name: /STEMI/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    // Varsayılan: alan yok → "Taslak" rozeti (en az bir kartta)
    await expect(page.getByText(/Taslak/i).first()).toBeVisible();
  });
});
