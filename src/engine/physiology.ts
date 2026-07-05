// ============================================================
// MediSim TR — Fizyoloji Sağlayıcısı (Faz 1)
// ============================================================
// Sanal Hasta Planı v1 §4.2 — gerçek zamanlı kötüleşme.
//
// PhysiologyProvider arayüzü Faz 3 Pulse Engine swap'i için sabit:
// UI ve senaryolar bu arayüze yazılır, sağlayıcı değişebilir.
//
// Faz mantığının tamamı PhaseStateMachine'de (phase-state-machine.ts);
// SimplePhysiologyProvider onun üstünde ince bir adaptördür. Farmakoloji
// motorunun tick delta'sı baseline'ın ÜSTÜNE eklenir (useVitalsTick).
//
// Saf motor kuralı: React import YOK. Durum FSM instance'ında tutulur,
// her oturum için createSimplePhysiologyProvider ile yeni instance.
// ============================================================

import type { Scenario, PatientVitals, ActionRef, PhaseSignal } from "./types";
import { PhaseStateMachine } from "./phase-state-machine";
import type { PhysiologyProviderState } from "./phase-state-machine";

// Kamu yüzü değişmedi: saf helper'lar + state tipi buradan da import edilir
// (tanım phase-state-machine.ts'te — tek yönlü bağımlılık için).
export {
  applyTrends,
  matchesAction,
  matchesVitalCondition,
} from "./phase-state-machine";
export type { PhysiologyProviderState } from "./phase-state-machine";

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
  /** Aktif dominant fazın faz-senkron sinyali (EKG paterni + kalp sesi + görsel).
      Sinyal tanımlı (signal alanı dolu) aktif faz yoksa null → eski senaryolar
      etkilenmez. Faz içi evrim (VF→asistoli, ekg_late_after_sec) ve reperfüzyon
      (recovering kolu) burada çözülür. TEK faz sinyali kaynağı; EKG, ses ve görsel
      bunu dinler (opsiyonel: Pulse provider implement etmez → null). */
  getActivePhaseSignal?(vitals: PatientVitals): PhaseSignal | null;
  /** Test/debug görünürlüğü */
  getState(): PhysiologyProviderState;
}

export function createSimplePhysiologyProvider(
  scenario: Scenario
): PhysiologyProvider {
  const fsm = new PhaseStateMachine(scenario.deterioration ?? []);

  return {
    tick(vitals, dtSec) {
      return fsm.tick(vitals, dtSec);
    },

    applyIntervention(vitals, action) {
      fsm.haltBy(action);
      return vitals;
    },

    notifyStepChange(stepId) {
      if (!stepId) return;
      fsm.activateFromStep(stepId);
    },

    isPhaseHalted(phaseId) {
      return fsm.isHalted(phaseId);
    },

    getActivePhaseSignal(vitals): PhaseSignal | null {
      return fsm.dominantSignal(vitals);
    },

    getState() {
      return fsm.getState();
    },
  };
}
