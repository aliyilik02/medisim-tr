// ============================================================
// Farmakoloji Motoru — birim testleri
// ============================================================
// MOTOR MEKANİĞİNİ test eder, klinik DEĞERLERİ değil.
// Sentetik ilaç/hasta fixture'ları kullanılır; gerçek katalog
// (medications-extended.ts) sadece 2 smoke testte, değerlere
// hardcode bağımlılık olmadan (band'dan programatik okuma) geçer.
// ============================================================

import { describe, expect, test } from "vitest";
import {
  evaluateDose,
  getDosePenalty,
  computeEffectMultiplier,
  applyMultiplierToDelta,
  evaluateTrigger,
  checkContraindications,
  administerMedication,
  computeProgress,
  tick,
  computeLiveVitals,
  getTickIntervalMs,
} from "@/engine/pharmacology/engine";
import { PHARMACOLOGY_PRESETS } from "@/engine/pharmacology/presets";
import type {
  ExtendedMedication,
  ActiveMedication,
  MedicationDoseBand,
  VitalDelta,
  Contraindication,
} from "@/engine/pharmacology/types";
import type { Patient, PatientVitals } from "@/engine/types";
import { getExtendedMedication } from "@/data/medications-extended";

// ------------------------------------------------------------
// Sentetik fixture'lar
// ------------------------------------------------------------

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    age: 45,
    sex: "M",
    weight_kg: 70,
    chief_complaint: "test şikayeti",
    history_items: [],
    allergies: [],
    ...overrides,
  };
}

function makeVitals(overrides: Partial<PatientVitals> = {}): PatientVitals {
  return {
    hr: 80,
    bp_systolic: 120,
    bp_diastolic: 80,
    spo2: 98,
    temp: 36.8,
    rr: 14,
    ...overrides,
  };
}

/** Sabit doz bandı: hedef 10, band 8–12, cezalar -4 / -8 */
function makeBand(overrides: Partial<MedicationDoseBand> = {}): MedicationDoseBand {
  return {
    default_dose: 10,
    dose_unit: "mg",
    dose_route: "IV_push",
    band_lower_pct: 0.8,
    band_upper_pct: 1.2,
    under_dose_penalty: -4,
    over_dose_penalty: -8,
    ...overrides,
  };
}

/** Sentetik ilaç: hr +10..+20, sbp -20..-10; onset 60 s, peak 2 dk, süre 10 dk */
function makeMed(overrides: Partial<ExtendedMedication> = {}): ExtendedMedication {
  return {
    id: "test-ilac",
    dose_band: makeBand(),
    vitals: { hr_range: [10, 20], sbp_range: [-20, -10] },
    timing: { onset_sec: 60, peak_min: 2, duration_min: 10 },
    ...overrides,
  };
}

/** Elde kurulmuş ActiveMedication — tick eğrisi testleri için (t=0'da verilmiş) */
function makeActive(overrides: Partial<ActiveMedication> = {}): ActiveMedication {
  return {
    instance_id: "test-ilac-0-1",
    medication_id: "test-ilac",
    administered_at: 0,
    dose_given: 10,
    dose_unit: "mg",
    effective_vitals: { hr_range: [10, 20] },
    timing: { onset_sec: 60, peak_min: 2, duration_min: 10 },
    expires_at: 10 * 60 * 1000, // 600.000 ms
    dose_evaluation: "correct",
    ...overrides,
  };
}

const NOW = 1_000_000; // sabit "şimdi" — deterministik test

// ============================================================
// 1. Doz değerlendirme — evaluateDose / getDosePenalty
// ============================================================

describe("evaluateDose — sabit doz bandı", () => {
  const band = makeBand(); // hedef 10 → band [8, 12]

  test("band içi doz → correct", () => {
    expect(evaluateDose(10, band)).toBe("correct");
    expect(evaluateDose(9, band)).toBe("correct");
    expect(evaluateDose(11.5, band)).toBe("correct");
  });

  test("alt sınırın altı → under_dose, üst sınırın üstü → over_dose", () => {
    expect(evaluateDose(7.99, band)).toBe("under_dose");
    expect(evaluateDose(12.01, band)).toBe("over_dose");
  });

  test("sınır değerler banda DAHİL (engine.ts:61-62 katı eşitsizlik)", () => {
    expect(evaluateDose(8, band)).toBe("correct");
    expect(evaluateDose(12, band)).toBe("correct");
  });

  test("birim hatası yolu: mg/mcg karışıklığı (1000x) → over_dose", () => {
    // Hedef 0.3 mg; öğrenci 300 verir (mcg sanıp mg girdi)
    const mcgBand = makeBand({ default_dose: 0.3 });
    expect(evaluateDose(300, mcgBand)).toBe("over_dose");
    // Ters yönde: 0.0003 → under_dose
    expect(evaluateDose(0.0003, mcgBand)).toBe("under_dose");
  });
});

