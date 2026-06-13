// ============================================================
// useScenarioVitals — senaryo deterioration → canlı vital
// ============================================================
// Faz 2 yatak sahnesi için HAFİF deterioration simülasyonu: gerçek
// PhysiologyProvider (createSimplePhysiologyProvider) senaryonun
// deterioration eğrisini tick'ler → canlı vitals. Bu vitals
// vitalsToClip + vitalsToVisual ile supine hastanın animasyon+ten
// tonunu sürer. Tam SessionState/farmakoloji YOK — sadece kötüleşme
// görselleştirmesi (ScenarioPlayPage ayrı, tam motor orada).
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { Scenario, PatientVitals, PhysiologyProvider, ActionRef } from "@/engine";
import { createSimplePhysiologyProvider } from "@/engine/physiology";

const STEP_MS = 250;

// O₂ desteği (maske/nazal) — PRESENTATION: takılıyken SpO2'yi ceiling'e doğru
// iter (deterioration'ı kısmen dengeler, tam iyileştirmez — altta yatan sorun
// için müdahale gerekir). Tunable, klinik karar değil.
const O2_CEILING = 94;
const O2_RATE = 1.4; // %/sn (simüle)

interface ScenarioVitalsOpts {
  speed?: number;
  /** O₂ ekipmanı takılı mı (SpO2 desteği). */
  oxygenSupport?: boolean;
}

export function useScenarioVitals(
  scenario: Scenario | null,
  running: boolean,
  opts: ScenarioVitalsOpts = {},
) {
  const { speed = 6, oxygenSupport = false } = opts;
  const [vitals, setVitals] = useState<PatientVitals | null>(scenario?.initial_vitals ?? null);
  const [given, setGiven] = useState<string[]>([]); // uygulanan müdahale id'leri
  const providerRef = useRef<PhysiologyProvider | null>(null);
  // Interval kapanışında stale olmasın diye ref
  const o2Ref = useRef(oxygenSupport);
  o2Ref.current = oxygenSupport;

  // Senaryo değişince provider + vitals sıfırla
  useEffect(() => {
    if (!scenario) {
      providerRef.current = null;
      setVitals(null);
      setGiven([]);
      return;
    }
    providerRef.current = createSimplePhysiologyProvider(scenario);
    setVitals(scenario.initial_vitals);
    setGiven([]);
  }, [scenario]);

  // Çalışırken deterioration tick (speed× hızlandırılmış simüle saniye)
  useEffect(() => {
    if (!running || !scenario) return;
    const id = setInterval(() => {
      setVitals((v) => {
        if (!v || !providerRef.current) return v;
        const dt = (STEP_MS / 1000) * speed;
        let next = providerRef.current.tick(v, dt);
        // O₂ desteği: SpO2'yi ceiling'e doğru iter (deterioration üstüne biner)
        if (o2Ref.current && next.spo2 < O2_CEILING) {
          next = { ...next, spo2: Math.min(O2_CEILING, next.spo2 + O2_RATE * dt) };
        }
        return next;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [running, scenario, speed]);

  const reset = useCallback(() => {
    if (!scenario) return;
    providerRef.current = createSimplePhysiologyProvider(scenario);
    setVitals(scenario.initial_vitals);
    setGiven([]);
  }, [scenario]);

  // Müdahale uygula — eşleşen deterioration fazını durdurur (recovery başlar).
  const intervene = useCallback((action: ActionRef) => {
    if (!providerRef.current) return;
    setVitals((v) => (v ? providerRef.current!.applyIntervention(v, action) : v));
    setGiven((g) => (g.includes(action.target_id) ? g : [...g, action.target_id]));
  }, []);

  return { vitals, reset, intervene, given };
}
