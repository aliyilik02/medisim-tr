// ============================================================
// E2E — STEMI TAM OYNANIŞ + MOTION/SKOR REGRESYONU (6 Tem)
// ============================================================
// Ali Bey isteği: "STEMI'yi oyna, her tıklanabiliri dene, bozulma +
// puanlama dahil kontrol et." Üç katmanlı denetim:
//   1. MOTION GUARD — her etkileşimden sonra pozlanmış dünya bbox'ı
//      (window.__bedMetrics) okunur: hasta yataktan KALKAMAZ
//      (maxY eşiği), NaN/patlama olamaz; yönetmen kararı
//      (window.__animDecision) supine-yasaklı klip OLAMAZ.
//   2. KONSOL GUARD — pageerror + console.error sıfır (backend
//      bağlantı redleri hariç — dev'de backend kapalı).
//   3. SKOR GUARD — skor her karardan sonra sayısal/tutarlı; debrief
//      toplamı seans skoruyla eşleşir.
// ============================================================

import { test, expect, type Page } from "@playwright/test";

const STEMI = "kardiyoloji-stemi-001";
// Supine sahnede ASLA oynamaması gerekenler (AnimatedPatientModel.NON_SUPINE_CLIPS aynası)
const NON_SUPINE = ["idle", "pain", "talk_gesture", "talk_shrug"];
// Pozlanmış hasta bbox tavanı (dünya): yatan hasta (dizler kalkık dahil) < 1.15;
// ayakta ≈ 1.9 → kalkma/patlama bunu aşar.
const BED_MAX_Y = 1.15;

type Guards = { errors: string[] };

async function setupGuards(page: Page): Promise<Guards> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/ERR_CONNECTION|Failed to load resource/.test(t)) return; // backend kapalı (dev)
    errors.push(`console: ${t.slice(0, 200)}`);
  });
  await page.addInitScript(() => {
    (window as unknown as { __measureBed?: boolean }).__measureBed = true;
  });
  return { errors };
}

async function assertMotion(page: Page, label: string) {
  const m = await page.evaluate(() => {
    const w = window as unknown as {
      __bedMetrics?: { minY: number; maxY: number };
      __animDecision?: { clip: string; layer: string; reason: string };
    };
    return { bed: w.__bedMetrics ?? null, anim: w.__animDecision ?? null };
  });
  expect(m.bed, `${label}: bedMetrics yok (probe çalışmıyor)`).not.toBeNull();
  const { minY, maxY } = m.bed!;
  expect(Number.isFinite(minY) && Number.isFinite(maxY), `${label}: bbox NaN — rig patladı`).toBe(true);
  expect(maxY, `${label}: hasta yataktan kalktı/patladı (maxY=${maxY.toFixed(2)}) — klip: ${m.anim?.clip} (${m.anim?.reason})`).toBeLessThan(BED_MAX_Y);
  if (m.anim) {
    expect(NON_SUPINE, `${label}: supine-yasaklı klip oynuyor: ${m.anim.clip} (${m.anim.reason})`).not.toContain(m.anim.clip);
  }
}

async function getScore(page: Page): Promise<number> {
  // timeout ŞART: debrief'e geçince testid kaybolur; timeout'suz innerText
  // SONSUZ bekler (6 Tem — 257sn asılı kalıp test timeout'u yedi).
  const t = await page.getByTestId("session-score").innerText({ timeout: 3000 });
  const n = parseInt(t.replace(/[^\-0-9]/g, ""), 10);
  expect(Number.isFinite(n), `skor sayısal değil: "${t}"`).toBe(true);
  return n;
}

/** force:true SCROLL'u da atlar — viewport dışı buton boşa tıklanır.
    Güvenli desen: önce scroll, sonra kısa-timeout force click. */
