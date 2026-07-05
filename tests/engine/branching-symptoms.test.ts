// ============================================================
// Dallanan karar + faz semptom olayları — motor genişletme testleri
// ============================================================
// 1) DecisionOption.next_step_id: yanlış karar → komplikasyon kolu,
//    doğru karar → hızlı yol. Zorluk kapısı finishStep/pickNextStep'te.
// 2) PhaseSignalSpec.symptom_events: faz aktifken tekrarlayan öksürük/
//    kusma; faz durunca kesilir (sunum katmanı).
// ============================================================

import { describe, expect, test } from "vitest";
import {
  evaluateDecision,
  evaluateDecisionMulti,
  getAchievableMaxPoints,
  pickNextStep,
} from "@/engine/engine";
import { PhaseStateMachine } from "@/engine/phase-state-machine";
import { advanceSymptomSchedule, type SymptomScheduleState } from "@/hooks/useAnimationDirector";
import type { Scenario, Step, DeteriorationPhase, PhaseSignal } from "@/engine";

// ── Dallanan karar ──────────────────────────────────────────

const branchStep: Step = {
  id: "karar",
  kind: "decision",
  title: "Reperfüzyon kararı",
  description: "",
  options: [
    { id: "dogru", text: "PKG'ye gönder", points: 30, correct: true, feedback: "Doğru.", next_step_id: "hizli-yol" },
    { id: "yanlis", text: "Bekle-gör", points: -15, correct: false, feedback: "Hasta kötüleşir.", next_step_id: "komplikasyon" },
    { id: "notr", text: "Konsültasyon iste", points: 5, correct: false, feedback: "Zaman kaybı." },
  ],
} as unknown as Step;

const scenario = {
  id: "dallanma-test",
  difficulty: 3,
  start_step_id: "karar",
  steps: [
    branchStep,
    { id: "hizli-yol", kind: "info", title: "", description: "", content: "" },
    { id: "komplikasyon", kind: "info", title: "", description: "", content: "" },
    { id: "ileri-dal", kind: "info", title: "", description: "", content: "", min_difficulty: 4 },
  ],
  available_medications: [],
  scoring: { max_points: 100, passing_score: 40, grade_bands: { A: 85, B: 70, C: 55, D: 40 } },
} as unknown as Scenario;

describe("dallanan karar — evaluateDecision", () => {
  test("next_step_id'li seçenek dal hedefini döner", () => {
    expect(evaluateDecision(branchStep, "dogru", 3)!.next_step_id).toBe("hizli-yol");
    expect(evaluateDecision(branchStep, "yanlis", 3)!.next_step_id).toBe("komplikasyon");
  });

  test("next_step_id'siz seçenek null → linear akış korunur", () => {
    expect(evaluateDecision(branchStep, "notr", 3)!.next_step_id).toBeNull();
  });
});

describe("dallanan karar — evaluateDecisionMulti dal seçimi", () => {
  const multi: Step = {
    id: "coklu",
    kind: "decision",
    title: "",
    description: "",
    allow_multiple: true,
    options: [
      { id: "a", text: "A", points: 5, correct: false, feedback: "", next_step_id: "yanlis-dal" },
      { id: "b", text: "B", points: 10, correct: true, feedback: "", next_step_id: "dogru-dal" },
      { id: "c", text: "C", points: 8, correct: true, feedback: "" },
    ],
  } as unknown as Step;

  test("doğru seçeneğin dalı yanlışınkine üstün gelir", () => {
    expect(evaluateDecisionMulti(multi, ["a", "b"], 3)!.next_step_id).toBe("dogru-dal");
  });

  test("doğru dal yoksa herhangi bir seçilmişin dalı", () => {
    expect(evaluateDecisionMulti(multi, ["a", "c"], 3)!.next_step_id).toBe("yanlis-dal");
  });

  test("dal yoksa null", () => {
    expect(evaluateDecisionMulti(multi, ["c"], 3)!.next_step_id).toBeNull();
  });
});

describe("dallanan karar — akış bütünlüğü", () => {
  test("pickNextStep: zorluk kapısına uymayan dal hedefi linear akışa düşer", () => {
    // d3'te 'ileri-dal' (min_difficulty 4) görünmez → karar sonrası linear (hizli-yol)
    expect(pickNextStep(scenario, "karar", ["ileri-dal"], 3)).toBe("hizli-yol");
    expect(pickNextStep(scenario, "karar", ["ileri-dal"], 5)).toBe("ileri-dal");
  });

  test("getAchievableMaxPoints best-path doğru kararın dalını izler", () => {
    // dogru (30, dal: hizli-yol) → hizli-yol info → son. 30 puan.
    expect(getAchievableMaxPoints(scenario, 3)).toBe(30);
  });
});

