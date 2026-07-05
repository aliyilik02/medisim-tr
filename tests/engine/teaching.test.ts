// ============================================================
// Öğretici mod — pickTeachingAction + teachingNarration (saf)
// ============================================================

import { describe, expect, test } from "vitest";
import { pickTeachingAction, teachingNarration, phaseTransitionNarration } from "@/engine";
import type { Step, PhaseSignal } from "@/engine";

const actionStep: Step = {
  id: "s1",
  title: "ABCDE",
  prompt: "Ne yaparsın?",
  kind: "action",
  expected_outcomes: [
    { action: { type: "give_medication", target_id: "aspirin" }, points: 10, feedback: "Doğru: ASA", unlocks: ["s2"] },
    { action: { type: "give_medication", target_id: "morfin" }, points: 5, feedback: "Kısmi" },
    { action: { type: "give_medication", target_id: "yanlis" }, points: -5, feedback: "Hatalı", critical: true },
  ],
};

const actionStepNoUnlock: Step = {
  id: "s1b",
  title: "Muayene",
  prompt: "?",
  kind: "action",
  expected_outcomes: [
    { action: { type: "examine", target_id: "akcizer" }, points: 8, feedback: "Oskültasyon" },
  ],
};

const decisionStep: Step = {
  id: "s2",
  title: "Reperfüzyon",
  prompt: "Hangi yol?",
  kind: "decision",
  options: [
    { id: "opt_pci", text: "PCI", correct: true, points: 20, feedback: "Primer PCI" },
    { id: "opt_bekle", text: "Bekle", correct: false, points: -10, feedback: "Yanlış", critical: true },
  ],
};

const infoStep: Step = {
  id: "s3",
  title: "Brifing",
  prompt: "",
  kind: "info",
  content: "STEMI yönetimi.",
};

