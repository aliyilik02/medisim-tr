import { describe, expect, test } from "vitest";
import {
  deriveGradeBands,
  getEffectiveGradeBands,
  getEffectivePassingScore,
  STANDARD_GRADE_THRESHOLDS,
} from "@/engine/grading";

describe("STANDARD_GRADE_THRESHOLDS", () => {
  test("Body Interact uyumlu eşikler", () => {
    expect(STANDARD_GRADE_THRESHOLDS.A).toBe(0.85);
    expect(STANDARD_GRADE_THRESHOLDS.B).toBe(0.70);
    expect(STANDARD_GRADE_THRESHOLDS.C).toBe(0.55);
    expect(STANDARD_GRADE_THRESHOLDS.D).toBe(0.40);
  });
});

describe("deriveGradeBands", () => {
  test("max_points=100 için standart eşikler", () => {
    expect(deriveGradeBands(100)).toEqual({ A: 85, B: 70, C: 55, D: 40 });
  });

  test("max_points=255 (hipoglisemi) yuvarlanmış değerler", () => {
    expect(deriveGradeBands(255)).toEqual({ A: 217, B: 179, C: 140, D: 102 });
  });

  test("max_points=200 yuvarlama gerektirmez", () => {
    expect(deriveGradeBands(200)).toEqual({ A: 170, B: 140, C: 110, D: 80 });
  });

  test("0 ve 1 edge case", () => {
    expect(deriveGradeBands(0)).toEqual({ A: 0, B: 0, C: 0, D: 0 });
    expect(deriveGradeBands(1)).toEqual({ A: 1, B: 1, C: 1, D: 0 });
  });

  test("monotonik sıra: A > B > C > D (yeterince büyük max'ta)", () => {
    const b = deriveGradeBands(500);
    expect(b.A).toBeGreaterThan(b.B);
    expect(b.B).toBeGreaterThan(b.C);
    expect(b.C).toBeGreaterThan(b.D);
  });
});

describe("getEffectiveGradeBands", () => {
  const baseConfig = {
    max_points: 200,
    passing_score: 80,
    grade_bands: { A: 999, B: 888, C: 777, D: 666 }, // sahte değerler
  };

  test("mode 'auto' (varsayılan) helper kullanır, yazılı değerler ignore", () => {
    const result = getEffectiveGradeBands(baseConfig);
    expect(result).toEqual({ A: 170, B: 140, C: 110, D: 80 });
  });

  test("mode 'manual' yazılı grade_bands kullanır", () => {
    const result = getEffectiveGradeBands({ ...baseConfig, grading_mode: "manual" });
    expect(result).toEqual({ A: 999, B: 888, C: 777, D: 666 });
  });

  test("mode 'auto' explicit set", () => {
    const result = getEffectiveGradeBands({ ...baseConfig, grading_mode: "auto" });
    expect(result).toEqual({ A: 170, B: 140, C: 110, D: 80 });
  });
});

describe("getEffectivePassingScore", () => {
  test("auto mode D bandı = max × 0.40", () => {
    expect(
      getEffectivePassingScore({
        max_points: 100,
        passing_score: 999,
        grade_bands: { A: 0, B: 0, C: 0, D: 0 },
      })
    ).toBe(40);
  });

  test("auto mode max_points=255 → 102", () => {
    expect(
      getEffectivePassingScore({
        max_points: 255,
        passing_score: 999,
        grade_bands: { A: 0, B: 0, C: 0, D: 0 },
      })
    ).toBe(102);
  });

  test("manual mode passing_score değerini korur", () => {
    expect(
      getEffectivePassingScore({
        max_points: 100,
        passing_score: 50,
        grade_bands: { A: 0, B: 0, C: 0, D: 0 },
        grading_mode: "manual",
      })
    ).toBe(50);
  });
});
