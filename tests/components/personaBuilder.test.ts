// ============================================================
// personaBuilder — Unit testler (Sprint B.2)
// ============================================================
// Gemini systemInstruction için hasta persona metni inşa eden saf
// fonksiyon. Scenario data → TR persona prompt.
// ============================================================

import { describe, expect, test } from "vitest";
import { buildPatientPersona } from "@/components/dialog/personaBuilder";
import { SCENARIOS } from "@/data/scenarios";

describe("buildPatientPersona — temel format", () => {
  test("yaş + cinsiyet + kilo profili içerir", () => {
    const persona = buildPatientPersona(SCENARIOS[0]);
    const p = SCENARIOS[0].patient;
    expect(persona).toContain(`Yaş: ${p.age}`);
    expect(persona).toContain(`Kilo: ${p.weight_kg}`);
  });

  test("ana şikayet (chief_complaint) görünür", () => {
    const persona = buildPatientPersona(SCENARIOS[0]);
    expect(persona).toContain(SCENARIOS[0].patient.chief_complaint);
  });

  test("'### Senin profilin (hastasın):' header'ı görünür", () => {
    const persona = buildPatientPersona(SCENARIOS[0]);
    expect(persona).toMatch(/### Senin profilin/);
  });
});

describe("buildPatientPersona — opsiyonel field'lar", () => {
  test("boy belirtilmişse persona'da görünür", () => {
    const scenarioWithHeight = SCENARIOS.find(
      (s) => s.patient.height_cm !== undefined,
    );
    if (!scenarioWithHeight) return; // fixture yok ise skip
    const persona = buildPatientPersona(scenarioWithHeight);
    expect(persona).toContain(`Boy: ${scenarioWithHeight.patient.height_cm}`);
  });

  test("ilaçlar boşsa 'yok', doluysa ';' ayraçla listelenir", () => {
    const noMedsScenario = SCENARIOS.find(
      (s) =>
        !s.patient.current_medications ||
        s.patient.current_medications.length === 0,
    );
    if (noMedsScenario) {
      const persona = buildPatientPersona(noMedsScenario);
      expect(persona).toMatch(/Şu an kullandığın ilaçlar: yok/);
    }

    const withMedsScenario = SCENARIOS.find(
      (s) =>
        s.patient.current_medications &&
        s.patient.current_medications.length > 0,
    );
    if (withMedsScenario) {
      const persona = buildPatientPersona(withMedsScenario);
      const firstMed = withMedsScenario.patient.current_medications![0];
      expect(persona).toContain(firstMed);
    }
  });

  test("alerji boşsa 'bildiğim yok', doluysa ';' ayraçla", () => {
    const noAllergyScenario = SCENARIOS.find(
      (s) => s.patient.allergies.length === 0,
    );
    if (noAllergyScenario) {
      const persona = buildPatientPersona(noAllergyScenario);
      expect(persona).toMatch(/Alerjiler: bildiğim yok/);
    }
  });

  test("history_items boşsa 'belirgin hastalık yok'", () => {
    const noHistScenario = SCENARIOS.find(
      (s) => s.patient.history_items.length === 0,
    );
    if (noHistScenario) {
      const persona = buildPatientPersona(noHistScenario);
      expect(persona).toMatch(/belirgin hastalık yok/);
    }
  });
});

describe("buildPatientPersona — davranış kuralları", () => {
  test("Tıp jargonu kullanma uyarısı içerir", () => {
    const persona = buildPatientPersona(SCENARIOS[0]);
    expect(persona).toMatch(/jargon|jargonu/i);
    // Örnek jargon→TR mapping örnekleri
    expect(persona).toContain("Dispnezi");
    expect(persona).toContain("Sinkop");
  });

  test("Format kuralları (1-3 cümle, max 40 kelime)", () => {
    const persona = buildPatientPersona(SCENARIOS[0]);
    expect(persona).toMatch(/1-3 cümle/);
    expect(persona).toMatch(/40 kelime/);
  });

  test("'Yapay zekâ olduğunu söylemezsin' kuralı içerir", () => {
    const persona = buildPatientPersona(SCENARIOS[0]);
    expect(persona).toMatch(/Yapay zek|karakter dışına çıkma/i);
  });
});

describe("buildPatientPersona — cinsiyet mapping", () => {
  test("M → 'Erkek', F → 'Kadın'", () => {
    const maleScenario = SCENARIOS.find((s) => s.patient.sex === "M");
    if (maleScenario) {
      const persona = buildPatientPersona(maleScenario);
      expect(persona).toContain("Cinsiyet: Erkek");
    }
    const femaleScenario = SCENARIOS.find((s) => s.patient.sex === "F");
    if (femaleScenario) {
      const persona = buildPatientPersona(femaleScenario);
      expect(persona).toContain("Cinsiyet: Kadın");
    }
  });
});
