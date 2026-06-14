// ============================================================
// MediSim TR — Senaryo → FHIR eşleme testleri
// ============================================================
// Saf eşleme fonksiyonları (scenarioToFhir.ts) %100 test edilir.
// Her mapper + boş/opsiyonel alan davranışı doğrulanır.
// ============================================================

import { describe, expect, test } from "vitest";
import type { Scenario, PatientVitals } from "@/engine";
import {
  scenarioToPatient,
  scenarioToConditions,
  scenarioToMedicationRequests,
  vitalsToObservations,
} from "@/clinical/fhir";

// ------------------------------------------------------------
// Test fikstürleri — gerçek senaryo şeklini taklit eder (stemi.ts esinli)
// ------------------------------------------------------------

const baseVitals: PatientVitals = {
  hr: 104,
  bp_systolic: 148,
  bp_diastolic: 92,
  spo2: 94,
  temp: 36.7,
  rr: 22,
};

/** Yalnız test için minimal-tam senaryo. Sadece eşlemede kullanılan alanları doldurur. */
function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  const base: Scenario = {
    id: "kardiyoloji-stemi-001",
    version: "0.3.0",
    title: "62 Yaş Erkek — Akut Göğüs Ağrısı (STEMI)",
    description: "test",
    specialty: "kardiyoloji",
    tags: ["stemi"],
    difficulty: 3,
    estimated_minutes: 18,
    modes: ["quiz", "interactive_3d"],
    language: "tr",
    last_updated: "2026-04-23",
    clinical_codes: { icd10: "I21.0", snomed_ct: "401303003" },
    patient: {
      age: 62,
      sex: "M",
      weight_kg: 84,
      height_cm: 174,
      chief_complaint: "göğüs ağrısı",
      history_items: ["HT"],
      allergies: [],
      current_medications: ["Metformin 1000 mg 2x1", "Ramipril 5 mg 1x1"],
    },
    initial_vitals: baseVitals,
    available_medications: [],
    available_equipment: [],
    steps: [],
    start_step_id: "",
    scoring: {
      max_points: 100,
      passing_score: 55,
      grade_bands: { A: 85, B: 70, C: 55, D: 40 },
    },
    debrief: { key_learnings: [], references: [] },
  };
  return { ...base, ...overrides };
}

// ------------------------------------------------------------
// scenarioToPatient
// ------------------------------------------------------------

describe("scenarioToPatient", () => {
  test("erkek hastayı doğru gender + yaştan türetilmiş birthDate ile çevirir", () => {
    const patient = scenarioToPatient(makeScenario(), { referenceYear: 2026 });
    expect(patient.resourceType).toBe("Patient");
    expect(patient.id).toBe("kardiyoloji-stemi-001");
    expect(patient.gender).toBe("male");
    // 2026 - 62 = 1964 (kısmi tarih: yalnız yıl)
    expect(patient.birthDate).toBe("1964");
    // name verilmediyse hiç eklenmez
    expect(patient.name).toBeUndefined();
  });

  test("kadın hasta + opsiyonel name → female gender ve HumanName", () => {
    const scenario = makeScenario({
      patient: { ...makeScenario().patient, sex: "F", age: 30 },
    });
    const patient = scenarioToPatient(scenario, { referenceYear: 2026, name: "Ayşe Y." });
    expect(patient.gender).toBe("female");
    expect(patient.birthDate).toBe("1996");
    expect(patient.name).toEqual([{ text: "Ayşe Y." }]);
  });
});

// ------------------------------------------------------------
// scenarioToConditions
// ------------------------------------------------------------

describe("scenarioToConditions", () => {
  test("ICD-10 birincil + SNOMED ikincil coding üretir, subject hastaya bağlı", () => {
    const conditions = scenarioToConditions(makeScenario());
    expect(conditions).toHaveLength(1);
    const c = conditions[0];
    expect(c.resourceType).toBe("Condition");
    expect(c.subject).toEqual({ reference: "Patient/kardiyoloji-stemi-001" });
    const coding = c.code?.coding ?? [];
    expect(coding[0]).toEqual({ system: "http://hl7.org/fhir/sid/icd-10", code: "I21.0" });
    expect(coding[1]).toEqual({ system: "http://snomed.info/sct", code: "401303003" });
  });

  test("clinical_codes yoksa boş dizi döner (guard)", () => {
    const scenario = makeScenario({ clinical_codes: undefined });
    expect(scenarioToConditions(scenario)).toEqual([]);
  });

  test("yalnız ICD-10 varsa tek coding üretir", () => {
    const scenario = makeScenario({ clinical_codes: { icd10: "T07" } });
    const coding = scenarioToConditions(scenario)[0].code?.coding ?? [];
    expect(coding).toHaveLength(1);
    expect(coding[0].system).toBe("http://hl7.org/fhir/sid/icd-10");
  });
});

