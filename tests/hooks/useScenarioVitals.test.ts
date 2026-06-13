// ============================================================
// useScenarioVitals saf mantık testleri
// ============================================================
// Hook'un yeni mantığı: O₂ desteği (saf) + deterioration→müdahale→recovery
// döngüsü (PhysiologyProvider üzerinden, hook'un React/interval makinesi
// olmadan — onu tarayıcı doğrulaması kapsar).
// ============================================================

import { describe, expect, test } from "vitest";
import type { PatientVitals, Scenario } from "@/engine";
import { createSimplePhysiologyProvider } from "@/engine/physiology";
import { applyOxygenSupport } from "@/hooks/useScenarioVitals";

const base: PatientVitals = {
  hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 84, temp: 36.8, rr: 14, pain: 0,
};

describe("applyOxygenSupport — O₂ klinik etki", () => {
  test("kapalı → değişmez", () => {
    expect(applyOxygenSupport(base, 1, false).spo2).toBe(84);
  });

  test("açık → SpO2 ceiling'e (94) doğru yükselir", () => {
    const out = applyOxygenSupport(base, 2, true);
    expect(out.spo2).toBeGreaterThan(84);
    expect(out.spo2).toBeLessThanOrEqual(94);
  });

  test("ceiling'i aşmaz", () => {
    const out = applyOxygenSupport({ ...base, spo2: 93.5 }, 5, true);
    expect(out.spo2).toBe(94);
  });

  test("zaten ceiling üstündeyse değişmez (normal hasta)", () => {
    expect(applyOxygenSupport({ ...base, spo2: 98 }, 5, true).spo2).toBe(98);
  });
});

// Sentetik deterioration senaryosu (klinik veriye bağımsız) — sadece motoru test eder.
const synthScenario = {
  deterioration: [
    {
      id: "phase1",
      label: "test kötüleşme",
      trends: [{ vital: "spo2", delta_per_sec: -1, floor: 70 }],
      halted_by: [{ type: "give_medication", target_id: "adrenalin" }],
      recovery_trends: [{ vital: "spo2", delta_per_sec: 2, ceiling: 98 }],
    },
  ],
} as unknown as Scenario;

describe("deterioration → müdahale → recovery döngüsü", () => {
  test("tedavisiz tick → SpO2 düşer", () => {
    const p = createSimplePhysiologyProvider(synthScenario);
    const v = p.tick({ ...base, spo2: 96 }, 5); // -5
    expect(v.spo2).toBeCloseTo(91, 1);
  });

  test("eşleşen müdahale → fazı durdurur → tick recovery'e geçer (SpO2 yükselir)", () => {
    const p = createSimplePhysiologyProvider(synthScenario);
    let v = p.tick({ ...base, spo2: 96 }, 5); // 91
    p.applyIntervention(v, { type: "give_medication", target_id: "adrenalin" });
    const before = v.spo2;
    v = p.tick(v, 5); // recovery +10 → ceiling 98
    expect(v.spo2).toBeGreaterThan(before);
  });

  test("eşleşmeyen müdahale → faz durmaz (kötüleşme sürer)", () => {
    const p = createSimplePhysiologyProvider(synthScenario);
    let v = p.tick({ ...base, spo2: 96 }, 5); // 91
    p.applyIntervention(v, { type: "give_medication", target_id: "parasetamol" });
    const before = v.spo2;
    v = p.tick(v, 5); // hâlâ -5
    expect(v.spo2).toBeLessThan(before);
  });
});
