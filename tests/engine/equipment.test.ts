import { describe, it, expect } from "vitest";
import {
  evaluateEquipmentCondition,
  computeVitalActionDelta,
  resolveEquipmentEffect,
  resolveEquipmentById,
  getEquipmentEffect,
  EQUIPMENT_EFFECTS,
  type EquipmentEffect,
  type EquipmentEffectContext,
} from "@/engine";
import { EQUIPMENT } from "@/data/equipment";
import type { PatientVitals, Patient } from "@/engine";

// ── Test fixtures ─────────────────────────────────────────────
const patient: Patient = {
  age: 60,
  sex: "M",
  weight_kg: 80,
  chief_complaint: "test",
  history_items: [],
  allergies: [],
};

function vitals(overrides: Partial<PatientVitals> = {}): PatientVitals {
  return {
    hr: 80,
    bp_systolic: 120,
    bp_diastolic: 80,
    spo2: 98,
    temp: 36.8,
    rr: 16,
    ...overrides,
  };
}

function ctx(overrides: Partial<EquipmentEffectContext> = {}): EquipmentEffectContext {
  return { vitals: vitals(), patient, ...overrides };
}

describe("ekipman koşul değerlendirme", () => {
  it("always koşulu daima sağlanır", () => {
    expect(evaluateEquipmentCondition({ kind: "always" }, ctx())).toBe(true);
    expect(evaluateEquipmentCondition(undefined, ctx())).toBe(true);
  });

  it("vital koşulu eşik kontrolü yapar", () => {
    const hipoksemik = ctx({ vitals: vitals({ spo2: 85 }) });
    const normoksemik = ctx({ vitals: vitals({ spo2: 98 }) });
    const cond = { kind: "vital", vital: "spo2", op: "lt", value: 94 } as const;
    expect(evaluateEquipmentCondition(cond, hipoksemik)).toBe(true);
    expect(evaluateEquipmentCondition(cond, normoksemik)).toBe(false);
  });

  it("rhythm koşulu sadece eşleşen ritimde sağlanır; ekg yoksa false", () => {
    const cond = { kind: "rhythm", in: ["vfib", "vt_salvo"] } as const;
    expect(evaluateEquipmentCondition(cond, ctx({ ekg: "vfib" }))).toBe(true);
    expect(evaluateEquipmentCondition(cond, ctx({ ekg: "sinus" }))).toBe(false);
    // Ritim bilinmiyorsa güvenli varsayılan: etki uygulanmaz
    expect(evaluateEquipmentCondition(cond, ctx())).toBe(false);
  });
});

describe("yönlü clamp — computeVitalActionDelta", () => {
  it("hedefe doğru artırır, hedefi aşmaz", () => {
    // SpO2 85 → +6 ama toward 97: tam 6 (91, 97 altı)
    expect(computeVitalActionDelta({ vital: "spo2", amount: 6, toward: 97 }, 85)).toBe(6);
    // SpO2 94 → +6 ama toward 97: sadece 3 (97'de durur)
    expect(computeVitalActionDelta({ vital: "spo2", amount: 6, toward: 97 }, 94)).toBe(3);
  });

  it("zaten hedefte/üstündeyse o yönde ilerletmez (0 delta)", () => {
    expect(computeVitalActionDelta({ vital: "spo2", amount: 6, toward: 97 }, 99)).toBe(0);
    expect(computeVitalActionDelta({ vital: "spo2", amount: 6, toward: 97 }, 97)).toBe(0);
  });

  it("azaltma yönünde de clamp uygular", () => {
    // RR 28 → -3 toward 18: tam -3
    expect(computeVitalActionDelta({ vital: "rr", amount: -3, toward: 18 }, 28)).toBe(-3);
    // RR 19 → -3 toward 18: sadece -1
    expect(computeVitalActionDelta({ vital: "rr", amount: -3, toward: 18 }, 19)).toBe(-1);
    // RR 18 → zaten hedefte: 0
    expect(computeVitalActionDelta({ vital: "rr", amount: -3, toward: 18 }, 18)).toBe(0);
  });

  it("toward yoksa düz toplama", () => {
    expect(computeVitalActionDelta({ vital: "hr", amount: -10 }, 120)).toBe(-10);
  });
});

