/* global window */
// ============================================================
// Sahne görüntü + ölçüm aracı (göz + SAYI birlikte)
// ============================================================
// Oynama ekranını gerçek GPU'lu Chromium'da açar, her kamera açısının ekran
// görüntüsünü kaydeder ve sahnedeki ölçüm probunu okur:
//   __bedMetrics → hastanın pozlanmış kutusu (hasta birimi + metre)
//   __boneProbe  → baş/kalça/el/ayak kemiklerinin dünya konumu (metre)
// Şilte üstü hasta biriminde y=0.179; hasta sırtı (minY) buna ≈ eşit olmalı.
//
// Kullanım:
//   node scripts/scene-shot.mjs <port> [çıktı klasörü] [yol]
//   SHOT_W=1366 SHOT_H=768 (varsayılan dizüstü ölçüsü)
// Sunucu: `npm run dev` (.env.local içinde VITE_AUTH_BYPASS=1 → giriş atlanır).
// ============================================================
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const PORT = process.argv[2] || "5173";
const OUT = process.argv[3] || "test-results/scene-shots";
const ROUTE = process.argv[4] || "/hasta/kardiyoloji-stemi-001";
const W = Number(process.env.SHOT_W || 1366);
const H = Number(process.env.SHOT_H || 768);
const PRESETS = (process.env.SHOT_PRESETS || "onden,tum_beden,genel,bas_ucu,yan").split(",");
const BED_TOP = 0.179;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.message)));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});

await page.goto(`http://localhost:${PORT}${ROUTE}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="patient-room-canvas"]', { timeout: 90000 });
await page.evaluate(() => {
  window.__measureBed = true;
});
await page.waitForTimeout(Number(process.env.SHOT_WAIT || 7000));

for (const p of PRESETS) {
  // Hareketli sahnede Playwright tıklaması güvenilmez → dispatchEvent.
  await page.locator(`[data-testid="camera-preset-${p}"]`).dispatchEvent("click");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${p}.png` });
  console.log(`kaydedildi: ${OUT}/${p}.png`);
}

const probe = await page.evaluate(() => ({
  bed: window.__bedMetrics ?? null,
  bones: window.__boneProbe ?? null,
}));
if (probe.bed) {
  const gap = probe.bed.minY - BED_TOP;
  console.log(`\nsırt − şilte (hasta birimi): ${gap.toFixed(3)}  (≈0 doğru · >0 havada · <0 gömülü)`);
}
console.log(JSON.stringify(probe, null, 1));
console.log(errs.length ? `\nHATALAR (${errs.length}):\n` + errs.slice(0, 12).join("\n") : "\nkonsol hatası yok");
await browser.close();
