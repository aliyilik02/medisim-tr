// ============================================================
// Motor kapsam boşlukları — Hat A tamamlayıcı testler
// ============================================================
// Coverage taramasının işaret ettiği test edilmemiş dallar:
// engine.ts (getCurrentStep, getStepsForDifficulty, applyVitalsChange,
// manual grading dalları, actionsMatch tip uyuşmazlığı),
// equipment/engine.ts (lte/gte koşulları, ritim-bilinmiyor, sayı-olmayan
// vital), pharmacology/presets.ts (getPreset/listPresets).
// ============================================================

import { describe, expect, test } from "vitest";
import {
  getCurrentStep,
  getStepsForDifficulty,
  applyVitalsChange,
  calculateGradeForDifficulty,
  getEffectivePassingScoreForDifficulty,
  evaluateAction,
} from "@/engine/engine";
import { evaluateEquipmentCondition } from "@/engine/equipment";
import { getPreset, listPresets } from "@/engine/pharmacology/presets";
import type { Scenario, SessionState, Step, PatientVitals } from "@/engine";

const vitals: PatientVitals = {
  hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 92, temp: 36.8, rr: 14, pain: 0,
};

const steps: Step[] = [
  { id: "s1", kind: "info", title: "Giriş", description: "" },
  { id: "s2", kind: "info", title: "İleri", description: "", min_difficulty: 4 },
  { id: "s3", kind: "info", title: "Temel", description: "", max_difficulty: 2 },
] as unknown as Step[];

const scenario = {
  id: "test",
  difficulty: 3,
  start_step_id: "s1",
  steps,
  available_medications: [],
  scoring: { grading_mode: "manual", max_points: 100, passing_score: 40, grade_bands: { A: 85, B: 70, C: 55, D: 40 } },
} as unknown as Scenario;

describe("engine.ts — küçük dallar", () => {
  test("getCurrentStep: current_step_id null → null; bilinmeyen id → null; bulunan → adım", () => {
    const base = { current_step_id: null } as unknown as SessionState;
    expect(getCurrentStep(scenario, base)).toBeNull();
    expect(getCurrentStep(scenario, { current_step_id: "yok" } as unknown as SessionState)).toBeNull();
    expect(getCurrentStep(scenario, { current_step_id: "s2" } as unknown as SessionState)?.id).toBe("s2");
  });

  test("getStepsForDifficulty: min/max kapıları uygulanır", () => {
    expect(getStepsForDifficulty(scenario, 1).map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(getStepsForDifficulty(scenario, 3).map((s) => s.id)).toEqual(["s1"]);
    expect(getStepsForDifficulty(scenario, 5).map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  test("applyVitalsChange: kısmi değişiklik merge, diğer alanlar korunur", () => {
    const out = applyVitalsChange(vitals, { spo2: 97, hr: 92 });
    expect(out.spo2).toBe(97);
    expect(out.hr).toBe(92);
    expect(out.bp_systolic).toBe(120);
    expect(vitals.spo2).toBe(92); // girdi mutasyona uğramaz
  });

  test("manual grading modu: yazılı bantlar + yazılı geçme eşiği kullanılır", () => {
    expect(calculateGradeForDifficulty(90, scenario, 5)).toBe("A");
    expect(calculateGradeForDifficulty(42, scenario, 5)).toBe("D");
    expect(calculateGradeForDifficulty(10, scenario, 5)).toBe("F");
    expect(getEffectivePassingScoreForDifficulty(scenario, 5)).toBe(40);
  });

  test("evaluateAction: aksiyon TİPİ uyuşmazsa eşleşme yok → varsayılan ceza", () => {
    const actionStep = {
      id: "a1",
      kind: "action",
      title: "",
      description: "",
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "adrenalin" },
          points: 20,
          feedback: "Doğru.",
        },
      ],
    } as unknown as Step;
    const r = evaluateAction(actionStep, { type: "use_equipment", target_id: "adrenalin" }, scenario);
    expect(r.matched_outcome).toBeNull();
    expect(r.points).toBe(-5);
  });
});

describe("equipment/engine.ts — koşul dalları", () => {
  const ctx = { vitals, patient: { age: 40, sex: "M" } } as never;

  test("lte/gte operatörleri", () => {
    expect(evaluateEquipmentCondition({ kind: "vital", vital: "spo2", op: "lte", value: 92 } as never, ctx)).toBe(true);
    expect(evaluateEquipmentCondition({ kind: "vital", vital: "spo2", op: "lte", value: 91 } as never, ctx)).toBe(false);
    expect(evaluateEquipmentCondition({ kind: "vital", vital: "hr", op: "gte", value: 80 } as never, ctx)).toBe(true);
    expect(evaluateEquipmentCondition({ kind: "vital", vital: "hr", op: "gte", value: 81 } as never, ctx)).toBe(false);
  });

  test("tanımsız vital alanı → koşul sağlanmaz (güvenli varsayılan)", () => {
    expect(evaluateEquipmentCondition({ kind: "vital", vital: "gcs", op: "lt", value: 9 } as never, ctx)).toBe(false);
  });

  test("ritim koşulu: ctx.ekg yoksa false (defib doğrulanamadan etki yok)", () => {
    const cond = { kind: "rhythm", in: ["vf"] } as never;
    expect(evaluateEquipmentCondition(cond, ctx)).toBe(false);
    expect(evaluateEquipmentCondition(cond, { ...(ctx as object), ekg: "vf" } as never)).toBe(true);
    expect(evaluateEquipmentCondition(cond, { ...(ctx as object), ekg: "sinus" } as never)).toBe(false);
  });
});

describe("animation-director — ilaç yolu jesti", () => {
  test("PO/SL → take_pill, nebul → use_inhaler, parenteral → null", async () => {
    const { medicationRouteGesture } = await import("@/engine/animation-director");
    expect(medicationRouteGesture("PO")).toBe("take_pill");
    expect(medicationRouteGesture("SL")).toBe("take_pill");
    expect(medicationRouteGesture("nebul")).toBe("use_inhaler");
    expect(medicationRouteGesture("IV_push")).toBeNull();
    expect(medicationRouteGesture("IV_infusion")).toBeNull();
    expect(medicationRouteGesture("IM")).toBeNull();
    expect(medicationRouteGesture("SC")).toBeNull();
  });
});

describe("pharmacology/presets.ts — erişim yardımcıları", () => {
  test("getPreset: bilinen id → preset, bilinmeyen → undefined", () => {
    const all = listPresets();
    expect(all.length).toBeGreaterThan(0);
    const first = all[0];
    expect(getPreset(first.id)?.id).toBe(first.id);
    expect(getPreset("boyle-bir-preset-yok")).toBeUndefined();
  });

  test("listPresets: her preset zorunlu zamanlama alanlarını taşır", () => {
    for (const p of listPresets()) {
      expect(p.onset_sec).toBeGreaterThanOrEqual(0);
      expect(p.duration_min).toBeGreaterThan(0);
    }
  });
});
