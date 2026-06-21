// ============================================================
// Klinik muhakeme — saf eşleme/değerlendirme (egitim modu, CEZASIZ)
// ============================================================
// React/Three import YOK — %100 test edilebilir. KRİTİK kural: prompt
// YALNIZ egitim modunda eşleşir (klinik/sinav → daima null). Bu fonksiyon
// puanlamaya HİÇ dokunmaz; yalnız "hangi prompt çıkar + cevap doğru mu".
// ============================================================

import type { ReasoningPrompt, PlayMode } from "./types";

/**
 * Bir tetikleyiciye (aksiyon target_id veya decision option id) karşılık gelen
 * muhakeme prompt'unu döndürür. SADECE egitim modunda; klinik/sinav → null.
 */
export function matchReasoningPrompt(
  prompts: ReasoningPrompt[] | undefined,
  triggerId: string,
  mode: PlayMode,
): ReasoningPrompt | null {
  if (mode !== "egitim") return null; // klinik/sinav modunda muhakeme HİÇ çıkmaz
  if (!prompts || prompts.length === 0) return null;
  return prompts.find((p) => p.triggerIds.includes(triggerId)) ?? null;
}

/** Seçilen şık doğru mu (öğretici — puanı ETKİLEMEZ). Geçersiz indeks → false. */
export function isReasoningCorrect(prompt: ReasoningPrompt, selectedIndex: number): boolean {
  return prompt.options[selectedIndex]?.correct === true;
}
