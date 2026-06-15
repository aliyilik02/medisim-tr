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
  test("action — en yüksek pozitif, kritik olmayan outcome (unlock var → otomatik ilerleme)", () => {
    const plan = pickTeachingAction(actionStep);
    expect(plan.kind).toBe("action");
    if (plan.kind === "action") {
      expect(plan.action.target_id).toBe("aspirin");
      expect(plan.advanceManually).toBe(false); // unlocks var
    }
  });

  test("action — unlock yoksa advanceManually true", () => {
    const plan = pickTeachingAction(actionStepNoUnlock);
    expect(plan.kind).toBe("action");
    if (plan.kind === "action") expect(plan.advanceManually).toBe(true);
  });

  test("decision — correct, kritik olmayan en yüksek puanlı", () => {
    const plan = pickTeachingAction(decisionStep);
    expect(plan.kind).toBe("decision");
    if (plan.kind === "decision") expect(plan.optionId).toBe("opt_pci");
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
    // correct yok → fallback pozitif+kritik-olmayan: opt_notr (kritik asla)
    expect(plan.kind).toBe("decision");
    if (plan.kind === "decision") expect(plan.optionId).toBe("opt_notr");
  });

  test("kritik seçenekler asla seçilmez", () => {
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
