// ============================================================
// PatientFaceExpression derive unit tests (Sprint B.8)
// ============================================================
// Pure fonksiyonlar — yanak kızarma severity (ateş + alerjik).
// ============================================================

import { describe, it, expect } from "vitest";
import { deriveCheekFlushSeverity } from "@/components/patient-3d/PatientFaceExpression";
import type { PatientVitals } from "@/engine/types";

const baseline: PatientVitals = {
  hr: 80,
  bp_systolic: 120,
  bp_diastolic: 80,
  spo2: 98,
  temp: 36.7,
  rr: 14,
  gcs: 15,
};

describe("deriveCheekFlushSeverity — yanak kızarma", () => {
  it("normal vital'lerde 0 (kızarma yok)", () => {
    expect(deriveCheekFlushSeverity(baseline)).toBe(0);
  });

  it("ateş 38.5°C → orta kızarma (~0.4)", () => {
    const s = deriveCheekFlushSeverity({ ...baseline, temp: 38.5 });
    expect(s).toBeCloseTo(0.4, 1);
  });

  it("ciddi ateş 39.5°C → yüksek kızarma", () => {
    const s = deriveCheekFlushSeverity({ ...baseline, temp: 39.5 });
    expect(s).toBeGreaterThanOrEqual(0.7);
  });

  it("hiperpireksia 40.5°C → near-max kızarma (~0.9, ateş 3 eşik tetiklenir)", () => {
    const s = deriveCheekFlushSeverity({ ...baseline, temp: 40.5 });
    expect(s).toBeCloseTo(0.9, 1);
  });

  it("ateş + anaflaksi clamp 1 (çok kızarık)", () => {
    const s = deriveCheekFlushSeverity({
      ...baseline,
      temp: 40,
      bp_systolic: 80,
      hr: 125,
      spo2: 94,
    });
    expect(s).toBe(1); // 0.4+0.3+0.2+0.3 = 1.2 → clamp 1
  });

  it("anaflaksi (SBP<90, HR>110, SpO2>=90) → orta kızarma", () => {
    const s = deriveCheekFlushSeverity({
      ...baseline,
      bp_systolic: 75,
      hr: 130,
      spo2: 95,
    });
    expect(s).toBeCloseTo(0.3, 1);
  });

  it("hipovolemik şok (SBP<90, HR>110, SpO2<90) → kızarma YOK (siyanoz var)", () => {
    // SpO2 < 90 → alerjik flush proxy match etmez (siyanoz oluşur)
    const s = deriveCheekFlushSeverity({
      ...baseline,
      bp_systolic: 80,
      hr: 125,
      spo2: 82,
    });
    expect(s).toBe(0);
  });

  it("ateş + anaflaksi → toplam yüksek", () => {
    const s = deriveCheekFlushSeverity({
      ...baseline,
      temp: 39,
      bp_systolic: 80,
      hr: 120,
      spo2: 94,
    });
    expect(s).toBeGreaterThanOrEqual(0.6);
  });

  it("hipotermi (temp<36) → kızarma yok", () => {
    const s = deriveCheekFlushSeverity({ ...baseline, temp: 35 });
    expect(s).toBe(0);
  });
});
