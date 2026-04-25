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
// Tick aralığı mod'a göre:
//   - Eğitim: baseMs / 3  (3x hızlı — yaklaşık her 333ms)
//   - Sınav:  baseMs / 1  (gerçek zaman — her 1000ms)
//
// Senaryo `time_scale_override` veriyorsa motor onu uygular.
// ============================================================

import { useEffect, useRef } from "react";
import type { SessionState, Scenario } from "@/engine";
import {
  tick,
  computeLiveVitals,
  getTickIntervalMs,
} from "@/engine/pharmacology/engine";

// Base interval — 1 saniye (sınav modunda 1s, eğitim modunda ~333ms)
const BASE_TICK_MS = 1000;

interface UseVitalsTickParams {
  scenario: Scenario | undefined;
  session: SessionState | null;
  setSession: React.Dispatch<React.SetStateAction<SessionState | null>>;
  // Paused: true ise tick durur (örn. kritik modal açıkken, debrief'te)
  paused?: boolean;
}

export function useVitalsTick({
  scenario,
  session,
  setSession,
  paused = false,
}: UseVitalsTickParams) {
  // Ref kullanıyoruz ki interval callback'i kapattığında stale state görmesin
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!scenario || !session || session.finished || paused) return;

    const intervalMs = getTickIntervalMs(
      BASE_TICK_MS,
      session.mode,
      scenario.time_scale_override
    );

    const intervalId = setInterval(() => {
      // Early-exit optimizasyonu: sessionRef stale olsa bile gereksiz re-render önler
      const s = sessionRef.current;
      if (!s || s.finished) return;
      if ((s.active_medications ?? []).length === 0) return;

      // Functional update — finishStep'in setSession çağrısını ezmez (race condition fix)
      setSession((prev) => {
        if (!prev || prev.finished) return prev;
        const actives = prev.active_medications ?? [];
        if (actives.length === 0) return prev;

        const now = Date.now();
        const result = tick({ activeMedications: actives, now });

        const stillActive = result.expired_instance_ids.length > 0
          ? actives.filter((m) => !result.expired_instance_ids.includes(m.instance_id))
          : actives;

        const liveVitals = computeLiveVitals(prev.baseline_vitals, result.vitals_delta);

        return {
          ...prev,
          vitals: liveVitals,
          active_medications: stillActive,
          current_ecg_params: Object.keys(result.ecg_delta).length > 0
            ? result.ecg_delta
            : undefined,
        };
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
    // scenario, mode, paused, difficulty değişince interval yeniden kurulur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, session?.mode, session?.finished, paused, setSession]);
}
