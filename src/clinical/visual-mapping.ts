// ============================================================
// Visual Mapping — vital → 3D görsel parametre dönüşümü
// ============================================================
// Master rapor Bölüm 4.10: "Klinik state → görsel manipulation
// mapping katmanı saf TS, %100 birim test edilmeli — klinik
// doğruluk için kritik."
//
// Bu modül PatientVitals → SkinTint, breathing rate, heart rate
// gibi 3D shader/animasyon parametrelerine dönüştürür.
// Pulse Engine geldiğinde input dinamik olarak gelir; statik
// scenario'larda initial_vitals'tan hesaplanır.
// ============================================================

import type { PatientVitals } from "@/engine";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";

export interface VisualParams {
  skinTint: SkinTint;
  /** Heart rate (BPM) — kalp pulsate frekansı. */
  hr: number;
  /** Respiratory rate (BPM) — akciğer breathing frekansı. */
  rr: number;
}

/**
 * Statik vital → görsel parametre.
 *
 * Cilt tonu öncelik sırası:
 * 1. SpO2 < 88 → siyanoz (mavimsi, kritik hipoksi)
 * 2. SBP < 90 → solgun (şok perfüzyon)
 * 3. Bilirubin > 2 → ikter (sarı; PatientVitals'ta yok, modifiers kullanılır)
 * 4. Aksi normal
 */
export function vitalsToVisual(vitals: PatientVitals): VisualParams {
  let skinTint: SkinTint = "normal";

  if (vitals.spo2 < 88) {
    skinTint = "cyanosis";
  } else if (vitals.bp_systolic < 90) {
    skinTint = "pallor";
  }
  // Jaundice için PatientVitals'ta bilirubin yok; senaryo modifiers
  // ya da history_items üzerinden tetiklenir. Şimdilik manuel override
  // (UI butonu) bırakıldı.

  return {
    skinTint,
    hr: vitals.hr,
    rr: vitals.rr,
  };
}

/**
 * Test edilebilir saf fonksiyon — clinical visual mapping doğruluğu
 * birim testle doğrulanır (D.1 Pulse Engine entegrasyonu öncesi).
 */
export function describeVisualMapping(vitals: PatientVitals): string {
  const v = vitalsToVisual(vitals);
  const reasons: string[] = [];
  if (v.skinTint === "cyanosis") reasons.push(`SpO2=${vitals.spo2} (<88)`);
  if (v.skinTint === "pallor") reasons.push(`SBP=${vitals.bp_systolic} (<90)`);
  return `${v.skinTint.toUpperCase()} ${reasons.join(", ")} | HR ${v.hr} RR ${v.rr}`;
}
