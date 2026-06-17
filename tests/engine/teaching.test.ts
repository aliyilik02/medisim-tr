// ============================================================
// Öğretici mod — pickTeachingAction + teachingNarration (saf)
// ============================================================

import { describe, expect, test } from "vitest";
import { pickTeachingAction, teachingNarration } from "@/engine";
import type { Step } from "@/engine";

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
});
