// ============================================================
// Klinik muhakeme — saf eşleme/değerlendirme + CEZASIZ doğrulama
// ============================================================

import { describe, expect, test, beforeEach } from "vitest";
import { matchReasoningPrompt, isReasoningCorrect } from "@/engine";
import type { ReasoningPrompt, SessionState, PatientVitals } from "@/engine";
import { getScenario } from "@/data/scenarios";
import { saveSession, clearAllSessions } from "@/storage/sessionHistory";

const PROMPTS: ReasoningPrompt[] = [
  {
    id: "rp-x",
    triggerIds: ["aspirin", "opt_pci_transfer"],
    question: "Neden?",
    options: [
      { text: "doğru", correct: true },
      { text: "yanlış", correct: false },
    ],
    explanation: "açıklama",
    source: "ESC 2023",
    status: "DRAFT",
  },
];

describe("matchReasoningPrompt — KRİTİK: sadece egitim modu", () => {
  test("egitim + eşleşen trigger → prompt döner", () => {
    expect(matchReasoningPrompt(PROMPTS, "aspirin", "egitim")?.id).toBe("rp-x");
    expect(matchReasoningPrompt(PROMPTS, "opt_pci_transfer", "egitim")?.id).toBe("rp-x");
  });

  test("klinik modunda → ASLA prompt (null)", () => {
    expect(matchReasoningPrompt(PROMPTS, "aspirin", "klinik")).toBeNull();
  });

  test("sinav modunda → ASLA prompt (null)", () => {
    expect(matchReasoningPrompt(PROMPTS, "aspirin", "sinav")).toBeNull();
  });

  test("eşleşmeyen trigger → null (egitim olsa bile)", () => {
    expect(matchReasoningPrompt(PROMPTS, "morfin", "egitim")).toBeNull();
  });

  test("prompts undefined/boş → null", () => {
    expect(matchReasoningPrompt(undefined, "aspirin", "egitim")).toBeNull();
    expect(matchReasoningPrompt([], "aspirin", "egitim")).toBeNull();
  });

  test("çoklu prompt listesi taranır — ilki eşleşmese de sonraki bulunur", () => {
    const second: ReasoningPrompt = {
      ...PROMPTS[0],
      id: "rp-y",
      triggerIds: ["heparin"],
    };
    const list = [...PROMPTS, second];
    expect(matchReasoningPrompt(list, "heparin", "egitim")?.id).toBe("rp-y");
  });

  test("aynı trigger'ı paylaşan iki prompt'ta listede İLK olan kazanır (deterministik)", () => {
    const dup: ReasoningPrompt = {
      ...PROMPTS[0],
      id: "rp-dup",
      triggerIds: ["aspirin"],
    };
    expect(matchReasoningPrompt([...PROMPTS, dup], "aspirin", "egitim")?.id).toBe("rp-x");
    expect(matchReasoningPrompt([dup, ...PROMPTS], "aspirin", "egitim")?.id).toBe("rp-dup");
  });
});

describe("isReasoningCorrect", () => {
  test("doğru şık → true", () => {
    expect(isReasoningCorrect(PROMPTS[0], 0)).toBe(true);
  });
  test("yanlış şık → false", () => {
    expect(isReasoningCorrect(PROMPTS[0], 1)).toBe(false);
  });
  test("geçersiz indeks → false (çökme yok)", () => {
    expect(isReasoningCorrect(PROMPTS[0], 99)).toBe(false);
    expect(isReasoningCorrect(PROMPTS[0], -1)).toBe(false);
  });
});

// ── CEZASIZ: prompt cevabı (doğru vs yanlış) puanı/notu DEĞİŞTİRMEZ ──
describe("CEZASIZ — reasoning cevabı skor/grade'e dokunmaz", () => {
  beforeEach(() => clearAllSessions());

  const scenario = getScenario("kardiyoloji-stemi-001")!;
  const v: PatientVitals = scenario.initial_vitals;

  function finishedSession(startedAt: number, reasoningCorrect: boolean): SessionState {
    return {
      scenario_id: scenario.id,
      mode: "egitim",
      selected_difficulty: scenario.difficulty,
      started_at: startedAt,
      current_step_id: null,
      completed_step_ids: [],
      baseline_vitals: v,
      vitals: v,
      results: [
        { step_id: "s1", actions_taken: [], points_earned: 70, time_spent_sec: 120, critical_errors: 0 },
      ],
      total_score: 70,
      finished: true,
      reasoning_answers: [
        { prompt_id: "rp-aspirin", selected_index: reasoningCorrect ? 0 : 1, correct: reasoningCorrect, answered_at: 0 },
      ],
    };
  }

  test("aynı senaryo + total_score, doğru vs yanlış gerekçe → aynı puan + aynı not", () => {
    const correct = saveSession(finishedSession(1000, true), scenario);
    const wrong = saveSession(finishedSession(2000, false), scenario);
    expect(correct).not.toBeNull();
    expect(wrong).not.toBeNull();
    expect(correct!.total_score).toBe(wrong!.total_score); // puan aynı
    expect(correct!.grade).toBe(wrong!.grade); // not aynı
  });

  test("reasoning_answers seans geçmişi snapshot'ına SIZMAZ (skor dışı)", () => {
    const saved = saveSession(finishedSession(3000, false), scenario);
    // SessionSnapshot reasoning içermez → skorlamadan tamamen ayrı
    expect(saved).not.toBeNull();
    expect("reasoning_answers" in saved!.session_snapshot).toBe(false);
  });
});
