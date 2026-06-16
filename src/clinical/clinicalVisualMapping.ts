// ============================================================
// Clinical Visual Mapping — sürekli vital → görsel parametre (0-1)
// ============================================================
// Master rapor 4.10: "Klinik state → görsel manipülasyon mapping katmanı
// saf TS, %100 birim test edilmeli." Mevcut visual-mapping.ts AYRIK
// (skinTint enum) — geriye uyumlu korunur. BU modül SÜREKLİ (0-1) parametre
// üretir: shader uniform'larına (uCyanosis/uPallor/uDiaphoresis/uMottled) ve
// per-frame cilt renk harmanına beslenir. Body Interact paritesi hedefi.
//
// Saf fonksiyon — React/Three import YOK. Pulse Engine geldiğinde input
// dinamik gelir; statik senaryoda canlı vitals'tan (deterioration tick'i
// sonrası) hesaplanır.
// ============================================================

import type { PatientVitals, PhaseVisualHint } from "@/engine";

export interface VisualState {
  /** 0-1 — siyanoz (mavi-mor dudak/uç). SpO2<92 → artar. */
  cyanosis: number;
  /** 0-1 — solgunluk (perfüzyon kaybı). SBP<100 → artar. */
  pallor: number;
  /** 0-1 — terleme/parlak cilt. Ağrı>5 veya HR>110 → artar. */
  diaphoresis: number;
  /** 0-1 — benekli/livedo cilt (şok). SBP<90 → artar. */
  mottled: number;
  /** Solunum hızı (RR, /dk) — shader uBreathSpeed + animasyon temposu. */
  breathingRate: number;
  /** 0-1 — bilinç düzeyi (GCS/15). Düşük → letarji. */
  consciousness: number;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Vital → sürekli görsel durum. Eşik mantığı klinik:
 *   - cyanosis: SpO2 92 → 0, 80 → 1   (12 puanlık geçiş bandı)
 *   - pallor:   SBP 100 → 0, 60 → 1   (40 mmHg bandı)
 *   - mottled:  SBP 90 → 0, 60 → 1    (30 mmHg, kardiyojenik şok cildi)
 *   - diaphoresis: ağrı>5 VEYA HR>110 → terleme (ikisinin maks rampası)
 *   - consciousness: GCS/15
 */
export function mapVitalsToVisuals(vitals: PatientVitals): VisualState {
  const pain = vitals.pain ?? 0; // opsiyonel vital — yoksa ağrısız
  const gcs = vitals.gcs ?? 15; // opsiyonel — yoksa tam bilinç
  const painRamp = (pain - 5) / 5; // ağrı 10 → 1
  const tachyRamp = (vitals.hr - 110) / 40; // HR 150 → 1

  return {
    cyanosis: clamp01((92 - vitals.spo2) / 12),
    pallor: clamp01((100 - vitals.bp_systolic) / 40),
    diaphoresis: clamp01(Math.max(painRamp, tachyRamp)),
    mottled: clamp01((90 - vitals.bp_systolic) / 30),
    breathingRate: vitals.rr,
    consciousness: clamp01(gcs / 15),
  };
}

/**
 * Faz-senkron dramatik katman: vital-tabanlı VisualState'in ÜSTÜNE faz görsel
 * hint'lerini ekler (0-1 clamp). Vital mapping doğru kalır (siyanoz/solgun
 * vital'den hesaplanır); bu katman dominant fazın dramatik yoğunluğunu bindirir
 * (örn. şokta terleme boost, arrest'te nefes durması). Saf fonksiyon — hint
 * yoksa base aynen döner (eski davranış). Geçiş yumuşaklığı tüketici tarafta
 * (AnatomicPatientModel useFrame lerp ~1.2sn) sağlanır.
 */
export function applyPhaseVisual(
  base: VisualState,
  hint?: PhaseVisualHint
): VisualState {
  if (!hint) return base;
  return {
    ...base,
    cyanosis: clamp01(base.cyanosis + (hint.cyanosis_boost ?? 0)),
    pallor: clamp01(base.pallor + (hint.pallor_boost ?? 0)),
    diaphoresis: clamp01(base.diaphoresis + (hint.diaphoresis_boost ?? 0)),
    mottled: clamp01(base.mottled + (hint.mottled_boost ?? 0)),
    // Arrest → nefes durur (breathingRate 0 → shader amplitüdü 0'a iner).
    breathingRate: hint.breath_stopped ? 0 : base.breathingRate,
  };
}

/** Test/debug okunur özet. */
export function describeVisualState(vitals: PatientVitals): string {
  const v = mapVitalsToVisuals(vitals);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    `cyanosis ${pct(v.cyanosis)} | pallor ${pct(v.pallor)} | ` +
    `diaphoresis ${pct(v.diaphoresis)} | mottled ${pct(v.mottled)} | ` +
    `RR ${v.breathingRate} | consciousness ${pct(v.consciousness)}`
  );
}
