// ============================================================
// E2E Smoke — /dialog-demo route (Sprint B.2)
// ============================================================
// Standalone AI hasta diyalog sayfası. Mock backend fallback (Gemini
// production'da yoksa otomatik mock). Chat input + Calgary stepper
// + backend rozet kontrolleri.
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("/dialog-demo — AI hasta diyaloğu standalone", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dialog-demo");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
  });

  test("sayfa mount edilir, chat input görünür", async ({ page }) => {
    const input = page.getByTestId("dialog-input");
    await expect(input).toBeVisible({ timeout: 10_000 });
    await expect(input).toBeEnabled();
  });

  test("Calgary-Cambridge stage label görünür (Karşılama)", async ({ page }) => {
    await expect(page.getByText(/Karşılama|İletişim/i).first()).toBeVisible();
  });

  test("Backend mod rozeti görünür (mock veya gemini)", async ({ page }) => {
    // Backend rozeti header'da — mock veya gemini
    await expect(
      page.locator("text=/Mock|Gemini/i").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("input + Enter → user mesajı eklenir", async ({ page }) => {
    const input = page.getByTestId("dialog-input");
    await input.fill("Merhaba doktor");
    await input.press("Enter");
    await expect(page.getByText(/Merhaba doktor/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("Sıfırla butonu turn'leri temizler", async ({ page }) => {
    const input = page.getByTestId("dialog-input");
    await input.fill("Test mesajı");
    await input.press("Enter");
    await expect(page.getByText(/Test mesajı/i)).toBeVisible({ timeout: 5000 });

    const resetBtn = page.getByRole("button", { name: /Sıfırla/i });
    await resetBtn.click();
    // Mesaj DOM'dan kaldırılmalı
    await expect(page.getByText(/Test mesajı/i)).not.toBeVisible({ timeout: 3000 });
  });
});
