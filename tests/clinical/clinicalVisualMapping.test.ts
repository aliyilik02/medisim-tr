// ============================================================
// clinicalVisualMapping — sürekli vital → görsel (0-1) birim testi
// ============================================================

import { describe, expect, test } from "vitest";
import { mapVitalsToVisuals } from "@/clinical/clinicalVisualMapping";
import type { PatientVitals } from "@/engine";

const BASE: PatientVitals = {
  hr: 80,
  bp_systolic: 120,
  bp_diastolic: 80,
  spo2: 98,
  temp: 36.8,
  rr: 16,
  pain: 0,
  glucose: 100,
  gcs: 15,
};

describe("mapVitalsToVisuals — siyanoz (SpO2)", () => {
  test("normal SpO2 → cyanosis 0", () => {
    expect(mapVitalsToVisuals(BASE).cyanosis).toBe(0);
  });
  test("SpO2 düştükçe cyanosis artar", () => {
    const mild = mapVitalsToVisuals({ ...BASE, spo2: 86 }); // (92-86)/12 = 0.5
    const severe = mapVitalsToVisuals({ ...BASE, spo2: 80 }); // (92-80)/12 = 1
    expect(mild.cyanosis).toBeCloseTo(0.5, 5);
    expect(severe.cyanosis).toBe(1);
    expect(severe.cyanosis).toBeGreaterThan(mild.cyanosis);
  });
  test("aşırı düşük SpO2 → clamp 1 (taşmaz)", () => {
    expect(mapVitalsToVisuals({ ...BASE, spo2: 50 }).cyanosis).toBe(1);
  });
});

describe("mapVitalsToVisuals — solgunluk + benekli (SBP)", () => {
  test("normal SBP → pallor/mottled 0", () => {
    const v = mapVitalsToVisuals(BASE);
    expect(v.pallor).toBe(0);
    expect(v.mottled).toBe(0);
  });
  test("SBP düştükçe pallor artar (100 bandı)", () => {
    expect(mapVitalsToVisuals({ ...BASE, bp_systolic: 80 }).pallor).toBeCloseTo(0.5, 5);
    expect(mapVitalsToVisuals({ ...BASE, bp_systolic: 60 }).pallor).toBe(1);
  });
  test("şok SBP → mottled artar (90 bandı)", () => {
    expect(mapVitalsToVisuals({ ...BASE, bp_systolic: 75 }).mottled).toBeCloseTo(0.5, 5);
    expect(mapVitalsToVisuals({ ...BASE, bp_systolic: 60 }).mottled).toBe(1);
  });
});

describe("mapVitalsToVisuals — terleme (diaphoresis)", () => {
  test("sakin → 0", () => {
    expect(mapVitalsToVisuals(BASE).diaphoresis).toBe(0);
  });
  test("yüksek ağrı → terleme", () => {
    expect(mapVitalsToVisuals({ ...BASE, pain: 10 }).diaphoresis).toBe(1);
  });
  test("taşikardi → terleme (HR>110)", () => {
    expect(mapVitalsToVisuals({ ...BASE, hr: 150 }).diaphoresis).toBe(1);
    expect(mapVitalsToVisuals({ ...BASE, hr: 130 }).diaphoresis).toBeCloseTo(0.5, 5);
  });
  test("ağrı VEYA taşikardi maks rampası", () => {
    // pain 6 → 0.2, hr 130 → 0.5 → maks 0.5
    expect(mapVitalsToVisuals({ ...BASE, pain: 6, hr: 130 }).diaphoresis).toBeCloseTo(0.5, 5);
  });
});

describe("mapVitalsToVisuals — bilinç + opsiyonel vitaller", () => {
  test("GCS/15", () => {
    expect(mapVitalsToVisuals(BASE).consciousness).toBe(1);
    expect(mapVitalsToVisuals({ ...BASE, gcs: 9 }).consciousness).toBeCloseTo(0.6, 5);
  });
  test("pain/gcs tanımsızsa güvenli varsayılan (çökmez)", () => {
    const v = mapVitalsToVisuals({ ...BASE, pain: undefined, gcs: undefined });
    expect(v.diaphoresis).toBe(0); // pain yok
    expect(v.consciousness).toBe(1); // gcs yok → tam bilinç
  });
  test("breathingRate = RR aynen", () => {
    expect(mapVitalsToVisuals({ ...BASE, rr: 28 }).breathingRate).toBe(28);
  });
});
