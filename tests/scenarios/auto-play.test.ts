// ============================================================
// Auto-Play Senaryo Testleri
// ============================================================
// Her senaryo, motor üzerinden "en iyi yol" stratejisiyle oynanır:
// her step için en yüksek puanlı doğru tepki seçilir. Beklenen:
// totalPoints ≥ scoring.grade_bands.A → A notu.
//
// Fail = senaryo dengesi bozuk (max_points fazla iddialı veya
// pozitif puanlar yetersiz). Klinik dosya DEĞİŞTİRİLMEZ.
// ============================================================

import { describe, expect, test } from "vitest";
import { getEffectiveGradeBands } from "@/engine";
import { ALL_SCENARIOS } from "../helpers/all-scenarios";
import { autoPlayBestPath } from "../helpers/auto-play";

describe.each(ALL_SCENARIOS.map((s) => [s.id, s] as const))(
  "Auto-play: %s",
  (_id, scenario) => {
    const supported = scenario.supported_difficulties ?? [scenario.difficulty];
    const testDiffs = supported.filter((d) => d <= 3);

    for (const diff of testDiffs) {
      test(`S${diff}: en iyi yol A notu eşiğine ulaşmalı`, () => {
        const result = autoPlayBestPath(scenario, diff);
        // Helper kullan — grading_mode "auto" ise max_points × 0.85,
        // "manual" ise yazılı grade_bands.A.
        const threshold = getEffectiveGradeBands(scenario.scoring).A;
        expect(
          result.totalPoints,
          `${scenario.id} S${diff}: ${result.totalPoints} < A eşiği (${threshold})\n` +
            `Ziyaret edilen step'ler: ${result.visitedSteps.join(" → ")}\n` +
            (result.warnings.length
              ? `Uyarılar:\n  - ${result.warnings.join("\n  - ")}`
              : "")
        ).toBeGreaterThanOrEqual(threshold);
      });
    }

    test("auto-play en az 1 step ziyaret eder ve donmadan biter", () => {
      const result = autoPlayBestPath(scenario, scenario.difficulty);
      expect(result.visitedSteps.length, `${scenario.id}`).toBeGreaterThan(0);
      expect(result.finalSession.current_step_id).toBeNull();
    });
  }
);
