// ============================================================
// REGRESYON: commit 2d142a5 ⭐
// "fix(play): aksiyon puanlamasında çift cezalama düzeltildi
//  (matched_outcome varsa pharma puanı yutulur)"
// ============================================================
// Bug: hipoglisemide insulin verildiğinde kullanıcı hem senaryonun
// (-25) cezasını hem de pharma motorunun kontrendikasyon (-25)
// cezasını alıyordu → toplam -50, beklenen -25.
//
// Fix (ScenarioPlayPage.tsx:290): matched_outcome dolu ise
// effectivePharmaPoints = 0. Senaryo otoritedir.
// ============================================================

import { describe, expect, test } from "vitest";
import { evaluateAction, getStep } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";
import {
  applyDoublePenaltyGuard,
  combineActionPoints,
} from "../helpers/scoring";

const hipoglisemi = getScenario("dahiliye-hipoglisemi-001");
if (!hipoglisemi) throw new Error("Hipoglisemi senaryosu bulunamadı");

describe("regresyon: çift cezalama (commit 2d142a5)", () => {
  test("hipoglisemi adım 1 + insulin → matched, points -25", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    const ev = evaluateAction(
      step,
      { type: "give_medication", target_id: "insulin_regular" },
      hipoglisemi,
      1
    );
    expect(ev.matched_outcome).not.toBeNull();
    expect(ev.points).toBe(-25);
    expect(ev.critical).toBe(true);
  });

  test("matched dolu iken pharma -25 yutulur, totalPoints -25", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    const ev = evaluateAction(
      step,
      { type: "give_medication", target_id: "insulin_regular" },
      hipoglisemi,
      1
    );
    const pharma = -25;
    expect(applyDoublePenaltyGuard(ev.matched_outcome, pharma)).toBe(0);
    expect(combineActionPoints(ev.points, ev.matched_outcome, pharma)).toBe(-25);
  });

  test("4× insulin → toplam -100 (asla -200 olamaz)", () => {
    const step = getStep(hipoglisemi, "step-1-degerlendir")!;
    let total = 0;
    for (let i = 0; i < 4; i++) {
      const ev = evaluateAction(
        step,
        { type: "give_medication", target_id: "insulin_regular" },
        hipoglisemi,
        1
      );
      total += combineActionPoints(ev.points, ev.matched_outcome, -25);
    }
    expect(total).toBe(-100);
    expect(total).not.toBe(-200);
  });

  test("matched_outcome NULL iken pharma normal akar (yutulmaz)", () => {
    const step = getStep(hipoglisemi, "step-2-mudahale")!;
    const ev = evaluateAction(
      step,
      { type: "give_medication", target_id: "atropin" },
      hipoglisemi,
      1
    );
    expect(ev.matched_outcome).toBeNull();

    const pharma = -10;
    expect(applyDoublePenaltyGuard(ev.matched_outcome, pharma)).toBe(-10);
    expect(combineActionPoints(ev.points, ev.matched_outcome, pharma)).toBe(
      ev.points - 10
    );
  });

  test("matched + pozitif pharma → senaryo puanı kalır, pharma yutulur", () => {
    const step = getStep(hipoglisemi, "step-2-mudahale")!;
    const ev = evaluateAction(
      step,
      { type: "give_medication", target_id: "dekstroz_50" },
      hipoglisemi,
      1
    );
    expect(ev.matched_outcome).not.toBeNull();
    expect(ev.points).toBe(30);
    expect(combineActionPoints(ev.points, ev.matched_outcome, +5)).toBe(30);
  });
});
