// ============================================================
// MediSim TR — Fizyoloji Sağlayıcısı (Faz 1)
// ============================================================
// Sanal Hasta Planı v1 §4.2 — gerçek zamanlı kötüleşme.
//
// PhysiologyProvider arayüzü Faz 3 Pulse Engine swap'i için sabit:
// UI ve senaryolar bu arayüze yazılır, sağlayıcı değişebilir.
//
// SimplePhysiologyProvider: senaryonun `deterioration` fazlarını
// saniye bazlı trend olarak BASELINE vitallere uygular. Farmakoloji
// motorunun tick delta'sı baseline'ın ÜSTÜNE eklenir (useVitalsTick).
//
// Saf motor kuralı: React import YOK. Durum closure içinde tutulur,
// her oturum için createSimplePhysiologyProvider ile yeni instance.
// ============================================================

import type {
  Scenario,
  PatientVitals,
  ActionRef,
  ActionMatcher,
  VitalTrend,
  DeteriorationPhase,
} from "./types";

export interface PhysiologyProviderState {
  /** Aktifleşmiş faz id'leri (adım tetiklemeli fazlar dahil) */
  activated: string[];
  /** Müdahale ile durdurulmuş faz id'leri */
  halted: string[];
}

export interface PhysiologyProvider {
  /** Bir tick'lik trend uygula. dtSec = simüle edilen saniye. Yeni vitals döner. */
  tick(vitals: PatientVitals, dtSec: number): PatientVitals;
  /** Öğrenci aksiyonunu bildir — eşleşen fazları durdurur. Yeni vitals döner
      (SimpleProvider vitalleri değiştirmez; anlık etki ActionOutcome.vitals_change
      ve farmakoloji motorundan gelir). */
  applyIntervention(vitals: PatientVitals, action: ActionRef): PatientVitals;
  /** Adım değişimini bildir — active_from_step_id'li fazları aktifleştirir. */
  notifyStepChange(stepId: string | null): void;
  /** Bu faz müdahale ile durduruldu mu? (oskültasyon resolved_sound geçişi için) */
  isPhaseHalted(phaseId: string): boolean;
  /** Test/debug görünürlüğü */
  getState(): PhysiologyProviderState;
}

// ------------------------------------------------------------
// Saf yardımcılar
// ------------------------------------------------------------

export function matchesAction(matcher: ActionMatcher, action: ActionRef): boolean {
  if (matcher.type !== action.type) return false;
  if (matcher.target_id !== action.target_id) return false;
  // matcher.site verilmişse eşleşmeli; verilmemişse her site kabul
  if (matcher.site && matcher.site !== action.site) return false;
  return true;
}

/** Trendleri vitallere uygula — floor/ceiling clamp'li. Saf fonksiyon. */
export function applyTrends(
  vitals: PatientVitals,
  trends: VitalTrend[],
  dtSec: number
): PatientVitals {
  if (trends.length === 0 || dtSec <= 0) return vitals;

  const next: PatientVitals = { ...vitals };
  for (const t of trends) {
    const current = next[t.vital];
    if (typeof current !== "number") continue; // opsiyonel vital tanımsızsa atla

    let value = current + t.delta_per_sec * dtSec;
    if (t.floor !== undefined && value < t.floor) value = t.floor;
    if (t.ceiling !== undefined && value > t.ceiling) value = t.ceiling;
    // Bilinçli: ara değerler kesirli tutulur (0.067/sn birikimi kaybolmasın).
    // Gösterim yuvarlaması computeLiveVitals'ta yapılır.
    next[t.vital] = value;
  }
  return next;
}

// ------------------------------------------------------------
// SimplePhysiologyProvider
// ------------------------------------------------------------

export function createSimplePhysiologyProvider(
  scenario: Scenario
): PhysiologyProvider {
  const phases: DeteriorationPhase[] = scenario.deterioration ?? [];

  // Başlangıçta aktif: adım tetikleyicisi olmayan fazlar
  const activated = new Set<string>(
    phases.filter((p) => !p.active_from_step_id).map((p) => p.id)
  );
  const halted = new Set<string>();

  return {
    tick(vitals, dtSec) {
      let next = vitals;
      for (const phase of phases) {
        if (!activated.has(phase.id)) continue;

        if (halted.has(phase.id)) {
          // Müdahale edildi — iyileşme trendi (varsa) hedefe doğru
          if (phase.recovery_trends?.length) {
            next = applyTrends(next, phase.recovery_trends, dtSec);
          }
        } else {
          // Tedavisiz seyir
          next = applyTrends(next, phase.trends, dtSec);
        }
      }
      return next;
    },

    applyIntervention(vitals, action) {
      for (const phase of phases) {
        if (halted.has(phase.id)) continue;
        if (phase.halted_by.some((m) => matchesAction(m, action))) {
          halted.add(phase.id);
        }
      }
      // Henüz aktifleşmemiş faz da durdurulabilir (erken doğru müdahale):
      // halted set'i aktivasyondan bağımsız — faz sonradan aktifleşse bile
      // doğrudan recovery koluna girer.
      return vitals;
    },

    notifyStepChange(stepId) {
      if (!stepId) return;
      for (const phase of phases) {
        if (phase.active_from_step_id === stepId) {
          activated.add(phase.id);
        }
      }
    },

    isPhaseHalted(phaseId) {
      return halted.has(phaseId);
    },

    getState() {
      return { activated: [...activated], halted: [...halted] };
    },
  };
}
