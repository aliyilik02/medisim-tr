// ============================================================
// Öğretici (teaching) mod — otomatik adım çözümü (saf, test edilebilir)
// ============================================================
// egitim modunda sistem doğru adımı otomatik uygular. Bu modül HANGİ aksiyonun
// "doğru" olduğunu saf fonksiyonla seçer (React/timer YOK) — sayfa katmanı
// (ScenarioBedPlayPage) bu planı runner handler'larıyla zamanlayıp uygular.
// ============================================================

import type { Step, ActionRef } from "./types";

export type TeachingPlan =
  // advanceManually: outcome'un unlocks'u YOKSA true → sayfa elle ilerletmeli
  // (unlocks varsa runner finishStep'i otomatik tetikler, çift-ilerleme olmasın).
  | { kind: "action"; action: ActionRef; feedback: string; advanceManually: boolean }
  | { kind: "decision"; optionId: string; feedback: string }
  | { kind: "info" }
  | { kind: "skip" }; // net doğru aksiyon yok — sadece anlat/bekle

/**
 * Adımın "doğru" otomatik aksiyonunu seç:
 *   - action: en yüksek pozitif puanlı, kritik OLMAYAN beklenen outcome.
 *   - decision: correct=true (kritik değil) en yüksek puanlı; yoksa pozitif puanlı.
 *   - info: ilerle.
 *   - aksi: skip (net doğru yok — sayfa sadece anlatır/bekler).
 */
export function pickTeachingAction(step: Step): TeachingPlan {
  if (step.kind === "info") return { kind: "info" };

  if (step.kind === "action") {
    const best = step.expected_outcomes
      .filter((o) => o.points > 0 && !o.critical)
      .sort((a, b) => b.points - a.points)[0];
    return best
      ? {
          kind: "action",
          action: best.action,
          feedback: best.feedback,
          advanceManually: !best.unlocks?.length,
        }
      : { kind: "skip" };
  }

  // decision
  const correct = step.options
    .filter((o) => o.correct && !o.critical)
    .sort((a, b) => b.points - a.points)[0];
  const fallback = step.options
    .filter((o) => o.points > 0)
    .sort((a, b) => b.points - a.points)[0];
  const pick = correct ?? fallback;
  return pick
    ? { kind: "decision", optionId: pick.id, feedback: pick.feedback }
    : { kind: "skip" };
}

/**
 * Adım için anlatım metni. Senaryo `teaching_narration[stepId]` override'ı
 * varsa onu, yoksa adım başlığı + doğru aksiyonun feedback'inden jenerik üretir.
 */
export function teachingNarration(step: Step, override?: string): string {
  if (override && override.trim()) return override;
  const plan = pickTeachingAction(step);
  if (plan.kind === "action" || plan.kind === "decision") {
    return `${step.title} — Doğru adım uygulanıyor: ${plan.feedback}`;
  }
  if (step.kind === "info") return `${step.title}. ${step.content ?? ""}`.trim();
  return step.title;
}
