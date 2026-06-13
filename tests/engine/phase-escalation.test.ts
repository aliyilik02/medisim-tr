// ============================================================
// Faz eskalasyonu testleri — zaman/vital-eşik tetikli durum geçişi
// ============================================================
// eval-monitor FSM transition mantığının A'nın deterioration modeline
// eklenmesi (opsiyonel katman; eski senaryolar etkilenmez).
// ============================================================

import { describe, expect, test } from "vitest";
import type { PatientVitals, Scenario } from "@/engine";
import { createSimplePhysiologyProvider, matchesVitalCondition } from "@/engine/physiology";

const base: PatientVitals = {
  hr: 90, bp_systolic: 120, bp_diastolic: 75, spo2: 96, temp: 37, rr: 16, pain: 0,
};

function tickN(p: ReturnType<typeof createSimplePhysiologyProvider>, v: PatientVitals, n: number, dt = 1) {
  let cur = v;
  for (let i = 0; i < n; i++) cur = p.tick(cur, dt);
  return cur;
}

describe("matchesVitalCondition", () => {
  test("lt/gt/lte/gte", () => {
    expect(matchesVitalCondition(base, { vital: "spo2", op: "lt", value: 100 })).toBe(true);
    expect(matchesVitalCondition(base, { vital: "spo2", op: "gt", value: 100 })).toBe(false);
    expect(matchesVitalCondition(base, { vital: "hr", op: "gte", value: 90 })).toBe(true);
    expect(matchesVitalCondition(base, { vital: "hr", op: "lte", value: 89 })).toBe(false);
  });
});

const vitalEscScenario = {
  deterioration: [
    {
      id: "hypoxia",
      trends: [{ vital: "spo2", delta_per_sec: -2, floor: 60 }],
      halted_by: [],
      escalations: [{ to_phase_id: "arrest", when_vital: { vital: "spo2", op: "lt", value: 78, for_sec: 5 } }],
    },
    { id: "arrest", trends: [{ vital: "hr", delta_per_sec: -3, floor: 0 }], halted_by: [] },
  ],
} as unknown as Scenario;

describe("vital-eşik tetikli eskalasyon", () => {
  test("eskalasyon hedefi (arrest) başta İNAKTİF", () => {
    const p = createSimplePhysiologyProvider(vitalEscScenario);
    expect(p.getState().activated).toContain("hypoxia");
    expect(p.getState().activated).not.toContain("arrest");
  });

  test("SpO2<78 5sn tutulunca arrest aktive olur", () => {
    const p = createSimplePhysiologyProvider(vitalEscScenario);
    // SpO2 96→<78: (96-78)/2 = 9sn; +5sn tutma → ~14 tick
    tickN(p, base, 13);
    expect(p.getState().activated).not.toContain("arrest"); // henüz değil
    tickN(p, { ...base, spo2: 70 }, 6); // <78 tutulu 6sn
    expect(p.getState().activated).toContain("arrest");
  });

  test("eşik kısa süre sağlanıp bozulursa tetiklenmez", () => {
    const p = createSimplePhysiologyProvider(vitalEscScenario);
    p.tick({ ...base, spo2: 70 }, 2); // <78 ama sadece 2sn
    p.tick({ ...base, spo2: 90 }, 2); // tekrar yükseldi → held sıfırlanır
    expect(p.getState().activated).not.toContain("arrest");
  });
});

const timeEscScenario = {
  deterioration: [
    {
      id: "shock",
      trends: [{ vital: "bp_systolic", delta_per_sec: -1, floor: 50 }],
      halted_by: [{ type: "give_medication", target_id: "adrenalin" }],
      escalations: [{ to_phase_id: "arrest", after_sec: 30, halt_self: true }],
    },
    { id: "arrest", trends: [{ vital: "hr", delta_per_sec: -2, floor: 0 }], halted_by: [] },
  ],
} as unknown as Scenario;

describe("zaman tetikli eskalasyon", () => {
  test("30sn sonra arrest aktive + halt_self ile shock durur", () => {
    const p = createSimplePhysiologyProvider(timeEscScenario);
    tickN(p, base, 29);
    expect(p.getState().activated).not.toContain("arrest");
    tickN(p, base, 2);
    expect(p.getState().activated).toContain("arrest");
    expect(p.getState().halted).toContain("shock"); // halt_self
  });

  test("erken müdahale (adrenalin) → eskalasyon önlenir (faz halted, yaş artmaz)", () => {
    const p = createSimplePhysiologyProvider(timeEscScenario);
    tickN(p, base, 10);
    p.applyIntervention(base, { type: "give_medication", target_id: "adrenalin" });
    tickN(p, base, 40);
    expect(p.getState().activated).not.toContain("arrest"); // halted faz eskale olmaz
  });
});

describe("escalations'sız eski senaryo etkilenmez", () => {
  test("eski faz normal akar (regresyon)", () => {
    const legacy = {
      deterioration: [{ id: "p", trends: [{ vital: "spo2", delta_per_sec: -1, floor: 80 }], halted_by: [] }],
    } as unknown as Scenario;
    const p = createSimplePhysiologyProvider(legacy);
    const v = tickN(p, base, 5);
    expect(v.spo2).toBeCloseTo(91, 0);
    expect(p.getState().activated).toEqual(["p"]);
  });
});
