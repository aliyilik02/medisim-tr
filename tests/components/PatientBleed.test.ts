// ============================================================
// PatientBleed applyHemostasis unit tests (Sprint B.10)
// ============================================================
// Hemostatik kontrol pattern matching — turnike/gauze/bası action'larına
// göre severity faktör + scope (arterial-only vs all).
// ============================================================

import { describe, it, expect } from "vitest";
import { applyHemostasis, type BleedingSite } from "@/components/patient-3d/PatientBleed";

const arterial1: BleedingSite = {
  position: [0.10, 0.55, 0.07],
  severity: 0.85,
  type: "arterial",
  label: "Sağ aksilla şarapnel",
};

const arterial2: BleedingSite = {
  position: [-0.08, 0.18, 0.10],
  severity: 0.75,
  type: "arterial",
  label: "Sol uyluk medial",
};

const venous: BleedingSite = {
  position: [0.05, 0.40, 0.08],
  severity: 0.60,
  type: "venous",
  label: "Venöz hasar",
};

const capillary: BleedingSite = {
  position: [0.20, 0.50, 0.05],
  severity: 0.40,
  type: "capillary",
  label: "Yüzeyel abrazyon",
};

const initialSites: BleedingSite[] = [arterial1, arterial2, venous, capillary];

describe("applyHemostasis — turnike (CAT/SOFT-T)", () => {
  it("'turnike' action arterial sites severity × 0.05", () => {
    const result = applyHemostasis(initialSites, "turnike");
    expect(result[0].severity).toBeCloseTo(0.85 * 0.05, 4);
    expect(result[1].severity).toBeCloseTo(0.75 * 0.05, 4);
  });

  it("'CAT-GEN-7' action sadece arterial etkiler, venöz değişmez", () => {
    const result = applyHemostasis(initialSites, "CAT-GEN-7");
    expect(result[2].severity).toBe(0.60); // venöz değişmedi
    expect(result[3].severity).toBe(0.40); // kapiller değişmedi
  });

  it("'tourniquet' (İngilizce) match etmeli", () => {
    const result = applyHemostasis([arterial1], "tourniquet");
    expect(result[0].severity).toBeCloseTo(0.85 * 0.05, 4);
  });

  it("'SOFT-T-WIDE' (SOFT-T variant) match etmeli", () => {
    const result = applyHemostasis([arterial1], "SOFT-T-WIDE");
    expect(result[0].severity).toBeCloseTo(0.85 * 0.05, 4);
  });
});

describe("applyHemostasis — quikclot/gauze packing", () => {
  it("'quikclot' action tüm sites severity × 0.20", () => {
    const result = applyHemostasis(initialSites, "quikclot");
    expect(result[0].severity).toBeCloseTo(0.85 * 0.20, 4);
    expect(result[1].severity).toBeCloseTo(0.75 * 0.20, 4);
    expect(result[2].severity).toBeCloseTo(0.60 * 0.20, 4);
    expect(result[3].severity).toBeCloseTo(0.40 * 0.20, 4);
  });

  it("'combat-gauze' match etmeli", () => {
    const result = applyHemostasis([arterial1], "combat-gauze");
    expect(result[0].severity).toBeCloseTo(0.85 * 0.20, 4);
  });

  it("'wound-packing' match etmeli", () => {
    const result = applyHemostasis([venous], "wound-packing");
    expect(result[0].severity).toBeCloseTo(0.60 * 0.20, 4);
  });

  it("'hemostatic gaz' match etmeli (TR + EN karışık)", () => {
    const result = applyHemostasis([venous], "hemostatic gauze");
    expect(result[0].severity).toBeCloseTo(0.60 * 0.20, 4);
  });
});

describe("applyHemostasis — direkt bası", () => {
  it("'direkt bası' action tüm sites severity × 0.40", () => {
    const result = applyHemostasis([venous], "direkt bası");
    expect(result[0].severity).toBeCloseTo(0.60 * 0.40, 4);
  });

  it("'direct-pressure' (İngilizce) match etmeli", () => {
    const result = applyHemostasis([arterial1], "direct-pressure");
    expect(result[0].severity).toBeCloseTo(0.85 * 0.40, 4);
  });

  it("'kompres' match etmeli", () => {
    const result = applyHemostasis([venous], "kompres-uygula");
    expect(result[0].severity).toBeCloseTo(0.60 * 0.40, 4);
  });
});

describe("applyHemostasis — ilgisiz action'lar", () => {
  it("'oxygen-mask' bleeding'i etkilemez", () => {
    const result = applyHemostasis(initialSites, "oxygen-mask");
    expect(result).toEqual(initialSites); // değişmedi
  });

  it("'iv-line' bleeding'i etkilemez", () => {
    const result = applyHemostasis(initialSites, "iv-line");
    expect(result).toEqual(initialSites);
  });

  it("'adrenalin' bleeding'i etkilemez", () => {
    const result = applyHemostasis(initialSites, "adrenalin");
    expect(result).toEqual(initialSites);
  });

  it("boş action id → array değişmez", () => {
    const result = applyHemostasis(initialSites, "");
    expect(result).toEqual(initialSites);
  });
});

describe("applyHemostasis — boş sites", () => {
  it("Boş array → boş array döner", () => {
    expect(applyHemostasis([], "turnike")).toEqual([]);
  });
});
