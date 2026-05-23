// ============================================================
// patient-profile unit tests (Sprint B.7)
// ============================================================
// PALS yaş kategorileri + scale factor + display label türetimi.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  categorizeByAge,
  categoryToScale,
  categoryLabel,
  sexLabel,
  deriveProfile,
  type PatientCategory,
} from "@/clinical/patient-profile";

describe("categorizeByAge — yaş → PALS kategorisi", () => {
  it("0 yaş → infant (8 aylık bebek bronşiyolit/sepsis)", () => {
    expect(categorizeByAge(0)).toBe("infant");
  });
  it("1 yaş → toddler", () => {
    expect(categorizeByAge(1)).toBe("toddler");
  });
  it("2 yaş → toddler", () => {
    expect(categorizeByAge(2)).toBe("toddler");
  });
  it("3 yaş → pediatric", () => {
    expect(categorizeByAge(3)).toBe("pediatric");
  });
  it("11 yaş → pediatric (PALS sınırı)", () => {
    expect(categorizeByAge(11)).toBe("pediatric");
  });
  it("12 yaş → adolescent", () => {
    expect(categorizeByAge(12)).toBe("adolescent");
  });
  it("17 yaş → adolescent", () => {
    expect(categorizeByAge(17)).toBe("adolescent");
  });
  it("18 yaş → adult", () => {
    expect(categorizeByAge(18)).toBe("adult");
  });
  it("62 yaş → adult", () => {
    expect(categorizeByAge(62)).toBe("adult");
  });
  it("64 yaş → adult", () => {
    expect(categorizeByAge(64)).toBe("adult");
  });
  it("65 yaş → elderly", () => {
    expect(categorizeByAge(65)).toBe("elderly");
  });
  it("90 yaş → elderly", () => {
    expect(categorizeByAge(90)).toBe("elderly");
  });
});

describe("categoryToScale — Rocketbox baz scaleFactor", () => {
  it("infant 0.28 (50cm boy proxy)", () => {
    expect(categoryToScale("infant")).toBe(0.28);
  });
  it("toddler 0.47 (85cm)", () => {
    expect(categoryToScale("toddler")).toBe(0.47);
  });
  it("pediatric 0.75 (135cm)", () => {
    expect(categoryToScale("pediatric")).toBe(0.75);
  });
  it("adolescent 0.92 (165cm)", () => {
    expect(categoryToScale("adolescent")).toBe(0.92);
  });
  it("adult 1.00 (180cm baz)", () => {
    expect(categoryToScale("adult")).toBe(1.0);
  });
  it("elderly 0.97 (kifoz proxy)", () => {
    expect(categoryToScale("elderly")).toBe(0.97);
  });
});

describe("categoryLabel — TR yaş kategorisi etiketi", () => {
  it("infant → Bebek", () => expect(categoryLabel("infant")).toBe("Bebek"));
  it("toddler → Küçük Çocuk", () => expect(categoryLabel("toddler")).toBe("Küçük Çocuk"));
  it("pediatric → Çocuk", () => expect(categoryLabel("pediatric")).toBe("Çocuk"));
  it("adolescent → Adolesan", () => expect(categoryLabel("adolescent")).toBe("Adolesan"));
  it("adult → Erişkin", () => expect(categoryLabel("adult")).toBe("Erişkin"));
  it("elderly → Yaşlı", () => expect(categoryLabel("elderly")).toBe("Yaşlı"));
});

describe("sexLabel — TR cinsiyet etiketi", () => {
  it("M → Erkek", () => expect(sexLabel("M")).toBe("Erkek"));
  it("F → Kadın", () => expect(sexLabel("F")).toBe("Kadın"));
});

describe("deriveProfile — senaryo.patient → PatientProfile", () => {
  it("8 aylık bebek (age 0, M) → infant + scale 0.28 + label 'Erkek Bebek'", () => {
    const p = deriveProfile({ age: 0, sex: "M" });
    expect(p.category).toBe("infant");
    expect(p.scaleFactor).toBe(0.28);
    expect(p.displayLabel).toBe("Erkek Bebek");
    expect(p.pregnant).toBe(false);
  });

  it("24 yaş kadın (DKA) → adult F + scale 1.0 + 'Kadın'", () => {
    const p = deriveProfile({ age: 24, sex: "F" });
    expect(p.category).toBe("adult");
    expect(p.scaleFactor).toBe(1.0);
    expect(p.sex).toBe("F");
    expect(p.displayLabel).toContain("Kadın");
    expect(p.displayLabel).toContain("24");
  });

  it("62 yaş erkek (STEMI) → adult M", () => {
    const p = deriveProfile({ age: 62, sex: "M" });
    expect(p.category).toBe("adult");
    expect(p.displayLabel).toContain("Erkek");
    expect(p.displayLabel).toContain("62");
  });

  it("72 yaş kadın (iskemik inme) → elderly + scale 0.97", () => {
    const p = deriveProfile({ age: 72, sex: "F" });
    expect(p.category).toBe("elderly");
    expect(p.scaleFactor).toBe(0.97);
    expect(p.displayLabel).toContain("Yaşlı");
  });

  it("32 yaş gebe (preeklampsi) → adult F + pregnant + label · Gebe", () => {
    const p = deriveProfile({ age: 32, sex: "F", medical_history: { gebelik: true } });
    expect(p.pregnant).toBe(true);
    expect(p.displayLabel).toContain("Gebe");
  });

  it("varsayılan sex M (sex undefined)", () => {
    const p = deriveProfile({ age: 30 });
    expect(p.sex).toBe("M");
  });

  it("8 yaş çocuk (pediatrik sepsis senaryosu için tipik) → pediatric", () => {
    const p = deriveProfile({ age: 8, sex: "M" });
    expect(p.category).toBe("pediatric");
    expect(p.scaleFactor).toBe(0.75);
    expect(p.displayLabel).toContain("Çocuk");
  });

  it("skinHintRgb mevcut tüm yaş gruplarında (3 element)", () => {
    const cats: PatientCategory[] = [
      "infant", "toddler", "pediatric", "adolescent", "adult", "elderly",
    ];
    for (const c of cats) {
      const p = deriveProfile({ age: c === "infant" ? 0 : c === "toddler" ? 2 : c === "pediatric" ? 8 : c === "adolescent" ? 15 : c === "elderly" ? 72 : 35, sex: "M" });
      expect(p.skinHintRgb).toBeDefined();
      expect(p.skinHintRgb).toHaveLength(3);
    }
  });
});
