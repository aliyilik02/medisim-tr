// ============================================================
// STEMI olgunlaştırma — klinik kural kanıtları (21 Haz 2026)
// ============================================================
// ESC 2023 kaynaklı kuralların senaryoda/motorda DOĞRU uygulandığını
// doğrular. clinical_review = REVIEWED_PENDING_ACTIVATION (ACTIVE değil).

import { describe, it, expect } from "vitest";
import { scenario_stemi } from "@/data/scenarios/stemi";
import {
  getEquipmentEffect,
  resolveEquipmentEffect,
  type EquipmentEffectContext,
} from "@/engine";
import { checkContraindications } from "@/engine/pharmacology/engine";
import { getExtendedMedication } from "@/data/medications-extended";
import type { PatientVitals } from "@/engine";

const patient = scenario_stemi.patient;

function vitals(overrides: Partial<PatientVitals> = {}): PatientVitals {
  return { ...scenario_stemi.initial_vitals, ...overrides };
}

describe("STEMI — nitrogliserin SBP<90 kontrendikasyonu (motor enforce)", () => {
  const nitro = getExtendedMedication("nitrogliserin")!;

  it("nitrogliserin extended med'de SBP<90 kritik kontrendikasyon tanımlı", () => {
    expect(nitro).toBeDefined();
    const sbpContra = nitro.contraindications?.find(
      (c) => c.trigger.kind === "vital" && c.trigger.param === "bp_systolic"
    );
    expect(sbpContra, "SBP kontrendikasyonu yok").toBeDefined();
    expect(sbpContra!.severity).toBe("kritik");
  });

  it("SBP<90 iken nitrogliserin → kritik kontrendikasyon TETİKLENİR", () => {
    const triggered = checkContraindications(nitro, patient, vitals({ bp_systolic: 80 }), []);
    expect(triggered.some((c) => c.severity === "kritik")).toBe(true);
  });

  it("normotansif (SBP 148) iken nitrogliserin → SBP kontrendikasyonu TETİKLENMEZ", () => {
    const triggered = checkContraindications(nitro, patient, vitals({ bp_systolic: 148 }), []);
    const sbpFired = triggered.some(
      (c) => c.trigger.kind === "vital" && c.trigger.param === "bp_systolic"
    );
    expect(sbpFired).toBe(false);
  });
});

describe("STEMI — oksijen eşiği (mapper, ESC 2023: yalnız SpO2<90)", () => {
  const o2 = getEquipmentEffect("oksijen_maske")!;
  const ctx = (spo2: number): EquipmentEffectContext => ({
    vitals: vitals({ spo2 }),
    patient,
  });

  it("STEMI başlangıç SpO2 96 (normoksemik — oksijen tuzağı)", () => {
    expect(scenario_stemi.initial_vitals.spo2).toBe(96);
  });

  it("SpO2 96 iken O2 maskesi → ETKİSİZ (hiperoksi tuzağı)", () => {
    const r = resolveEquipmentEffect(o2, ctx(96));
    expect(r.applied).toBe(false);
    expect(r.delta.spo2).toBeUndefined();
  });

  it("SpO2 85 (gerçek hipoksemi) iken O2 maskesi → SpO2 artırır", () => {
    const r = resolveEquipmentEffect(o2, ctx(85));
    expect(r.applied).toBe(true);
    expect(r.delta.spo2).toBeGreaterThan(0);
  });
});

describe("STEMI — ekipman mapper bağı + defib VF/VT koşulu", () => {
  it("use_central_equipment_effects açık", () => {
    expect(scenario_stemi.use_central_equipment_effects).toBe(true);
  });

  it("defibrilatör SADECE VF/VT ritminde etki uygular", () => {
    const defib = getEquipmentEffect("defibrilator")!;
    const vf = resolveEquipmentEffect(defib, { vitals: vitals({ hr: 180 }), patient, ekg: "vfib" });
    expect(vf.applied).toBe(true);
    const sinus = resolveEquipmentEffect(defib, { vitals: vitals(), patient, ekg: "sinus" });
    expect(sinus.applied).toBe(false);
  });

  it("STEMI ekipmanları (defib/O2/IV/monitör) REVIEWED, ACTIVE değil", () => {
    for (const id of ["defibrilator", "oksijen_maske", "iv_kateter_18g", "monitor", "ekg_12"]) {
      expect(getEquipmentEffect(id)!.status).toBe("REVIEWED_PENDING_ACTIVATION");
    }
  });
});

describe("STEMI — fibrinoliz ile P2Y12 = klopidogrel kuralı + tenecteplase doz", () => {
  const trombolizOpt = scenario_stemi.steps
    .flatMap((s) => (s.kind === "decision" ? s.options : []))
    .find((o) => o.id === "opt_tromboliz");

  it("tromboliz seçeneği fibrinoliz→klopidogrel kuralını öğretir", () => {
    expect(trombolizOpt).toBeDefined();
    const fb = trombolizOpt!.feedback;
    // Türkçe İ lowercase sorununu önlemek için ham metinde ara
    expect(fb).toContain("KLOPİDOGREL");
    // tikagrelor/prasugrel fibrinolizle önerilmez uyarısı
    expect(fb).toContain("tikagrelor");
  });

  it("tenecteplase kiloya-göre doz öğretilir (84kg → 45 mg)", () => {
    expect(trombolizOpt!.feedback).toContain("45 mg");
    expect(trombolizOpt!.feedback.toLowerCase()).toContain("kg");
  });
});

describe("STEMI — heparin doz tavanı (max 4000 U, çelişki giderildi)", () => {
  // s1'de heparin dozsuz (erken), s3'te dozlu — dozlu olanı al.
  const heparinOutcome = scenario_stemi.steps
    .flatMap((s) => (s.kind === "action" ? s.expected_outcomes : []))
    .find(
      (o) =>
        o.action.type === "give_medication" &&
        o.action.target_id === "heparin" &&
        o.action.dose !== undefined
    );

  it("heparin dozlu outcome 4000 IU (kendi max'ıyla çelişmez)", () => {
    expect(heparinOutcome).toBeDefined();
    expect(heparinOutcome!.action.dose).toBe("4000 IU");
    expect(heparinOutcome!.feedback).not.toContain("5000");
  });
});

describe("STEMI — clinical_review REVIEWED (ACTIVE değil) + dürüstlük", () => {
  it("status REVIEWED_PENDING_ACTIVATION, ACTIVE değil", () => {
    expect(scenario_stemi.clinical_review?.status).toBe("REVIEWED_PENDING_ACTIVATION");
    expect(scenario_stemi.clinical_review?.status).not.toBe("ACTIVE");
  });

  it("reviewed_by'da sahte klinik uzman/doktor imzası YOK (dürüstlük)", () => {
    const rb = (scenario_stemi.clinical_review?.reviewed_by ?? "").toLowerCase();
    expect(rb).toContain("ürün-sahibi");
    expect(rb).toContain("önerilir"); // 'bağımsız klinik uzman review önerilir'
    // 'Dr.' / 'Prof.' gibi sahte unvan-imza içermez
    expect(rb).not.toMatch(/\bdr\.|prof\.|doç\.|uzm\.\s*dr/);
  });

  it("katalog-id geçerli: noradrenalin var, norepinefrin/atorvastatin yok", () => {
    expect(scenario_stemi.available_medications).toContain("noradrenalin");
    expect(scenario_stemi.available_medications).not.toContain("norepinefrin");
    expect(scenario_stemi.available_medications).not.toContain("atorvastatin");
  });
});
