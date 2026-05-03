import { describe, expect, test } from "vitest";
import { evaluateDecision, getStep, getVisibleOptions } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";

const hipoglisemi = getScenario("dahiliye-hipoglisemi-001");
if (!hipoglisemi) throw new Error("Hipoglisemi senaryosu bulunamadı");

describe("evaluateDecision — temel davranış", () => {
  test("decision olmayan step için null", () => {
    const actionStep = getStep(hipoglisemi, "step-1-degerlendir")!;
    const r = evaluateDecision(actionStep, "anything", 1, hipoglisemi);
    expect(r).toBeNull();
  });

  test("doğru opsiyon → pozitif puan", () => {
    const step = getStep(hipoglisemi, "step-3-takip")!;
    const r = evaluateDecision(step, "opt-a", 1, hipoglisemi);
    expect(r).not.toBeNull();
    expect(r!.points).toBeGreaterThan(0);
    expect(r!.option.correct).toBe(true);
  });

  test("yanlış opsiyon → negatif puan, correct false", () => {
    const step = getStep(hipoglisemi, "step-3-takip")!;
    const r = evaluateDecision(step, "opt-b", 1, hipoglisemi);
    expect(r).not.toBeNull();
    expect(r!.points).toBeLessThan(0);
    expect(r!.option.correct).toBe(false);
  });

  test("var olmayan optionId → null", () => {
    const step = getStep(hipoglisemi, "step-3-takip")!;
    const r = evaluateDecision(step, "opt-yok", 1, hipoglisemi);
    expect(r).toBeNull();
  });
});

describe("evaluateDecision — zorluk filtresi", () => {
  test("min_difficulty 2 olan opsiyon S1'de seçilirse null döner (engine.ts:234)", () => {
    const step = getStep(hipoglisemi, "step-3-takip")!;
    if (step.kind !== "decision") throw new Error("decision step bekleniyordu");
    const optC = step.options.find((o) => o.id === "opt-c");
    expect(optC?.min_difficulty).toBe(2);

    const r1 = evaluateDecision(step, "opt-c", 1, hipoglisemi);
    expect(r1).toBeNull();

    const r2 = evaluateDecision(step, "opt-c", 2, hipoglisemi);
    expect(r2).not.toBeNull();
  });
});

describe("getVisibleOptions — UI render filtresi", () => {
  test("S1'de min_difficulty=2 opsiyonları gizlenir", () => {
    const step = getStep(hipoglisemi, "step-3-takip")!;
    const visible1 = getVisibleOptions(step, 1).map((o) => o.id);
    expect(visible1).not.toContain("opt-c");

    const visible2 = getVisibleOptions(step, 2).map((o) => o.id);
    expect(visible2).toContain("opt-c");
  });

  test("decision olmayan step → boş dizi", () => {
    const actionStep = getStep(hipoglisemi, "step-1-degerlendir")!;
    expect(getVisibleOptions(actionStep, 3)).toEqual([]);
  });
});
