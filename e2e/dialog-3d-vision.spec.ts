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
    // Monitör üst barında canlı saat (HH:MM:SS) var → ham textContent her
    // okumada değişir (yanlış-pozitif). Saati ve trend sparkline'larını ele,
    // sistolik TA değerini (monitor-nibp-sys) karşılaştır = anlamlı sinyal.
    const sys0 = (await page.getByTestId("monitor-nibp-sys").first().textContent())?.trim();

    const dkaValue = await page
      .locator("select option")
      .filter({ hasText: /DKA/i })
      .first()
      .getAttribute("value");
    expect(dkaValue, "DKA senaryosu dropdown'da bulunamadı").toBeTruthy();
    await page.selectOption("select", dkaValue!);
    await page.waitForTimeout(1200);

    const sys1 = (await page.getByTestId("monitor-nibp-sys").first().textContent())?.trim();
    // Anaflaksi (hipotansif) ↔ DKA farklı baseline sistolik → değer değişmeli
    expect(sys1).not.toBe(sys0);
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

  test("statik hasta GLB 200 + makul boyut (silinen /3d-demo guard'ı taşındı)", async ({
    page,
  }) => {
    // /3d-demo emekli; AnatomicPatientModel (patient-{female,male,child}*.glb)
    // hâlâ /dialog-3d-demo'da yükleniyor → bütünlük guard'ı burada.
    const responsePromise = page.waitForResponse(
      (r) => /\/3d\/patient-(female|male|child)[^/]*\.glb$/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto("/dialog-3d-demo");
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const contentLength = response.headers()["content-length"];
    if (contentLength) {
      expect(Number(contentLength)).toBeGreaterThan(50_000);
      expect(Number(contentLength)).toBeLessThan(5_000_000);
    }
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
