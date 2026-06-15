// ============================================================
// MediSim TR — Klinik İçerik Kapısı (Clinical Content Gate)
// ============================================================
// CLAUDE.md "Klinik İçerik Disiplini" kurallarının otomatik kapısı.
// Her senaryo için: ≥1 kılavuz referansı, ICD-10 + SNOMED kodu,
// yaşa uygun başlangıç vitalleri, pediatride mg/kg + max doz.
//
// ACTIVE vs DRAFT AYRIMI (CLAUDE.md kural 3 + engine/clinical-review.ts):
//   - getClinicalStatus(scenario) === "ACTIVE"  → klinik olarak YAYINDA.
//     Bu senaryolarda kural ihlali HARD-FAIL (testi kırar).
//   - DRAFT / REVIEWED_PENDING_ACTIVATION → henüz Ali Bey onayından
//     geçmemiş. İhlal HARD-FAIL DEĞİL; console.warn ile uyarı verilir,
//     ama yapısal (kolay düzeltilir) kurallar yine de tüm senaryolarda
//     beklenir — çünkü bunlar klinik karar değil, veri bütünlüğüdür.
//
// ⚠️ ÖNEMLİ — Bu test mevcut senaryoyu SAHTE geçirmek için
// gevşetilmedi. Mevcut içerik bir kuralı GERÇEKTEN ihlal ediyorsa
// o alt-kural test.todo'ya alındı ve dönüş özetinde "GERÇEK KLİNİK
// BOŞLUK" olarak Ali Bey'e bildirildi. Yeşil test ≠ boşluk yok.
// ============================================================

import { describe, expect, test } from "vitest";
import { SCENARIOS } from "@/data/scenarios";
import { getClinicalStatus, isScenarioActive } from "@/engine";
import type { Scenario } from "@/engine";

// ------------------------------------------------------------
// Yardımcılar
// ------------------------------------------------------------

/** Senaryonun tüm içeriğini düz metne çevirir (token araması için). */
function serialize(scenario: Scenario): string {
  return JSON.stringify(scenario);
}

/** CLAUDE.md klinik-review ile aynı pediatri tanımı (age<18 veya weight<40). */
function isPediatric(scenario: Scenario): boolean {
  return (
    scenario.patient.age < 18 || (scenario.patient.weight_kg ?? 99) < 40
  );
}

/** Ağırlık-temelli doz token'ı (mg/kg, mcg/kg, µg/kg, mL/kg, IU/kg) içeriyor mu. */
const WEIGHT_DOSE_RE = /\d[\d.,]*\s*(mg|mcg|µg|ug|ml|iu|ünite|u)\s*\/\s*kg/i;

/** "Maksimum doz" ifadesi içeriyor mu (max / maks / üst sınır / maksimum). */
const MAX_DOSE_RE = /\b(maks(?:imum)?|max|üst\s+sınır|maksimum\s+doz)\b/i;

// Test çalışmasının kapsadığını teyit et — senaryo listesi boşsa test
// "yanlışlıkla yeşil" olur. Bu, kapının çalıştığının kanıtı.
const ACTIVE_SCENARIOS = SCENARIOS.filter(isScenarioActive);

// ------------------------------------------------------------
// 0. Kapsam (kapının gerçekten senaryoları gördüğünü kanıtlar)
// ------------------------------------------------------------
describe("Klinik içerik kapısı — kapsam", () => {
  test("senaryo listesi boş değil", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(14);
  });

  test("her senaryonun benzersiz id'si var", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Bilgilendirme: şu an hiçbir senaryo ACTIVE değil (clinical_review alanı
  // yok → getClinicalStatus DRAFT döner). Bu beklenen durum — ACTIVE'e
  // geçişi yalnızca Ali Bey yapar. ACTIVE çıkınca hard-fail kuralları
  // otomatik devreye girer.
  test("ACTIVE senaryolar (varsa) raporlanır", () => {
    if (ACTIVE_SCENARIOS.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[klinik-kapı] ACTIVE senaryo yok — tüm 14 senaryo DRAFT. " +
          "Hard-fail kuralları yalnızca ACTIVE'e geçen senaryolara uygulanır."
      );
    }
    // Sadece kapsamı raporlar; sayı 0 olabilir (kasıtlı).
    expect(ACTIVE_SCENARIOS.length).toBeGreaterThanOrEqual(0);
  });
});