describe("pickTeachingAction", () => {
  test("action — TÜM pozitif kritik-olmayan outcome'lar (puan-azalan), kritik dışlanır", () => {
    const plan = pickTeachingAction(actionStep);
    expect(plan.kind).toBe("actions");
    if (plan.kind === "actions") {
      // aspirin(10) + morfin(5) uygulanır; "yanlis" (critical) dışlanır.
      expect(plan.actions.map((a) => a.target_id)).toEqual(["aspirin", "morfin"]);
    }
  });

  test("action — tek outcome → tek elemanlı actions", () => {
    const plan = pickTeachingAction(actionStepNoUnlock);
    expect(plan.kind).toBe("actions");
    if (plan.kind === "actions") expect(plan.actions).toHaveLength(1);
  });

  test("BUG FIX: çoklu doğru aksiyon adımında HEPSİ uygulanır (puan kaybı yok)", () => {
    const multi: Step = {
      id: "s-multi",
      title: "STEMI ilk tedavi",
      prompt: "?",
      kind: "action",
      expected_outcomes: [
        { action: { type: "give_medication", target_id: "aspirin" }, points: 20, feedback: "ASA" },
        { action: { type: "give_medication", target_id: "tikagrelor" }, points: 20, feedback: "P2Y12" },
        { action: { type: "give_medication", target_id: "heparin" }, points: 15, feedback: "antikoagülan" },
      ],
    };
    const plan = pickTeachingAction(multi);
    expect(plan.kind).toBe("actions");
    if (plan.kind === "actions") expect(plan.actions).toHaveLength(3);
  });

  test("difficulty filtresi — S4+ outcome diff 3'te seçilmez", () => {
    const diffStep: Step = {
      id: "s-diff",
      title: "Zorluk",
      prompt: "?",
      kind: "action",
      expected_outcomes: [
        { action: { type: "give_medication", target_id: "temel" }, points: 10, feedback: "her seviye" },
        { action: { type: "give_medication", target_id: "ileri" }, points: 30, feedback: "S4+", min_difficulty: 4 },
      ],
    };
    const plan = pickTeachingAction(diffStep, 3);
    expect(plan.kind).toBe("actions");
    if (plan.kind === "actions") {
      expect(plan.actions.map((a) => a.target_id)).toEqual(["temel"]);
    }
  });

  test("decision (tekli) — correct, kritik olmayan en yüksek puanlı", () => {
    const plan = pickTeachingAction(decisionStep);
    expect(plan.kind).toBe("decision");
    if (plan.kind === "decision") expect(plan.optionId).toBe("opt_pci");
  });

  test("decision_multi — allow_multiple adımda TÜM doğru seçenekler", () => {
    const multiDecision: Step = {
      id: "s-multidec",
      title: "Ek derivasyon",
      prompt: "?",
      kind: "decision",
      allow_multiple: true,
      options: [
        { id: "opt_v4r", text: "V4R", correct: true, points: 15, feedback: "sağ V" },
        { id: "opt_v7v9", text: "V7-V9", correct: true, points: 12, feedback: "posterior" },
        { id: "opt_hic", text: "Gereksiz", correct: false, points: -8, feedback: "hayır" },
      ],
    };
    const plan = pickTeachingAction(multiDecision);
    expect(plan.kind).toBe("decision_multi");
    if (plan.kind === "decision_multi") {
      expect(plan.optionIds.sort()).toEqual(["opt_v4r", "opt_v7v9"]);
    }
  });

  test("info → kind info", () => {
    expect(pickTeachingAction(infoStep).kind).toBe("info");
  });

  test("decision — kritik+pozitif puanlı seçenek asla seçilmez (correct yoksa)", () => {
    const trap: Step = {
      id: "s-trap",
      title: "Tuzak",
      prompt: "?",
      kind: "decision",
      options: [
        { id: "opt_kritik", text: "Kritik ama puanlı", correct: false, points: 8, feedback: "tuzak", critical: true },
        { id: "opt_notr", text: "Nötr", correct: false, points: 2, feedback: "düşük" },
      ],
    };
    const plan = pickTeachingAction(trap);
    expect(plan.kind).toBe("decision");
    if (plan.kind === "decision") expect(plan.optionId).toBe("opt_notr");
  });

  test("kritik aksiyonlar asla seçilmez → skip", () => {
    const onlyCritical: Step = {
      ...actionStep,
      expected_outcomes: [
        { action: { type: "give_medication", target_id: "x" }, points: -5, feedback: "kritik", critical: true },
      ],
    };
    expect(pickTeachingAction(onlyCritical).kind).toBe("skip");
  });

  test("decision — zorluk filtresi: min_difficulty 4 seçenek diff 3'te görünmez, diff 4'te seçilir", () => {
    const diffDecision: Step = {
      id: "s-diffdec",
      title: "Zorluk kararı",
      prompt: "?",
      kind: "decision",
      options: [
        { id: "opt_temel", text: "Temel", correct: true, points: 10, feedback: "temel" },
        { id: "opt_ileri", text: "İleri", correct: true, points: 25, feedback: "ileri", min_difficulty: 4 },
      ],
    };
    // diff verilmezse varsayılan 3 → S4+ seçenek görünmez
    const p3 = pickTeachingAction(diffDecision);
    expect(p3.kind).toBe("decision");
    if (p3.kind === "decision") expect(p3.optionId).toBe("opt_temel");
    // diff 4 → daha yüksek puanlı ileri seçenek kazanır
    const p4 = pickTeachingAction(diffDecision, 4);
    if (p4.kind === "decision") expect(p4.optionId).toBe("opt_ileri");
  });

  test("decision — zorluk filtresi tüm seçenekleri elerse → skip", () => {
    const allHidden: Step = {
      id: "s-hidden",
      title: "Hepsi gizli",
      prompt: "?",
      kind: "decision",
      options: [
        { id: "opt_s5", text: "S5", correct: true, points: 10, feedback: "s5", min_difficulty: 5 },
      ],
    };
    expect(pickTeachingAction(allHidden, 2).kind).toBe("skip");
  });

  test("decision_multi — tüm doğrular kritikse → skip", () => {
    const allCriticalMulti: Step = {
      id: "s-crit-multi",
      title: "Tuzaklı çoklu",
      prompt: "?",
      kind: "decision",
      allow_multiple: true,
      options: [
        { id: "opt_a", text: "A", correct: true, points: 10, feedback: "a", critical: true },
        { id: "opt_b", text: "B", correct: false, points: -5, feedback: "b" },
      ],
    };
    expect(pickTeachingAction(allCriticalMulti).kind).toBe("skip");
  });

  test("action — zorluk filtresi TÜM outcome'ları elerse → skip (yanlış ceza yerine bekle)", () => {
    const allS4: Step = {
      ...actionStep,
      expected_outcomes: [
        { action: { type: "give_medication", target_id: "ileri" }, points: 10, feedback: "S4+", min_difficulty: 4 },
      ],
    };
    expect(pickTeachingAction(allS4, 3).kind).toBe("skip");
  });
});

