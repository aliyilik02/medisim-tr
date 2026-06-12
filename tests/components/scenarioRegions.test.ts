// ============================================================
// buildScenarioRegions testleri — Faz 1 oskültasyon override (§4.4)
// ============================================================
import { describe, expect, test } from "vitest";
import { buildScenarioRegions } from "@/components/patient-3d/scenarioRegions";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { getScenario } from "../helpers/all-scenarios";

const anaflaksi = getScenario("acil-anaflaksi-001");
if (!anaflaksi) throw new Error("Anaflaksi senaryosu bulunamadı");

describe("buildScenarioRegions", () => {
  test("auscultation alanı olmayan senaryoda base regions aynen döner", () => {
    const stemi = getScenario("kardiyoloji-stemi-001");
    if (!stemi || stemi.auscultation) {
      // STEMI'ye ileride auscultation eklenirse bu test güncellenmeli
      expect(buildScenarioRegions(DEFAULT_REGIONS, undefined, [])).toBe(
        DEFAULT_REGIONS
      );
      return;
    }
    expect(buildScenarioRegions(DEFAULT_REGIONS, stemi, [])).toBe(
      DEFAULT_REGIONS
    );
  });

  test("faz aktifken patolojik ses (wheeze) atanır", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, anaflaksi, []);
    const chestFront = regions.find((r) => r.id === "chest-front")!;
    expect(chestFront.auscultationSoundId).toBe("lung_wheeze");
    // Bulgu notu da override edilir
    expect(chestFront.placeholderNote).toContain("wheezing");
  });

  test("faz halt edildikten sonra resolved ses (normal) atanır", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, anaflaksi, [
      "untreated-anaphylaxis",
    ]);
    const chestFront = regions.find((r) => r.id === "chest-front")!;
    expect(chestFront.auscultationSoundId).toBe("heart_normal");
  });

  test("override olmayan bölgeler dokunulmaz", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, anaflaksi, []);
    const mouth = regions.find((r) => r.id === "face-mouth")!;
    const baseMouth = DEFAULT_REGIONS.find((r) => r.id === "face-mouth")!;
    expect(mouth).toEqual(baseMouth);
  });

  test("ses atanan bölgede stetoskop prosedürü garanti açık", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, anaflaksi, []);
    for (const id of ["chest-front", "chest-left", "chest-right"]) {
      const r = regions.find((x) => x.id === id)!;
      expect(r.availableProcedures).toContain("stethoscope");
    }
  });
});