// ------------------------------------------------------------
// scenarioToMedicationRequests
// ------------------------------------------------------------

describe("scenarioToMedicationRequests", () => {
  test("current_medications her ilacı MedicationRequest'e çevirir", () => {
    const reqs = scenarioToMedicationRequests(makeScenario());
    expect(reqs).toHaveLength(2);
    expect(reqs[0].resourceType).toBe("MedicationRequest");
    expect(reqs[0].status).toBe("active");
    expect(reqs[0].intent).toBe("plan");
    expect(reqs[0].subject).toEqual({ reference: "Patient/kardiyoloji-stemi-001" });
    expect(reqs[0].medicationCodeableConcept).toEqual({ text: "Metformin 1000 mg 2x1" });
    expect(reqs[1].medicationCodeableConcept).toEqual({ text: "Ramipril 5 mg 1x1" });
  });

  test("ilaç listesi yok/boş ise boş dizi döner; boş string'ler elenir", () => {
    const empty = scenarioToMedicationRequests(
      makeScenario({ patient: { ...makeScenario().patient, current_medications: undefined } }),
    );
    expect(empty).toEqual([]);

    const withBlank = scenarioToMedicationRequests(
      makeScenario({ patient: { ...makeScenario().patient, current_medications: ["", "  ", "ASA 100 mg"] } }),
    );
    expect(withBlank).toHaveLength(1);
    expect(withBlank[0].medicationCodeableConcept?.text).toBe("ASA 100 mg");
  });
});

// ------------------------------------------------------------
// vitalsToObservations
// ------------------------------------------------------------

describe("vitalsToObservations", () => {
  test("altı temel vital → LOINC kodlu + UCUM birimli Observation üretir", () => {
    const obs = vitalsToObservations(baseVitals);
    expect(obs).toHaveLength(6);

    const byLoinc = (code: string) =>
      obs.find((o) => o.code?.coding?.some((c) => c.code === code));

    const hr = byLoinc("8867-4");
    expect(hr?.resourceType).toBe("Observation");
    expect(hr?.status).toBe("final");
    expect(hr?.valueQuantity).toEqual({
      value: 104,
      unit: "/min",
      system: "http://unitsofmeasure.org",
      code: "/min",
    });

    const spo2 = byLoinc("59408-5");
    expect(spo2?.valueQuantity?.unit).toBe("%");

    const sys = byLoinc("8480-6");
    expect(sys?.valueQuantity).toMatchObject({ value: 148, code: "mm[Hg]" });

    const dia = byLoinc("8462-4");
    expect(dia?.valueQuantity?.value).toBe(92);

    const rr = byLoinc("9279-1");
    expect(rr?.valueQuantity?.value).toBe(22);

    const temp = byLoinc("8310-5");
    expect(temp?.valueQuantity).toMatchObject({ value: 36.7, code: "Cel" });

    // Hepsi vital-signs kategorisinde
    expect(hr?.category?.[0].coding?.[0].code).toBe("vital-signs");
  });

  test("eksik/geçersiz (undefined, NaN) vital alanları gözleme çevrilmez", () => {
    const partial: PatientVitals = {
      hr: 80,
      bp_systolic: Number.NaN,
      bp_diastolic: 70,
      spo2: 98,
      temp: 37,
      rr: 16,
    };
    const obs = vitalsToObservations(partial);
    // NaN sistolik elenir → 5 gözlem
    expect(obs).toHaveLength(5);
    expect(obs.find((o) => o.code?.coding?.some((c) => c.code === "8480-6"))).toBeUndefined();
    // diastolik (8462-4) hâlâ var
    expect(obs.find((o) => o.code?.coding?.some((c) => c.code === "8462-4"))).toBeDefined();
  });
});