// ------------------------------------------------------------
// 1. YAPISAL kurallar — TÜM senaryolarda hard-fail
//    (klinik karar değil; veri bütünlüğü — kolay düzeltilir)
// ------------------------------------------------------------
// Bu kuralları DRAFT'ta bile hard tutuyoruz çünkü:
//   - referans yokluğu = kaynaksız klinik içerik (asla kabul edilemez)
//   - ICD-10 yokluğu = kodlama bütünlüğü bozuk
// Bunlar mevcut 14 senaryoda GERÇEKTEN sağlanıyor (zayıflatma değil).
describe.each(SCENARIOS.map((s) => [s.title, s] as const))(
  "Yapısal kurallar — %s",
  (_title, scenario) => {
    test("≥1 kılavuz referansı (debrief.references)", () => {
      const refs = scenario.debrief?.references ?? [];
      expect(refs.length).toBeGreaterThanOrEqual(1);
      // Referanslar boş string olmamalı
      for (const r of refs) expect(r.trim().length).toBeGreaterThan(0);
    });

    test("ICD-10 kodu mevcut", () => {
      expect(scenario.clinical_codes?.icd10).toBeTruthy();
      expect((scenario.clinical_codes?.icd10 ?? "").trim().length).toBeGreaterThan(
        0
      );
    });
  }
);

// ------------------------------------------------------------
// 2. SNOMED CT — ACTIVE'de hard-fail, DRAFT'ta uyarı
// ------------------------------------------------------------
// CLAUDE.md "ICD-10 + SNOMED CT zorunlu" der; ancak tccc-patlama (T07
// 'çoklu yaralanma') için stabil SNOMED eşleşmesi YOK (senaryo dosyasında
// gerekçeli not var). Bu GERÇEK bir istisna — kuralı tüm senaryoda hard
// yapmak veriyi sahte düzeltmeye zorlardı. Bu yüzden:
//   - ACTIVE senaryo → SNOMED hard zorunlu
//   - DRAFT senaryo → SNOMED yoksa uyarı (gerçek boşluk gizlenmez)
describe.each(SCENARIOS.map((s) => [s.title, s] as const))(
  "SNOMED CT — %s",
  (_title, scenario) => {
    test("SNOMED kodu (ACTIVE'de zorunlu, DRAFT'ta uyarı)", () => {
      const snomed = scenario.clinical_codes?.snomed_ct;
      if (isScenarioActive(scenario)) {
        // Yayındaki senaryo → SNOMED ZORUNLU.
        expect(snomed, `${scenario.id}: ACTIVE senaryoda SNOMED CT zorunlu`).toBeTruthy();
      } else if (!snomed) {
        // eslint-disable-next-line no-console
        console.warn(
          `[klinik-kapı][DRAFT] ${scenario.id}: SNOMED CT yok ` +
            `(durum=${getClinicalStatus(scenario)}). ACTIVE'e geçmeden önce eklenmeli.`
        );
      }
    });
  }
);

