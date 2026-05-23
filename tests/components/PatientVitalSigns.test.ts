// ============================================================
// PatientVitalSigns derive unit tests (Sprint B.6.1)
// ============================================================
// Pure fonksiyonlar — render testi değil, vital → severity matematiği.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  deriveSweatSeverity,
  deriveJvdSeverity,
  deriveEyelidCloseness,
} from "@/components/patient-3d/PatientVitalSigns";
import type { PatientVitals } from "@/engine/types";

const baselineVitals: PatientVitals = {
  hr: 80,
  bp_systolic: 120,
  bp_diastolic: 80,
  spo2: 98,
  temp: 36.7,
  rr: 14,
  gcs: 15,
};

describe("deriveSweatSeverity — terleme şiddeti", () => {
  it("normal vital'lerde 0 (terleme yok)", () => {
    expect(deriveSweatSeverity(baselineVitals)).toBe(0);
  });

  it("hipotansiyon SBP=85 → orta terleme (~0.5)", () => {
    const s = deriveSweatSeverity({ ...baselineVitals, bp_systolic: 85 });
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThanOrEqual(0.6);
  });

  it("ciddi hipotansiyon SBP=65 → ağır terleme", () => {
    const s = deriveSweatSeverity({ ...baselineVitals, bp_systolic: 65 });
    expect(s).toBeGreaterThanOrEqual(0.8);
  });

  it("ateş temp=38.5 → terleme (~0.3)", () => {
    const s = deriveSweatSeverity({ ...baselineVitals, temp: 38.5 });
    expect(s).toBeGreaterThanOrEqual(0.3);
    expect(s).toBeLessThanOrEqual(0.5);
  });

  it("şok (taşikardi+hipotansiyon) → yüksek", () => {
    const s = deriveSweatSeverity({
      ...baselineVitals,
      bp_systolic: 80,
      hr: 140,
    });
    expect(s).toBeGreaterThanOrEqual(0.7);
  });

  it("max 1'i geçmez (clamp)", () => {
    const s = deriveSweatSeverity({
      ...baselineVitals,
      bp_systolic: 50,
      temp: 40,
      hr: 150,
    });
    expect(s).toBeLessThanOrEqual(1);
    expect(s).toBe(1);
  });
});

describe("deriveJvdSeverity — juguler ven dolgunluğu", () => {
  it("normal vital'lerde 0", () => {
    expect(deriveJvdSeverity(baselineVitals)).toBe(0);
  });

  it("CVP=15 cmH2O → orta JVD", () => {
    const s = deriveJvdSeverity({ ...baselineVitals, cvp: 15 });
    expect(s).toBeGreaterThanOrEqual(0.5);
    expect(s).toBeLessThan(0.81);
  });

  it("CVP=22 → ağır JVD", () => {
    const s = deriveJvdSeverity({ ...baselineVitals, cvp: 22 });
    expect(s).toBeGreaterThanOrEqual(0.8);
  });

  it("sağ kalp yetm proxy (hipo+taşi+düşük spo2) → JVD", () => {
    const s = deriveJvdSeverity({
      ...baselineVitals,
      bp_systolic: 80,
      hr: 130,
      spo2: 85,
    });
    expect(s).toBeGreaterThanOrEqual(0.4);
  });

  it("CVP undefined ve normal vital → 0", () => {
    const s = deriveJvdSeverity({ ...baselineVitals, cvp: undefined });
    expect(s).toBe(0);
  });
});

describe("deriveEyelidCloseness — GCS → göz kapağı", () => {
  it("GCS=15 → tam açık (0)", () => {
    expect(deriveEyelidCloseness(15)).toBe(0);
  });
  it("GCS=14 → tam açık (0)", () => {
    expect(deriveEyelidCloseness(14)).toBe(0);
  });
  it("GCS=13 → hafif kapalı (0.2)", () => {
    expect(deriveEyelidCloseness(13)).toBe(0.2);
  });
  it("GCS=11 → hafif kapalı (0.2)", () => {
    expect(deriveEyelidCloseness(11)).toBe(0.2);
  });
  it("GCS=10 → yarı kapalı (0.5)", () => {
    expect(deriveEyelidCloseness(10)).toBe(0.5);
  });
  it("GCS=8 → yarı kapalı (0.5)", () => {
    expect(deriveEyelidCloseness(8)).toBe(0.5);
  });
  it("GCS=7 → büyük çoğunluk kapalı (0.8)", () => {
    expect(deriveEyelidCloseness(7)).toBe(0.8);
  });
  it("GCS=5 → büyük çoğunluk kapalı (0.8)", () => {
    expect(deriveEyelidCloseness(5)).toBe(0.8);
  });
  it("GCS=4 → tam kapalı (1)", () => {
    expect(deriveEyelidCloseness(4)).toBe(1);
  });
  it("GCS=3 → tam kapalı (1)", () => {
    expect(deriveEyelidCloseness(3)).toBe(1);
  });
  it("GCS undefined → 0 (vital yok varsayım: bilinç değerlendirilmemiş, default açık)", () => {
    expect(deriveEyelidCloseness(undefined)).toBe(0);
  });
});
