// ============================================================
// E2E Smoke Testleri — MediSim TR (Faz 11)
// ============================================================
// Amaç: prod hata olduğunda en kısa zamanda yakalamak. Senaryo
// içeriği ve klinik mantık birim testlerde — burada sadece
// "uygulama yükleniyor + temel akış çalışıyor" doğrulanır.
// ============================================================

import { test, expect } from "@playwright/test";

test.describe("Ana akış", () => {
  test("ana sayfa yüklenir, başlık ve marka görünür", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MediSim/i);
    // Header'da marka
    await expect(page.getByText(/MediSim/).first()).toBeVisible();
  });

  test("senaryolar sayfasına navigasyon — kart listesi yüklenir", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Senaryolar/i }).first().click();
    await expect(page).toHaveURL(/\/senaryolar/);
    // En az 1 senaryo kartı bulunmalı (en kötü ihtimal şu an 14)
    const cards = page.getByRole("link", { name: /STEMI|DKA|Bronşiyolit|Anaflaksi/i });
    await expect(cards.first()).toBeVisible();
  });

  test("STEMI senaryosu başlatılabilir — oyna sayfası açılır", async ({ page }) => {
    await page.goto("/senaryolar");
    // İlk STEMI içeren karta tıkla
    const stemiCard = page.getByRole("link").filter({ hasText: /STEMI/i }).first();
    await stemiCard.click();
    await expect(page).toHaveURL(/\/oyna\/kardiyoloji-stemi-001/);
    // Hasta paneli render olmuş olmalı
    await expect(page.getByText(/yaş/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("HomePage 3D Demo Beta bölümü — 3 demo kartı görünür + Tam Paket linki çalışır", async ({ page }) => {
    await page.goto("/");
    // Yeni demo bölümü başlığı
    await expect(page.getByText(/3D Klinik Simülasyon · Beta/i)).toBeVisible();
    // "Tam Paket" rozetli kart
    await expect(page.getByText(/Tam Paket/i)).toBeVisible();
    // 3 demo link'i — dialog-3d-demo (vurgulu), 3d-demo, dialog-demo
    const dialogDemo3D = page.getByRole("link", { name: /3D Hasta \+ AI Diyalog/i });
    await expect(dialogDemo3D).toBeVisible();
    await expect(dialogDemo3D).toHaveAttribute("href", "/dialog-3d-demo");
  });

  test("Footer 'Hakkında & Lisanslar' linki çalışır", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /Hakkında & Lisanslar/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/hakkinda/);
  });

  test("/senaryolar — kart hover '3D Hasta' linki + doğru href", async ({ page }) => {
    await page.goto("/senaryolar");
    await page.waitForLoadState("load");

    // İlk senaryo kartını bul
    const firstCard = page
      .locator('a[href^="/oyna/"]')
      .first();
    await expect(firstCard).toBeVisible();

    // Aynı kart içinde '3D hasta modu' aria-label'lı badge link olmalı
    const allCards = page.locator('div.group:has(a[href^="/oyna/"])');
    const firstCardContainer = allCards.first();
    const dev3dLink = firstCardContainer.getByRole("link", {
      name: /3D hasta modu/i,
    });

    // Hover ile görünür yap
    await firstCardContainer.hover();
    await expect(dev3dLink).toHaveAttribute(
      "href",
      /\/dialog-3d-demo\?scenario=/,
    );
  });

  test("/oyna/:id sayfasında '3D Hasta' butonu görünür", async ({ page }) => {
    // STEMI senaryosunu başlat
    await page.goto("/oyna/kardiyoloji-stemi-001");
    await page.waitForLoadState("load");

    // Mod seçim ekranında 'Eğitim' butonuna tıkla
    const egitimBtn = page.getByRole("button", { name: /Eğitim/i }).first();
    await expect(egitimBtn).toBeVisible({ timeout: 10_000 });
    await egitimBtn.click();
    await page.waitForTimeout(1500);

    // Üst barda '3D Hasta' linki olmalı
    const link3d = page.getByRole("link", { name: /3D Hasta/i });
    await expect(link3d).toBeVisible();
    await expect(link3d).toHaveAttribute(
      "href",
      "/dialog-3d-demo?scenario=kardiyoloji-stemi-001",
    );
  });
});

test.describe("Geçmiş ve editör sayfaları smoke", () => {
  test("geçmiş sayfası yüklenir (boş state olabilir)", async ({ page }) => {
    await page.goto("/gecmis");
    // 404 değil
    await expect(page).toHaveURL(/\/gecmis/);
  });

  test("senaryo editörü yüklenir", async ({ page }) => {
    await page.goto("/senaryo-editor");
    await expect(page).toHaveURL(/\/senaryo-editor/);
  });
});
