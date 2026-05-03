import { describe, expect, test } from "vitest";
import { evaluateAction, getStep, calculateGrade, isVisibleAtDifficulty } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";
import { applyDoublePenaltyGuard, combineActionPoints } from "../helpers/scoring";

const hipoglisemi = getScenario("dahiliye-hipoglisemi-001");
if (!hipoglisemi) throw new Error("Hipoglisemi senaryosu bulunamadı");

describe("scoring — calculateGrade", () => {
  const scoring = {
    max_points: 200,
    passing_score: 120,
    grade_bands: { A: 180, B: 150, C: 120, D: 80 },
  } as const;

  test("A bandı", () => {
    expect(calculateGrade(190, scoring)).toBe("A");
    expect(calculateGrade(180, scoring)).toBe("A");
  });
  test("B bandı", () => {
    expect(calculateGrade(150, scoring)).toBe("B");
    expect(calculateGrade(160, scoring)).toBe("B");
  });
  test("C bandı", () => {
    expect(calculateGrade(120, scoring)).toBe("C");
  });
  test("D bandı", () => {
    expect(calculateGrade(80, scoring)).toBe("D");
  });
  test("F (D'nin altı)", () => {
    expect(calculateGrade(50, scoring)).toBe("F");
    expect(calculateGrade(0, scoring)).toBe("F");
    expect(calculateGrade(-10, scoring)).toBe("F");
  });
});

describe("scoring — isVisibleAtDifficulty", () => {
  test("min/max yoksa her seviyede görünür", () => {
    expect(isVisibleAtDifficulty(undefined, undefined, 1)).toBe(true);
    expect(isVisibleAtDifficulty(undefined, undefined, 5)).toBe(true);
  });
  test("seçili < min → gizli", () => {
    expect(isVisibleAtDifficulty(3, undefined, 2)).toBe(false);
    expect(isVisibleAtDifficulty(3, undefined, 3)).toBe(true);
  });
  test("seçili > max → gizli", () => {
    expect(isVisibleAtDifficulty(undefined, 2, 3)).toBe(false);
    expect(isVisibleAtDifficulty(undefined, 2, 2)).toBe(true);
  });
});

describe("scoring — çift cezalama regresyonu (commit 2d142a5)", () => {
  // Senaryo: hipoglisemi adım 1, hasta glukozu 38 mg/dL — INSULIN verilirse:
  //   evaluation.points = -25 (matched_outcome dolu, senaryo yazarınca yakalandı)
  //   pharmaPoints = -25 (kontrendikasyon — hipoglisemide insulin)
  //   eski hatalı toplam: -50 (çift cezalama)
  //   düzeltilmiş toplam: -25 (matched varsa pharma yutulur)

  test("matched_outcome dolu iken effectivePharmaPoints = 0", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    const evaluation = evaluateAction(
      step,
      { type: "give_medication", target_id: "insulin_regular" },
      hipoglisemi,
      1
    );
    expect(evaluation.matched_outcome).not.toBeNull();
    expect(evaluation.points).toBe(-25);

    const pharmaPoints = -25;
    const eff = applyDoublePenaltyGuard(evaluation.matched_outcome, pharmaPoints);
    expect(eff).toBe(0);

    const total = combineActionPoints(evaluation.points, evaluation.matched_outcome, pharmaPoints);
    expect(total).toBe(-25);
  });

  test("4× insulin → -100, asla -200 olamaz", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    let total = 0;
    for (let i = 0; i < 4; i++) {
      const evaluation = evaluateAction(
        step,
        { type: "give_medication", target_id: "insulin_regular" },
        hipoglisemi,
        1
      );
      total += combineActionPoints(evaluation.points, evaluation.matched_outcome, -25);
    }
    expect(total).toBe(-100);
  });

  test("matched_outcome null iken pharmaPoints normal işler", () => {
    const eff = applyDoublePenaltyGuard(null, -15);
    expect(eff).toBe(-15);
    expect(combineActionPoints(0, null, -15)).toBe(-15);
  });

  test("matched_outcome dolu + pozitif pharma da yutulur (senaryo otoritedir)", () => {
    // Pozitif pharma da olsa, senaryo yakaladıysa onun puanı geçerli
    const step = getStep(hipoglisemi, "step-2-mudahale")!;
    const evaluation = evaluateAction(
      step,
      { type: "give_medication", target_id: "dekstroz_50" },
      hipoglisemi,
      1
    );
    expect(evaluation.matched_outcome).not.toBeNull();
    expect(evaluation.points).toBe(30);

    const total = combineActionPoints(evaluation.points, evaluation.matched_outcome, +5);
    expect(total).toBe(30);
  });

  test("senaryoda yakalanmayan random ilaç → matched null, pharma normal akar", () => {
    const step = getStep(hipoglisemi, "step-2-mudahale")!;
    const evaluation = evaluateAction(
      step,
      { type: "give_medication", target_id: "atropin" },
      hipoglisemi,
      1
    );
    expect(evaluation.matched_outcome).toBeNull();
    const total = combineActionPoints(evaluation.points, evaluation.matched_outcome, -10);
    expect(total).toBe(evaluation.points - 10);
  });

  test("scoring.max_points pozitif ve passing_score'dan büyük (sanity)", () => {
    expect(hipoglisemi.scoring.max_points).toBeGreaterThan(0);
    expect(hipoglisemi.scoring.max_points).toBeGreaterThan(hipoglisemi.scoring.passing_score);
  });
});
