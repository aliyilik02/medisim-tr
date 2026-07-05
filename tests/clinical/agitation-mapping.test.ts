// ============================================================
// agitation-mapping — vital → prosedürel hareket katmanı testleri
// ============================================================

import { describe, expect, test } from "vitest";
import { vitalsToAgitation } from "@/clinical/agitation-mapping";
import type { PatientVitals } from "@/engine";

const base: PatientVitals = {
  hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 97, temp: 36.8, rr: 14, pain: 0,
};

describe("vitalsToAgitation", () => {
  test("normal vital → her iki kanal 0", () => {
    expect(vitalsToAgitation(base)).toEqual({ tremor: 0, restlessness: 0 });
  });

  test("tremor: 38.5°C altı 0, 39.0 ara, 39.5+ tavan", () => {
    expect(vitalsToAgitation({ ...base, temp: 38.4 }).tremor).toBe(0);
    const mid = vitalsToAgitation({ ...base, temp: 39.0 }).tremor;
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(vitalsToAgitation({ ...base, temp: 40.2 }).tremor).toBe(1);
  });

  test("tremor: derin hipoksi katkısı (SpO2 75 → 0.5), ateşle max alınır", () => {
    expect(vitalsToAgitation({ ...base, spo2: 75 }).tremor).toBeCloseTo(0.5, 5);
    // hem ateş hem hipoksi → büyük olan kazanır
    expect(vitalsToAgitation({ ...base, spo2: 75, temp: 40 }).tremor).toBe(1);
  });

  test("restlessness: ağrı 4→7 rampası; 7+ tavan (moaning klibi devralır)", () => {
    expect(vitalsToAgitation({ ...base, pain: 3 }).restlessness).toBe(0);
    expect(vitalsToAgitation({ ...base, pain: 5.5 }).restlessness).toBeCloseTo(0.5, 5);
    expect(vitalsToAgitation({ ...base, pain: 9 }).restlessness).toBe(1);
  });

  test("pain undefined güvenli (0 kabul)", () => {
    const { pain: _p, ...rest } = base;
    expect(vitalsToAgitation(rest as PatientVitals).restlessness).toBe(0);
  });
});
