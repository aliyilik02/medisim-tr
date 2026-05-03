// ============================================================
// Çift cezalama koruma kuralı — UI'dan motor düzeyine taşınmış
// pure function. Asıl üretim kullanımı:
//   src/pages/ScenarioPlayPage.tsx (commit 2d142a5)
// Burada test edilebilir saf fonksiyon olarak çoğaltıldı.
// Kural: outcome senaryo yazarınca açıkça yakalandıysa
// (matched_outcome dolu), pharma motorunun ek cezası yutulur —
// senaryo otoritedir.
// ============================================================

import type { ActionOutcome } from "@/engine";

export function applyDoublePenaltyGuard(
  matchedOutcome: ActionOutcome | null,
  pharmaPoints: number
): number {
  return matchedOutcome ? 0 : pharmaPoints;
}

export function combineActionPoints(
  evaluationPoints: number,
  matchedOutcome: ActionOutcome | null,
  pharmaPoints: number
): number {
  return evaluationPoints + applyDoublePenaltyGuard(matchedOutcome, pharmaPoints);
}
