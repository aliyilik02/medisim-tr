// ============================================================
// E2E Smoke — /hakkinda route
// ============================================================
// AboutPage CC BY/BY-SA görünür atıf gereksinimini karşılıyor; bu
// sayfanın mount + 8+ atıf öğesi + disclaimer + footer linkleri
// kontrol edilir.
//
// 24 May 2026: R3F + Three.js kaldırıldı (Unity geçişi). 3D atıfları
// (chuma6oy, MaceLogice, Z-Anatomy, Three.js) çıkarıldı; testler de
// güncellendi (12 → 8+ count, CC BY 4.0 → CC BY generic).
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("/hakkinda — Hakkında sayfası", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/hakkinda");
    await page.waitForLoadState("load");
  });

  test("sayfa mount edilir, başlık + disclaimer görünür", async ({ page }) => {
    await expect(page.getByText(/Hakkında/i).first()).toBeVisible();
    // Disclaimer ribbon
    await expect(page.getByTestId("about-disclaimer")).toBeVisible();
    await expect(page.getByText(/Eğitim amaçlıdır/i).first()).toBeVisible();
    await expect(page.getByText(/Klinik karar destek aracı değildir/i)).toBeVisible();
  });

  test("8+ atıf öğesi listede görünür (Ses + Yazılım + Font)", async ({ page }) => {
    const items = page.getByTestId("attribution-item");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test("oskültasyon ses atıfları: Heilman MD + Wikimedia", async ({ page }) => {
    await expect(page.getByText(/Wheeze2O/i)).toBeVisible();
    await expect(page.getByText(/Crackles in pneumonia/i)).toBeVisible();
    await expect(page.getByText(/Heilman/i).first()).toBeVisible();
  });

  test("klinik standartlar grid'i — PALS + Calgary + TCCC + TA2", async ({ page }) => {
    await expect(page.getByText(/PALS 2015/i)).toBeVisible();
    await expect(page.getByText(/Calgary-Cambridge/i).first()).toBeVisible();
    await expect(page.getByText(/TCCC/i).first()).toBeVisible();
    await expect(page.getByText(/TA2-2019/i)).toBeVisible();
  });

  test("KVKK bölümü + ÜYZ Rehberi linki", async ({ page }) => {
    await expect(page.getByText(/KVKK 6698/i).first()).toBeVisible();
    const kvkkLink = page.getByRole("link", { name: /ÜYZ Rehberi/i });
    await expect(kvkkLink).toBeVisible();
    await expect(kvkkLink).toHaveAttribute("href", /kvkk\.gov\.tr/);
  });

  test("Ana Sayfa linkleri header + footer", async ({ page }) => {
    const headerLink = page.getByRole("link", { name: /Ana Sayfa/i }).first();
    await expect(headerLink).toBeVisible();
    await expect(headerLink).toHaveAttribute("href", "/");
  });

  test("Lisans linkleri target=_blank ve rel=noopener", async ({ page }) => {
    // 24 May 2026: 3D atıflarındaki CC BY 4.0 linkleri kaldırıldı; ses
    // atıflarındaki CC BY-SA 3.0 / CC BY 3.0 üzerinden generic kontrol.
    const ccLink = page
      .getByRole("link", { name: /CC BY/i })
      .first();
    await expect(ccLink).toBeVisible();
    await expect(ccLink).toHaveAttribute("target", "_blank");
    await expect(ccLink).toHaveAttribute("rel", /noopener|noreferrer/);
  });
});
