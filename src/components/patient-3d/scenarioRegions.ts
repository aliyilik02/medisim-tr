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

import type { Scenario } from "@/engine";
import type { PatientRegion } from "./regions";

export function buildScenarioRegions(
  baseRegions: PatientRegion[],
  scenario: Scenario | undefined,
  haltedPhaseIds: string[]
): PatientRegion[] {
  const overrides = scenario?.auscultation;
  if (!overrides) return baseRegions;

  const haltedSet = new Set(haltedPhaseIds);

  return baseRegions.map((region) => {
    const o = overrides[region.id];
    if (!o) return region;

    const resolved =
      o.phase_id !== undefined && haltedSet.has(o.phase_id);
    const soundId =
      resolved && o.resolved_sound_id ? o.resolved_sound_id : o.sound_id;

    return {
      ...region,
      auscultationSoundId: soundId,
      placeholderNote: o.note ?? region.placeholderNote,
      // Ses atanan bölgede stetoskop prosedürü mutlaka açık olsun
      availableProcedures: region.availableProcedures?.includes("stethoscope")
        ? region.availableProcedures
        : [...(region.availableProcedures ?? []), "stethoscope"],
    };
  });
}
