// ============================================================
// E2E — OYNAMA EKRANI YERLEŞİMİ: "muayene merkezde" (16 Kas 2026)
// ============================================================
// Sadeleştirme turunun kalıcı güvencesi. Ölçülen eski kusurlar:
//   - hasta kadraj ortasındayken sağ kolu/etiketleri başucu monitörünün ALTINDA
//   - dizüstünde envanterin yalnız 2 satırı görünüyordu (sabit 420 px kutu)
//   - STEMI sahnesinde ilgisiz ventilatör cihazı + düğmesi
// Bu test GÖZ yerine SAYI ile bakar: her ABCDE basamağında nokta ve etiket
// kutuları monitör / muayene çubuğu ile kesişmemeli, sahnenin içinde kalmalı.
// Hareketli (kemik-bağlı) noktaya Playwright tıklaması güvenilmez →
// dispatchEvent("click").
// ============================================================

import { test, expect, type Page } from "@playwright/test";

const STEMI = "kardiyoloji-stemi-001";

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

async function layout(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const q = (id: string) => box(document.querySelector(`[data-testid="${id}"]`));
    return {
      scene: q("patient-room-canvas"),
      monitor: q("bedside-monitor"),
      bar: q("abcde-bar"),
      hotspots: Array.from(document.querySelectorAll('[data-testid^="exam-hotspot-"]')).map((el) => ({
        id: (el.getAttribute("data-testid") ?? "").replace("exam-hotspot-", ""),
        dot: box(el.querySelector(".exam-hotspot-dot")),
        label: box(el.querySelector(".exam-hotspot-label")),
      })),
    };
  });
}

test.describe("Oynama ekranı yerleşimi — muayene merkezde", () => {
  test.setTimeout(120_000);

  test("STEMI: nokta ve etiketler hiçbir katmanın altında kalmaz", async ({ page }) => {
    await page.goto(`/hasta/${STEMI}`);
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("abcde-bar")).toBeVisible();
    // Kemikler bulunana dek noktalar gizli — ilk nokta ekrana oturana kadar bekle.
    await expect
      .poll(async () => (await layout(page)).hotspots.filter((h) => (h.dot?.w ?? 0) > 0).length, {
        timeout: 30000,
      })
      .toBeGreaterThan(0);

    const problems: string[] = [];
    let seen = 0;
    for (const cat of ["A", "B", "C", "D", "E"]) {
      await page.getByTestId(`abcde-${cat}`).dispatchEvent("click");
      await page.waitForTimeout(700);
      const l = await layout(page);
      expect(l.scene && l.monitor && l.bar, "sahne/monitör/çubuk ölçülemedi").toBeTruthy();
      for (const h of l.hotspots) {
        for (const [kind, r] of [["nokta", h.dot], ["etiket", h.label]] as const) {
          if (!r || r.w === 0) continue;
          seen += 1;
          if (overlaps(r, l.monitor!)) problems.push(`${cat}:${h.id} ${kind} monitörün altında`);
          if (overlaps(r, l.bar!)) problems.push(`${cat}:${h.id} ${kind} muayene çubuğunun altında`);
          if (r.x < l.scene!.x || r.x + r.w > l.scene!.x + l.scene!.w)
            problems.push(`${cat}:${h.id} ${kind} sahnenin dışında`);
        }
      }
    }
    expect(seen, "hiç nokta ölçülmedi — test boşa geçmesin").toBeGreaterThan(10);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("STEMI: ventilatör gizli, ipucu ilk dokunuşla kaybolur, bulgu kartı açılır", async ({ page }) => {
    await page.goto(`/hasta/${STEMI}`);
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({ timeout: 20000 });
    // Muayene katmanlı vakada ventilatör düğmesi yok (dikkat dağıtıcı, dondurulmuş özellik)
    await expect(page.getByTestId("ventilator-open")).toHaveCount(0);
    await expect(page.getByTestId("exam-hint")).toBeVisible();

    const first = page.locator('[data-testid^="exam-hotspot-"]').first();
    await expect(first).toBeAttached({ timeout: 30000 });
    await first.dispatchEvent("click");
    await expect(page.getByTestId("exam-finding-card")).toBeVisible();
    await expect(page.getByTestId("exam-hint")).toHaveCount(0);
  });

  test("STEMI: envanter yan panele sığar (en az 4 tam satır) ve çubuk sahneden taşmaz", async ({ page }) => {
    await page.goto(`/hasta/${STEMI}`);
    await expect(page.getByTestId("vaka-panel")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("abcde-bar")).toBeVisible();
    const m = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="vaka-panel"]')!.getBoundingClientRect();
      const rows = Array.from(document.querySelectorAll('[data-testid="vaka-panel"] .neon-row')).filter((el) => {
        const b = el.getBoundingClientRect();
        return b.top >= panel.top && b.bottom <= Math.min(panel.bottom, window.innerHeight);
      }).length;
      const scene = document.querySelector('[data-testid="patient-room-canvas"]')!.getBoundingClientRect();
      const bar = document.querySelector('[data-testid="abcde-bar"]')!.getBoundingClientRect();
      return { rows, barLeft: bar.left, barRight: bar.right, sceneLeft: scene.left, sceneRight: scene.right };
    });
    expect(m.rows, "görünür envanter satırı").toBeGreaterThanOrEqual(4);
    expect(m.barLeft).toBeGreaterThanOrEqual(m.sceneLeft);
    expect(m.barRight).toBeLessThanOrEqual(m.sceneRight);
  });
});
