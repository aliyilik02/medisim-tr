// ============================================================
// E2E — Görselli vaka akışı /vaka/:id (kalıcı iz katmanı, D kararı)
// ============================================================
// Doğrulanan zincir (13 Tem 2026):
//   1. Sahne açılır — durum karesi baseline, aksiyon yok.
//   2. Ekipman aksiyonu → P1 aksiyon ara-sahnesi (kare + banner) düşer.
//   3. Ara-sahne ~4sn sonra kapanır, durum karesine dönülür.
//   4. KALICI İZ: takılan ekipman çipi ara-sahne bittikten sonra da KALIR
//      (maske/IV/EKG) — geçici-sahne modelinin bittiğinin kanıtı.
//   5. İlaç verme (anlık işlem) ara-sahne tetikler ama YENİ çip üretmez.
// 3D canvas YOK — rAF açlığı riski düşük; yine de safeClick deseni
// (stemi-playthrough dersleri) kullanılır.

import { test, expect, type Page } from "@playwright/test";

const STEMI = "kardiyoloji-stemi-001";
const ACTION_MS = 4000; // CaseStage ara-sahne süresi

async function safeClick(loc: import("@playwright/test").Locator) {
  await loc.scrollIntoViewIfNeeded({ timeout: 800 }).catch(() => {});
  const ok = await loc.click({ timeout: 1500 }).then(() => true).catch(() => false);
  if (!ok) {
    const h = await loc.elementHandle({ timeout: 600 }).catch(() => null);
    if (h) await h.evaluate((el) => (el as HTMLElement).click()).catch(() => {});
  }
}

/** Envanter tabına geç + item'a tıkla (isim regex). */
async function useInventory(page: Page, tab: string, item: string) {
  const tabBtn = page.getByRole("button", { name: tab, exact: false }).first();
  if (await tabBtn.isVisible().catch(() => false)) await safeClick(tabBtn);
  await page.waitForTimeout(250);
  const btn = page.getByRole("button", { name: new RegExp(item, "i") }).first();
  await expect(btn, `envanterde bulunamadı: ${item}`).toBeVisible({ timeout: 5000 });
  await safeClick(btn);
}

test.describe("görselli vaka — durum + ara-sahne + kalıcı iz", () => {
  test("STEMI: aksiyon karesi düşer, çipler ara-sahne sonrası KALIR", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

    await page.goto(`/vaka/${STEMI}?mod=egitim`);

    // 1. Sahne + baseline durum karesi
    const stage = page.getByTestId("case-stage");
    await expect(stage).toBeVisible({ timeout: 15000 });
    await expect(stage).toHaveAttribute("data-stage", "baseline");
    await expect(stage).toHaveAttribute("data-action", "");
    await expect(page.getByTestId("trace-chips")).toHaveCount(0); // temiz hasta

    // 2. EKG tak → ara-sahne (kare + banner) + kalıcı EKG çipi
    await useInventory(page, "Ekipman", "12 Derivasyonlu EKG");
    await expect(stage).toHaveAttribute("data-action", "ekg-takma", { timeout: 3000 });
    await expect(page.getByTestId("action-banner")).toBeVisible();
    await expect(page.locator('img[src*="aksiyon-ekg-takma"]')).toBeVisible();
    await expect(page.locator('[data-trace="ekg"]')).toBeVisible();

    // 3. IV + maske tak (son-kazanır ara-sahne) → çipler birikir
    await useInventory(page, "Ekipman", "18G IV Kateter");
    await expect(page.locator('[data-trace="iv"]')).toBeVisible({ timeout: 3000 });
    await useInventory(page, "Ekipman", "Rezervuarlı Oksijen Maskesi");
    await expect(stage).toHaveAttribute("data-action", "oksijen-maske", { timeout: 3000 });
    await expect(page.locator('[data-trace="maske"]')).toBeVisible();

    // 4. Ara-sahne kapanır, durum karesine dönülür — ÇİPLER KALIR (kalıcı iz)
    await page.waitForTimeout(ACTION_MS + 1200);
    await expect(stage).toHaveAttribute("data-action", "");
    for (const t of ["ekg", "iv", "maske"]) {
      await expect(page.locator(`[data-trace="${t}"]`), `çip kayboldu: ${t}`).toBeVisible();
    }

    // 5. Aspirin PO — ara-sahne var, YENİ çip yok (anlık işlem iz bırakmaz)
    await useInventory(page, "İlaç", "Aspirin");
    await expect(stage).toHaveAttribute("data-action", "ilac-po", { timeout: 3000 });
    await expect(page.locator('img[src*="aksiyon-ilac-po"]')).toBeVisible();
    await expect(page.getByTestId("trace-chips").locator("[data-trace]")).toHaveCount(3);

    expect(errors, `sayfa hataları:\n${errors.join("\n")}`).toEqual([]);
  });
});
