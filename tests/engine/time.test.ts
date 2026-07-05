// ============================================================
// TimeController — TEK SAAT kuralı kanıtları (Hat A #7)
// ============================================================
// Tick bütünlüğü: mod/override yalnız DUVAR-SAATİ aralığını değiştirir;
// simüle dt her modda SABİT 1 sn'dir. Böylece ilaç onset/duration,
// deterioration ve ekipman onset'i tüm modlarda aynı simüle-zaman
// davranışını gösterir.
// ============================================================

import { describe, expect, test } from "vitest";
import {
  getTickTiming,
  advanceSimClock,
  SIM_STEP_MS,
  SIM_STEP_SEC,
  BASE_TICK_MS,
} from "@/engine/time";

describe("getTickTiming — mod ölçekleri", () => {
  test("varsayılan ölçekler: eğitim 8× (125ms), klinik 3× (~333ms), sınav 1× (1000ms)", () => {
    expect(getTickTiming("egitim").intervalMs).toBe(BASE_TICK_MS / 8);
    expect(getTickTiming("klinik").intervalMs).toBeCloseTo(BASE_TICK_MS / 3, 5);
    expect(getTickTiming("sinav").intervalMs).toBe(BASE_TICK_MS);
  });

  test("TİCK BÜTÜNLÜĞÜ: simüle dt HER modda sabit 1 sn — mod hızı dt'yi DEĞİŞTİRMEZ", () => {
    for (const mode of ["egitim", "klinik", "sinav"] as const) {
      const t = getTickTiming(mode);
      expect(t.dtSec).toBe(SIM_STEP_SEC);
      expect(t.simStepMs).toBe(SIM_STEP_MS);
    }
  });

  test("time_scale_override yalnız ilgili modun aralığını değiştirir", () => {
    const t = getTickTiming("egitim", { egitim: 4 });
    expect(t.intervalMs).toBe(BASE_TICK_MS / 4);
    expect(t.dtSec).toBe(SIM_STEP_SEC); // dt yine sabit

    // Override başka moda dokunmaz
    expect(getTickTiming("sinav", { egitim: 4 }).intervalMs).toBe(BASE_TICK_MS);
  });

  test("İLAÇ ONSET TUTARLILIĞI: N simüle-sn'lik etki her modda N tick sürer", () => {
    // 30 sn onset'li etki: tick sayısı = 30 / dtSec — moddan bağımsız.
    const onsetSec = 30;
    const tickSayilari = (["egitim", "klinik", "sinav"] as const).map(
      (m) => onsetSec / getTickTiming(m).dtSec
    );
    expect(new Set(tickSayilari).size).toBe(1); // hepsi eşit
    expect(tickSayilari[0]).toBe(30);
  });
});

describe("advanceSimClock — simüle saat", () => {
  test("sim_time_ms varsa bir adım ilerletir", () => {
    expect(advanceSimClock({ sim_time_ms: 5000, started_at: 0 })).toBe(
      5000 + SIM_STEP_MS
    );
  });

  test("sim_time_ms yoksa started_at'ten başlar (ilk tick)", () => {
    expect(advanceSimClock({ started_at: 12345 })).toBe(12345 + SIM_STEP_MS);
  });
});
