// ============================================================
// Clip Mapping — klinik durum → 3D animasyon klibi
// ============================================================
// vitalsToVisual (visual-mapping.ts) ile AYNI desen: PatientVitals →
// AnimatedPatientModel klibi (saf TS, %100 test edilebilir). Supine yatak
// hastasının davranışını klinik duruma bağlar — senaryo motoru vital/durum
// değiştikçe hasta otomatik öksürür/inler/nefes darlığı yaşar.
//
// EŞİKLER PRESENTATION içindir (vitalsToVisual spo2<88 presedanı), senaryo
// klinik datası DEĞİL — tunable. Eğitim amaçlı görsel geri bildirim.
// ============================================================

import type { PatientVitals } from "@/engine";
import type { PatientClip } from "@/components/patient-3d/AnimatedPatientModel";

/** Senaryo-tetikli anlık semptom (vital değil — event). */
export type PatientSymptom = "vomiting" | "cough" | null;
/** Hastanın uyguladığı tedavi jesti (event). */
export type PatientProcedureGesture = "take_pill" | "use_inhaler" | null;

export interface ClipMappingOpts {
  /** Diyalog aktif mi (hasta konuşuyor). */
  speaking?: boolean;
  /** Senaryo-tetikli semptom (kusma/öksürük) — vitalden bağımsız event. */
  symptom?: PatientSymptom;
  /** Hasta tedavi jesti uyguluyor (hap/inhaler). */
  procedure?: PatientProcedureGesture;
}

/**
 * Klinik durum → ideal animasyon klibi.
 *
 * Öncelik (klinik belirginlik sırası):
 * 1. Tedavi jesti (hap/inhaler) — açık event
 * 2. Kusma — açık event
 * 3. Ağır solunum sıkıntısı (SpO2<88 veya RR≥30) → nefes darlığı
 * 4. Öksürük semptomu → şiddet vitale göre
 * 5. Şiddetli ağrı (pain≥7) → inleme
 * 6. Diyalog → konuşma
 * 7. Hafif takipne (RR≥24) → nefes darlığı
 * 8. Orta ağrı (pain≥4) → inleme
 * 9. Sakin yatış
 */
export function vitalsToClip(vitals: PatientVitals, opts: ClipMappingOpts = {}): PatientClip {
  if (opts.procedure) return opts.procedure;
  if (opts.symptom === "vomiting") return "vomiting";

  const rr = vitals.rr;
  const spo2 = vitals.spo2;
  const pain = vitals.pain ?? 0;

  if (opts.symptom === "cough") {
    return spo2 < 90 || rr > 28 ? "cough_severe" : "cough_mild";
  }
  if (spo2 < 88 || rr >= 30) return "laying_breathless"; // ağır solunum sıkıntısı
  if (pain >= 7) return "moaning"; // şiddetli ağrı
  if (opts.speaking) return "talk_gesture";
  if (rr >= 24) return "laying_breathless"; // hafif takipne
  if (pain >= 4) return "moaning"; // orta ağrı
  return "laying_idle";
}

/**
 * Varyant fallback zinciri — her varyantta her klip yok (ör. kadında
 * laying_breathless/moaning/vomiting yok). İdeal klip yoksa en yakın
 * klinik eşdeğere düşer.
 */
const CLIP_FALLBACKS: Record<PatientClip, PatientClip[]> = {
  laying_breathless: ["laying_breathless", "cough_severe", "cough_mild", "laying_idle"],
  moaning: ["moaning", "pain", "cough_severe", "laying_idle"],
  vomiting: ["vomiting", "cough_severe", "laying_idle"],
  cough_severe: ["cough_severe", "cough_mild", "laying_breathless", "laying_idle"],
  cough_mild: ["cough_mild", "cough_severe", "laying_idle"],
  talk_gesture: ["talk_gesture", "talk_shrug", "laying_idle"],
  talk_shrug: ["talk_shrug", "talk_gesture", "laying_idle"],
  take_pill: ["take_pill", "laying_idle"],
  use_inhaler: ["use_inhaler", "laying_idle"],
  pain: ["pain", "moaning", "laying_idle"],
  laying_idle: ["laying_idle"],
  idle: ["idle", "laying_idle"],
};

/** İdeal klibi varyantın sahip olduğu kliplere düşür (ilk uyan). */
export function resolveClipForVariant(ideal: PatientClip, available: PatientClip[]): PatientClip {
  const chain = CLIP_FALLBACKS[ideal] ?? [ideal];
  for (const c of chain) {
    if (available.includes(c)) return c;
  }
  return available.includes("laying_idle") ? "laying_idle" : (available[0] ?? ideal);
}

/** Test/debug açıklaması. */
export function describeClipMapping(vitals: PatientVitals, opts: ClipMappingOpts = {}): string {
  const clip = vitalsToClip(vitals, opts);
  const why: string[] = [];
  if (opts.procedure) why.push(`prosedür=${opts.procedure}`);
  if (opts.symptom) why.push(`semptom=${opts.symptom}`);
  if (vitals.spo2 < 88) why.push(`SpO2=${vitals.spo2}(<88)`);
  if (vitals.rr >= 30) why.push(`RR=${vitals.rr}(≥30)`);
  else if (vitals.rr >= 24) why.push(`RR=${vitals.rr}(≥24)`);
  if ((vitals.pain ?? 0) >= 7) why.push(`ağrı=${vitals.pain}(≥7)`);
  else if ((vitals.pain ?? 0) >= 4) why.push(`ağrı=${vitals.pain}(≥4)`);
  if (opts.speaking) why.push("konuşuyor");
  return `${clip} ← ${why.join(", ") || "sakin"}`;
}
