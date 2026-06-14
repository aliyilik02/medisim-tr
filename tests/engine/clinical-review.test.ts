// ============================================================
// clinical-review — durum yardımcıları + checklist testleri (Faz ④)
// ============================================================

import { describe, expect, test } from "vitest";
import {
  getClinicalStatus,
  isScenarioActive,
  buildReviewChecklist,
  autoChecksPass,
} from "@/engine/clinical-review";
import type { Scenario } from "@/engine/types";

// Minimal sahte senaryo — sadece checklist alanları
function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "test-001",
    version: "1",
    title: "Test",
    description: "d",
    specialty: "dahiliye",
    tags: [],
    difficulty: 3,
    estimated_minutes: 10,
    modes: ["quiz"],
    language: "tr",
    last_updated: "2026-06-14",
    patient: { age: 40, sex: "M", weight_kg: 70 } as Scenario["patient"],
    initial_vitals: {} as Scenario["initial_vitals"],
    available_medications: [],
    available_equipment: [],
    steps: [],
    start_step_id: "s1",
    scoring: {} as Scenario["scoring"],
    debrief: { key_learnings: [], references: [] },
    ...overrides,
  };
}

describe("getClinicalStatus", () => {
  test("alan yoksa güvenli varsayılan DRAFT", () => {
    expect(getClinicalStatus(makeScenario())).toBe("DRAFT");
  });

  test("clinical_review.status okunur", () => {
    const s = makeScenario({ clinical_review: { status: "ACTIVE" } });
    expect(getClinicalStatus(s)).toBe("ACTIVE");
    expect(isScenarioActive(s)).toBe(true);
  });

  test("DRAFT/REVIEWED aktif sayılmaz", () => {
    expect(isScenarioActive(makeScenario())).toBe(false);
    expect(
      isScenarioActive(makeScenario({ clinical_review: { status: "REVIEWED_PENDING_ACTIVATION" } }))
    ).toBe(false);
  });
});

describe("buildReviewChecklist", () => {
  test("kılavuz referansı yoksa guideline maddesi başarısız", () => {
    const c = buildReviewChecklist(makeScenario());
    expect(c.find((i) => i.key === "guideline_references")?.pass).toBe(false);
  });

  test("referans + ICD + SNOMED varsa ilgili maddeler geçer", () => {
    const s = makeScenario({
      debrief: { key_learnings: [], references: ["ESC 2023"] },
      clinical_codes: { icd10: "I21", snomed_ct: "22298006" },
    });
    const c = buildReviewChecklist(s);
    expect(c.find((i) => i.key === "guideline_references")?.pass).toBe(true);
    expect(c.find((i) => i.key === "icd10")?.pass).toBe(true);
    expect(c.find((i) => i.key === "snomed")?.pass).toBe(true);
  });

  test("pediatrik (kilo<40) → mg/kg maddesi elle (pass=null)", () => {
    const s = makeScenario({ patient: { age: 1, sex: "M", weight_kg: 9 } as Scenario["patient"] });
    const c = buildReviewChecklist(s);
    expect(c.find((i) => i.key === "pediatric_dosing")?.pass).toBeNull();
  });

  test("çözülmemiş draft_areas → ilgili madde başarısız", () => {
    const s = makeScenario({
      clinical_review: { status: "DRAFT", draft_areas: ["deterioration"] },
    });
    const c = buildReviewChecklist(s);
    expect(c.find((i) => i.key === "draft_areas")?.pass).toBe(false);
  });
});

describe("autoChecksPass", () => {
  test("eksik kılavuz/kod → false", () => {
    expect(autoChecksPass(makeScenario())).toBe(false);
  });

  test("otomatik geçer maddeler tamsa true (elle olanlar engellemez)", () => {
    const s = makeScenario({
      debrief: { key_learnings: [], references: ["TKD 2023"] },
      clinical_codes: { icd10: "I21", snomed_ct: "22298006" },
    });
    expect(autoChecksPass(s)).toBe(true);
  });
});
