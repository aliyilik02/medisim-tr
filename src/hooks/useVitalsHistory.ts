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
  const [history, setHistory] = useState<VitalsHistory>({
    hr: [],
    sbp: [],
    spo2: [],
    rr: [],
  });

  useEffect(() => {
    setHistory((prev) => {
      const lastHr = prev.hr[prev.hr.length - 1];
      const lastSbp = prev.sbp[prev.sbp.length - 1];
      const lastSpo2 = prev.spo2[prev.spo2.length - 1];
      const lastRr = prev.rr[prev.rr.length - 1];
      if (
        lastHr === vitals.hr &&
        lastSbp === vitals.bp_systolic &&
        lastSpo2 === vitals.spo2 &&
        lastRr === vitals.rr
      ) {
        return prev;
      }
      return {
        hr: [...prev.hr, vitals.hr].slice(-MAX_POINTS),
        sbp: [...prev.sbp, vitals.bp_systolic].slice(-MAX_POINTS),
        spo2: [...prev.spo2, vitals.spo2].slice(-MAX_POINTS),
        rr: [...prev.rr, vitals.rr].slice(-MAX_POINTS),
      };
    });
  }, [vitals.hr, vitals.bp_systolic, vitals.spo2, vitals.rr]);

  return history;
}
