// ============================================================
// Öğretici (teaching) mod — otomatik adım çözümü (saf, test edilebilir)
// ============================================================
// egitim modunda sistem doğru adımı otomatik uygular. Bu modül HANGİ aksiyonun
// "doğru" olduğunu saf fonksiyonla seçer (React/timer YOK) — sayfa katmanı
// (ScenarioBedPlayPage) bu planı runner handler'larıyla zamanlayıp uygular.
// ============================================================

import type { Step, ActionRef, PhaseSignal, Difficulty } from "./types";
import { isVisibleAtDifficulty } from "./engine";

export type TeachingPlan =
  // ÇOĞUL: adımda doğru olan TÜM aksiyonlar uygulanır (puan-azalan sıralı).
  // Eski tekil "action" planı bir action adımının yalnız EN YÜKSEK puanlı
  // outcome'unu uyguluyordu → çoklu-doğru adımlarda (STEMI s1/s3/s6) puanın
  // çoğu kaybolurdu. Artık hepsi uygulanır.
  | { kind: "actions"; actions: ActionRef[]; feedback: string }
  | { kind: "decision"; optionId: string; feedback: string }
  // decision_multi: allow_multiple adımda TÜM doğru seçenekler işaretlenir.
  | { kind: "decision_multi"; optionIds: string[]; feedback: string }
  | { kind: "info" }
  | { kind: "skip" }; // net doğru aksiyon yok — sadece anlat/bekle

/**
 * Adımın "doğru" otomatik aksiyon(lar)ını seç:
 *   - action: zorluğa görünür, pozitif puanlı, kritik OLMAYAN TÜM outcome'lar
 *     (puan-azalan). Çoklu-doğru adımda hepsi uygulanır → tam puan.
 *   - decision (allow_multiple): correct=true (kritik değil) TÜM seçenekler.
 *   - decision (tekli): correct=true en yüksek puanlı; yoksa pozitif puanlı.
 *   - info: ilerle.
 *   - aksi: skip (net doğru yok — sayfa sadece anlatır/bekler).
 *
 * difficulty: outcome/option'lar zorluğa göre filtrelenir (verilmezse 3).
 * Aksi halde S4+ bir outcome seçilip motorda eşleşmez → yanlış ceza (-5).
 */
export function pickTeachingAction(step: Step, difficulty?: Difficulty): TeachingPlan {
  const diff: Difficulty = difficulty ?? 3;
  if (step.kind === "info") return { kind: "info" };

  if (step.kind === "action") {
    const good = step.expected_outcomes
      .filter(
        (o) =>
          o.points > 0 &&
          !o.critical &&
          isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, diff)
      )
      .sort((a, b) => b.points - a.points);
    return good.length
      ? { kind: "actions", actions: good.map((o) => o.action), feedback: good[0].feedback }
      : { kind: "skip" };
  }

  // decision — çoklu (allow_multiple): tüm doğru (kritik değil) seçenekler
  if (step.allow_multiple) {
    const correctIds = step.options
      .filter(
        (o) =>
          o.correct &&
          !o.critical &&
          isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, diff)
      )
      .map((o) => o.id);
    return correctIds.length
      ? {
          kind: "decision_multi",
          optionIds: correctIds,
          feedback: "Tüm doğru seçenekler işaretlendi.",
        }
      : { kind: "skip" };
  }

  // decision — tekli
  const visible = step.options.filter((o) =>
    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, diff)
  );
  const correct = visible
    .filter((o) => o.correct && !o.critical)
    .sort((a, b) => b.points - a.points)[0];
  const fallback = visible
    .filter((o) => o.points > 0 && !o.critical)
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
  if (plan.kind === "actions" || plan.kind === "decision" || plan.kind === "decision_multi") {
    return `${step.title} — Doğru adım uygulanıyor: ${plan.feedback}`;
  }
  if (step.kind === "info") return `${step.title}. ${step.content ?? ""}`.trim();
  return step.title;
}

/**
 * Faz-senkron geçiş anlatımı (öğretici mod). Faz signal spec'inde authored
 * `narration` varsa onu; yoksa EKG paternine göre jenerik şablon döner (sinyalli
 * her senaryoda çalışır). null → anlatım yok (baseline/sinüs).
 * ⚠️ KLİNİK İÇERİK: faz anlatımı DRAFT.
 */
export function phaseTransitionNarration(signal: PhaseSignal): string | null {
  if (signal.narration && signal.narration.trim()) return signal.narration;
  if (signal.recovering)
    return "Reperfüzyon sonrası: EKG'de ST elevasyonu geriliyor, ritim ve hemodinami toparlanıyor.";
  switch (signal.ekg) {
    case "st_elev_pvc":
      return "Hasta kötüleşiyor — EKG'de ventriküler erken vurular (VES) başladı (iritabl miyokard).";
    case "vt_salvo":
      return "Kritik kötüleşme — VT salvoları (R-on-T): ventriküler fibrilasyon riski yüksek.";
    case "vfib":
      return "Kardiyak arrest — ventriküler fibrilasyon! Nabız yok; ACLS (CPR + defibrilasyon) başlat.";
    case "asystole":
      return "Asistoli — düz hat. Şoklanamaz ritim; CPR + adrenalin, geri döndürülebilir nedenleri ara.";
    default:
      return null;
  }
}
