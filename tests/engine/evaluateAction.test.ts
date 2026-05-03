import { describe, expect, test } from "vitest";
import { evaluateAction, getStep } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";

const hipoglisemi = getScenario("dahiliye-hipoglisemi-001");
if (!hipoglisemi) throw new Error("Hipoglisemi senaryosu bulunamadı");

describe("evaluateAction — temel davranış", () => {
  test("step.kind !== action ise points 0 ve null matched_outcome döner", () => {
    const decisionStep = getStep(hipoglisemi, "step-3-takip")!;
    const result = evaluateAction(
      decisionStep,
      { type: "give_medication", target_id: "dekstroz_50" },
      hipoglisemi,
      1
    );
    expect(result.matched_outcome).toBeNull();
    expect(result.points).toBe(0);
  });

  test("eşleşen outcome → matched + doğru puan + critical flag", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    const result = evaluateAction(
      step,
      { type: "use_equipment", target_id: "glukometre" },
      hipoglisemi,
      1
    );
    expect(result.matched_outcome).not.toBeNull();
    expect(result.points).toBe(30);
    expect(result.critical).toBe(true);
  });

  test("hipoglisemi adım 1 — insulin → matched, points -25, critical true (sanity)", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    const result = evaluateAction(
      step,
      { type: "give_medication", target_id: "insulin_regular" },
      hipoglisemi,
      1
    );
    expect(result.matched_outcome).not.toBeNull();
    expect(result.points).toBe(-25);
    expect(result.critical).toBe(true);
  });

  test("eşleşmeyen aksiyon → default_wrong_penalty döner", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    const result = evaluateAction(
      step,
      { type: "give_medication", target_id: "atropin" },
      hipoglisemi,
      1
    );
    expect(result.matched_outcome).toBeNull();
    expect(result.points).toBe(step.kind === "action" ? step.default_wrong_penalty ?? -5 : -5);
  });

  test("envanterde olmayan ilaç default penalty + ek uyarı feedback", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    const result = evaluateAction(
      step,
      { type: "give_medication", target_id: "morfin" },
      hipoglisemi,
      1
    );
    expect(result.feedback).toMatch(/envanterde yok/i);
  });

  test("vitals_change ve unlocks alanları aktarılır", () => {
    const step = getStep(hipoglisemi, "step-2-mudahale")!;
    const result = evaluateAction(
      step,
      { type: "give_medication", target_id: "dekstroz_50" },
      hipoglisemi,
      1
    );
    expect(result.unlocks).toContain("step-3-takip");
  });
});

describe("evaluateAction — zorluk filtresi", () => {
  test("min_difficulty 2 olan outcome S1'de görünmez (eşleşmez)", () => {
    const step = getStep(hipoglisemi, "s2b_orders")!;
    if (step.kind !== "action") throw new Error("action step bekleniyordu");
    const s2only = step.expected_outcomes.find(
      (o) =>
        o.action.target_id === "hipo-etiology-panel" &&
        o.action.type === "order_test"
    );
    expect(s2only?.min_difficulty).toBe(2);

    const s1Result = evaluateAction(
      step,
      { type: "order_test", target_id: "hipo-etiology-panel" },
      hipoglisemi,
      1
    );
    expect(s1Result.matched_outcome).toBeNull();

    const s2Result = evaluateAction(
      step,
      { type: "order_test", target_id: "hipo-etiology-panel" },
      hipoglisemi,
      2
    );
    expect(s2Result.matched_outcome).not.toBeNull();
    expect(s2Result.points).toBe(20);
  });
});

describe("evaluateAction — dose ve site eşleştirmesi (sentetik fixture)", () => {
  // Klinik veriye dokunmadan motoru izole etmek için minimal sentetik senaryo.
  // Bu fixture sadece bu test'in scope'unda kullanılır, src/data altına yazılmaz.
  const fixture = makeFixtureScenario({
    expected: [
      {
        action: { type: "give_medication", target_id: "drug-x", dose: "100mg" },
        points: 10,
        feedback: "tam doz",
      },
    ],
  });
  const step = fixture.steps[0];

  test("dose eşleşirse matched", () => {
    const r = evaluateAction(
      step,
      { type: "give_medication", target_id: "drug-x", dose: "100mg" },
      fixture
    );
    expect(r.matched_outcome).not.toBeNull();
  });

  test("aksiyon dose'u outcome dose'undan farklıysa matched değil", () => {
    const r = evaluateAction(
      step,
      { type: "give_medication", target_id: "drug-x", dose: "200mg" },
      fixture
    );
    expect(r.matched_outcome).toBeNull();
  });
});

// ------------------------------------------------------------
// Test fixture yardımcısı (tip uyumlu minimum scenario)
// ------------------------------------------------------------
import type { ActionOutcome, Scenario } from "@/engine";

interface FixtureSpec {
  expected: Array<Pick<ActionOutcome, "action" | "points" | "feedback"> & Partial<ActionOutcome>>;
}

function makeFixtureScenario(spec: FixtureSpec): Scenario {
  return {
    id: "fixture-001",
    version: "0.0.1",
    title: "Fixture",
    description: "Test fixture",
    specialty: "acil",
    tags: [],
    difficulty: 1,
    estimated_minutes: 1,
    modes: ["quiz"],
    language: "tr",
    last_updated: "2026-05-03",
    patient: {
      age: 50,
      sex: "M",
      weight_kg: 70,
      chief_complaint: "test",
      history_items: [],
      allergies: [],
    },
    initial_vitals: { hr: 80, bp_systolic: 120, bp_diastolic: 80, spo2: 98, temp: 36.5, rr: 16 },
    available_medications: ["drug-x"],
    available_equipment: [],
    steps: [
      {
        kind: "action",
        id: "s1",
        title: "fixture step",
        prompt: "?",
        expected_outcomes: spec.expected as ActionOutcome[],
      },
    ],
    start_step_id: "s1",
    scoring: {
      max_points: 100,
      passing_score: 60,
      grade_bands: { A: 90, B: 75, C: 60, D: 40 },
    },
    debrief: { key_learnings: [], references: [] },
  };
}