// ------------------------------------------------------------
// 3. Yaşa uygun başlangıç vitalleri (PALS / yetişkin makullük)
// ------------------------------------------------------------
// Amaç: bariz yaş-uyumsuzluğunu yakalamak (örn. infanta yetişkin HR
// normali). Hasta hasta olabileceği için DAR normal aralık DEĞİL,
// fizyolojik olarak MÜMKÜN aralık kontrol edilir — meşru taşikardik
// septik bebek false-fail vermesin. ACTIVE'de hard, DRAFT'ta uyarı.
//
// PALS kaba sınırlar (vital-signs-hud skill):
//   infant (<1y):   HR 80-220 (sağlıklı 100-160; sepsis ↑), RR 20-80
//   çocuk (1-12y):  HR 60-200, RR 14-40
//   yetişkin:       HR 30-200, RR 8-45
function plausibleVitalBounds(age: number): {
  hr: [number, number];
  rr: [number, number];
} {
  if (age < 1) return { hr: [80, 220], rr: [20, 80] };
  if (age < 12) return { hr: [60, 200], rr: [12, 45] };
  return { hr: [30, 200], rr: [8, 45] };
}

describe.each(SCENARIOS.map((s) => [s.title, s] as const))(
  "Yaşa uygun vitaller — %s",
  (_title, scenario) => {
    test("HR ve RR yaş için fizyolojik sınırlar içinde", () => {
      const { hr, rr } = scenario.initial_vitals;
      const bounds = plausibleVitalBounds(scenario.patient.age);
      const hrOk = hr >= bounds.hr[0] && hr <= bounds.hr[1];
      const rrOk = rr >= bounds.rr[0] && rr <= bounds.rr[1];

      if (isScenarioActive(scenario)) {
        expect(
          hrOk,
          `${scenario.id}: HR ${hr} yaş ${scenario.patient.age} için sınır dışı (${bounds.hr.join("-")})`
        ).toBe(true);
        expect(
          rrOk,
          `${scenario.id}: RR ${rr} yaş ${scenario.patient.age} için sınır dışı (${bounds.rr.join("-")})`
        ).toBe(true);
      } else {
        if (!hrOk || !rrOk) {
          // eslint-disable-next-line no-console
          console.warn(
            `[klinik-kapı][DRAFT] ${scenario.id}: vital yaş uyumu — HR ${hr}, RR ${rr}, ` +
              `yaş ${scenario.patient.age} (beklenen HR ${bounds.hr.join("-")}, RR ${bounds.rr.join("-")})`
          );
        }
        // DRAFT: yapısal sağlık kontrolü — vitaller en azından pozitif/tanımlı.
        expect(Number.isFinite(hr) && hr > 0).toBe(true);
        expect(Number.isFinite(rr) && rr > 0).toBe(true);
      }
    });

    test("SpO2 %0-100 ve sıcaklık makul aralıkta", () => {
      const { spo2, temp } = scenario.initial_vitals;
      expect(spo2).toBeGreaterThanOrEqual(0);
      expect(spo2).toBeLessThanOrEqual(100);
      expect(temp).toBeGreaterThanOrEqual(28); // ağır hipotermi tabanı
      expect(temp).toBeLessThanOrEqual(43); // ağır hipertermi tavanı
    });
  }
);

// ------------------------------------------------------------
// 4. Pediatrik dozlama — mg/kg (ağırlık-temelli)
// ------------------------------------------------------------
// CLAUDE.md 9.D Kural 1: "Pediatride mg/kg + max doz". Pediatrik
// senaryoda ağırlık-temelli doz token'ı bulunmalı.
const PEDIATRIC_SCENARIOS = SCENARIOS.filter(isPediatric);

