// ============================================================
// Monitör adaptörü — medisim PatientVitals → monitör VitalState
// ============================================================
// Portlanan VitalMonitorScreen NATIVE VitalState alıyor (hr/spo2/sbp/dbp/rr/
// etco2/temp/rhythm). Bu adaptör medisim'in PatientVitals'i + scenario
// ekg_pattern'ini ona köprüler. Canlı senaryo vitalini zengin monitöre besler.
// ============================================================

import type { PatientVitals } from "@/engine";
import type { VitalState, Rhythm } from "./waveform-engine";

// medisim ekg_pattern (senaryo) → monitör Rhythm union
const RHYTHM_MAP: Record<string, Rhythm> = {
  normal: "sinus",
  sinus: "sinus",
  sinus_tach: "tachy",
  tachy: "tachy",
  taskardi: "tachy",
  sinus_brady: "brady",
  brady: "brady",
  bradikardi: "brady",
  afib: "afib",
  af: "afib",
  aflutter: "aflutter",
  flutter: "aflutter",
  svt: "svt",
  vtach: "vtach",
  vt: "vtach",
  vfib: "vfib",
  vf: "vfib",
  asystole: "asystole",
  asistoli: "asystole",
  av1: "av1",
  av2: "av2",
  av3: "av3",
  wpw: "wpw",
  pea: "pea",
  pvc: "pvc",
  bigeminy: "bigeminy",
  torsades: "torsades",
  // STEMI sinüs morfolojisi + ST elevasyonu (aşağıda st ile)
  stemi: "sinus",
  // Faz-senkron EKG paternleri (EkgPattern, physiology.getActivePhaseSignal) →
  // monitör ritmi. ST elevasyonu ST_ELEVATION_PATTERNS ile ayrıca uygulanır.
  st_elevation: "sinus",
  st_elev_pvc: "pvc",
  vt_salvo: "vt_salvo",
};

// Belirgin ST elevasyonu (~4.5mm → 0.18 normalize) gerektiren paternler.
const ST_ELEVATION_PATTERNS = new Set(["stemi", "st_elevation", "st_elev_pvc"]);

// Dolaşımı çökmüş (nabızsız) ritimler — senaryodan bağımsız fizyolojik kural:
// arrestte solunum durur (apne → RR 0) ve perfüzyon kaybıyla EtCO₂ çöker.
// Monitör RR<2'yi "--" gösterir; EtCO₂ 0'a iner. Senaryo trendi gerektirmez.
const ARREST_RHYTHMS = new Set<Rhythm>(["vfib", "asystole", "pea"]);

export function patientVitalsToMonitor(v: PatientVitals, ekgPattern?: string): VitalState {
  const key = (ekgPattern ?? "normal").toLowerCase();
  const rhythm = RHYTHM_MAP[key] ?? "sinus";
  // ST sapması: ST-elevasyonlu paternler → belirgin elevasyon; ölçülen
  // st_elevation_mm varsa onu kullan (faz sinyali ST paterni dayatmadıysa).
  let st = 0;
  if (ST_ELEVATION_PATTERNS.has(key)) st = 0.18;
  else if (v.st_elevation_mm != null) st = v.st_elevation_mm * 0.04;

  const arrest = ARREST_RHYTHMS.has(rhythm);

  return {
    hr: v.hr,
    spo2: v.spo2,
    sbp: v.bp_systolic,
    // Fizyolojik invaryant: diastolik sistoliği aşamaz. Senaryo yalnız
    // sistolike trend yazdıysa diastolik bayat kalmasın (arrestte SBP 0'a
    // inerken DBP 92'de donuyordu) — sistolikle birlikte aşağı çekilir.
    dbp: Math.min(v.bp_diastolic, v.bp_systolic),
    rr: arrest ? 0 : v.rr,
    etco2: arrest ? 0 : v.etco2 ?? 35,
    temp: v.temp,
    rhythm,
    st: st !== 0 ? st : undefined,
  };
}
