// ============================================================
// MediSim TR — Zaman Denetleyicisi (TimeController, Hat A #7)
// ============================================================
// TEK SAAT kuralının tek tanım yeri. Dağınık zaman mantığı
// (useVitalsTick'teki BASE_TICK_MS + "1 tick = 1 simüle sn" konvansiyonu
// + pharmacology.getTickIntervalMs çağrısı) burada toplanır.
//
// Model:
//   - Her tick SABİT 1 simüle saniyedir (SIM_STEP_MS) — moddan bağımsız.
//   - Mod/override yalnız TICK ARALIĞINI (duvar saati) değiştirir:
//     eğitim 8× (125ms), klinik 3× (~333ms), sınav 1× (1000ms).
//   - Böylece ilaç onset/duration, deterioration ve ekipman onset'i
//     TÜM modlarda aynı simüle-zaman davranışını gösterir; sadece
//     duvar-saati hızı değişir. Tab throttling hepsini birlikte yavaşlatır.
//
// Saf motor kuralı: React import YOK.
// ============================================================

import type { PlayMode, Scenario } from "./types";
import { getTickIntervalMs } from "./pharmacology/engine";

/** Bir tick'in simüle-zaman karşılığı (ms). SABİT — mod hızı bunu DEĞİŞTİRMEZ. */
export const SIM_STEP_MS = 1000;
/** Bir tick'in simüle-zaman karşılığı (sn) — motor tick'lerine geçilen dt. */
export const SIM_STEP_SEC = SIM_STEP_MS / 1000;
/** Duvar-saati taban aralığı (sınav modu = gerçek zaman). */
export const BASE_TICK_MS = 1000;

export interface TickTiming {
  /** setInterval duvar-saati aralığı (mod/override ölçekli). */
  intervalMs: number;
  /** Motor tick'lerine geçilecek simüle dt (sn) — moddan bağımsız sabit. */
  dtSec: number;
  /** Simüle saatin tick başına ilerlemesi (ms) — moddan bağımsız sabit. */
  simStepMs: number;
}

/** Mod + senaryo time_scale_override → tick zamanlaması. */
export function getTickTiming(
  mode: PlayMode,
  timeScaleOverride?: Scenario["time_scale_override"]
): TickTiming {
  return {
    intervalMs: getTickIntervalMs(BASE_TICK_MS, mode, timeScaleOverride),
    dtSec: SIM_STEP_SEC,
    simStepMs: SIM_STEP_MS,
  };
}

/** Simüle saati bir tick ilerlet. Provider'lı oturumda farmakoloji "now"u da
    bu eksende akar (TEK SAAT) — Date.now() KULLANILMAZ. */
export function advanceSimClock(session: {
  sim_time_ms?: number;
  started_at: number;
}): number {
  return (session.sim_time_ms ?? session.started_at) + SIM_STEP_MS;
}
