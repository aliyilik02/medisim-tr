// ============================================================
// E2E Smoke — Faz 1 Oynanabilir Döngü (/dialog-3d-demo)
// ============================================================
// Sanal Hasta Planı v1 §4 kabul kriteri: aksiyon gönder →
// vital değişimini gör → debrief açılır.
//
// Strateji: DOM assertion (pixel-snapshot yok — WebGL oscillation).
// Anaflaksi senaryosu: deterioration aktif → SBP gerçek zamanda düşer.
// ============================================================

import { test, expect, type Page } from "@playwright/test";

/** HUD metninden TA (sistolik) değerini çek — "78/44" deseninin ilk parçası */
async function readSystolic(page: Page): Promise<number> {
  const hudText =
    (await page.getByTestId("compact-vitals-hud").textContent()) ?? "";
  const match = hudText.match(/(\d{2,3})\/(\d{2,3})/);
  expect(match, `HUD içinde TA deseni bulunamadı: ${hudText}`).not.toBeNull();
  return parseInt(match![1], 10);
}

async function selectAnaflaksi(page: Page) {
  const value = await page
    .locator("select option")
    .filter({ hasText: /anaflaksi/i })
    .first()
    .getAttribute("value");
  expect(value).toBeTruthy();
  await page.selectOption("select", value!);
  await page.waitForTimeout(1000);
}

test.describe("dialog-3d-demo — oynanabilir döngü", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dialog-3d-demo");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
    await selectAnaflaksi(page);
  });

  test("vaka akışı paneli açılışta görünür — adım başlığı + skor", async ({
    page,
  }) => {
    await expect(page.getByTestId("vaka-panel")).toBeVisible();
    await expect(page.getByTestId("vaka-panel")).toContainText("Klinik Tanı");
    await expect(page.getByTestId("session-score")).toBeVisible();
  });

  test("gerçek zamanlı kötüleşme — SBP tedavisiz düşer", async ({ page }) => {
    const sbp0 = await readSystolic(page);
    // Eğitim modu 8×: ~6 gerçek sn ≈ 48 simüle sn ≈ −3 mmHg
    await page.waitForTimeout(6000);
    const sbp1 = await readSystolic(page);
    expect(sbp1).toBeLessThan(sbp0);
  });

  test("karar adımı — seçim onayla → toast + sonraki adım", async ({
    page,
  }) => {
    const panel = page.getByTestId("vaka-panel");

    // s1_tani çoklu karar: doğru bir seçenek işaretle (label + checkbox)
    await panel
      .locator("label", { hasText: /Tetikleyici/ })
      .locator('input[type="checkbox"]')
      .check();
    await panel.locator('button:has-text("Seçimi Onayla")').click();

    // finishStep 2.2 sn sonra — sonraki adım başlığı gelir
    await expect(panel).toContainText(/Lab siparişleri|İlk Müdahale/, {
      timeout: 8000,
    });
  });

  test("tetkik sipariş — İste → geri sayım modalı", async ({ page }) => {
    const panel = page.getByTestId("vaka-panel");

    // Karar adımını geç → s2b_orders (action step, envanter görünür)
    await panel
      .locator("label", { hasText: /Tetikleyici/ })
      .locator('input[type="checkbox"]')
      .check();
    await panel.locator('button:has-text("Seçimi Onayla")').click();
    await expect(panel).toContainText(/Lab siparişleri/, { timeout: 8000 });

    // Envanter → Tetkik sekmesi → ilk paneli iste
    await panel.locator('button:has-text("Tetkik")').first().click();
    await expect(panel.locator("text=/Triptaz/i").first()).toBeVisible();
    await panel.locator('button:has-text("İste")').first().click();

    // Geri sayım modalı (eğitim modunda 5 sn)
    await expect(page.locator("text=Tetkik İsteniyor")).toBeVisible({
      timeout: 4000,
    });
  });

  test("erken bitirme → debrief ekranı açılır", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.getByTestId("finish-early").click();
    await expect(
      page.locator("text=Temel Öğrenim Noktaları")
    ).toBeVisible({ timeout: 8000 });
  });

  test("diyalog sekmesi — chat korunuyor", async ({ page }) => {
    await page.getByTestId("tab-diyalog").click();
    await expect(page.getByTestId("dialog-input")).toBeVisible();
    await page.getByTestId("tab-vaka").click();
    await expect(page.getByTestId("vaka-panel")).toBeVisible();
  });
});