describe("evaluateDose — kiloya bağlı (mg/kg) doz", () => {
  // 0.01 mg/kg, mutlak tavan 0.5 mg
  const wBand = makeBand({
    default_dose: 0.01,
    weight_based: true,
    max_single_dose: 0.5,
  });

  test("pediatrik 20 kg → hedef 0.2 mg; band [0.16, 0.24]", () => {
    expect(evaluateDose(0.2, wBand, 20)).toBe("correct");
    expect(evaluateDose(0.1, wBand, 20)).toBe("under_dose");
    expect(evaluateDose(0.3, wBand, 20)).toBe("over_dose");
  });

  test("max_single_dose tavanı: 70 kg → 0.7 yerine 0.5 hedef", () => {
    // Tavan uygulanınca band [0.4, 0.6]
    expect(evaluateDose(0.5, wBand, 70)).toBe("correct");
    expect(evaluateDose(0.7, wBand, 70)).toBe("over_dose"); // tavansız correct olurdu
    expect(evaluateDose(0.35, wBand, 70)).toBe("under_dose");
  });

  test("weight_based ama kilo verilmemiş → mg/kg değeri MUTLAK doz gibi işlenir (mevcut davranış, engine.ts:50)", () => {
    // Kilo yokken hedef 0.01'e düşer → makul doz 0.2 'over_dose' sayılır.
    // Sessiz yanlış sınıflandırma — şüpheli davranış, raporda işaretli.
    expect(evaluateDose(0.2, wBand)).toBe("over_dose");
    expect(evaluateDose(0.01, wBand)).toBe("correct");
  });
});

describe("getDosePenalty", () => {
  test("correct → 0; under/over → banddaki ceza", () => {
    const band = makeBand(); // -4 / -8
    expect(getDosePenalty("correct", band)).toBe(0);
    expect(getDosePenalty("under_dose", band)).toBe(-4);
    expect(getDosePenalty("over_dose", band)).toBe(-8);
  });

  test("ceza tanımsızsa varsayılan -5", () => {
    const band = makeBand({
      under_dose_penalty: undefined,
      over_dose_penalty: undefined,
    });
    expect(getDosePenalty("under_dose", band)).toBe(-5);
    expect(getDosePenalty("over_dose", band)).toBe(-5);
  });
});

// ============================================================
// 2. Modifier zinciri — computeEffectMultiplier
// ============================================================

describe("computeEffectMultiplier", () => {
  test("ilaçta modifiers yok → 1.0", () => {
    const med = makeMed({ modifiers: undefined });
    const patient = makePatient({ modifiers: { beta_blocker: true } });
    expect(computeEffectMultiplier(med, patient)).toBe(1.0);
  });

  test("hastada flag açık ama ilaçta o modifier tanımsız → 1.0", () => {
    const med = makeMed({ modifiers: { karaciger_yetm: 0.5 } });
    const patient = makePatient({ modifiers: { beta_blocker: true } });
    expect(computeEffectMultiplier(med, patient)).toBe(1.0);
  });

  test("tek modifier: beta_blocker 0.4", () => {
    const med = makeMed({ modifiers: { beta_blocker: 0.4 } });
    const patient = makePatient({ modifiers: { beta_blocker: true } });
    expect(computeEffectMultiplier(med, patient)).toBeCloseTo(0.4);
  });

  test("çoklu modifier ÇARPILIR: beta_blocker 0.4 × yasli_70plus 0.7 = 0.28", () => {
    const med = makeMed({ modifiers: { beta_blocker: 0.4, yasli_70plus: 0.7 } });
    const patient = makePatient({ age: 75, modifiers: { beta_blocker: true } });
    expect(computeEffectMultiplier(med, patient)).toBeCloseTo(0.28);
  });

  test("dört flag birden: 0.4 × 0.5 × 0.8 × 0.9 zinciri", () => {
    const med = makeMed({
      modifiers: {
        beta_blocker: 0.4,
        karaciger_yetm: 0.5,
        bobrek_yetm: 0.8,
        gebelik: 0.9,
      },
    });
    const patient = makePatient({
      modifiers: {
        beta_blocker: true,
        karaciger_yetm: true,
        bobrek_yetm: true,
        gebelik: true,
      },
    });
    expect(computeEffectMultiplier(med, patient)).toBeCloseTo(0.4 * 0.5 * 0.8 * 0.9);
  });

  test("yaş sınırları: 70 dahil (yasli), 69 değil; 17 pediatrik, 18 değil", () => {
    const med = makeMed({ modifiers: { yasli_70plus: 0.7, pediatrik: 0.6 } });
    expect(computeEffectMultiplier(med, makePatient({ age: 70 }))).toBeCloseTo(0.7);
    expect(computeEffectMultiplier(med, makePatient({ age: 69 }))).toBe(1.0);
    expect(computeEffectMultiplier(med, makePatient({ age: 17 }))).toBeCloseTo(0.6);
    expect(computeEffectMultiplier(med, makePatient({ age: 18 }))).toBe(1.0);
  });

  test("patient.modifiers hiç yoksa sadece yaş türetilenler işler", () => {
    const med = makeMed({ modifiers: { beta_blocker: 0.4, yasli_70plus: 0.7 } });
    const patient = makePatient({ age: 80, modifiers: undefined });
    expect(computeEffectMultiplier(med, patient)).toBeCloseTo(0.7);
  });

  test("modifier değeri 0 → etki tamamen sıfırlanır (!== undefined kontrolü)", () => {
    const med = makeMed({ modifiers: { gebelik: 0 } });
    const patient = makePatient({ modifiers: { gebelik: true } });
    expect(computeEffectMultiplier(med, patient)).toBe(0);
  });
});

