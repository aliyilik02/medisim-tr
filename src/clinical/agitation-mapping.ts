// ============================================================
// Agitation Mapping — vital → prosedürel hareket katmanı (SAF)
// ============================================================
// vitalsToVisual/vitalsToClip ile aynı desen: PatientVitals → additive
// kemik animasyon yoğunlukları (0-1). Yeni Mixamo klibi GEREKTİRMEZ —
// AnimatedPatientModel mixer pozunun ÜSTÜNE küçük ofsetler ekler.
//
// EŞİKLER PRESENTATION içindir, klinik karar verisi DEĞİL — tunable.
// - tremor: yüksek ateş titremesi/rigor hissi (38.5→39.5°C rampa) +
//   derin hipoksi katkısı (SpO2<85).
// - restlessness: orta ağrı huzursuzluğu (4→7 rampa; şiddetli ağrıda
//   moaning klibi zaten devrede → 7 üstü sabit tavan).
// ============================================================

import type { PatientVitals } from "@/engine";

export interface AgitationState {
  /** 0-1 — yüksek frekanslı ince titreme (rigor/üşüme). */
  tremor: number;
  /** 0-1 — yavaş baş/gövde kıpırdanması (ağrı huzursuzluğu). */
  restlessness: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Doğrusal rampa: lo→hi arasında 0→1. */
const ramp = (v: number, lo: number, hi: number) => clamp01((v - lo) / (hi - lo));

export function vitalsToAgitation(vitals: PatientVitals): AgitationState {
  const feverTremor = ramp(vitals.temp, 38.5, 39.5);
  const hypoxiaTremor = ramp(85 - vitals.spo2, 0, 10) * 0.5; // SpO2 85→75: 0→0.5
  const pain = vitals.pain ?? 0;
  return {
    tremor: clamp01(Math.max(feverTremor, hypoxiaTremor)),
    restlessness: ramp(pain, 4, 7),
  };
}
