// ============================================================
// SimplePhysiologyProvider testleri — Faz 1 (§4.2)
// ============================================================
import { describe, expect, test } from "vitest";
import {
  createSimplePhysiologyProvider,
  applyTrends,
  matchesAction,
} from "@/engine";
import type {
  Scenario,
  PatientVitals,
  DeteriorationPhase,
} from "@/engine";

const BASE_VITALS: PatientVitals = {
  hr: 128,
  bp_systolic: 78,
  bp_diastolic: 44,
  spo2: 88,
  temp: 36.8,
  rr: 30,
};

function makeScenario(phases: DeteriorationPhase[]): Scenario {
  // Sadece provider'ın okuduğu alanlar önemli — gerisi iskelet
  return {
    id: "test-deterioration",
    version: "0.0.1",
    title: "Test",
    description: "",
    specialty: "acil",
    tags: [],
    difficulty: 2,
    estimated_minutes: 5,
    modes: ["interactive_3d"],
    language: "tr",
    last_updated: "2026-06-12",
    patient: {
      age: 35,
      sex: "F",
      weight_kg: 68,
      chief_complaint: "",
      history_items: [],
      allergies: [],
    },
    initial_vitals: { ...BASE_VITALS },
    available_medications: ["adrenalin"],
    available_equipment: [],
    steps: [],
    start_step_id: "s1",
    scoring: {
      max_points: 100,
      passing_score: 55,
      grade_bands: { A: 85, B: 70, C: 55, D: 40 },
    },
    debrief: { key_learnings: [], references: [] },
    deterioration: phases,
  };
}

const SIMPLE_PHASE: DeteriorationPhase = {
  id: "shock",
  trends: [
    { vital: "bp_systolic", delta_per_sec: -2, floor: 50 },
    { vital: "spo2", delta_per_sec: -1, floor: 72 },
    { vital: "hr", delta_per_sec: 1, ceiling: 152 },
  ],
  halted_by: [{ type: "give_medication", target_id: "adrenalin" }],
  recovery_trends: [
    { vital: "bp_systolic", delta_per_sec: 4, ceiling: 112 },
    { vital: "spo2", delta_per_sec: 2, ceiling: 97 },
    { vital: "hr", delta_per_sec: -2, floor: 96 },
  ],
};

describe("applyTrends — saf trend uygulama", () => {
  test("delta_per_sec × dtSec kadar değiştirir", () => {
    const next = applyTrends(
      BASE_VITALS,
      [{ vital: "bp_systolic", delta_per_sec: -2 }],
      3
    );
    expect(next.bp_systolic).toBe(72);
    // Diğer vitaller dokunulmaz
    expect(next.hr).toBe(128);
    expect(next.spo2).toBe(88);
  });

  test("floor altına inmez", () => {
    const next = applyTrends(
      { ...BASE_VITALS, bp_systolic: 52 },
      [{ vital: "bp_systolic", delta_per_sec: -2, floor: 50 }],
      10
    );
    expect(next.bp_systolic).toBe(50);
  });

  test("ceiling üstüne çıkmaz", () => {
    const next = applyTrends(
      { ...BASE_VITALS, hr: 150 },
      [{ vital: "hr", delta_per_sec: 1, ceiling: 152 }],
      10
    );
    expect(next.hr).toBe(152);
  });

  test("tanımsız opsiyonel vital atlanır", () => {
    const next = applyTrends(
      BASE_VITALS, // etco2 yok
      [{ vital: "etco2", delta_per_sec: -1 }],
      5
    );
    expect(next.etco2).toBeUndefined();
  });

  test("kesirli birikim korunur (yuvarlama yapılmaz)", () => {
    const next = applyTrends(
      BASE_VITALS,
      [{ vital: "bp_systolic", delta_per_sec: -0.067 }],
      1
    );
    expect(next.bp_systolic).toBeCloseTo(77.933, 3);
  });

  test("dtSec 0 veya boş trend → aynı obje", () => {
    expect(applyTrends(BASE_VITALS, [], 1)).toBe(BASE_VITALS);
    expect(
      applyTrends(BASE_VITALS, [{ vital: "hr", delta_per_sec: 1 }], 0)
    ).toBe(BASE_VITALS);
  });
});

