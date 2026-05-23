// ============================================================
// MedicationBolus drug-color unit tests (Sprint B.6.2)
// ============================================================
// Klinik ilaç klasifikasyonu renk eşleştirmesi — pure regex testler.
// ============================================================

import { describe, it, expect } from "vitest";
import { getDrugColor } from "@/components/patient-3d/MedicationBolus";

describe("getDrugColor — klinik ilaç sınıfı → renk", () => {
  it("null/undefined → varsayılan yeşil", () => {
    expect(getDrugColor(null)).toBe("#22c55e");
    expect(getDrugColor(undefined)).toBe("#22c55e");
    expect(getDrugColor("")).toBe("#22c55e");
  });

  it("vazopresör/inotrop (adrenalin, noradrenalin, dopamin) → kırmızı", () => {
    expect(getDrugColor("adrenalin")).toBe("#dc2626");
    expect(getDrugColor("epinefrin")).toBe("#dc2626");
    expect(getDrugColor("noradrenalin")).toBe("#dc2626");
    expect(getDrugColor("norepinefrin")).toBe("#dc2626");
    expect(getDrugColor("dopamin")).toBe("#dc2626");
    expect(getDrugColor("Adrenalin 1mg IV")).toBe("#dc2626"); // case insensitive
  });

  it("opioid (morfin, fentanil, tramadol) → mor", () => {
    expect(getDrugColor("morfin")).toBe("#9333ea");
    expect(getDrugColor("fentanil")).toBe("#9333ea");
    expect(getDrugColor("tramadol")).toBe("#9333ea");
    expect(getDrugColor("opioid")).toBe("#9333ea");
  });

  it("antiaritmik (atropin, amiodaron, lidokain) → sarı", () => {
    expect(getDrugColor("atropin")).toBe("#f59e0b");
    expect(getDrugColor("amiodaron")).toBe("#f59e0b");
    expect(getDrugColor("lidokain")).toBe("#f59e0b");
  });

  it("metabolik (insülin/glukoz/dextroz) → mavi", () => {
    expect(getDrugColor("insulin")).toBe("#3b82f6");
    expect(getDrugColor("glukoz")).toBe("#3b82f6");
    expect(getDrugColor("dextroz")).toBe("#3b82f6");
    expect(getDrugColor("dextroz-%30")).toBe("#3b82f6");
  });

  it("antiplatelet/antikoagülan (ASA, heparin, clopidogrel) → pembe", () => {
    expect(getDrugColor("aspirin")).toBe("#ec4899");
    expect(getDrugColor("asa")).toBe("#ec4899");
    expect(getDrugColor("heparin")).toBe("#ec4899");
    expect(getDrugColor("clopidogrel")).toBe("#ec4899");
  });

  it("tanımsız ilaç → varsayılan yeşil", () => {
    expect(getDrugColor("paracetamol")).toBe("#22c55e");
    expect(getDrugColor("salbutamol")).toBe("#22c55e");
    expect(getDrugColor("xxx-unknown-drug")).toBe("#22c55e");
  });
});
