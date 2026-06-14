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

  test("kamera preset toggle — açı değiştirir (varsayılan Önden)", async ({
    page,
  }) => {
    await page.goto(`/hasta/${ANAFLAKSI}`);
    await page.waitForLoadState("load");
    await page.waitForTimeout(2500);
    const onden = page.getByTestId("camera-preset-onden");
    const genel = page.getByTestId("camera-preset-genel");
    await expect(onden).toBeVisible();
    // Varsayılan açı Önden (kullanıcı seçimi, commit 978f0c8)
    await expect(onden).toHaveAttribute("aria-pressed", "true");
    // Genel'e geçiş → oda/sedye/IV görünür açı
    await genel.click();
    await expect(genel).toHaveAttribute("aria-pressed", "true");
    await expect(onden).toHaveAttribute("aria-pressed", "false");
  });

  test("paramlı seansta senaryo dropdown'u gizli", async ({ page }) => {
    await page.goto(`/hasta/${ANAFLAKSI}`);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    // /hasta/:id sabit senaryo → dropdown yok (sadece /senaryo-yatak dev modunda)
    await expect(page.locator("header select")).toHaveCount(0);
  });

  test("animasyonlu hasta GLB 200 + makul boyut (truncate/master guard)", async ({
    page,
  }) => {
    // /3d-demo emekli oldu; model-bütünlük guard'ı canonical route'a taşındı.
    const responsePromise = page.waitForResponse(
      (r) => r.url().endsWith("/3d/patient-animated.glb") && r.status() === 200,
      { timeout: 15_000 }
    );
    await page.goto(`/hasta/${ANAFLAKSI}`);
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const contentLength = response.headers()["content-length"];
    if (contentLength) {
      // ~890 KB Mixamo+meshopt. Alt sınır: 0-byte/truncate; üst: ham master.
      expect(Number(contentLength)).toBeGreaterThan(100_000);
      expect(Number(contentLength)).toBeLessThan(5_000_000);
    }
  });

  test("ventilatör — buton paneli açar, preset değişir, kapanır", async ({
    page,
  }) => {
    await page.goto(`/hasta/${ANAFLAKSI}`);
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    // Panel başta kapalı
    await expect(page.getByTestId("ventilator-panel")).toHaveCount(0);
    // DOM affordance (3D cihaz tıklamasının eşdeğeri) paneli açar
    await page.getByTestId("ventilator-open").click();
    const panel = page.getByTestId("ventilator-panel");
    await expect(panel).toBeVisible();
    // Başlangıç preset = Normal Akciğer → Vt 500 mL panelde görünür
    await expect(panel.getByText("500", { exact: true }).first()).toBeVisible();
    // Preset değişimi GERÇEKTEN değeri değiştirir: ARDS → Vt 380 mL
    await panel.getByRole("button", { name: /ARDS/i }).first().click();
    await expect(panel.getByText("380", { exact: true }).first()).toBeVisible();
    // Kapat
    await page.getByTestId("ventilator-close").click();
    await expect(page.getByTestId("ventilator-panel")).toHaveCount(0);
  });

  test("debrief — FHIR Bundle (.json) indirilebilir", async ({ page }) => {
    await page.goto(`/hasta/${ANAFLAKSI}`);
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
    // finishEarly confirm() → otomatik onayla
    page.on("dialog", (d) => d.accept());
    await page.getByTestId("finish-early").click();
    // Debrief açılır → FHIR indir butonu
    const fhirBtn = page.getByTestId("download-fhir");
    await expect(fhirBtn).toBeVisible({ timeout: 10_000 });
    const downloadPromise = page.waitForEvent("download");
    await fhirBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/medisim-fhir-.*\.json$/);
  });

  test("ventilatör pediatrik senaryoda GİZLİ (erişkin preset güvensiz)", async ({
    page,
  }) => {
    // pedi-bronsiyolit-001: ~8 kg infant. Erişkin Vt presetleri (380-500 mL)
    // klinik olarak tehlikeli → cihaz/buton gizlenir (ventEligible weight<40).
    await page.goto("/hasta/pedi-bronsiyolit-001");
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("ventilator-open")).toHaveCount(0);
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