async function safeClick(loc: import("@playwright/test").Locator) {
  await loc.scrollIntoViewIfNeeded({ timeout: 800 }).catch(() => {});
  // force KULLANMA: force, scroll'u atlayıp viewport-dışı koordinata tıklar —
  // hedefi ıskalar ama "başarılı" döner (turn-loop teşhisi, 6 Tem).
  // Timeout'lar KISA: rAF-aç ortamda her katman nasılsa düşer; asıl iş
  // evaluate fallback'te biter. Sağlıklı ortamda ilk katman anında başarır.
  const ok = await loc.click({ timeout: 1200 }).then(() => true).catch(() => false);
  if (!ok) {
    // toast overlay / actionability engeli → DOM native click (React handler'ı tetikler)
    const h = await loc.elementHandle({ timeout: 600 }).catch(() => null);
    if (h) {
      await h.evaluate((el) => (el as HTMLElement).click()).catch(() => {});
      return;
    }
    // SON ÇARE (rAF açlığı, 6 Tem teşhisi): Playwright locator/elementHandle
    // çözümlemesi sayfa rAF-polling'ine dayanır; software-GL canvas rAF'ı
    // boğunca HEPSİ timeout olur. page.evaluate rAF beklemez → buton
    // metniyle DOM'dan bul + native click.
    const desc = String(loc);
    const tid = /getByTestId\('(.+?)'\)/.exec(desc)?.[1];
    if (tid) {
      await loc.page().evaluate((id) => {
        (document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null)?.click();
      }, tid).catch(() => {});
      return;
    }
    const m = /getByRole\('button', \{ name: (?:\/(.+?)\/i?|'(.+?)') \}\)/.exec(desc);
    const needle = m?.[1] ?? m?.[2];
    if (needle) {
      await loc.page().evaluate((txt) => {
        const re = new RegExp(txt, "i");
        const b = Array.from(document.querySelectorAll("button")).find((el) =>
          re.test(el.textContent ?? ""),
        );
        if (b) (b as HTMLElement).click();
      }, needle).catch(() => {});
    }
  }
}

/** Envanter tabındaki item butonlarına metinle tıkla (görünüyorsa). */
async function clickInventory(page: Page, tab: string, items: string[], guardLabelPrefix: string) {
  const tabBtn = page.getByRole("button", { name: tab, exact: false }).first();
  // Karar/bilgi adımında envanter kapalı olabilir → sessiz atla
  if (!(await tabBtn.isVisible().catch(() => false))) return;
  await safeClick(tabBtn);
  await page.waitForTimeout(300);
  for (const item of items) {
    const btn = page.getByRole("button", { name: new RegExp(item, "i") }).first();
    if ((await btn.count()) === 0) continue;
    if (!(await btn.isVisible().catch(() => false))) continue;
    await safeClick(btn); // toast overlay / viewport-dışı — güvenli desen
    await page.waitForTimeout(600); // toast + jest penceresi
    await assertMotion(page, `${guardLabelPrefix} · ${item}`);
  }
}

/** Aksiyon adımını min_actions karşılayıp ilerlet; karar adımında verilen id'yi seç. */
async function continueIfPossible(page: Page) {
  const cont = page.getByRole("button", { name: /Sonraki Adıma Geç|Devam/ }).first();
  if ((await cont.count()) && (await cont.isVisible().catch(() => false))) {
    await safeClick(cont);
    await page.waitForTimeout(800);
  }
}

