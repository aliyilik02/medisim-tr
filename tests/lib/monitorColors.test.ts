// ============================================================
// monitorColors unit testleri — vital monitör parametre renkleri
// ============================================================
// PARAM_COLOR tek kaynak (Philips IntelliVue / APSF konvansiyonu).
// 8 parametrenin tümü + geçerli hex değer garantisi — UI tutarlılığı kritik.
// ============================================================

import { describe, expect, test } from "vitest";
import { PARAM_COLOR, type MonitorParam } from "@/lib/monitorColors";

const EXPECTED_PARAMS: MonitorParam[] = [
  "hr",
  "spo2",
  "bp",
  "rr",
  "temp",
  "etco2",
  "gcs",
  "glucose",
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

describe("PARAM_COLOR — parametre kapsamı", () => {
  test("tam 8 parametre içerir", () => {
    expect(Object.keys(PARAM_COLOR)).toHaveLength(8);
  });

  test("beklenen 8 parametrenin tümü tanımlı", () => {
    expect(Object.keys(PARAM_COLOR).sort()).toEqual(
      [...EXPECTED_PARAMS].sort(),
    );
  });

  test.each(EXPECTED_PARAMS)("%s parametresi mevcut", (param) => {
    expect(PARAM_COLOR[param]).toBeDefined();
  });
});

describe("PARAM_COLOR — geçerli hex değerler", () => {
  test.each(EXPECTED_PARAMS)("%s geçerli 6 haneli hex (#RRGGBB)", (param) => {
    expect(PARAM_COLOR[param]).toMatch(HEX_RE);
  });

  test("renkler birbirinden farklı (kimlik çakışması yok)", () => {
    const values = Object.values(PARAM_COLOR).map((c) => c.toUpperCase());
    expect(new Set(values).size).toBe(values.length);
  });
});
