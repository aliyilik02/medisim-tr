// ============================================================
// Zorluk-duyarlı puanlama (scoring fix) — /debug bulgusu
// ============================================================
// SORUN: max_points sabit ama ulaşılabilir puan zorlukla büyüyor
// (min_difficulty gated adım/outcome) → yüksek zorlukta %>100 + bedava A.
// FIX: getAchievableMaxPoints(senaryo, zorluk) → yüzde + grade buna göre.

import { describe, it, expect } from "vitest";
import {
  getAchievableMaxPoints,
  calculateGradeForDifficulty,
  getEffectivePassingScoreForDifficulty,
  finalizeSession,
  startSession,
} from "@/engine";
import { scenario_stemi } from "@/data/scenarios/stemi";

describe("getAchievableMaxPoints — zorlukla büyür", () => {
  it("STEMI: d5 ulaşılabilir > d1 (üst zorlukta ek adım/outcome açılır)", () => {
    const d1 = getAchievableMaxPoints(scenario_stemi, 1);
    const d5 = getAchievableMaxPoints(scenario_stemi, 5);
    expect(d5).toBeGreaterThan(d1);
    // Eski hata: sabit max_points (293) d5'te %188 veriyordu — artık d5 tavanı d5'e göre.
    expect(d5).toBeGreaterThan(scenario_stemi.scoring.max_points);
  });

  it("pozitif tavan (>0)", () => {
    for (const d of [1, 2, 3, 4, 5] as const) {
      expect(getAchievableMaxPoints(scenario_stemi, d)).toBeGreaterThan(0);
    }
  });
});

describe("calculateGradeForDifficulty — her zorlukta tutarlı, bedava A yok", () => {
  it("d5'te ulaşılabilir tavan = A (mükemmel oyun A, %<=100)", () => {
    const max5 = getAchievableMaxPoints(scenario_stemi, 5);
    expect(calculateGradeForDifficulty(max5, scenario_stemi, 5)).toBe("A");
    // Eski hata: d5'te 293 (sabit A eşiği=249) → yarı puanla bile A.
    // Şimdi A eşiği d5 tavanının %85'i → çok daha yüksek.
    const half = Math.round(max5 * 0.5);
    expect(calculateGradeForDifficulty(half, scenario_stemi, 5)).not.toBe("A");
  });

  it("d1 mükemmel oyun da A (zorluk-tutarlı)", () => {
    const max1 = getAchievableMaxPoints(scenario_stemi, 1);
    expect(calculateGradeForDifficulty(max1, scenario_stemi, 1)).toBe("A");
  });

  it("0 puan → F", () => {
    expect(calculateGradeForDifficulty(0, scenario_stemi, 3)).toBe("F");
  });
});

describe("finalizeSession — effective_max_points set + difficulty-aware grade", () => {
  it("effective_max_points seçilen zorlukta hesaplanır + yüzde <=100", () => {
    const s = startSession(scenario_stemi, "klinik", 5);
    // Mükemmel oyun simülasyonu: total_score = ulaşılabilir tavan
    const max5 = getAchievableMaxPoints(scenario_stemi, 5);
    const finished = finalizeSession(
      { ...s, total_score: max5, finished: true },
      scenario_stemi
    );
    expect(finished.effective_max_points).toBe(max5);
    expect(finished.grade).toBe("A");
    const percent = Math.round((finished.floored_score! / finished.effective_max_points!) * 100);
    expect(percent).toBeLessThanOrEqual(100); // eski hata: 188
  });

  it("passing eşiği zorluk-duyarlı (tavanın ~%40'ı)", () => {
    const pass3 = getEffectivePassingScoreForDifficulty(scenario_stemi, 3);
    const max3 = getAchievableMaxPoints(scenario_stemi, 3);
    expect(pass3).toBe(Math.round(max3 * 0.4));
  });
});
