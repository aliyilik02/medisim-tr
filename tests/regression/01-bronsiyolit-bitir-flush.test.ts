// ============================================================
// REGRESYON: commit e46e552
// "fix(play): flush active step on early end so toast points
//  persist in report"
// ============================================================
// Bug: oyun ortasında "Bitir" basıldığında aktif adımın puanı
// rapora yansımıyordu. Engine seviyesinde test edebileceğimiz
// kısım: completeStep ile bir adım bittikten sonra results'a
// puanı işlenmiş mi.
//
// UI tarafı (Bitir butonu / toast persistence) Aşama 2'de Vitest +
// Testing Library ile test edilecek — burada SKIP + TODO.
// ============================================================

import { describe, expect, test } from "vitest";
import { startSession, completeStep } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";

const bronsiyolit = getScenario("pedi-bronsiyolit-001");
if (!bronsiyolit) throw new Error("Bronşiyolit senaryosu bulunamadı");

describe("regresyon: bitir flush — engine düzeyi", () => {
  test("completeStep aktif adımı results'a ekler (puan kaybolmaz)", () => {
    const session = startSession(bronsiyolit, "klinik", 1);
    const stepId = session.current_step_id!;
    const next = completeStep(session, stepId, 30, [], 0, null);

    expect(next.results).toHaveLength(1);
    expect(next.results[0].step_id).toBe(stepId);
    expect(next.results[0].points_earned).toBe(30);
    expect(next.total_score).toBe(30);
    expect(next.finished).toBe(true);
  });

  test("erken bitir senaryosu: completion_status partial set edilebilir", () => {
    const session = startSession(bronsiyolit, "klinik", 1);
    const stepId = session.current_step_id!;
    const interim = completeStep(session, stepId, 15, [], 0, null);
    // UI Bitir butonu: finalizeSession reason="partial" çağırır
    const partial = { ...interim, completion_status: "partial" as const };
    expect(partial.results).toHaveLength(1);
    expect(partial.results[0].points_earned).toBe(15);
  });
});

describe.skip("regresyon: bitir butonu UI flush — Aşama 2 (Testing Library)", () => {
  // TODO Aşama 2: render(<ScenarioPlayPage>) → click Bitir →
  // assert: rapor sayfasında son adımın toast puanı görünür
  test("UI testi gelecek aşamada", () => {
    expect(true).toBe(true);
  });
});