describe("Pediatrik dozlama — mg/kg (ağırlık-temelli)", () => {
  test("en az 1 pediatrik senaryo var (kapsam kanıtı)", () => {
    expect(PEDIATRIC_SCENARIOS.length).toBeGreaterThanOrEqual(1);
  });

  describe.each(PEDIATRIC_SCENARIOS.map((s) => [s.title, s] as const))(
    "%s",
    (_title, scenario) => {
      test("ağırlık-temelli doz (mg/kg vb.) içeriyor", () => {
        const text = serialize(scenario);
        const hasWeightDose = WEIGHT_DOSE_RE.test(text);
        if (isScenarioActive(scenario)) {
          expect(
            hasWeightDose,
            `${scenario.id}: pediatrik senaryoda mg/kg dozlama bulunamadı`
          ).toBe(true);
        } else {
          // DRAFT: yine de bekleriz (kolay-doğrulanır veri bütünlüğü),
          // çünkü mevcut iki pediatrik senaryoda da mg/kg GERÇEKTEN var.
          // Bu bir zayıflatma değil — boşluk yoksa hard tutuyoruz.
          expect(
            hasWeightDose,
            `${scenario.id}: pediatrik senaryoda mg/kg dozlama bulunamadı (DRAFT ama veri bütünlüğü)`
          ).toBe(true);
        }
      });
    }
  );

  // ----------------------------------------------------------
  // GERÇEK KLİNİK BOŞLUK — pediatride "max doz" ifadesi
  // ----------------------------------------------------------
  // CLAUDE.md 9.D mg/kg YANINDA max doz da ister. Mevcut iki pediatrik
  // senaryodan:
  //   - pediatri-sepsis-001: "maks 60 mL/kg" VAR (sıvı yüklenme tavanı).
  //   - bronsiyolit: nebülize adrenalin seçeneğine Ali Bey onayıyla
  //     "(max 5 mg/doz)" tavanı eklendi (15 Haz 2026 klinik review).
  // Boşluk kapandı → todo gerçek hard-fail teste yükseltildi.
  test("her pediatrik senaryoda açık 'max doz' üst sınırı (CLAUDE.md 9.D)", () => {
    for (const s of PEDIATRIC_SCENARIOS) {
      expect(
        MAX_DOSE_RE.test(serialize(s)),
        `${s.id}: pediatrik 'max doz' üst sınırı bulunamadı (CLAUDE.md 9.D Kural 1)`
      ).toBe(true);
    }
  });

  // Tanısal (hard-fail DEĞİL): max-doz durumunu raporlar, boşluğu görünür kılar.
  test("[tanı] pediatrik senaryolarda max-doz durumu raporu", () => {
    for (const s of PEDIATRIC_SCENARIOS) {
      const text = serialize(s);
      if (!MAX_DOSE_RE.test(text)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[klinik-kapı][BOŞLUK] ${s.id}: pediatrik 'max doz' üst sınırı bulunamadı ` +
            `(CLAUDE.md 9.D Kural 1). Ali Bey klinik review'de değerlendirmeli.`
        );
      }
    }
    // Bu test her zaman geçer (tanısal); amaç boşluğu loglamak.
    expect(PEDIATRIC_SCENARIOS.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------
// 5. ACTIVE senaryolar için tam klinik kapı (toplu hard-fail)
// ------------------------------------------------------------
// ACTIVE'e geçen her senaryo TÜM kuralları sağlamalı. Şu an liste boş
// olabilir; bu blok ACTIVE çıkar çıkmaz otomatik koruma sağlar.
describe("ACTIVE senaryolar — tam klinik kapı", () => {
  test.each(
    ACTIVE_SCENARIOS.length
      ? ACTIVE_SCENARIOS.map((s) => [s.title, s] as const)
      : [["(ACTIVE senaryo yok — kapsam dışı)", null] as const]
  )("%s", (_title, scenario) => {
    if (!scenario) {
      // ACTIVE senaryo yok — placeholder, kasıtlı geçer.
      expect(ACTIVE_SCENARIOS.length).toBe(0);
      return;
    }
    const text = serialize(scenario);
    // Referans
    expect((scenario.debrief?.references ?? []).length).toBeGreaterThanOrEqual(1);
    // ICD-10 + SNOMED
    expect(scenario.clinical_codes?.icd10).toBeTruthy();
    expect(scenario.clinical_codes?.snomed_ct).toBeTruthy();
    // Pediatride mg/kg + max doz (her ikisi de)
    if (isPediatric(scenario)) {
      expect(WEIGHT_DOSE_RE.test(text)).toBe(true);
      expect(MAX_DOSE_RE.test(text)).toBe(true);
    }
  });
});
