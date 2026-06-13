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

import { useEffect, useRef, useState } from "react";
import type { Scenario, PatientVitals, PhysiologyProvider } from "@/engine";
import { createSimplePhysiologyProvider } from "@/engine/physiology";

const STEP_MS = 250;

export function useScenarioVitals(scenario: Scenario | null, running: boolean, speed = 6) {
  const [vitals, setVitals] = useState<PatientVitals | null>(scenario?.initial_vitals ?? null);
  const providerRef = useRef<PhysiologyProvider | null>(null);

  // Senaryo değişince provider + vitals sıfırla
  useEffect(() => {
    if (!scenario) {
      providerRef.current = null;
      setVitals(null);
      return;
    }
    providerRef.current = createSimplePhysiologyProvider(scenario);
    setVitals(scenario.initial_vitals);
  }, [scenario]);

  // Çalışırken deterioration tick (speed× hızlandırılmış simüle saniye)
  useEffect(() => {
    if (!running || !scenario) return;
    const id = setInterval(() => {
      setVitals((v) =>
        v && providerRef.current ? providerRef.current.tick(v, (STEP_MS / 1000) * speed) : v,
      );
    }, STEP_MS);
    return () => clearInterval(id);
  }, [running, scenario, speed]);

  const reset = () => {
    if (!scenario) return;
    providerRef.current = createSimplePhysiologyProvider(scenario);
    setVitals(scenario.initial_vitals);
  };

  return { vitals, reset };
}
