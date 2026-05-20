// ============================================================
// Visual Mapping unit testleri — vital → 3D görsel parametre
// ============================================================
// Master rapor 4.10: visual mapping katmanı saf TS, %100 birim
// test edilmeli — klinik doğruluk için kritik.
// ============================================================

import { describe, expect, test } from "vitest";
import type { PatientVitals } from "@/engine";
import { vitalsToVisual, describeVisualMapping } from "@/clinical/visual-mapping";

const baseVitals: PatientVitals = {
  hr: 80,
  bp_systolic: 120,
  bp_diastolic: 75,
  spo2: 98,
  temp: 36.8,
  rr: 14,
};

describe("vitalsToVisual — cilt tonu mapping", () => {
  test("normal vital → normal cilt tonu", () => {
    expect(vitalsToVisual(baseVitals).skinTint).toBe("normal");
  });

  test("SpO2 < 88 → siyanoz", () => {
    expect(vitalsToVisual({ ...baseVitals, spo2: 85 }).skinTint).toBe("cyanosis");
  });

  test("SpO2 88 sınır → henüz siyanoz değil", () => {
    expect(vitalsToVisual({ ...baseVitals, spo2: 88 }).skinTint).toBe("normal");
  });

  test("SBP < 90 → solgun (şok)", () => {
    expect(vitalsToVisual({ ...baseVitals, bp_systolic: 80 }).skinTint).toBe("pallor");
  });

  test("Siyanoz solgundan baskın (her ikisi varsa)", () => {
    // Kritik hipoksi + şok → öncelik siyanoz
    expect(
      vitalsToVisual({ ...baseVitals, spo2: 80, bp_systolic: 70 }).skinTint,
    ).toBe("cyanosis");
  });

  test("HR ve RR doğru aktarılır", () => {
    const v = vitalsToVisual({ ...baseVitals, hr: 120, rr: 28 });
    expect(v.hr).toBe(120);
    expect(v.rr).toBe(28);
  });
});

describe("describeVisualMapping — debug string", () => {
  test("normal vital", () => {
    expect(describeVisualMapping(baseVitals)).toMatch(/NORMAL/);
  });

  test("siyanoz açıklaması SpO2 değerini içerir", () => {
    const desc = describeVisualMapping({ ...baseVitals, spo2: 84 });
    expect(desc).toMatch(/CYANOSIS/);
    expect(desc).toMatch(/SpO2=84/);
  });

  test("solgun açıklaması SBP değerini içerir", () => {
    const desc = describeVisualMapping({ ...baseVitals, bp_systolic: 75 });
    expect(desc).toMatch(/PALLOR/);
    expect(desc).toMatch(/SBP=75/);
  });
});