// ============================================================
// 3. applyMultiplierToDelta
// ============================================================

describe("applyMultiplierToDelta", () => {
  test("pozitif ve negatif aralıkların İKİ ucu da çarpılır", () => {
    const delta: VitalDelta = { hr_range: [10, 20], sbp_range: [-20, -10] };
    const r = applyMultiplierToDelta(delta, 2);
    expect(r.hr_range).toEqual([20, 40]);
    expect(r.sbp_range).toEqual([-40, -20]);
  });

  test("0.5 çarpan etkinin yarısı", () => {
    const r = applyMultiplierToDelta({ rr_range: [4, 8] }, 0.5);
    expect(r.rr_range).toEqual([2, 4]);
  });

  test("sıfır çarpan → [0, 0] (etki yok ama alan korunur)", () => {
    const r = applyMultiplierToDelta({ hr_range: [10, 20] }, 0);
    expect(r.hr_range).toEqual([0, 0]);
  });

  test("tanımsız alanlar tanımsız kalır", () => {
    const r = applyMultiplierToDelta({ hr_range: [1, 2] }, 2);
    expect(r.sbp_range).toBeUndefined();
    expect(r.gcs_range).toBeUndefined();
  });

  test("tüm 9 vital alanı ölçeklenir", () => {
    const full: VitalDelta = {
      hr_range: [1, 2],
      sbp_range: [1, 2],
      dbp_range: [1, 2],
      spo2_range: [1, 2],
      rr_range: [1, 2],
      temp_range: [1, 2],
      glucose_range: [1, 2],
      pain_range: [1, 2],
      gcs_range: [1, 2],
    };
    const r = applyMultiplierToDelta(full, 3);
    for (const key of Object.keys(full) as Array<keyof VitalDelta>) {
      expect(r[key]).toEqual([3, 6]);
    }
  });
});

// ============================================================
// 4. Kontrendikasyon tetikleyicileri — evaluateTrigger
// ============================================================