describe("matchesAction — müdahale eşleştirme", () => {
  test("type + target_id eşleşmesi yeter (site verilmemişse)", () => {
    expect(
      matchesAction(
        { type: "give_medication", target_id: "adrenalin" },
        { type: "give_medication", target_id: "adrenalin", site: "im_uyluk" }
      )
    ).toBe(true);
  });

  test("matcher site isterse aksiyon sitesi eşleşmeli", () => {
    expect(
      matchesAction(
        { type: "give_medication", target_id: "adrenalin", site: "im_uyluk" },
        { type: "give_medication", target_id: "adrenalin" }
      )
    ).toBe(false);
  });

  test("farklı ilaç eşleşmez", () => {
    expect(
      matchesAction(
        { type: "give_medication", target_id: "adrenalin" },
        { type: "give_medication", target_id: "feniramin" }
      )
    ).toBe(false);
  });
});

describe("SimplePhysiologyProvider — kötüleşme döngüsü", () => {
  test("aktif faz tedavisiz trendi uygular", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIMPLE_PHASE])
    );
    const next = provider.tick(BASE_VITALS, 1);
    expect(next.bp_systolic).toBe(76);
    expect(next.spo2).toBe(87);
    expect(next.hr).toBe(129);
  });

  test("müdahale fazı durdurur, recovery trendi hedefe taşır", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIMPLE_PHASE])
    );

    // 5 sn kötüleşme: SBP 78 → 68
    let vitals = provider.tick(BASE_VITALS, 5);
    expect(vitals.bp_systolic).toBe(68);
    expect(provider.isPhaseHalted("shock")).toBe(false);

    // Adrenalin (site fark etmez)
    provider.applyIntervention(vitals, {
      type: "give_medication",
      target_id: "adrenalin",
      site: "im_uyluk",
    });
    expect(provider.isPhaseHalted("shock")).toBe(true);

    // Artık iyileşme: SBP 68 → 72 (1 sn × +4)
    vitals = provider.tick(vitals, 1);
    expect(vitals.bp_systolic).toBe(72);

    // Uzun süre sonra ceiling'de durur (hedef 112)
    vitals = provider.tick(vitals, 100);
    expect(vitals.bp_systolic).toBe(112);
    expect(vitals.spo2).toBe(97);
    expect(vitals.hr).toBe(96);
  });

  test("yanlış müdahale fazı durdurmaz", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIMPLE_PHASE])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "feniramin",
    });
    expect(provider.isPhaseHalted("shock")).toBe(false);
    // Kötüleşme devam eder
    const next = provider.tick(BASE_VITALS, 1);
    expect(next.bp_systolic).toBe(76);
  });

  test("recovery_trends olmayan halt edilmiş faz vitalleri değiştirmez", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...SIMPLE_PHASE, recovery_trends: undefined }])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    const next = provider.tick(BASE_VITALS, 10);
    expect(next).toEqual(BASE_VITALS);
  });

  test("active_from_step_id'li faz adım gelmeden çalışmaz, adımla aktifleşir", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...SIMPLE_PHASE, active_from_step_id: "s3" }])
    );

    // Adım gelmedi — vitaller sabit
    expect(provider.tick(BASE_VITALS, 10)).toEqual(BASE_VITALS);

    provider.notifyStepChange("s1");
    expect(provider.tick(BASE_VITALS, 10)).toEqual(BASE_VITALS);

    provider.notifyStepChange("s3");
    const next = provider.tick(BASE_VITALS, 1);
    expect(next.bp_systolic).toBe(76);

    // Adım geçse de faz sürer (halt edilmedikçe)
    provider.notifyStepChange("s4");
    const next2 = provider.tick(next, 1);
    expect(next2.bp_systolic).toBe(74);
  });

  test("erken doğru müdahale — faz aktifleşmeden halt edilirse direkt recovery'ye girer", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...SIMPLE_PHASE, active_from_step_id: "s3" }])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    provider.notifyStepChange("s3");
    const next = provider.tick({ ...BASE_VITALS, bp_systolic: 70 }, 1);
    expect(next.bp_systolic).toBe(74); // recovery +4, kötüleşme değil
  });

  test("deterioration tanımsız senaryoda no-op", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([]));
    expect(provider.tick(BASE_VITALS, 60)).toEqual(BASE_VITALS);
    expect(provider.getState()).toEqual({ activated: [], halted: [] });
  });
});
