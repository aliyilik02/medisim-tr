// ============================================================
// Pedagojik mod davranışı — egitim/klinik/sinav
// ============================================================

import { describe, expect, test } from "vitest";
import { PEDAGOGY, PEDAGOGY_ORDER, getPedagogy } from "@/engine";

describe("PEDAGOGY map", () => {
  test("üç mod tanımlı + sıralı (öğretici→uygulama→sınav)", () => {
    expect(PEDAGOGY_ORDER).toEqual(["egitim", "klinik", "sinav"]);
    for (const m of PEDAGOGY_ORDER) expect(PEDAGOGY[m]).toBeTruthy();
  });

  test("egitim = öğretici (otomatik + narration, puansız)", () => {
    expect(PEDAGOGY.egitim.autoPlay).toBe(true);
    expect(PEDAGOGY.egitim.narration).toBe(true);
    expect(PEDAGOGY.egitim.scored).toBe(false);
  });

  test("klinik = uygulama (interaktif + ipucu + puan, otomatik değil)", () => {
    expect(PEDAGOGY.klinik.autoPlay).toBe(false);
    expect(PEDAGOGY.klinik.showHints).toBe(true);
    expect(PEDAGOGY.klinik.showFeedback).toBe(true);
    expect(PEDAGOGY.klinik.scored).toBe(true);
  });

  test("sinav = sınav (ipucu YOK, geri bildirim YOK, puanlı)", () => {
    expect(PEDAGOGY.sinav.showHints).toBe(false);
    expect(PEDAGOGY.sinav.showFeedback).toBe(false);
    expect(PEDAGOGY.sinav.scored).toBe(true);
    expect(PEDAGOGY.sinav.autoPlay).toBe(false);
  });

  test("getPedagogy bilinmeyen mod → klinik fallback", () => {
    // @ts-expect-error — kasıtlı geçersiz mod
    expect(getPedagogy("yok")).toBe(PEDAGOGY.klinik);
  });
});