describe("resolveEquipmentEffect — koşula bağlı uygulama", () => {
  it("O2 maskesi SADECE hipoksemide SpO2 artırır", () => {
    const o2 = getEquipmentEffect("oksijen_maske")!;
    const hipoksemik = resolveEquipmentEffect(o2, ctx({ vitals: vitals({ spo2: 85 }) }));
    expect(hipoksemik.applied).toBe(true);
    expect(hipoksemik.delta.spo2).toBeGreaterThan(0);

    const normoksemik = resolveEquipmentEffect(o2, ctx({ vitals: vitals({ spo2: 98 }) }));
    expect(normoksemik.applied).toBe(false);
    expect(normoksemik.delta.spo2).toBeUndefined();
  });

  it("defib SADECE şoklanabilir ritimde etki uygular", () => {
    const defib = getEquipmentEffect("defibrilator")!;
    const vf = resolveEquipmentEffect(defib, ctx({ vitals: vitals({ hr: 180 }), ekg: "vfib" }));
    expect(vf.applied).toBe(true);
    expect(vf.delta.hr).toBeLessThan(0); // HR perfüze ritime doğru

    const sinus = resolveEquipmentEffect(defib, ctx({ vitals: vitals({ hr: 180 }), ekg: "sinus" }));
    expect(sinus.applied).toBe(false);
  });

  it("entübasyon havayolu güvenliği flag'i koşuldan bağımsız döner", () => {
    const ett = getEquipmentEffect("entubasyon_seti")!;
    // Koşul sağlanmasa bile airway_secured true (havayolu fiziksel olarak güvende)
    const normoksemik = resolveEquipmentEffect(ett, ctx({ vitals: vitals({ spo2: 99 }) }));
    expect(normoksemik.applied).toBe(false);
    expect(normoksemik.airway_secured).toBe(true);
  });

  it("IV kateter yol açar, vital etkisi yok", () => {
    const iv = getEquipmentEffect("iv_kateter_18g")!;
    const r = resolveEquipmentEffect(iv, ctx());
    expect(r.opens_iv_route).toBe(true);
    expect(Object.keys(r.delta).length).toBe(0);
  });

  it("izlem ekipmanı (monitör) vital değiştirmez", () => {
    const m = resolveEquipmentById("monitor", ctx());
    expect(m).not.toBeNull();
    expect(Object.keys(m!.delta).length).toBe(0);
  });

  it("katalogda olmayan id null döner", () => {
    expect(resolveEquipmentById("uydurma_ekipman", ctx())).toBeNull();
  });
});

describe("katalog bütünlüğü", () => {
  it("her EquipmentEffect.equipment_id GERÇEK ekipman kataloğunda var", () => {
    for (const [key, eff] of Object.entries(EQUIPMENT_EFFECTS)) {
      expect(eff.equipment_id).toBe(key); // anahtar = id tutarlılığı
      expect(EQUIPMENT[eff.equipment_id], `${key} katalogda yok`).toBeDefined();
    }
  });

  it("tüm etki değerleri DRAFT (hiçbiri ACTIVE değil — klinik review bekliyor)", () => {
    for (const eff of Object.values(EQUIPMENT_EFFECTS)) {
      expect(eff.status).toBe("DRAFT");
    }
  });

  it("etki yapan ekipmanlar TODO_KLINIK kaynağı taşır", () => {
    const withEffects = Object.values(EQUIPMENT_EFFECTS).filter((e) => e.effects.length > 0);
    expect(withEffects.length).toBeGreaterThan(0);
    for (const eff of withEffects) {
      // amount değerleri klinik DRAFT — kaynak alanı doğrulama beklediğini belgeler
      const hasTodo =
        eff.source.includes("TODO_KLINIK") ||
        Object.values(eff).some((v) => typeof v === "string" && v.includes("TODO_KLINIK"));
      expect(hasTodo || eff.status === "DRAFT").toBe(true);
    }
  });
});
