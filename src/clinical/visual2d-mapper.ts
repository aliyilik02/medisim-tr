// ============================================================
// visual2d-mapper — sürekli VisualState (0-1) → ayrık 2D görsel durumu
// ============================================================
// 2D pivot pilotu (docs/2D-PIVOT-DEGERLENDIRME.md §2): VisualState render-
// bağımsız klinik semantik; 2D katman ayrık kare gösterir → bu modül sürekli
// değerleri 5 durumluk merdivene indirger. Saf fonksiyon — React import YOK,
// %100 vitest edilebilir (3D shader'da edilemiyordu).
//
// Eşik titremesi (SpO2 91↔92 sınırında görsel zıplaması) çift-eşikle çözülür:
// merdivende YUKARI çıkmak enter eşiği, AŞAĞI inmek exit eşiği ister
// (animation-director histerezis deseninin ayrık-durum karşılığı; minHold
// süresi tüketici bileşende — bu modül zamansız/saf kalır).
//
// Eşik kalibrasyonu STEMI tedavisiz seyrine göre (stemi.ts deterioration):
//   iskemi     → diaphoresis ~0.7, gerisi ~0        → baseline (görsel 01)
//   şok        → pallor ~0.53, cyanosis ~0.33       → sok (02)
//   kötüleşme  → cyanosis erken doyar, mottled geç  → siyanoz (03) → derin-sok (04)
//   arrest     → breath_stopped → breathingRate 0   → arrest (05, kesin sinyal)
// Reperfüzyon recovery_trends değerleri geri çeker → exit eşiklerinden iner.

import type { VisualState } from "./clinicalVisualMapping";

/** 2D hasta görsel durumu — public/patients/<senaryo>/ kare adlarıyla eşleşir. */
export type Patient2DStage =
  | "baseline"
  | "sok"
  | "siyanoz"
  | "derin-sok"
  | "arrest";

/** Merdiven sırası — indeks büyüdükçe klinik tablo ağırlaşır. */
export const STAGE_ORDER: readonly Patient2DStage[] = [
  "baseline",
  "sok",
  "siyanoz",
  "derin-sok",
  "arrest",
];

export const stageRank = (s: Patient2DStage): number => STAGE_ORDER.indexOf(s);

// Çift eşik: enter (yukarı geçiş) / exit (aşağı dönüş). exit < enter →
// sınırda salınan vital görseli zıplatmaz.
const T = {
  sok: { pallorEnter: 0.45, pallorExit: 0.32 },
  siyanoz: { cyanosisEnter: 0.55, cyanosisExit: 0.4 },
  derinSok: {
    mottledEnter: 0.75,
    mottledExit: 0.6,
    pallorEnter: 0.8,
    pallorExit: 0.65,
  },
} as const;

/**
 * Sürekli VisualState → ayrık 2D durum. `current` histerezis referansı:
 * durum yalnızca enter eşiği aşılınca yükselir, exit eşiğinin altına
 * inince düşer. `current` verilmezse (ilk kare) enter eşikleri kullanılır.
 *
 * Arrest istisnası: breathingRate === 0 yalnız faz sinyalindeki
 * breath_stopped'tan gelir (applyPhaseVisual) → histerezissiz anında arrest;
 * nefes geri döndüğünde (recovery) anında çıkılır.
 */
export function resolveStage2D(
  v: VisualState,
  current: Patient2DStage | null = null,
): Patient2DStage {
  if (v.breathingRate <= 0) return "arrest";

  const rank = current ? stageRank(current) : -1;
  // Bir basamağın eşiği: hâlihazırda o basamakta/üstündeysek exit (kalma
  // koşulu gevşek), değilsek enter (giriş koşulu sıkı).
  const th = (stage: Patient2DStage, enter: number, exit: number): number =>
    rank >= stageRank(stage) ? exit : enter;

  if (
    v.mottled >= th("derin-sok", T.derinSok.mottledEnter, T.derinSok.mottledExit) &&
    v.pallor >= th("derin-sok", T.derinSok.pallorEnter, T.derinSok.pallorExit)
  ) {
    return "derin-sok";
  }
  if (v.cyanosis >= th("siyanoz", T.siyanoz.cyanosisEnter, T.siyanoz.cyanosisExit)) {
    return "siyanoz";
  }
  if (v.pallor >= th("sok", T.sok.pallorEnter, T.sok.pallorExit)) {
    return "sok";
  }
  return "baseline";
}

/** STEMI 2D kare yolları — durum → public asset. Pilot: tek varyant (erişkin erkek). */
export const STEMI_2D_FRAMES: Record<Patient2DStage, string> = {
  baseline: "/patients/stemi/stemi-01-baseline.png",
  sok: "/patients/stemi/stemi-02-sok.png",
  siyanoz: "/patients/stemi/stemi-03-siyanoz.png",
  "derin-sok": "/patients/stemi/stemi-04-derin-sok.png",
  arrest: "/patients/stemi/stemi-05-arrest.png",
};
