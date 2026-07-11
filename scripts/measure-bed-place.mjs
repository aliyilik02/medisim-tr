/* global window */
// ============================================================
// Yatak yerleşimi OBJEKTİF ölçüm harness'ı (göz değil sayı)
// ============================================================
// PatientRoomScene'deki BedMetricsProbe çalışan sahnede hastanın POZLANMIŞ
// (skinned) dünya bbox'unu window.__bedMetrics'e yazar. Bu script her varyant
// için minY zaman serisini örnekler → TAZE YÜK vs OYNATMA farkını + varyant
// geçiş etkileşimini ölçer. mattress üst ≈ 0.179 (BED_TOP). Hedef: hasta sırtı
// (minY) tüm varyant/kliplerde mattress'a ≈ eşit (gömülme/havalanma yok).
//
// Kullanım: node scripts/measure-bed-place.mjs <port>
// ============================================================
import { chromium } from "@playwright/test";

const PORT = process.argv[2] || "5182";
const URL = `http://localhost:${PORT}/faz2-demo`;
const BED_TOP = 0.179; // mattress üst yüzey world Y (referans)

const VARIANTS = ["Kadın", "Erkek", "Çocuk", "Yaşlı"];

function stats(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const p = (q) => s[Math.floor(q * (s.length - 1))];
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { min: s[0], p10: p(0.1), p50: p(0.5), p90: p(0.9), max: s[s.length - 1], mean, n: s.length };
}
const r3 = (x) => (x == null ? "—" : x.toFixed(3));

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.message)));
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
await page.evaluate(() => { window.__measureBed = true; });

const topBtn = (label) => page.locator('[class*="top-3"] button', { hasText: label }).first();
const bottomBtn = (label) => page.locator('[class*="bottom-4"] button', { hasText: label }).first();

async function metric() { return page.evaluate(() => window.__bedMetrics || null); }
async function sample(ms, step = 100) {
  const out = [];
  for (let i = 0; i < Math.floor(ms / step); i++) {
    await page.waitForTimeout(step);
    const m = await metric();
    if (m && Number.isFinite(m.minY)) out.push(m.minY);
  }
  return out;
}

// Bottom bardaki klip buton etiketleri (Konuş hariç)
async function clipLabels() {
  const labels = await page.$$eval('[class*="bottom-4"] button', (bs) => bs.map((x) => x.textContent.trim()));
  return labels.filter((l) => !/Konuş/i.test(l));
}

console.log(`\n=== YATAK YERLEŞİMİ ÖLÇÜMÜ (BED_TOP=${BED_TOP}) ===`);
console.log("gap = minY − BED_TOP  (≈0 doğru · >0 havada · <0 gömülü)\n");

// ── 1) Varyant başına laying_idle: TAZE (ilk 0.6s) vs OTURMUŞ (son 3s) ──
console.log("── laying_idle: taze yük vs oturmuş ──");
const layingTarget = {};
for (const v of VARIANTS) {
  await topBtn(v).click();
  // varyant değişince ilk klip laying_idle olur. Hemen örnekle (taze).
  const fresh = await sample(700, 100);
  const settled = await sample(3000, 100);
  const fs = stats(fresh), ss = stats(settled);
  layingTarget[v] = ss;
  console.log(
    `${v.padEnd(7)} taze minY=${r3(fs?.p50)} (gap ${r3(fs ? fs.p50 - BED_TOP : null)}) | ` +
    `oturmuş minY=${r3(ss?.p50)} (gap ${r3(ss ? ss.p50 - BED_TOP : null)}) | ` +
    `oynama aralığı=${r3(ss ? ss.max - ss.min : null)}`
  );
}

// ── 2) Varyant geçiş etkileşimi: Kadın → Erkek → Kadın ──
console.log("\n── varyant geçiş etkileşimi (state sızıntısı testi) ──");
await topBtn("Kadın").click();
const fA = stats(await sample(2500, 100));
await topBtn("Erkek").click();
await sample(1500, 100);
await topBtn("Kadın").click();
const fB = stats(await sample(2500, 100));
console.log(`Kadın ilk: minY=${r3(fA?.p50)} | Erkek'ten dönünce: minY=${r3(fB?.p50)} | fark=${r3(fA && fB ? fB.p50 - fA.p50 : null)}`);

// ── 3) Bir adult varyantta TÜM klipler (per-klip tutarlılık) ──
console.log("\n── Yaşlı: tüm klipler oturmuş minY (per-klip) ──");
await topBtn("Yaşlı").click();
await page.waitForTimeout(500);
const labels = await clipLabels();
for (const lab of labels) {
  await bottomBtn(lab).click();
  await page.waitForTimeout(500);
  const st = stats(await sample(2500, 100));
  console.log(`  ${lab.padEnd(22)} minY p50=${r3(st?.p50)} gap=${r3(st ? st.p50 - BED_TOP : null)} aralık=${r3(st ? st.max - st.min : null)}`);
}

// ── 4) bedPosY düzeltme önerisi (hedef: oturmuş p50 = BED_TOP) ──
console.log("\n── ÖNERİLEN bedPosY DÜZELTMESİ (oturmuş laying_idle → BED_TOP) ──");
const CUR = { "Kadın": -0.35, "Erkek": -0.36, "Çocuk": -0.146, "Yaşlı": -0.318 };
for (const v of VARIANTS) {
  const ss = layingTarget[v];
  if (!ss) continue;
  const gap = ss.p50 - BED_TOP;
  console.log(`${v.padEnd(7)} mevcut=${r3(CUR[v])} → öneri=${r3(CUR[v] - gap)} (gap düzeltmesi ${r3(-gap)})`);
}

console.log(`\npageerrors: ${errs.length ? JSON.stringify(errs) : "yok"}`);
await b.close();
