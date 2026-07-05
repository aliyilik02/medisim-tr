// ============================================================
// useVitalsTick — Canlı Monitör Tick Hook
// ============================================================
// Amaç: Farmakoloji motorunun `tick()` fonksiyonunu bir React
// interval'e bağlamak. Her tick'te:
//   1. Motor aktif ilaçların kümülatif vital etkisini hesaplar
//   2. `computeLiveVitals(baseline, delta)` ile gösterilecek
//      vitaller üretilir
//   3. SessionState'teki `vitals` alanı güncellenir
//   4. Süresi dolan ilaçlar `active_medications` listesinden düşer
//
// Tick aralığı mod'a göre (getTickIntervalMs varsayılanları):
//   - Eğitim: baseMs / 8  (8x hızlı — her 125ms)
//   - Klinik: baseMs / 3  (3x — her ~333ms)
//   - Sınav:  baseMs / 1  (gerçek zaman — her 1000ms)
//
// Senaryo `time_scale_override` veriyorsa motor onu uygular.
// ============================================================

import { useEffect } from "react";
import type { SessionState, Scenario, PhysiologyProvider } from "@/engine";
import { tickTimedEquipmentDeltas, applyVitalsChange } from "@/engine";
import { tick, computeLiveVitals } from "@/engine/pharmacology/engine";
import { getTickTiming, advanceSimClock } from "@/engine/time";

interface UseVitalsTickParams {
  scenario: Scenario | undefined;
  session: SessionState | null;
  setSession: React.Dispatch<React.SetStateAction<SessionState | null>>;
  // Paused: true ise tick durur (örn. kritik modal açıkken, debrief'te)
  paused?: boolean;
  // Faz 1 — deterioration trendlerini baseline'a uygulayan sağlayıcı.
  // Verilmezse eski davranış (sadece farmakoloji tick) korunur.
  provider?: PhysiologyProvider | null;
}

export function useVitalsTick({
  scenario,
  session,
  setSession,
  paused = false,
  provider = null,
}: UseVitalsTickParams) {
  useEffect(() => {
    if (!scenario || paused) return;

    // TEK SAAT kuralının tek tanım yeri: engine/time.ts. Mod/override yalnız
    // duvar-saati aralığını değiştirir; her tick SABİT 1 simüle sn'dir.
    const timing = getTickTiming(session?.mode ?? "klinik", scenario.time_scale_override);

    const intervalId = setInterval(() => {
      setSession((s) => {
        if (!s || s.finished) return s;
        const actives = s.active_medications ?? [];
        // Faz 1 — TEK SAAT kuralı: provider'lı oturumda farmakoloji de
        // simüle eksende akar. Provider'sız (quiz) oturumda eski
        // wall-clock davranışı korunur.
        const now = provider ? advanceSimClock(s) : Date.now();
        const result = tick({ activeMedications: actives, now });

        const stillActive = result.expired_instance_ids.length > 0
          ? actives.filter((m) => !result.expired_instance_ids.includes(m.instance_id))
          : actives;

        // Faz 1 — deterioration: her tick 1 simüle saniyedir (interval mode
        // hızına göre kısalır, böylece eğitim modunda 8× hızlı kötüleşir).
        let newBaseline = provider
          ? provider.tick(s.baseline_vitals, timing.dtSec)
          : s.baseline_vitals;

        // Ekipman onset ramp'leri (Hat A #7): onset_sec>0 ekipman etkisi
        // onset boyunca lineer uygulanır — entübasyon SpO2'yi tek tıkta değil
        // kademeli yükseltir. Simüle eksende akar (mod hızı eşit uygulanır).
        let pendingEq = s.pending_equipment_deltas;
        if (pendingEq?.length) {
          const eq = tickTimedEquipmentDeltas(pendingEq, timing.dtSec);
          if (Object.keys(eq.delta).length > 0) {
            newBaseline = applyVitalsChange(newBaseline, eq.delta);
          }
          pendingEq = eq.remaining;
        }

        const liveVitals = computeLiveVitals(newBaseline, result.vitals_delta);

        return {
          ...s,
          baseline_vitals: newBaseline,
          vitals: liveVitals,
          sim_time_ms: provider ? now : s.sim_time_ms,
          pending_equipment_deltas: pendingEq,
          active_medications: stillActive,
          current_ecg_params: Object.keys(result.ecg_delta).length > 0
            ? result.ecg_delta
            : stillActive.length > 0
              ? s.current_ecg_params
              : undefined,
        };
      });
    }, timing.intervalMs);

    return () => clearInterval(intervalId);
  }, [scenario, session?.mode, session?.finished, paused, setSession, provider]);
}
