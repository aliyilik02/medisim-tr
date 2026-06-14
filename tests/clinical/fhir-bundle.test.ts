// ============================================================
// fhirBundle — Bundle birleştirici testleri (#6 FHIR export)
// ============================================================

import { describe, expect, test } from "vitest";
import { buildScenarioFhirBundle, sessionToFhirBundle } from "@/clinical/fhir";
import type { Scenario, SessionState, PatientVitals } from "@/engine";

const vitals: PatientVitals = {
  hr: 110,
  spo2: 88,
  bp_systolic: 90,
  bp_diastolic: 55,
  rr: 24,
  temp: 37.1,
} as PatientVitals;

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "acil-test-001",
    version: "1",
    title: "Test Anaflaksi",
    description: "d",
    specialty: "acil",
    tags: [],
    difficulty: 3,
    estimated_minutes: 10,
    modes: ["interactive_3d"],
    language: "tr",
    last_updated: "2026-06-14",
    patient: { age: 35, sex: "F", weight_kg: 62, current_medications: ["metformin"] } as Scenario["patient"],
    initial_vitals: vitals,
    available_medications: [],
    available_equipment: [],
    steps: [],
    start_step_id: "s1",
    scoring: {} as Scenario["scoring"],
    debrief: { key_learnings: [], references: ["WAO 2020"] },
    clinical_codes: { icd10: "T78.2", snomed_ct: "39579001" },
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    vitals,
    active_medications: [
      { medication_id: "adrenalin" } as SessionState["active_medications"][number],
    ],
    started_at: 1_700_000_000_000,
    results: [],
    total_score: 0,
    ...overrides,
  } as SessionState;
}

describe("buildScenarioFhirBundle", () => {
  test("collection Bundle + Patient/Condition/Observation içerir", () => {
    const b = buildScenarioFhirBundle(makeScenario(), vitals);
    expect(b.resourceType).toBe("Bundle");
    expect(b.type).toBe("collection");
    const types = (b.entry ?? []).map((e) => e.resource?.resourceType);
    expect(types).toContain("Patient");
    expect(types).toContain("Condition");
    expect(types).toContain("Observation");
  });

  test("Observation'lara subject (Patient referansı) eklenir", () => {
    const b = buildScenarioFhirBundle(makeScenario(), vitals);
    const obs = (b.entry ?? [])
      .map((e) => e.resource)
      .filter((r) => r?.resourceType === "Observation");
    expect(obs.length).toBeGreaterThan(0);
    for (const o of obs) {
      expect((o as { subject?: { reference?: string } }).subject?.reference).toBe(
        "Patient/acil-test-001"
      );
    }
  });

  test("ev ilaçları MedicationRequest olur", () => {
    const b = buildScenarioFhirBundle(makeScenario(), vitals);
    const types = (b.entry ?? []).map((e) => e.resource?.resourceType);
    expect(types).toContain("MedicationRequest");
  });
});

describe("sessionToFhirBundle", () => {
  test("verilen ilaçlar MedicationAdministration (completed) olur", () => {
    const b = sessionToFhirBundle(makeScenario(), makeSession());
    const admins = (b.entry ?? [])
      .map((e) => e.resource)
      .filter((r) => r?.resourceType === "MedicationAdministration");
    expect(admins.length).toBe(1);
    const a = admins[0] as { status?: string; medicationCodeableConcept?: { text?: string } };
    expect(a.status).toBe("completed");
    expect(a.medicationCodeableConcept?.text).toBe("adrenalin");
  });

  test("verilen ilaç yoksa MedicationAdministration üretmez", () => {
    const b = sessionToFhirBundle(makeScenario(), makeSession({ active_medications: [] }));
    const admins = (b.entry ?? [])
      .map((e) => e.resource)
      .filter((r) => r?.resourceType === "MedicationAdministration");
    expect(admins.length).toBe(0);
  });

  test("üretilen Bundle geçerli JSON'a serileşir", () => {
    const b = sessionToFhirBundle(makeScenario(), makeSession());
    const json = JSON.stringify(b);
    expect(json).toContain('"resourceType":"Bundle"');
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
