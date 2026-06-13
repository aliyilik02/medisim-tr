// ============================================================
// patientModels unit testleri — hasta → varyant + ten tonu mapping
// ============================================================
// patientToVariant / patientToSkinTone saf TS türetme fonksiyonları;
// klinik landmark hizası model seçimine bağlı olduğu için birim test kritik.
// PATIENT_MODELS / SKIN_TONE_PRESETS tabloları da bütünlük açısından doğrulanır.
// ============================================================

import { describe, expect, test } from "vitest";
import {
  patientToVariant,
  patientToSkinTone,
  PATIENT_MODELS,
  SKIN_TONE_PRESETS,
  DEFAULT_PATIENT_VARIANT,
  DEFAULT_SKIN_TONE,
  type PatientVariant,
  type SkinTone,
} from "@/components/patient-3d/patientModels";

describe("patientToVariant — yaşa göre seçim", () => {
  test("yaş < 13 → child (cinsiyetten bağımsız)", () => {
    expect(patientToVariant({ age: 12, sex: "M" })).toBe("child");
    expect(patientToVariant({ age: 5, sex: "F" })).toBe("child");
    expect(patientToVariant({ age: 0 })).toBe("child");
  });

  test("yaş 13 sınır → artık child değil (erişkin)", () => {
    expect(patientToVariant({ age: 13, sex: "F" })).toBe("female-adult");
    expect(patientToVariant({ age: 13, sex: "M" })).toBe("male-adult");
  });

  test("yaş ≥ 65 → elderly (cinsiyetten bağımsız)", () => {
    expect(patientToVariant({ age: 65, sex: "M" })).toBe("elderly");
    expect(patientToVariant({ age: 80, sex: "F" })).toBe("elderly");
  });

  test("yaş 64 sınır → henüz elderly değil (erişkin)", () => {
    expect(patientToVariant({ age: 64, sex: "M" })).toBe("male-adult");
    expect(patientToVariant({ age: 64, sex: "F" })).toBe("female-adult");
  });
});

describe("patientToVariant — cinsiyete göre erişkin", () => {
  test("M → male-adult", () => {
    expect(patientToVariant({ age: 30, sex: "M" })).toBe("male-adult");
  });

  test("F → female-adult", () => {
    expect(patientToVariant({ age: 30, sex: "F" })).toBe("female-adult");
  });

  test("cinsiyet verilmezse erişkinde female-adult'a düşer", () => {
    expect(patientToVariant({ age: 40 })).toBe("female-adult");
  });

  test("yaş verilmezse default 30 → erişkin", () => {
    expect(patientToVariant({ sex: "M" })).toBe("male-adult");
    expect(patientToVariant({})).toBe("female-adult");
  });
});

describe("patientToVariant — avatar_id override", () => {
  test("geçerli avatar_id doğrudan varyant olarak kullanılır (yaş/cinsiyeti ezer)", () => {
    // child yaşı olmasına rağmen avatar_id elderly'yi zorlar
    expect(
      patientToVariant({ age: 8, sex: "F", avatar_id: "elderly" }),
    ).toBe("elderly");
    expect(
      patientToVariant({ age: 70, avatar_id: "child" }),
    ).toBe("child");
    expect(
      patientToVariant({ age: 30, sex: "F", avatar_id: "male-adult" }),
    ).toBe("male-adult");
  });

  test("geçersiz avatar_id yoksayılır → yaş/cinsiyet mantığına döner", () => {
    expect(
      patientToVariant({ age: 30, sex: "M", avatar_id: "bilinmeyen" }),
    ).toBe("male-adult");
    expect(
      patientToVariant({ age: 10, avatar_id: "" }),
    ).toBe("child");
  });

  test("DEFAULT_PATIENT_VARIANT female-adult", () => {
    expect(DEFAULT_PATIENT_VARIANT).toBe("female-adult");
  });
});

describe("patientToSkinTone — ten tonu seçimi", () => {
  test("geçerli skin_tone alanı doğrudan kullanılır", () => {
    expect(patientToSkinTone({ skin_tone: "fair" })).toBe("fair");
    expect(patientToSkinTone({ skin_tone: "tan" })).toBe("tan");
    expect(patientToSkinTone({ skin_tone: "brown" })).toBe("brown");
    expect(patientToSkinTone({ skin_tone: "dark" })).toBe("dark");
    expect(patientToSkinTone({ skin_tone: "mediterranean" })).toBe("mediterranean");
  });

  test("skin_tone yoksa default mediterranean", () => {
    expect(patientToSkinTone({})).toBe("mediterranean");
    expect(patientToSkinTone({ skin_tone: undefined })).toBe("mediterranean");
  });

  test("geçersiz skin_tone → default mediterranean", () => {
    expect(patientToSkinTone({ skin_tone: "yesil" })).toBe("mediterranean");
    expect(patientToSkinTone({ skin_tone: "" })).toBe("mediterranean");
  });

  test("DEFAULT_SKIN_TONE mediterranean", () => {
    expect(DEFAULT_SKIN_TONE).toBe("mediterranean");
  });
});

describe("PATIENT_MODELS — tablo bütünlüğü", () => {
  const variants: PatientVariant[] = [
    "female-adult",
    "male-adult",
    "child",
    "elderly",
  ];

  test("4 varyantın tümü tanımlı", () => {
    expect(Object.keys(PATIENT_MODELS).sort()).toEqual([...variants].sort());
  });

  test.each(variants)("%s varyantı url/scale/yOffset içerir", (variant) => {
    const def = PATIENT_MODELS[variant];
    expect(def).toBeDefined();
    expect(typeof def.url).toBe("string");
    expect(def.url).toMatch(/\.glb$/);
    expect(typeof def.scale).toBe("number");
    expect(def.scale).toBeGreaterThan(0);
    expect(typeof def.yOffset).toBe("number");
  });

  test("tüm varyantlar aynı canonical ayak hizasında (yOffset = -0.243)", () => {
    for (const v of variants) {
      expect(PATIENT_MODELS[v].yOffset).toBe(-0.243);
    }
  });
});

describe("SKIN_TONE_PRESETS — tablo bütünlüğü", () => {
  const tones: SkinTone[] = ["fair", "mediterranean", "tan", "brown", "dark"];

  test("5 ten tonunun tümü tanımlı", () => {
    expect(Object.keys(SKIN_TONE_PRESETS).sort()).toEqual([...tones].sort());
  });

  test.each(tones)("%s tonu geçerli lineer-RGB üçlüsü (0..1)", (tone) => {
    const rgb = SKIN_TONE_PRESETS[tone];
    expect(rgb).toHaveLength(3);
    for (const channel of rgb) {
      expect(typeof channel).toBe("number");
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });
});
