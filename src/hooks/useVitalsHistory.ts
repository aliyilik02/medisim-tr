import { useState, useEffect } from "react";
import type { PatientVitals } from "@/engine";

const MAX_POINTS = 60;

export interface VitalsHistory {
  hr: number[];
  sbp: number[];
  spo2: number[];
  rr: number[];
}

export function useVitalsHistory(vitals: PatientVitals): VitalsHistory {
  const [history, setHistory] = useState<VitalsHistory>(() => ({
    hr: [vitals.hr],
    sbp: [vitals.bp_systolic],
    spo2: [vitals.spo2],
    rr: [vitals.rr],
  }));

  useEffect(() => {
    setHistory((prev) => ({
      hr: [...prev.hr, vitals.hr].slice(-MAX_POINTS),
      sbp: [...prev.sbp, vitals.bp_systolic].slice(-MAX_POINTS),
      spo2: [...prev.spo2, vitals.spo2].slice(-MAX_POINTS),
      rr: [...prev.rr, vitals.rr].slice(-MAX_POINTS),
    }));
  }, [vitals]);

  return history;
}