test.describe("STEMI tam oynanış — motion + skor + konsol regresyonu", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(420_000);

  test("doğru yol: 11 adım baştan sona, her etkileşimde motion temiz", async ({ page }) => {
    const guards = await setupGuards(page);
    await page.goto(`/hasta/${STEMI}`);
    await page.waitForTimeout(6000); // GLB v2 + sahne
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({ timeout: 15000 });
    await assertMotion(page, "açılış");

    // ── s1: İlk Değerlendirme (min 3 aksiyon) — envanter yağmuru ──
    // Motion bug avı: PO ilaçlar take_pill jesti tetikler; jest süresince
    // ve sonrasında hasta yatakta kalmalı.
    // PO ilaç ÖNCE (take_pill jesti motion avı) — EKG unlock'u s2'ye atlatır, EN SON
    await clickInventory(page, "İlaç", ["Aspirin", "Tikagrelor", "Heparin"], "s1-ilaç");
    for (let i = 0; i < 4; i++) { // jest penceresi (~3sn) örneklemesi
      await page.waitForTimeout(800);
      await assertMotion(page, `s1-jest-örnek-${i}`);
    }
    await clickInventory(page, "Ekipman", ["Hasta Monitörü", "18G IV Kateter", "Pulse Oksimetre", "12 Derivasyonlu EKG"], "s1-ekipman");
    await page.waitForTimeout(1600); // olası unlock geçişi
    const scoreAfterS1 = await getScore(page);
    expect(scoreAfterS1, "s1 sonrası skor pozitif olmalı (doğru aksiyonlar)").toBeGreaterThan(0);
    await continueIfPossible(page);

    // ── kararlar: başlığa göre doğru seçenek ──
    const decisions: Array<[string, string]> = [
      ["s2 EKG yorumu", "decision-opt_anterior_stemi"],
      ["s2b ek derivasyon", "decision-opt_v4r"],
      ["s3b lab review", "decision-opt_tam_degerl"],
      ["s4 reperfüzyon", "decision-opt_pci_hesapla"],
      ["s7b şok", "decision-opt_norepinefrin_dobutamin"],
    ];
    // Adımlar arasında aksiyon adımları da var — genel döngü: 14 tura kadar
    // görünen ilk bilinen-karar butonuna bas, yoksa aksiyon/continue dene.
    for (let turn = 0; turn < 18; turn++) {
      // Debrief ekranı başlığı "Klinik Performans Raporu" (literal "Debrief"
      // metni YOK — 6 Tem: eski koşul hiç kırılmıyor, 18 tur boşa dönüyordu)
      if (
        await page
          .getByText(/Debrief|Klinik Performans Raporu/i)
          .first()
          .isVisible()
          .catch(() => false)
      )
        break;
      let acted = false;
      for (const [label, tid] of decisions) {
        const b = page.getByTestId(tid);
        if ((await b.count()) && (await b.isVisible().catch(() => false)) && (await b.isEnabled().catch(() => false))) {
          await safeClick(b);
          await page.waitForTimeout(600);
          const confNow = page.getByTestId("decision-confirm");
          if (await confNow.count()) await safeClick(confNow); // çoklu karar
          await page.waitForTimeout(2300); // klinik mod otomatik ilerleme 1800ms
          await assertMotion(page, `karar · ${label}`);
          acted = true;
          break;
        }
      }
      if (!acted) {
        // çoklu karar (s7b allow_multiple olabilir) → Onayla varsa bas
        const confirm = page.getByTestId("decision-confirm");
        if (await confirm.count()) {
          await safeClick(confirm);
          await page.waitForTimeout(2600);
          await assertMotion(page, "karar-multi onay");
          acted = true;
        }
      }
      if (!acted) {
        // aksiyon adımı: s3/s5/s6/s7 beklenenleri dene (Tetkik dahil)
        await clickInventory(page, "Tetkik", ["Troponin", "EKO", "Kan Gazı"], `tur${turn}-tetkik`);
        await clickInventory(page, "Ekipman", ["Defibrilatör", "Hasta Monitörü", "Yatak Başı EKO", "Ventilatör"], `tur${turn}-ekipman`);
        await clickInventory(page, "İlaç", ["Metoprolol", "Statin", "Atorvastatin", "Ramipril", "Amiodaron", "Adrenalin"], `tur${turn}-ilaç`);
        await continueIfPossible(page);
        await assertMotion(page, `tur${turn}-sonu`);
      }
      const s = await getScore(page).catch(() => null);
      if (s !== null) expect(Number.isFinite(s)).toBe(true);
    }

    // ── kamera presetleri — her açı motion-temiz render ──
    for (const cam of ["genel", "bas_ucu", "yan", "onden"]) {
      const b = page.getByTestId(`camera-preset-${cam}`);
      if (await b.isVisible().catch(() => false)) {
        await safeClick(b);
        await page.waitForTimeout(700);
        await assertMotion(page, `kamera-${cam}`);
      }
    }

    expect(guards.errors, `konsol/page hataları:\n${guards.errors.join("\n")}`).toEqual([]);
  });

  test("diyalog: konuşma sırasında hasta yatakta kalır (motion bug regresyonu)", async ({ page }) => {
    const guards = await setupGuards(page);
    await page.goto(`/hasta/${STEMI}`);
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(4000);
    await safeClick(page.getByRole("button", { name: /Hasta ile Konuş/ }));
    await page.waitForTimeout(1200);
    const input = page.locator("textarea, input[type=text]").last();
    await input.fill("Ağrınız nereye yayılıyor?");
    await input.press("Enter");
    // mock/gemini yanıt + TTS konuşma penceresi boyunca örnekle
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(900);
      await assertMotion(page, `diyalog-örnek-${i}`);
    }
    expect(guards.errors, guards.errors.join("\n")).toEqual([]);
  });

  test("yanlış karar dallanması: bekle-gör → komplikasyon kolu (s4b) çalışır", async ({ page }) => {
    const guards = await setupGuards(page);
    await page.goto(`/hasta/${STEMI}`);
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(4000);
    // s1'i hızla karşıla
    await clickInventory(page, "Ekipman", ["Hasta Monitörü", "12 Derivasyonlu EKG", "18G IV Kateter"], "dal-s1");
    await continueIfPossible(page);
    // kararlarda s4'e kadar doğru git, s4'te opt_bekle
    const path: string[] = [
      "decision-opt_anterior_stemi",
      "decision-opt_v4r",
      "decision-opt_tam_degerl",
      "decision-opt_bekle",
    ];
    const clicked = new Set<string>();
    for (let turn = 0; turn < 14; turn++) {
      const dbgTitle = await page.locator("h1, h2").last().innerText().catch(() => "?");
      const dbgConf = await page.getByTestId("decision-confirm").count();
      const dbgScore = await page.getByTestId("session-score").innerText().catch(() => "?");
      console.log(`[dal turn ${turn}] başlık="${dbgTitle.slice(0, 40)}" conf=${dbgConf} skor=${dbgScore} clicked=${[...clicked].join(",")}`);
      let acted = false;
      for (const tid of path) {
        if (clicked.has(tid)) continue; // çoklu-karar toggle döngüsünü önle
        const b = page.getByTestId(tid);
        if ((await b.count()) && (await b.isVisible().catch(() => false)) && (await b.isEnabled().catch(() => false))) {
          await safeClick(b);
          clicked.add(tid);
          await page.waitForTimeout(600);
          // çoklu karar ise hemen onayla
          const conf = page.getByTestId("decision-confirm");
          if (await conf.count()) await safeClick(conf);
          await page.waitForTimeout(2300);
          await assertMotion(page, `dal · ${tid}`);
          acted = true;
          break;
        }
      }
      // s4b kurtarma görünür mü?
      const rescue = page.getByTestId("decision-opt_kurtarma_pci");
      if ((await rescue.count()) && (await rescue.isVisible().catch(() => false))) {
        // DALLANMA ÇALIŞTI — komplikasyon kolu geldi
        await expect(page.getByText("Reperfüzyonsuz", { exact: false }).first()).toBeVisible();
        await safeClick(rescue);
        await page.waitForTimeout(2300);
        await assertMotion(page, "dal · kurtarma");
        // s5'e döndük mü (transfer stabilizasyonu)
        await expect(page.getByText("Transfer", { exact: false }).first()).toBeVisible({ timeout: 8000 });
        expect(guards.errors, guards.errors.join("\n")).toEqual([]);
        return;
      }
      if (!acted) {
        // çoklu karar: işaretlendi ama onaylanmadı → Onayla
        const confirm = page.getByTestId("decision-confirm");
        if (await confirm.count()) {
          await safeClick(confirm);
          await page.waitForTimeout(2600);
        } else {
          // aksiyon adımları (s3 lab/tetkik dahil) — geniş envanter süpürmesi
          await clickInventory(page, "Tetkik", ["Troponin", "EKO", "Kan Gazı", "Akciğer"], `dal-tur${turn}-tetkik`);
          await clickInventory(page, "Ekipman", ["Yatak Başı EKO", "Hasta Monitörü", "Defibrilatör"], `dal-tur${turn}-ekipman`);
          await clickInventory(page, "İlaç", ["Metoprolol", "Morfin", "Nitrogliserin"], `dal-tur${turn}-ilaç`);
          await continueIfPossible(page);
        }
      }
    }
    throw new Error("s4b komplikasyon kolu hiç görünmedi — dallanma kırık olabilir");
  });

  test("erken bitir → debrief skoru seans skoruyla tutarlı", async ({ page }) => {
    const guards = await setupGuards(page);
    await page.goto(`/hasta/${STEMI}`);
    await expect(page.getByTestId("patient-room-canvas")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(4000);
    await clickInventory(page, "Ekipman", ["Hasta Monitörü", "12 Derivasyonlu EKG"], "bitir-önce");
    const scoreBefore = await getScore(page);
    page.on("dialog", (d) => d.accept()); // confirm()
    await safeClick(page.getByTestId("finish-early"));
    await page.waitForTimeout(2500);
    // Debrief: skor + kılavuz karşılaştırma tablosu render
    await expect(page.getByText("Kılavuz Karşılaştırması", { exact: false })).toBeVisible({ timeout: 10000 });
    const debriefText = await page.locator("body").innerText();
    expect(debriefText).toContain(String(scoreBefore));
    expect(guards.errors, guards.errors.join("\n")).toEqual([]);
  });
});
