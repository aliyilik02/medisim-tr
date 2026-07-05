// ============================================================
// Hasta varyantı — findVariant / applyPatientVariant / applyVitalsVariant
// / applyStepVariant / applyStepsVariant / resolveScenarioVariant (saf)
// ============================================================

import { describe, expect, test } from "vitest";
import {
  findVariant,
  applyPatientVariant,
  applyVitalsVariant,
  applyStepVariant,
  applyStepsVariant,
  resolveScenarioVariant,
} from "@/engine/variant";
import type {
  Scenario,
  Patient,
  PatientVitals,
  PatientVariant,
  Step,
} from "@/engine/types";

// ── Sentetik fixture'lar (gerçek senaryo dosyasına bağımlılık YOK) ──

const basePatient: Patient = {
  age: 55,
  sex: "M",
  weight_kg: 80,
  height_cm: 175,
  chief_complaint: "Göğüs ağrısı",
  history_items: ["HT", "DM"],
  allergies: ["penisilin"],
  current_medications: ["metformin"],
  modifiers: { beta_blocker: true },
};

const baseVitals: PatientVitals = {
  hr: 92,
  bp_systolic: 130,
  bp_diastolic: 85,
  spo2: 96,
  temp: 36.8,
  rr: 18,
  pain: 7,
};

const baseSteps: Step[] = [
  {
    id: "s1",
    title: "İlk değerlendirme",
    prompt: "Ne yaparsın?",
    kind: "action",
    expected_outcomes: [
      {
        action: { type: "examine", target_id: "gogus" },
        points: 10,
        feedback: "Doğru",
      },
    ],
  },
  { id: "s2", title: "Brifing", prompt: "", kind: "info", content: "Bilgi." },
];

const variant: PatientVariant = {
  id: "v-atipik",
  label: "Atipik prezentasyon",
  description: "Yaşlı kadın, atipik semptom",
  patient: {
    age: 78,
    sex: "F",
    chief_complaint: "Halsizlik",
    modifiers: { bobrek_yetm: true },
  },
  initial_vitals: { hr: 110, spo2: 91 },
  step_overrides: {
    s1: { title: "Atipik değerlendirme", prompt: "Yaşlı hastada ne yaparsın?" },
  },
};

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "test-variant-001",
    version: "1",
    title: "Varyant Testi",
    description: "d",
    specialty: "dahiliye",
    tags: [],
    difficulty: 3,
    estimated_minutes: 10,
    modes: ["quiz"],
    language: "tr",
    last_updated: "2026-07-05",
    patient: basePatient,
    initial_vitals: baseVitals,
    available_medications: [],
    available_equipment: [],
    steps: baseSteps,
    start_step_id: "s1",
    scoring: {} as Scenario["scoring"],
    debrief: { key_learnings: [], references: [] } as unknown as Scenario["debrief"],
    variants: [variant],
    ...overrides,
  };
}

// ── findVariant ──

describe("findVariant", () => {
  test("variantId undefined → null", () => {
    expect(findVariant(makeScenario(), undefined)).toBeNull();
  });

  test("var olmayan id → null", () => {
    expect(findVariant(makeScenario(), "yok-boyle-varyant")).toBeNull();
  });

  test("senaryoda variants alanı yoksa → null (çökme yok)", () => {
    expect(findVariant(makeScenario({ variants: undefined }), "v-atipik")).toBeNull();
  });

  test("eşleşen id → varyant nesnesi", () => {
    expect(findVariant(makeScenario(), "v-atipik")?.label).toBe("Atipik prezentasyon");
  });
});

// ── applyPatientVariant ──

