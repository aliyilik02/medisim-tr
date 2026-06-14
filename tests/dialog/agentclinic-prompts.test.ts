// ============================================================
// AgentClinic çok-ajanlı prompt kurucu testleri
// ============================================================
// Hasta / Ölçüm / Moderatör ajan prompt kurucularının beklenen anahtar
// bölümleri içerdiğini doğrular (string-contains). Bu testler TEKNİK
// İSKELETİ doğrular — somut klinik değerleri (DRAFT) değil.
//
// AgentClinic (MIT, Schmidgall et al. 2024) deseninden port; bkz. ilgili
// kaynak dosyalardaki atıf yorumları.
// ============================================================

import { describe, expect, test } from "vitest";
import {
  buildPatientPersona,
  deriveAffect,
  type PatientBehaviorProfile,
} from "@/components/dialog/personaBuilder";
import {
  buildMeasurementPrompt,
  formatObjectiveVitals,
  listAvailableObjectiveSources,
} from "@/components/dialog/measurementPrompt";
import {
  buildModeratorRubric,
  MODERATOR_RUBRIC_DIMENSIONS,
  MODERATOR_SCORING_DRAFT,
} from "@/components/dialog/moderatorRubric";
import { getScenario } from "../helpers/all-scenarios";

const anaflaksi = getScenario("acil-anaflaksi-001");
if (!anaflaksi) throw new Error("Anaflaksi senaryosu bulunamadı");

// ------------------------------------------------------------
// 1. Hasta persona — temel iskelet korunmuş + zenginleştirme
// ------------------------------------------------------------
describe("buildPatientPersona — hasta ajanı", () => {
  test("temel persona bölümleri korunuyor (geriye uyumlu)", () => {
    const persona = buildPatientPersona(anaflaksi);
    expect(persona).toContain("Senin profilin (hastasın)");
    expect(persona).toContain("Ana şikayet:");
    expect(persona).toContain("Davranış kuralları");
    expect(persona).toContain("Cevap formatı");
    // Senaryo verisinden geliyor
    expect(persona).toContain(anaflaksi.patient.chief_complaint);
  });

  test("AgentClinic deseni: duygu tonu + tutarlılık + uydurma yasağı eklendi", () => {
    const persona = buildPatientPersona(anaflaksi);
    expect(persona).toContain("Duygu durumu ve üslup");
    expect(persona).toContain("TUTARLILIK");
    expect(persona).toContain("UYDURMA");
  });

  test("davranış profili parametresi üslubu değiştirir (klinik gerçek değil)", () => {
    const azKonusan: PatientBehaviorProfile = {
      communication: "az_konusan",
      affect: "bitkin",
    };
    const persona = buildPatientPersona(anaflaksi, azKonusan);
    expect(persona).toContain("Çekingensin");
    expect(persona).toContain("Bitkin ve halsizsin");
  });

  test("deriveAffect senaryo vitalinden tonu türetir (uydurmaz)", () => {
    // Anaflakside SpO2 düşük / RR yüksek beklenir → panik
    expect(deriveAffect(anaflaksi)).toBe("panik");

    // Sentetik stabil hasta → sakin
    const calm = {
      ...anaflaksi,
      initial_vitals: {
        ...anaflaksi.initial_vitals,
        spo2: 98,
        rr: 16,
        hr: 80,
        bp_systolic: 120,
        pain: 0,
        gcs: 15,
      },
    };
    expect(deriveAffect(calm)).toBe("sakin");
  });

  test("tutarlılık zorlaması kapatılabilir", () => {
    const persona = buildPatientPersona(anaflaksi, { enforceConsistency: false });
    expect(persona).not.toContain("TUTARLILIK:");
  });
});

// ------------------------------------------------------------
// 2. Ölçüm / objektif bulgu ajanı
// ------------------------------------------------------------
describe("buildMeasurementPrompt — ölçüm ajanı", () => {
  test("ölçüm rolü + uydurma yasağı + objektif vital içeriyor", () => {
    const prompt = buildMeasurementPrompt(anaflaksi);
    expect(prompt).toContain("Objektif Bulgu");
    expect(prompt).toContain("UYDURMA");
    expect(prompt).toContain("tanımlı değil"); // senaryoda yok → kayıtlı sonuç yok kuralı
    // Başlangıç vitali gerçek veriden gömülü
    expect(prompt).toContain(String(anaflaksi.initial_vitals.spo2));
  });

  test("formatObjectiveVitals mevcut vital alanlarını listeler", () => {
    const text = formatObjectiveVitals(anaflaksi.initial_vitals);
    expect(text).toContain("Kalp hızı (HR)");
    expect(text).toContain("Kan basıncı (TA)");
    expect(text).toContain("SpO2");
  });

  test("listAvailableObjectiveSources kaynak yoksa açık mesaj verir", () => {
    const stripped = {
      ...anaflaksi,
      lab_panels: undefined,
      imaging_results: undefined,
      available_equipment: [],
    };
    const sources = listAvailableObjectiveSources(stripped);
    expect(sources).toContain("tanımlı ek tetkik");
  });
});

// ------------------------------------------------------------
// 3. Moderatör rubriği
// ------------------------------------------------------------
describe("buildModeratorRubric — moderatör ajanı", () => {
  test("dört MVME boyutu da promptta var", () => {
    const rubric = buildModeratorRubric();
    expect(rubric).toContain("Anamnez");
    expect(rubric).toContain("İletişim");
    expect(rubric).toContain("Klinik Muhakeme");
    expect(rubric).toContain("Yönetim");
  });

  test("rubrik dört boyut tanımlar ve ağırlıklar 1.0 toplar", () => {
    expect(MODERATOR_RUBRIC_DIMENSIONS).toHaveLength(4);
    const total = MODERATOR_RUBRIC_DIMENSIONS.reduce((s, d) => s + d.weight, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  test("DRAFT puan eşikleri ACTIVE değer içermez (klinik review bekliyor)", () => {
    // Klinik içerik disiplini: somut geçme eşiği atanmamış olmalı
    expect(MODERATOR_SCORING_DRAFT.overallPassingPercent).toBeUndefined();
    expect(MODERATOR_SCORING_DRAFT.passingThresholdByDimension).toBeUndefined();

    // Prompt kesin geçti/kaldı hükmü vermemeli (eşik DRAFT)
    const rubric = buildModeratorRubric();
    expect(rubric).toContain("DRAFT");
    expect(rubric).toContain("EĞİTİM AMAÇLIDIR");
  });
});