describe("evaluateTrigger", () => {
  const vitals = makeVitals();
  const noActive: string[] = [];

  test("modifier: hastada flag true → tetiklenir, yok/false → tetiklenmez", () => {
    const trig = { kind: "modifier", modifier: "gebelik" } as const;
    expect(
      evaluateTrigger(trig, makePatient({ modifiers: { gebelik: true } }), vitals, noActive)
    ).toBe(true);
    expect(
      evaluateTrigger(trig, makePatient({ modifiers: { gebelik: false } }), vitals, noActive)
    ).toBe(false);
    expect(evaluateTrigger(trig, makePatient(), vitals, noActive)).toBe(false); // modifiers hiç yok
  });

  test("history: büyük/küçük harf duyarsız alt-dize eşleşmesi", () => {
    const trig = { kind: "history", keyword: "koah" } as const;
    const hasta = makePatient({ history_items: ["KOAH tanısı mevcut", "HT"] });
    expect(evaluateTrigger(trig, hasta, vitals, noActive)).toBe(true);
    expect(evaluateTrigger(trig, makePatient({ history_items: ["HT"] }), vitals, noActive)).toBe(false);
  });

  test("allergy: alerji listesinde anahtar kelime", () => {
    const trig = { kind: "allergy", keyword: "penisilin" } as const;
    expect(
      evaluateTrigger(trig, makePatient({ allergies: ["Penisilin grubu"] }), vitals, noActive)
    ).toBe(true);
    expect(evaluateTrigger(trig, makePatient({ allergies: [] }), vitals, noActive)).toBe(false);
  });

  test("concurrent_med: aktif ilaç listesinde id var/yok", () => {
    const trig = { kind: "concurrent_med", medication_id: "morfin" } as const;
    expect(evaluateTrigger(trig, makePatient(), vitals, ["morfin", "aspirin"])).toBe(true);
    expect(evaluateTrigger(trig, makePatient(), vitals, ["aspirin"])).toBe(false);
  });

  test("vital: dört operatör de doğru çalışır", () => {
    const v = makeVitals({ bp_systolic: 90 });
    const p = makePatient();
    expect(evaluateTrigger({ kind: "vital", param: "bp_systolic", op: "<", value: 90 }, p, v, noActive)).toBe(false);
    expect(evaluateTrigger({ kind: "vital", param: "bp_systolic", op: "<=", value: 90 }, p, v, noActive)).toBe(true);
    expect(evaluateTrigger({ kind: "vital", param: "bp_systolic", op: ">", value: 89 }, p, v, noActive)).toBe(true);
    expect(evaluateTrigger({ kind: "vital", param: "bp_systolic", op: ">=", value: 91 }, p, v, noActive)).toBe(false);
  });

  test("vital eşiği: SBP < 90 → nitrat verilmez örüntüsü tetiklenir/tetiklenmez", () => {
    const trig = { kind: "vital", param: "bp_systolic", op: "<", value: 90 } as const;
    expect(evaluateTrigger(trig, makePatient(), makeVitals({ bp_systolic: 85 }), noActive)).toBe(true);
    expect(evaluateTrigger(trig, makePatient(), makeVitals({ bp_systolic: 120 }), noActive)).toBe(false);
  });

  test("eksik (undefined) vital alanı → false (glukoz ölçülmemiş)", () => {
    const trig = { kind: "vital", param: "glucose", op: "<", value: 60 } as const;
    const v = makeVitals(); // glucose tanımsız
    expect(evaluateTrigger(trig, makePatient(), v, noActive)).toBe(false);
  });

  test("sayı olmayan vital (pupil_reactive boolean) → false (typeof guard, engine.ts:186)", () => {
    const trig = { kind: "vital", param: "pupil_reactive", op: ">", value: 0 } as const;
    const v = makeVitals({ pupil_reactive: true });
    expect(evaluateTrigger(trig, makePatient(), v, noActive)).toBe(false);
  });
});

describe("checkContraindications", () => {
  const contraVital: Contraindication = {
    trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
    severity: "kritik",
    effect: "hipotansiyon",
    penalty: -20,
    message: "SBP düşük!",
    feedback: "test",
  };
  const contraAllergy: Contraindication = {
    trigger: { kind: "allergy", keyword: "test-alerjen" },
    severity: "uyari",
    effect: "alerjik_reaksiyon",
    penalty: -5,
    message: "Alerji!",
    feedback: "test",
  };

  test("kontrendikasyon tanımsız → boş dizi", () => {
    const med = makeMed({ contraindications: undefined });
    expect(checkContraindications(med, makePatient(), makeVitals(), [])).toEqual([]);
  });

  test("sadece tetiklenenler döner", () => {
    const med = makeMed({ contraindications: [contraVital, contraAllergy] });
    const r = checkContraindications(med, makePatient(), makeVitals({ bp_systolic: 80 }), []);
    expect(r).toHaveLength(1);
    expect(r[0].effect).toBe("hipotansiyon");
  });

  test("hiçbiri tetiklenmezse boş dizi", () => {
    const med = makeMed({ contraindications: [contraVital, contraAllergy] });
    expect(checkContraindications(med, makePatient(), makeVitals(), [])).toEqual([]);
  });
});

// ============================================================
// 5. administerMedication — ana giriş noktası
// ============================================================

