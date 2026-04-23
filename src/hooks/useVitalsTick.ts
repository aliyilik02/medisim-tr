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
      const s = sessionRef.current;
      if (!s || s.finished) return;

      const actives = s.active_medications ?? [];
      if (actives.length === 0) return; // Aktif ilaç yoksa tick atmaya gerek yok

      const now = Date.now();
      const result = tick({ activeMedications: actives, now });

      // Süresi dolan ilaçları listeden çıkar
      const stillActive = result.expired_instance_ids.length > 0
        ? actives.filter(
            (m) => !result.expired_instance_ids.includes(m.instance_id)
          )
        : actives;

      // Yeni canlı vitaller = baseline + kümülatif delta
      const liveVitals = computeLiveVitals(
        s.baseline_vitals,
        result.vitals_delta
      );

      setSession({
        ...s,
        vitals: liveVitals,
        active_medications: stillActive,
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
    // scenario, mode, paused, difficulty değişince interval yeniden kurulur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, session?.mode, session?.finished, paused, setSession]);
}
