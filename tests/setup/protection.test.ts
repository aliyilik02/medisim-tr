import { describe, expect, test } from "vitest";
import path from "node:path";
import { __isProtectedForTest as isProtected } from "./clinical-protection";

describe("Klinik dosya koruma — yol eşleştirme", () => {
  test("scenarios klasörü korunuyor", () => {
    expect(isProtected(path.resolve("src/data/scenarios/stemi.ts"))).toBe(true);
    expect(isProtected(path.resolve("src/data/scenarios/index.ts"))).toBe(true);
  });

  test("medications.ts ve medications-extended.ts korunuyor", () => {
    expect(isProtected(path.resolve("src/data/medications.ts"))).toBe(true);
    expect(isProtected(path.resolve("src/data/medications-extended.ts"))).toBe(true);
  });

  test("engine ve test dosyaları korunmuyor", () => {
    expect(isProtected(path.resolve("src/engine/engine.ts"))).toBe(false);
    expect(isProtected(path.resolve("tests/setup/clinical-protection.ts"))).toBe(false);
    expect(isProtected(path.resolve("vitest.config.ts"))).toBe(false);
  });
});
