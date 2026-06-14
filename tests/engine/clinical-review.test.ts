// ============================================================
// clinical-review — durum yardımcıları + checklist testleri (Faz ④)
// ============================================================

import { describe, expect, test } from "vitest";
import {
  getClinicalStatus,
  isScenarioActive,
  buildReviewChecklist,
  autoChecksPass,
  manualChecklistKeys,
  canActivate,
  buildClinicalReviewSnippet,
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

  test("yetişkin yaş ama düşük kilo (weight<40) da pediatrik tetikler", () => {
    // OR dalı: age>=18 ama weight_kg=30 → pediatric_dosing elle (null)
    const s = makeScenario({ patient: { age: 40, sex: "K", weight_kg: 30 } as Scenario["patient"] });
    const c = buildReviewChecklist(s);
    expect(c.find((i) => i.key === "pediatric_dosing")?.pass).toBeNull();
  });

  test("erişkin (yaş≥18 + kilo≥40) → pediatric_dosing otomatik geçer", () => {
    const s = makeScenario({ patient: { age: 50, sex: "M", weight_kg: 80 } as Scenario["patient"] });
    const c = buildReviewChecklist(s);
    expect(c.find((i) => i.key === "pediatric_dosing")?.pass).toBe(true);
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

// Klinik disiplinin ÇEKİRDEK garantisi: otomatik ACTIVE'e geçiş engellenmeli.
describe("canActivate — ACTIVE kilit predicate", () => {
  const fullAuto = {
    debrief: { key_learnings: [], references: ["ESC 2023"] },
    clinical_codes: { icd10: "I21", snomed_ct: "22298006" },
  };

  test("otomatik kontroller eksikse elle hepsi işaretli olsa bile false", () => {
    const s = makeScenario(); // ref/ICD/SNOMED yok
    const allManual: Record<string, boolean> = {};
    for (const k of manualChecklistKeys(s)) allManual[k] = true;
    expect(canActivate(s, allManual)).toBe(false);
  });

  test("otomatik tam ama elle maddeler işaretsizse false", () => {
    const s = makeScenario(fullAuto);
    expect(manualChecklistKeys(s).length).toBeGreaterThan(0);
    expect(canActivate(s, {})).toBe(false);
  });

  test("otomatik tam + tüm elle maddeler işaretliyse true", () => {
    const s = makeScenario(fullAuto);
    const allManual: Record<string, boolean> = {};
    for (const k of manualChecklistKeys(s)) allManual[k] = true;
    expect(canActivate(s, allManual)).toBe(true);
  });

  test("çözülmemiş draft_areas varsa (otomatik kontrol kalır) false", () => {
    const s = makeScenario({
      ...fullAuto,
      clinical_review: { status: "DRAFT", draft_areas: ["deterioration"] },
    });
    const allManual: Record<string, boolean> = {};
    for (const k of manualChecklistKeys(s)) allManual[k] = true;
    expect(canActivate(s, allManual)).toBe(false);
  });
});

describe("buildClinicalReviewSnippet", () => {
  const base = makeScenario({
    clinical_review: { status: "DRAFT", draft_areas: ["deterioration", "auscultation"] },
  });

  test("status + reviewed_at yazılır", () => {
    const s = buildClinicalReviewSnippet(base, {
      intended: "REVIEWED_PENDING_ACTIVATION",
      reviewedAt: "2026-06-14",
    });
    expect(s).toContain('status: "REVIEWED_PENDING_ACTIVATION"');
    expect(s).toContain('reviewed_at: "2026-06-14"');
    expect(s.startsWith("  clinical_review: {")).toBe(true);
  });

  test("non-ACTIVE'de draft_areas korunur", () => {
    const s = buildClinicalReviewSnippet(base, {
      intended: "REVIEWED_PENDING_ACTIVATION",
      reviewedAt: "2026-06-14",
    });
    expect(s).toContain("draft_areas:");
    expect(s).toContain('"deterioration"');
  });

  test("ACTIVE'de draft_areas ÇIKARILIR (tüm alanlar onaylı sayılır)", () => {
    const s = buildClinicalReviewSnippet(base, {
      intended: "ACTIVE",
      reviewedAt: "2026-06-14",
    });
    expect(s).not.toContain("draft_areas");
    expect(s).toContain('status: "ACTIVE"');
  });

  test("notes JSON ile kaçışlanır (kırık TS üretmez)", () => {
    const s = buildClinicalReviewSnippet(base, {
      intended: "ACTIVE",
      notes: 'tırnak "test" ve satır\nsonu',
      reviewedAt: "2026-06-14",
    });
    expect(s).toContain('notes: "tırnak \\"test\\" ve satır\\nsonu"');
  });

  test("boş notes satırı eklenmez", () => {
    const s = buildClinicalReviewSnippet(base, {
      intended: "ACTIVE",
      notes: "   ",
      reviewedAt: "2026-06-14",
    });
    expect(s).not.toContain("notes:");
  });
});
