// ============================================================
// visual2d-mapper — sürekli VisualState (0-1) → ayrık 2D görsel durumu
// ============================================================
// 2D pivot pilotu (docs/2D-PIVOT-DEGERLENDIRME.md §2): VisualState render-
// bağımsız klinik semantik; 2D katman ayrık kare gösterir → bu modül sürekli
// değerleri 5 durumluk merdivene indirger. Saf fonksiyon — React import YOK,
// %100 vitest edilebilir (3D shader'da edilemiyordu).
//
// TASARIM: tek boyutlu ağırlıklı ağırlık skoru (severity). Tek-kanal eşik
// (örn. "pallor ≥ X → şok") STEMI'de ÇALIŞMAZ: authored floor'lar pallor'u
// arrest'e dek 0.45'in altında tutar (SBP 148'den başlar, faz floor'ları
// 100/85/65) — kanıt: motor-entegrasyon testi ilk kalibrasyonda
// baseline→siyanoz→arrest verdi, sok/derin-sok hiç görünmedi. Skor tüm
// kanalları toplar → her faz ayrışır (gerçek tedavisiz seyirde ~0.25 /
// 0.77 / 1.2 / 1.8 / arrest).
//
// Eşik titremesi (sınır değerde görsel zıplaması) çift-eşikle çözülür:
// merdivende YUKARI çıkmak enter eşiği, AŞAĞI inmek exit eşiği ister
// (animation-director histerezis deseninin ayrık-durum karşılığı; minHold
// süresi tüketici bileşende — bu modül zamansız/saf kalır).

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

// Kanal ağırlıkları — hipoksi (siyanoz) baş belirleyici, perfüzyon kaybı
// (pallor/mottled) onu izler, terleme zayıf sinyal (ağrıyla da yükselir,
// tek başına durum değiştirmemeli), bilinç kaybı destekleyici.
const W = {
  cyanosis: 1.0,
  pallor: 0.8,
  mottled: 0.8,
  diaphoresis: 0.35,
  unconscious: 0.5,
} as const;

/** Toplam klinik ağırlık skoru (0 ≈ sağlıklı, ~2+ ≈ periarrest). */
export function severityScore(v: VisualState): number {
  return (
    W.cyanosis * v.cyanosis +
    W.pallor * v.pallor +
    W.mottled * v.mottled +
    W.diaphoresis * v.diaphoresis +
    W.unconscious * (1 - v.consciousness)
  );
}

// Skor bantları (enter/exit) — STEMI tedavisiz seyrine kalibre (motor-
// entegrasyon testiyle kilitli): iskemi ~0.25 | şok fazı 0.44→0.77 |
// kötüleşme girişte ~1.2 | geç kötüleşme ~1.8. exit < enter → sınırda
// salınan vital görseli zıplatmaz.
const BANDS: ReadonlyArray<{
  stage: Patient2DStage;
  enter: number;
  exit: number;
}> = [
  { stage: "derin-sok", enter: 1.7, exit: 1.5 },
  { stage: "siyanoz", enter: 1.1, exit: 0.9 },
  { stage: "sok", enter: 0.6, exit: 0.45 },
];

/**
 * Sürekli VisualState → ayrık 2D durum. `current` histerezis referansı:
 * durum yalnızca enter eşiği aşılınca yükselir, exit eşiğinin altına
 * inince düşer. `current` verilmezse (ilk kare) enter eşikleri kullanılır.
 *
 * Arrest istisnası: breathingRate === 0 yalnız faz sinyalindeki
 * breath_stopped'tan gelir (applyPhaseVisual) → histerezissiz anında arrest;
 * nefes geri döndüğünde (recovery) skora göre çözülür.
 */
export function resolveStage2D(
  v: VisualState,
  current: Patient2DStage | null = null,
): Patient2DStage {
  if (v.breathingRate <= 0) return "arrest";

  const score = severityScore(v);
  const rank = current ? stageRank(current) : -1;
  for (const band of BANDS) {
    // Hâlihazırda bu basamakta/üstündeysek exit (kalma koşulu gevşek),
    // değilsek enter (giriş koşulu sıkı).
    const threshold = rank >= stageRank(band.stage) ? band.exit : band.enter;
    if (score >= threshold) return band.stage;
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