describe("dallanan karar — editör doğrulayıcısı", () => {
  test("kırık dal hedefi REF_BRANCH hatası; geçerli dal erişilebilirlik uyarısını susturur", async () => {
    const { validateScenario } = await import("@/components/editor/validation");
    const draft = {
      ...scenario,
      steps: [
        branchStep,
        { id: "hizli-yol", kind: "info", title: "t", content: "içerik" },
        { id: "komplikasyon", kind: "info", title: "t", content: "içerik" },
      ],
    } as never;
    const ok = validateScenario(draft);
    expect(ok.errors.filter((e) => e.code === "REF_BRANCH")).toEqual([]);
    // dal hedefleri (hizli-yol/komplikasyon) unlock'suz ama ULAŞILABİLİR sayılmalı
    expect(ok.warnings.filter((w) => w.code === "WARN_UNREACHABLE")).toEqual([]);

    const broken = {
      ...draft,
      steps: [
        {
          ...branchStep,
          options: [
            ...(branchStep as never as { options: object[] }).options.slice(0, 2),
            { id: "kirik", text: "K", points: 0, correct: false, feedback: "", next_step_id: "yok-boyle-adim" },
          ],
        },
      ],
    } as never;
    const bad = validateScenario(broken);
    expect(bad.errors.some((e) => e.code === "REF_BRANCH")).toBe(true);
  });
});

// ── Faz semptom olayları ────────────────────────────────────

const coughPhase: DeteriorationPhase = {
  id: "bronkospazm",
  trends: [],
  halted_by: [],
  signal: {
    ekg: "sinus_tachy",
    heart_sound: "normal",
    symptom_events: [{ type: "cough", every_sec: 20, start_after_sec: 5 }],
  },
} as unknown as DeteriorationPhase;

describe("faz semptom olayları — sinyal taşıma", () => {
  test("dominantSignal aktif fazın symptom_events'ini taşır", () => {
    const m = new PhaseStateMachine([coughPhase]);
    const sig = m.dominantSignal({ hr: 110, bp_systolic: 120, bp_diastolic: 75, spo2: 93, temp: 37, rr: 22 } as never);
    expect(sig?.symptomEvents).toEqual([{ type: "cough", every_sec: 20, start_after_sec: 5 }]);
  });
});

describe("advanceSymptomSchedule — takvim", () => {
  const signal = {
    phaseId: "bronkospazm",
    symptomEvents: [{ type: "cough", every_sec: 20, start_after_sec: 5 }],
  } as unknown as PhaseSignal;
  const empty: SymptomScheduleState = { phaseId: null, nextDue: {} };

  test("faz girişi: ilk olay start_after_sec sonra, öncesinde tetik yok", () => {
    const s1 = advanceSymptomSchedule(signal, empty, 100);
    expect(s1.fired).toEqual([]); // takvim kuruldu (105'e)
    expect(advanceSymptomSchedule(signal, s1.state, 104).fired).toEqual([]);
    const at105 = advanceSymptomSchedule(signal, s1.state, 105);
    expect(at105.fired).toEqual(["cough"]);
    // sonraki tetik every_sec sonra
    expect(advanceSymptomSchedule(signal, at105.state, 120).fired).toEqual([]);
    expect(advanceSymptomSchedule(signal, at105.state, 125).fired).toEqual(["cough"]);
  });

  test("faz değişimi takvimi sıfırlar (yeni start_after_sec)", () => {
    const s1 = advanceSymptomSchedule(signal, empty, 100);
    const other = { ...(signal as object), phaseId: "yeni-faz" } as PhaseSignal;
    const s2 = advanceSymptomSchedule(other, s1.state, 200);
    expect(s2.fired).toEqual([]);
    expect(advanceSymptomSchedule(other, s2.state, 205).fired).toEqual(["cough"]);
  });

  test("sinyal yok / semptomsuz faz (recovering) → durum sıfırlanır, tetik yok", () => {
    const s1 = advanceSymptomSchedule(signal, empty, 100);
    const done = advanceSymptomSchedule(null, s1.state, 106);
    expect(done.fired).toEqual([]);
    expect(done.state.phaseId).toBeNull();
    const rec = { phaseId: "recovering" } as PhaseSignal; // symptomEvents yok
    expect(advanceSymptomSchedule(rec, s1.state, 106).fired).toEqual([]);
  });
});