describe("administerMedication — doz ve etki", () => {
  test("doğru doz: ceza 0, etki delta'sı ölçeksiz aynen taşınır", () => {
    const r = administerMedication({
      medication: makeMed(),
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.success).toBe(true);
    expect(r.dose_evaluation).toBe("correct");
    expect(r.points_delta).toBe(0);
    expect(r.triggered_contraindications).toEqual([]);
    expect(r.requires_correction).toBeUndefined();
    expect(r.active_instance!.effective_vitals.hr_range).toEqual([10, 20]);
    expect(r.active_instance!.effective_vitals.sbp_range).toEqual([-20, -10]);
  });

  test("düşük doz: etki ×0.5 + banddaki under ceza", () => {
    const r = administerMedication({
      medication: makeMed(),
      doseGiven: 5,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.dose_evaluation).toBe("under_dose");
    expect(r.points_delta).toBe(-4);
    expect(r.active_instance!.effective_vitals.hr_range).toEqual([5, 10]);
  });

  test("aşırı doz: etki ×1.4 + banddaki over ceza", () => {
    const r = administerMedication({
      medication: makeMed(),
      doseGiven: 20,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.dose_evaluation).toBe("over_dose");
    expect(r.points_delta).toBe(-8);
    expect(r.active_instance!.effective_vitals.hr_range).toEqual([14, 28]);
  });

  test("modifier zinciri etkiye uygulanır (beta_blocker 0.4)", () => {
    const r = administerMedication({
      medication: makeMed({ modifiers: { beta_blocker: 0.4 } }),
      doseGiven: 10,
      patient: makePatient({ modifiers: { beta_blocker: true } }),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.active_instance!.effective_vitals.hr_range).toEqual([4, 8]);
  });

  test("modifier × doz bandı birlikte: 0.4 × 0.5 = 0.2", () => {
    const r = administerMedication({
      medication: makeMed({ modifiers: { beta_blocker: 0.4 } }),
      doseGiven: 5, // under_dose
      patient: makePatient({ modifiers: { beta_blocker: true } }),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.active_instance!.effective_vitals.hr_range).toEqual([2, 4]);
  });

  test("ActiveMedication kaydı: kimlik, zamanlama, expires_at doğru", () => {
    const r = administerMedication({
      medication: makeMed(),
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      sourceStepId: "step-x",
      now: NOW,
    });
    const inst = r.active_instance!;
    expect(inst.instance_id.startsWith("test-ilac-")).toBe(true);
    expect(inst.medication_id).toBe("test-ilac");
    expect(inst.administered_at).toBe(NOW);
    expect(inst.dose_given).toBe(10);
    expect(inst.dose_unit).toBe("mg");
    expect(inst.timing).toEqual({ onset_sec: 60, peak_min: 2, duration_min: 10 });
    expect(inst.expires_at).toBe(NOW + 10 * 60 * 1000);
    expect(inst.source_step_id).toBe("step-x");
  });

  test("timingOverride: verilen alanlar ilacın kendi timing'ini geçersiz kılar", () => {
    const r = administerMedication({
      medication: makeMed(),
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
      timingOverride: { onset_sec: 5, duration_min: 3 }, // peak_min verilmedi
    });
    expect(r.active_instance!.timing).toEqual({
      onset_sec: 5,
      peak_min: 2, // ilaçtan korundu
      duration_min: 3,
    });
    expect(r.active_instance!.expires_at).toBe(NOW + 3 * 60 * 1000);
  });

  test("preset yok + vitals/timing yok → varsayılan timing (60s/5dk/20dk), boş delta", () => {
    const med: ExtendedMedication = { id: "bos-ilac", dose_band: makeBand() };
    const r = administerMedication({
      medication: med,
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.active_instance!.timing).toEqual({ onset_sec: 60, peak_min: 5, duration_min: 20 });
    expect(r.active_instance!.effective_vitals.hr_range).toBeUndefined();
  });

  test("preset çözümü: med.vitals preset alanını override eder, kalanı preset'ten gelir", () => {
    const preset = PHARMACOLOGY_PRESETS["sempatomimetik-guclu"];
    const med: ExtendedMedication = {
      id: "preset-ilac",
      preset: "sempatomimetik-guclu",
      vitals: { hr_range: [1, 2] }, // sadece hr override
      dose_band: makeBand(),
    };
    const r = administerMedication({
      medication: med,
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.active_instance!.effective_vitals.hr_range).toEqual([1, 2]);
    expect(r.active_instance!.effective_vitals.sbp_range).toEqual(preset.sbp_range);
    expect(r.active_instance!.timing.onset_sec).toBe(preset.onset_sec);
  });

  test("EcgEffect ilaçtan aktif kayda aynen taşınır (modifier ÇARPILMAZ — mevcut davranış, engine.ts:312)", () => {
    const ecg = { st_elevation_mv: 0.2, qt_interval_ms: 40 };
    const r = administerMedication({
      medication: makeMed({ ecg_effect: ecg, modifiers: { beta_blocker: 0.4 } }),
      doseGiven: 10,
      patient: makePatient({ modifiers: { beta_blocker: true } }),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    // Vital delta 0.4 ile ölçeklendi ama EKG etkisi ham kaldı
    expect(r.active_instance!.effective_ecg).toEqual(ecg);
  });
});

describe("administerMedication — kontrendikasyon", () => {
  const kritikContra: Contraindication = {
    trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
    severity: "kritik",
    effect: "hipotansiyon",
    effect_vitals: { hr_range: [-30, -30] },
    grace_sec: 45,
    penalty: -20,
    message: "SBP düşük!",
    feedback: "test",
    antidotes: ["antidot-x"],
  };
  const uyariContra: Contraindication = {
    trigger: { kind: "history", keyword: "koah" },
    severity: "uyari",
    effect: "bronkospazm",
    penalty: -5,
    message: "KOAH!",
    feedback: "test",
  };

  test("kritik kontrendikasyon: requires_correction dolu, ceza puana ekli, kayıt YİNE oluşur", () => {
    const r = administerMedication({
      medication: makeMed({ contraindications: [kritikContra] }),
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals({ bp_systolic: 80 }),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.success).toBe(true); // hasta ilacı aldı — bloklanmaz
    expect(r.active_instance).toBeDefined();
    expect(r.triggered_contraindications).toHaveLength(1);
    expect(r.points_delta).toBe(-20);
    expect(r.requires_correction).toEqual({
      grace_sec: 45,
      expected_antidotes: ["antidot-x"],
      expires_at: NOW + 45 * 1000,
    });
  });

  test("grace_sec/antidotes tanımsız → varsayılan 60 s ve boş liste", () => {
    const contra: Contraindication = {
      ...kritikContra,
      grace_sec: undefined,
      antidotes: undefined,
      effect_vitals: undefined,
    };
    const r = administerMedication({
      medication: makeMed({ contraindications: [contra] }),
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals({ bp_systolic: 80 }),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.requires_correction).toEqual({
      grace_sec: 60,
      expected_antidotes: [],
      expires_at: NOW + 60 * 1000,
    });
  });

  test("kritik olmayan (uyari) → requires_correction YOK ama ceza var", () => {
    const r = administerMedication({
      medication: makeMed({ contraindications: [uyariContra] }),
      doseGiven: 10,
      patient: makePatient({ history_items: ["KOAH"] }),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.requires_correction).toBeUndefined();
    expect(r.points_delta).toBe(-5);
  });

  test("çoklu kontrendikasyon cezaları TOPLANIR + doz cezası eklenir", () => {
    const r = administerMedication({
      medication: makeMed({ contraindications: [kritikContra, uyariContra] }),
      doseGiven: 5, // under_dose: -4
      patient: makePatient({ history_items: ["KOAH"] }),
      vitals: makeVitals({ bp_systolic: 80 }),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.triggered_contraindications).toHaveLength(2);
    expect(r.points_delta).toBe(-4 + -20 + -5);
  });

  test("effect_vitals ölçeklenmiş etkiyle TOPLANIR (çarpan sonrası merge, engine.ts:296-301)", () => {
    const r = administerMedication({
      medication: makeMed({ contraindications: [kritikContra] }),
      doseGiven: 10,
      patient: makePatient(),
      vitals: makeVitals({ bp_systolic: 80 }),
      activeMedicationIds: [],
      now: NOW,
    });
    // hr_range [10,20] + [-30,-30] = [-20,-10]
    expect(r.active_instance!.effective_vitals.hr_range).toEqual([-20, -10]);
    // sbp: contra'da yok → ilacınki aynen
    expect(r.active_instance!.effective_vitals.sbp_range).toEqual([-20, -10]);
  });
});

// ============================================================
// 6. computeProgress — onset → peak → plato → düşüş eğrisi
// ============================================================

describe("computeProgress", () => {
  // onset 60 s, peak 2 dk (120 s), süre 10 dk (600 s), düşüş başlangıcı 396 s
  const timing = { onset_sec: 60, peak_min: 2, duration_min: 10 };

  test("onset öncesi → 0", () => {
    expect(computeProgress(0, timing)).toBe(0);
    expect(computeProgress(59, timing)).toBe(0);
  });

  test("yükselme lineer: onset'te 0, ortada 0.5, peak'te 1", () => {
    expect(computeProgress(60, timing)).toBe(0);
    expect(computeProgress(90, timing)).toBeCloseTo(0.5);
    expect(computeProgress(119, timing)).toBeCloseTo(59 / 60);
    expect(computeProgress(120, timing)).toBe(1);
  });

  test("plato: peak'ten süre×0.66'ya kadar 1", () => {
    expect(computeProgress(200, timing)).toBe(1);
    expect(computeProgress(395, timing)).toBe(1);
  });

  test("düşüş lineer: ortada 0.5, sona doğru 0'a iner", () => {
    expect(computeProgress(396, timing)).toBeCloseTo(1);
    expect(computeProgress(498, timing)).toBeCloseTo(0.5); // (396+600)/2
    expect(computeProgress(599, timing)).toBeGreaterThan(0);
    expect(computeProgress(599, timing)).toBeLessThan(0.02);
  });

  test("duration sonunda ve sonrasında → 0 (etki söner)", () => {
    expect(computeProgress(600, timing)).toBe(0);
    expect(computeProgress(10_000, timing)).toBe(0);
  });

  test("onset_sec = 0 kabul edilir (anında başlar)", () => {
    const t0 = { onset_sec: 0, peak_min: 1, duration_min: 10 };
    expect(computeProgress(0, t0)).toBe(0);
    expect(computeProgress(30, t0)).toBeCloseTo(0.5);
    expect(computeProgress(60, t0)).toBe(1);
  });
});

// ============================================================
// 7. tick — kümülatif vital + EKG etkisi, süre dolumu
// ============================================================

describe("tick — vital eğrisi zaman evrimi", () => {
  test("boş liste → sıfır sonuç", () => {
    const r = tick({ activeMedications: [], now: 0 });
    expect(r.vitals_delta).toEqual({});
    expect(r.ecg_delta).toEqual({});
    expect(r.expired_instance_ids).toEqual([]);
    expect(r.active_count).toBe(0);
  });

  test("onset öncesi: ilaç listede ama katkı ve active_count 0", () => {
    const r = tick({ activeMedications: [makeActive()], now: 30_000 });
    expect(r.active_count).toBe(0);
    expect(r.vitals_delta.hr).toBeUndefined();
    expect(r.expired_instance_ids).toEqual([]);
  });

  test("peak'te tam etki: aralık ORTASI uygulanır ([10,20] → 15)", () => {
    const r = tick({ activeMedications: [makeActive()], now: 120_000 });
    expect(r.active_count).toBe(1);
    expect(r.vitals_delta.hr).toBeCloseTo(15);
  });

  test("yükselme ortasında yarım etki (t=90 s → 7.5)", () => {
    const r = tick({ activeMedications: [makeActive()], now: 90_000 });
    expect(r.vitals_delta.hr).toBeCloseTo(7.5);
  });

  test("düşüş ortasında etki sönmekte (t=498 s → 7.5)", () => {
    const r = tick({ activeMedications: [makeActive()], now: 498_000 });
    expect(r.vitals_delta.hr).toBeCloseTo(7.5);
  });

  test("süre dolunca: katkı yok + expired_instance_ids'e düşer", () => {
    const r = tick({ activeMedications: [makeActive()], now: 600_000 });
    expect(r.expired_instance_ids).toEqual(["test-ilac-0-1"]);
    expect(r.active_count).toBe(0);
    expect(r.vitals_delta.hr).toBeUndefined();
  });

  test("iki aktif ilaç: katkılar TOPLANIR", () => {
    const medA = makeActive(); // hr [10,20] → peak'te +15
    const medB = makeActive({
      instance_id: "b-1",
      effective_vitals: { hr_range: [-4, -6], sbp_range: [10, 10] },
    });
    const r = tick({ activeMedications: [medA, medB], now: 120_000 });
    expect(r.active_count).toBe(2);
    expect(r.vitals_delta.hr).toBeCloseTo(15 - 5);
    expect(r.vitals_delta.bp_systolic).toBeCloseTo(10);
  });

  test("biri aktif biri süresi dolmuş karışım", () => {
    const canli = makeActive({ instance_id: "canli" });
    const olmus = makeActive({ instance_id: "olmus", expires_at: 100_000 });
    const r = tick({ activeMedications: [canli, olmus], now: 120_000 });
    expect(r.expired_instance_ids).toEqual(["olmus"]);
    expect(r.active_count).toBe(1);
    expect(r.vitals_delta.hr).toBeCloseTo(15);
  });
});

describe("tick — EKG etkisi", () => {
  const ecgMed = makeActive({
    effective_ecg: {
      qrs_amplitude_pct: 1.2,
      t_amplitude_pct: 0.8,
      st_elevation_mv: 0.2,
      qt_interval_ms: 40,
      qrs_duration_ms: 20,
    },
  });

  test("tam progress'te EKG parametreleri aynen yansır", () => {
    const r = tick({ activeMedications: [ecgMed], now: 120_000 });
    expect(r.ecg_delta.qrs_amplitude_pct).toBeCloseTo(1.2);
    expect(r.ecg_delta.t_amplitude_pct).toBeCloseTo(0.8);
    expect(r.ecg_delta.st_elevation_mv).toBeCloseTo(0.2);
    expect(r.ecg_delta.qt_interval_ms).toBeCloseTo(40);
    expect(r.ecg_delta.qrs_duration_ms).toBeCloseTo(20);
  });

  test("yarım progress'te pct alanları 1.0 baza doğru, delta alanları yarıya iner", () => {
    const r = tick({ activeMedications: [ecgMed], now: 90_000 }); // progress 0.5
    expect(r.ecg_delta.qrs_amplitude_pct).toBeCloseTo(1.1); // 1 + 0.2×0.5
    expect(r.ecg_delta.t_amplitude_pct).toBeCloseTo(0.9);   // 1 - 0.2×0.5
    expect(r.ecg_delta.st_elevation_mv).toBeCloseTo(0.1);
    expect(r.ecg_delta.qt_interval_ms).toBeCloseTo(20);
  });

  test("iki ilacın pct etkileri ADDITIVE birleşir: 1.2 + 1.3 → 1.5", () => {
    const a = makeActive({ effective_ecg: { qrs_amplitude_pct: 1.2 } });
    const b = makeActive({ instance_id: "b", effective_ecg: { qrs_amplitude_pct: 1.3 } });
    const r = tick({ activeMedications: [a, b], now: 120_000 });
    expect(r.ecg_delta.qrs_amplitude_pct).toBeCloseTo(1.5);
  });

  test("EKG etkisi olmayan ilaç ecg_delta üretmez", () => {
    const r = tick({ activeMedications: [makeActive()], now: 120_000 });
    expect(r.ecg_delta).toEqual({});
  });

  test("birbirini tam götüren etkiler alanı OMİT eder (mevcut davranış, engine.ts:470)", () => {
    const arti = makeActive({ effective_ecg: { st_elevation_mv: 0.2 } });
    const eksi = makeActive({ instance_id: "e", effective_ecg: { st_elevation_mv: -0.2 } });
    const r = tick({ activeMedications: [arti, eksi], now: 120_000 });
    expect(r.ecg_delta.st_elevation_mv).toBeUndefined();
  });
});

// ============================================================
// 8. computeLiveVitals — baseline + delta
// ============================================================

describe("computeLiveVitals", () => {
  const baseline = makeVitals({ pain: 6, glucose: 100, gcs: 15 });

  test("delta eklenir ve tam sayıya yuvarlanır", () => {
    const r = computeLiveVitals(baseline, { hr: 7.4, bp_systolic: -10.6 });
    expect(r.hr).toBe(87);
    expect(r.bp_systolic).toBe(109);
    expect(r.rr).toBe(14); // delta yok → baseline
  });

  test("spo2 0-100 aralığına kırpılır", () => {
    expect(computeLiveVitals(baseline, { spo2: 10 }).spo2).toBe(100);
    expect(computeLiveVitals(baseline, { spo2: -200 }).spo2).toBe(0);
  });

  test("pain 0-10, gcs 3-15 aralığına kırpılır", () => {
    expect(computeLiveVitals(baseline, { pain: -9 }).pain).toBe(0);
    expect(computeLiveVitals(baseline, { pain: 9 }).pain).toBe(10);
    expect(computeLiveVitals(baseline, { gcs: -20 }).gcs).toBe(3);
    expect(computeLiveVitals(baseline, { gcs: 5 }).gcs).toBe(15);
  });

  test("baseline'da olmayan opsiyonel vital delta gelse bile undefined kalır", () => {
    const noPain = makeVitals(); // pain/glucose/gcs tanımsız
    const r = computeLiveVitals(noPain, { pain: -3, glucose: 50, gcs: -2 });
    expect(r.pain).toBeUndefined();
    expect(r.glucose).toBeUndefined();
    expect(r.gcs).toBeUndefined();
  });

  test("temp 1 ondalığa yuvarlanır", () => {
    const r = computeLiveVitals(baseline, { temp: 0.63 });
    expect(r.temp).toBe(37.4); // 36.8 + 0.63 = 37.43 → toFixed(1)
  });
});

// ============================================================
// 9. getTickIntervalMs — zaman ölçeği
// ============================================================

describe("getTickIntervalMs", () => {
  test("varsayılan ölçekler: egitim 8x, klinik 3x, sinav 1x", () => {
    expect(getTickIntervalMs(1000, "egitim")).toBe(125);
    expect(getTickIntervalMs(1000, "klinik")).toBeCloseTo(1000 / 3);
    expect(getTickIntervalMs(1000, "sinav")).toBe(1000);
  });

  test("override sadece verilen modu değiştirir", () => {
    expect(getTickIntervalMs(1000, "egitim", { egitim: 2 })).toBe(500);
    expect(getTickIntervalMs(1000, "sinav", { egitim: 2 })).toBe(1000);
  });
});

// ============================================================
// 10. Katalog smoke — gerçek ExtendedMedication ile motor uçtan uca
//     (değerlere hardcode bağımlılık yok: band'dan programatik okunur)
// ============================================================

describe("gerçek katalog smoke", () => {
  test("aspirin: default_dose ile correct + aktif kayıt oluşur", () => {
    const med = getExtendedMedication("aspirin");
    expect(med).toBeDefined();
    const r = administerMedication({
      medication: med!,
      doseGiven: med!.dose_band.default_dose,
      patient: makePatient(),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    expect(r.success).toBe(true);
    expect(r.dose_evaluation).toBe("correct");
    expect(r.active_instance!.medication_id).toBe("aspirin");
    expect(r.active_instance!.expires_at).toBeGreaterThan(NOW);
  });

  test("aspirin: alerjik hastada kritik kontrendikasyon tetiklenir", () => {
    const med = getExtendedMedication("aspirin")!;
    const r = administerMedication({
      medication: med,
      doseGiven: med.dose_band.default_dose,
      patient: makePatient({ allergies: ["Aspirin alerjisi"] }),
      vitals: makeVitals(),
      activeMedicationIds: [],
      now: NOW,
    });
    const kritik = r.triggered_contraindications.find((c) => c.severity === "kritik");
    expect(kritik).toBeDefined();
    expect(r.requires_correction).toBeDefined();
    expect(r.points_delta).toBeLessThan(0);
  });
});
