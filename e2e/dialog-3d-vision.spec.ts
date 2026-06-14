// ============================================================
// E2E Smoke + Layout — /dialog-3d-demo (Sprint B.2-B.4)
// ============================================================
// Strateji: Pixel-snapshot regression yerine **DOM assertion** odaklı.
// WebGL Canvas + breathing/pulse/lerp animasyonları sürekli oscillate
// ediyor → toHaveScreenshot stabilize edilemiyor.
//
// Bu yerine layout pozisyonu (boundingBox), element varlığı, içerik
// metni, etkileşim akışı test edilir. UI regression'larını yakalar:
// - Monitor sol üstten kayarsa → fail
// - Cilt tonu buton kaybolursa → fail
// - Senaryo değişimi vital güncellemez → fail
//
// Visual snapshot test'i Pulse Engine geldikten sonra (animasyon
// pause prop'u eklenince) yeniden eklenecek.
//
// Çalıştırma: npm run test:visual
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("dialog-3d-demo layout + smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dialog-3d-demo");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
  });

  test("layout — monitor sol üst, chat sağ panel", async ({ page }) => {
    const monitor = page.getByTestId("vital-monitor-screen");

    await expect(monitor).toBeVisible();

    // Faz 1: sağ panel sekmeli — diyalog "Hasta ile Konuş" sekmesinde
    await page.getByTestId("tab-diyalog").click();
    const chatInput = page.getByTestId("dialog-input");
    await expect(chatInput).toBeVisible();

    const monitorBox = await monitor.boundingBox();
    expect(monitorBox?.x).toBeLessThan(50);
    expect(monitorBox?.y).toBeLessThan(150);
  });

  test("monitor — köşe başucu monitörü vital kutuları görünür", async ({ page }) => {
    const monitor = page.getByTestId("vital-monitor-screen");
    // Köşe monitör (VitalMonitorScreen): HR + SpO₂ + NIBP kutuları
    await expect(monitor.locator("text=/HR/i").first()).toBeVisible();
    await expect(monitor.locator("text=/SpO/i").first()).toBeVisible();
    await expect(monitor.locator("text=/NIBP/i").first()).toBeVisible();
    // Sistolik TA değeri okunabilir
    await expect(page.getByTestId("monitor-nibp-sys").first()).toBeVisible();
  });

  test("cilt tonu 4 buton görünür", async ({ page }) => {
    await expect(page.locator('button:has-text("Normal")')).toBeVisible();
    await expect(page.locator('button:has-text("Siyanoz")')).toBeVisible();
    await expect(page.locator('button:has-text("İkter")')).toBeVisible();
    await expect(page.locator('button:has-text("Solgun")')).toBeVisible();
  });

  test("solunum toggle çalışır", async ({ page }) => {
    const toggle = page.locator('button:has-text("Solunum")');
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText(/açık/i);
    await toggle.click();
    await expect(toggle).toContainText(/kapalı/i);
  });

  test("senaryo dropdown geçişi vital değiştirir", async ({ page }) => {
    const initialVitalText = await page.getByTestId("vital-monitor-screen").textContent();

    const dkaValue = await page
      .locator("select option")
      .filter({ hasText: /DKA/i })
      .first()
      .getAttribute("value");
    if (dkaValue) {
      await page.selectOption("select", dkaValue);
      await page.waitForTimeout(800);
    }

    const newVitalText = await page.getByTestId("vital-monitor-screen").textContent();
    expect(newVitalText).not.toBe(initialVitalText);
  });

  test("dialog chat input + Calgary-Cambridge stepper görünür", async ({ page }) => {
    // Faz 1: diyalog ayrı sekmede
    await page.getByTestId("tab-diyalog").click();
    const input = page.getByTestId("dialog-input");
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    // Calgary-Cambridge stage labels
    await expect(page.locator("text=/Kar.ılama/i").first()).toBeVisible();
    await expect(page.locator("text=/Anamnez/i").first()).toBeVisible();
  });

  test("3d canvas render edilir", async ({ page }) => {
    // R3F Canvas DOM'da var ve görünür
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    // Canvas içeriği var (width > 100px = gerçek render alanı)
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(100);
  });
});
