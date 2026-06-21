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
    // STEMI'yi ayırt edici başlıkla hedefle — başka senaryo başlığı da "STEMI"
    // içeriyor (kardiyojenik-sok "STEMI Sonrası Şok"); STEMI artık İncelendi grubunda.
    await page.getByRole("button", { name: /Akut Göğüs Ağrısı/i }).first().click();
    // Sağ panel: otomatik kontroller başlığı (exact — "otomatik kontroller"
    // ifadesi kilit notunda da geçiyor) + kalıcılaştırma snippet'i görünür
    await expect(
      page.getByText("Otomatik Kontroller", { exact: true })
    ).toBeVisible();
    await expect(page.getByText(/clinical_review:/i)).toBeVisible();
  });

  test("review çalışması yerel kaydedilir (localStorage)", async ({ page }) => {
    await page.goto("/klinik-review");
    await page.waitForLoadState("load");
    // STEMI'yi ayırt edici başlıkla hedefle — başka senaryo başlığı da "STEMI"
    // içeriyor (kardiyojenik-sok "STEMI Sonrası Şok"); STEMI artık İncelendi grubunda.
    await page.getByRole("button", { name: /Akut Göğüs Ağrısı/i }).first().click();
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
    // Klinik durum rozeti (testid ile kesin hedef) — varsayılan "Taslak"
    const badge = page.getByTestId("clinical-status-badge").first();
    await expect(badge).toBeVisible();
    // İlk kart STEMI — 21 Haz olgunlaştırma sonrası REVIEWED → "İncelendi" rozeti.
    await expect(badge).toContainText(/İncelendi/i);
  });

  test("ACTIVE durum butonu başlangıçta KİLİTLİ (elle maddeler işaretsiz)", async ({
    page,
  }) => {
    await page.goto("/klinik-review");
    await page.waitForLoadState("load");
    // STEMI'yi ayırt edici başlıkla hedefle — başka senaryo başlığı da "STEMI"
    // içeriyor (kardiyojenik-sok "STEMI Sonrası Şok"); STEMI artık İncelendi grubunda.
    await page.getByRole("button", { name: /Akut Göğüs Ağrısı/i }).first().click();
    // Klinik disiplin garantisi: otomatik ACTIVE'e geçiş engellenir
    await expect(page.getByTestId("status-ACTIVE")).toBeDisabled();
    // DRAFT seçilebilir
    await expect(page.getByTestId("status-DRAFT")).toBeEnabled();
  });
});
