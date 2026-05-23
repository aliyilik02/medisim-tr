// ============================================================
// PatientRash deriveAcuteRash unit tests (Sprint B.10++)
// ============================================================

import { describe, it, expect } from "vitest";
import { deriveAcuteRash } from "@/components/patient-3d/PatientRash";

const normalVitals = {
  hr: 80,
  bp_systolic: 120,
  spo2: 98,
  temp: 36.7,
};

describe("deriveAcuteRash — anaflaksi ürtiker", () => {
  it("anaflaksi senaryosu + SBP<100 + HR>100 → 4 ürtiker site", () => {
    const sites = deriveAcuteRash("acil-anaflaksi-001", {
      hr: 130,
      bp_systolic: 80,
      spo2: 95,
      temp: 36.8,
    });
    expect(sites).toHaveLength(4);
    expect(sites.every((s) => s.type === "urticaria")).toBe(true);
    expect(sites[0].label).toContain("ürtiker");
  });

  it("anaflaksi senaryosu + normal vital → boş", () => {
    const sites = deriveAcuteRash("acil-anaflaksi-001", normalVitals);
    expect(sites).toEqual([]);
  });

  it("anaflaksi olmayan senaryo + düşük SBP → boş", () => {
    const sites = deriveAcuteRash("kardiyoloji-stemi-001", {
      hr: 130,
      bp_systolic: 80,
      spo2: 95,
      temp: 36.8,
    });
    expect(sites).toEqual([]);
  });
});

describe("deriveAcuteRash — sepsis peteşi", () => {
  it("sepsis senaryosu + temp>38.5 → 3 peteşi site", () => {
    const sites = deriveAcuteRash("pediatri-sepsis-001", {
      hr: 110,
      bp_systolic: 90,
      spo2: 95,
      temp: 39.2,
    });
    expect(sites).toHaveLength(3);
    expect(sites.every((s) => s.type === "petechiae")).toBe(true);
  });

  it("hemsirelik-sepsis-001 + temp=39 → peteşi", () => {
    const sites = deriveAcuteRash("hemsirelik-sepsis-001", {
      hr: 105,
      bp_systolic: 95,
      spo2: 94,
      temp: 39.0,
    });
    expect(sites).toHaveLength(3);
  });

  it("sepsis senaryo + temp normal → boş (sepsis tanısı tamam değil)", () => {
    const sites = deriveAcuteRash("pediatri-sepsis-001", {
      hr: 95,
      bp_systolic: 100,
      spo2: 97,
      temp: 37.5,
    });
    expect(sites).toEqual([]);
  });

  it("sepsis olmayan + yüksek ateş → boş (ateş tek başına yeterli değil)", () => {
    const sites = deriveAcuteRash("dahiliye-dka-001", {
      hr: 100,
      bp_systolic: 100,
      spo2: 96,
      temp: 39.5,
    });
    expect(sites).toEqual([]);
  });
});

describe("deriveAcuteRash — ilgisiz senaryolar", () => {
  it("STEMI / DKA / iskemik inme / vs. → boş", () => {
    for (const id of [
      "kardiyoloji-stemi-001",
      "dahiliye-dka-001",
      "acil-iskemik-inme-001",
      "kadin_dogum-preeklampsi-001",
      "askeri_tccc-patlama-001",
    ]) {
      expect(deriveAcuteRash(id, normalVitals)).toEqual([]);
    }
  });
});
