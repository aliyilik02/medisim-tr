// ============================================================
// MediSim TR — Grading Helper (Aşama 1.1)
// ============================================================
// Pazar lideri Body Interact ile uyumlu standart grade band
// eşikleri. Türkiye üniversite sistemi (60% geçer) ile de
// tutarlı (D bandı = %40, geçer eşiği D-C arası).
//
// Senaryo yazarları artık grade_bands'i elle yazmak zorunda
// değil — max_points yeterli, eşikler otomatik türetilir.
// Özel senaryolar (OSCE, sınav modu) için: scoring.grading_mode
// = "manual" şalterini açıp yazılı değerlere geri dön.
// ============================================================

import type { ScoringConfig } from "./types";

export const STANDARD_GRADE_THRESHOLDS = {
  A: 0.85,
  B: 0.70,
  C: 0.55,
  D: 0.40,
} as const;

/**
 * max_points'tan otomatik grade_bands türetir.
 * Body Interact uyumlu eşikler (%85+ A, %70+ B, %55+ C, %40+ D).
 */
export function deriveGradeBands(maxPoints: number) {
  return {
    A: Math.round(maxPoints * STANDARD_GRADE_THRESHOLDS.A),
    B: Math.round(maxPoints * STANDARD_GRADE_THRESHOLDS.B),
    C: Math.round(maxPoints * STANDARD_GRADE_THRESHOLDS.C),
    D: Math.round(maxPoints * STANDARD_GRADE_THRESHOLDS.D),
  };
}

/**
 * Bir scoring config'in geçerli grade_bands'ini döndürür.
 * grading_mode === "manual" ise yazılmış değerler; aksi halde türetilir.
 */
export function getEffectiveGradeBands(scoring: ScoringConfig) {
  if (scoring.grading_mode === "manual") {
    return scoring.grade_bands;
  }
  return deriveGradeBands(scoring.max_points);
}

/**
 * Geçer puanı (passing_score) D bandı eşiğine eşitler.
 * "manual" mode'da yazılı passing_score korunur.
 */
export function getEffectivePassingScore(scoring: ScoringConfig): number {
  if (scoring.grading_mode === "manual") {
    return scoring.passing_score;
  }
  return Math.round(scoring.max_points * STANDARD_GRADE_THRESHOLDS.D);
}