describe("applyPatientVariant — alan bazlı birleşme", () => {
  test("override edilen alanlar varyanttan gelir", () => {
    const p = applyPatientVariant(basePatient, variant);
    expect(p.age).toBe(78);
    expect(p.sex).toBe("F");
    expect(p.chief_complaint).toBe("Halsizlik");
  });

  test("override edilmeyen alanlar base'den korunur", () => {
    const p = applyPatientVariant(basePatient, variant);
    expect(p.weight_kg).toBe(80);
    expect(p.height_cm).toBe(175);
    expect(p.history_items).toEqual(["HT", "DM"]);
    expect(p.allergies).toEqual(["penisilin"]);
    expect(p.current_medications).toEqual(["metformin"]);
  });

  test("modifiers derin birleşir (base + varyant anahtarları)", () => {
    const p = applyPatientVariant(basePatient, variant);
    expect(p.modifiers).toEqual({ beta_blocker: true, bobrek_yetm: true });
  });

  test("varyant dizileri verilmişse base dizilerinin YERİNE geçer", () => {
    const v: PatientVariant = {
      ...variant,
      patient: { allergies: [], history_items: ["KOAH"] },
    };
    const p = applyPatientVariant(basePatient, v);
    expect(p.allergies).toEqual([]); // boş dizi bile override sayılır
    expect(p.history_items).toEqual(["KOAH"]);
  });

  test("boş patient override → base tamamen korunur", () => {
    const empty: PatientVariant = { ...variant, patient: {} };
    const p = applyPatientVariant(basePatient, empty);
    expect(p).toMatchObject(basePatient);
  });

  test("base mutasyona uğramaz", () => {
    applyPatientVariant(basePatient, variant);
    expect(basePatient.age).toBe(55);
    expect(basePatient.modifiers).toEqual({ beta_blocker: true });
  });
});

// ── applyVitalsVariant ──

describe("applyVitalsVariant", () => {
  test("kısmi vital override — verilenler değişir, kalanlar korunur", () => {
    const v = applyVitalsVariant(baseVitals, variant);
    expect(v.hr).toBe(110);
    expect(v.spo2).toBe(91);
    expect(v.bp_systolic).toBe(130);
    expect(v.pain).toBe(7);
  });

  test("initial_vitals verilmeyen varyant → vitaller aynen kalır", () => {
    const noVitals: PatientVariant = { ...variant, initial_vitals: undefined };
    expect(applyVitalsVariant(baseVitals, noVitals)).toEqual(baseVitals);
  });
});

// ── applyStepVariant / applyStepsVariant ──

describe("applyStepVariant / applyStepsVariant", () => {
  test("override'ı olmayan adım AYNI referansla döner", () => {
    expect(applyStepVariant(baseSteps[1], variant)).toBe(baseSteps[1]);
  });

  test("override'lı adımda verilen alanlar değişir, kalanlar korunur", () => {
    const s = applyStepVariant(baseSteps[0], variant);
    expect(s.title).toBe("Atipik değerlendirme");
    expect(s.prompt).toBe("Yaşlı hastada ne yaparsın?");
    expect(s.id).toBe("s1");
    expect(s.kind).toBe("action");
    if (s.kind === "action") {
      expect(s.expected_outcomes).toHaveLength(1); // outcome'lar korunur
    }
  });

  test("applyStepsVariant sadece hedef adımı değiştirir, sırayı korur", () => {
    const steps = applyStepsVariant(baseSteps, variant);
    expect(steps).toHaveLength(2);
    expect(steps[0].title).toBe("Atipik değerlendirme");
    expect(steps[1]).toBe(baseSteps[1]); // dokunulmadı
  });

  test("step_overrides olmayan varyant → tüm adımlar aynen", () => {
    const noOverrides: PatientVariant = { ...variant, step_overrides: undefined };
    const steps = applyStepsVariant(baseSteps, noOverrides);
    expect(steps[0]).toBe(baseSteps[0]);
    expect(steps[1]).toBe(baseSteps[1]);
  });
});

// ── resolveScenarioVariant ──

describe("resolveScenarioVariant", () => {
  test("variantId yok/eşleşmiyor → orijinal senaryo AYNI referans", () => {
    const sc = makeScenario();
    expect(resolveScenarioVariant(sc, undefined)).toBe(sc);
    expect(resolveScenarioVariant(sc, "bilinmeyen")).toBe(sc);
  });

  test("eşleşen varyant → hasta+vital+adımlar çözülür, meta korunur", () => {
    const sc = makeScenario();
    const resolved = resolveScenarioVariant(sc, "v-atipik");
    expect(resolved).not.toBe(sc);
    expect(resolved.patient.age).toBe(78);
    expect(resolved.initial_vitals.hr).toBe(110);
    expect(resolved.steps[0].title).toBe("Atipik değerlendirme");
    // meta alanlar değişmez
    expect(resolved.id).toBe(sc.id);
    expect(resolved.title).toBe(sc.title);
    expect(resolved.start_step_id).toBe("s1");
  });

  test("orijinal senaryo mutasyona uğramaz", () => {
    const sc = makeScenario();
    resolveScenarioVariant(sc, "v-atipik");
    expect(sc.patient.age).toBe(55);
    expect(sc.initial_vitals.hr).toBe(92);
    expect(sc.steps[0].title).toBe("İlk değerlendirme");
  });
});