describe("teachingNarration", () => {
  test("override varsa onu kullanır", () => {
    expect(teachingNarration(actionStep, "Özel açıklama")).toBe("Özel açıklama");
  });
  test("override yoksa adım + feedback'ten jenerik üretir", () => {
    const text = teachingNarration(actionStep);
    expect(text).toContain("ABCDE");
    expect(text).toContain("ASA");
  });
  test("boş override jenerik'e düşer", () => {
    expect(teachingNarration(infoStep, "   ")).toContain("Brifing");
  });

  test("info adımı — başlık + içerik birleşir", () => {
    expect(teachingNarration(infoStep)).toBe("Brifing. STEMI yönetimi.");
  });

  test("skip planlı adım (net doğru yok) → sadece başlık", () => {
    const skipStep: Step = {
      id: "s-skip",
      title: "Gözlem",
      prompt: "?",
      kind: "action",
      expected_outcomes: [
        { action: { type: "give_medication", target_id: "x" }, points: -5, feedback: "hata", critical: true },
      ],
    };
    expect(teachingNarration(skipStep)).toBe("Gözlem");
  });
});

// ── phaseTransitionNarration — faz-senkron geçiş anlatımı ──

function makeSignal(overrides: Partial<PhaseSignal> = {}): PhaseSignal {
  return {
    phaseId: "faz-1",
    phaseIndex: 0,
    ekg: "sinus",
    heartSound: "normal",
    visual: {},
    recovering: false,
    ...overrides,
  };
}

describe("phaseTransitionNarration", () => {
  test("authored narration her şeyden önce gelir (ekg paternine bakılmaz)", () => {
    const s = makeSignal({ ekg: "vfib", narration: "Yazar anlatımı." });
    expect(phaseTransitionNarration(s)).toBe("Yazar anlatımı.");
  });

  test("boşluk-sadece narration şablona düşer", () => {
    const s = makeSignal({ ekg: "vfib", narration: "   " });
    expect(phaseTransitionNarration(s)).toContain("fibrilasyon");
  });

  test("recovering → reperfüzyon anlatımı (ekg ne olursa olsun)", () => {
    const s = makeSignal({ recovering: true, ekg: "vfib" });
    expect(phaseTransitionNarration(s)).toContain("Reperfüzyon");
  });

  test("EKG paternine göre jenerik şablonlar", () => {
    expect(phaseTransitionNarration(makeSignal({ ekg: "st_elev_pvc" }))).toContain("VES");
    expect(phaseTransitionNarration(makeSignal({ ekg: "vt_salvo" }))).toContain("VT salvoları");
    expect(phaseTransitionNarration(makeSignal({ ekg: "vfib" }))).toContain("ventriküler fibrilasyon");
    expect(phaseTransitionNarration(makeSignal({ ekg: "asystole" }))).toContain("Asistoli");
  });

  test("baseline/sinüs paternleri → null (anlatım yok)", () => {
    expect(phaseTransitionNarration(makeSignal({ ekg: "sinus" }))).toBeNull();
    expect(phaseTransitionNarration(makeSignal({ ekg: "st_elevation" }))).toBeNull();
  });
});
