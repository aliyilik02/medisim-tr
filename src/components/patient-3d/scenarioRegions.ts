// ============================================================
// scenarioRegions — Senaryo oskültasyon override'ı (Faz 1, §4.4)
// ============================================================
// Senaryonun `auscultation` alanını DEFAULT_REGIONS ile birleştirir:
//   - sound_id: faz aktifken (patolojik ses, örn. wheeze)
//   - resolved_sound_id: ilişkili deterioration fazı durdurulduysa
//     (örn. adrenalin sonrası normal kalp sesi)
//   - note: InspectionPanel'de gösterilen bulgu metni
// PatientBody3D değişmeden çalışır — ses id'si region prop'undan akar.
// ============================================================

import type { Scenario, PhaseSignal } from "@/engine";
import type { PatientRegion } from "./regions";
import { heartSoundFile } from "./auscultationAudio";

// Kardiyak oskültasyon noktaları (Erb / Mitral / Aortik) — faz-senkron kalp
// sesi bunlara uygulanır (senaryo override'ı yoksa).
const CARDIAC_REGION_IDS = new Set(["chest-front", "chest-left", "chest-right"]);

/** Ses atanan bölgede stetoskop prosedürü mutlaka açık olsun. */
function ensureStethoscope(region: PatientRegion): PatientRegion["availableProcedures"] {
  return region.availableProcedures?.includes("stethoscope")
    ? region.availableProcedures
    : [...(region.availableProcedures ?? []), "stethoscope"];
}

export function buildScenarioRegions(
  baseRegions: PatientRegion[],
  scenario: Scenario | undefined,
  haltedPhaseIds: string[],
  phaseSignal?: PhaseSignal | null
): PatientRegion[] {
  const overrides = scenario?.auscultation;
  // Faz-senkron kalp sesi: dominant fazın heartSound'u (silent → null = ses yok).
  const phaseHeart = phaseSignal ? heartSoundFile(phaseSignal.heartSound) : undefined;

  // Hiçbir kaynak yoksa (override yok + faz sinyali yok) — eski davranış.
  if (!overrides && !phaseSignal) return baseRegions;

  const haltedSet = new Set(haltedPhaseIds);

  return baseRegions.map((region) => {
    const o = overrides?.[region.id];
    // 1) Senaryo authored override'ı (halted→resolved) — öncelikli.
    if (o) {
      const resolved = o.phase_id !== undefined && haltedSet.has(o.phase_id);
      const soundId =
        resolved && o.resolved_sound_id ? o.resolved_sound_id : o.sound_id;
      return {
        ...region,
        auscultationSoundId: soundId,
        placeholderNote: o.note ?? region.placeholderNote,
        availableProcedures: ensureStethoscope(region),
      };
    }
    // 2) Faz-senkron kalp sesi (kardiyak noktalar) — override yoksa.
    //    silent (phaseHeart === null) → auscultationSoundId undefined (ses yok).
    if (phaseSignal && CARDIAC_REGION_IDS.has(region.id)) {
      return {
        ...region,
        auscultationSoundId: phaseHeart ?? undefined,
        availableProcedures: ensureStethoscope(region),
      };
    }
    return region;
  });
}
