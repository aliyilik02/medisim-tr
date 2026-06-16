// ============================================================
// MediSim TR — Pulse Engine Fizyoloji Sağlayıcısı (Faz 3 / D.1 İSKELET)
// ============================================================
// ⚠️ İSKELET (SCAFFOLD) — henüz canlı sidecar'a BAĞLI DEĞİL.
// Amaç: Faz 1'deki SimplePhysiologyProvider ile aynı PhysiologyProvider
// arayüzünün Pulse Engine arkasında da tutulabildiğini KANITLAMAK.
// Böylece Faz 3'te sağlayıcı değişir, UI ve senaryolar değişmez.
//
// Mimari (bkz. `pulse-engine-binding` skill, PLAN-SANAL-HASTA-V1 §6):
//   R3F (tarayıcı)  ──WebSocket──►  Node sidecar (Fly.io/Railway)
//                                     └─ Pulse Physiology Engine (C++/Apache 2.0)
//   Sidecar her ~1s'de PulsePatientState yayınlar → bu sınıf vitallere map'ler.
//
// ⚠️ BÜYÜK KARAR — sidecar DEPLOY yeri (Fly.io vs Railway vs Render) ve
// maliyeti AYRI ONAY konusudur (geri dönülmez dış servis). Ali Bey'e
// sorulmadan deploy YAPILMAZ. Bu dosya sadece kontrat + map katmanıdır.
//
// Şu anki davranış: WebSocket bağlanana kadar (veya hiç URL verilmezse)
// SimplePhysiologyProvider'a delege eder — yani Faz 1 senaryoları bu
// sağlayıcıyla da bozulmadan çalışır. Sidecar canlıya alınınca
// `applyPulseState` doldurulup delege kaldırılır.
// ============================================================

import type { Scenario, PatientVitals, ActionRef } from "./types";
import {
  createSimplePhysiologyProvider,
  type PhysiologyProvider,
  type PhysiologyProviderState,
} from "./physiology";

// ------------------------------------------------------------
// Pulse Engine veri sözleşmesi (sidecar JSON şeması)
// ------------------------------------------------------------
// Pulse'ın yayınladığı System/Compartment değerlerinin alt kümesi.
// Sidecar bunları SI birimlerinde gönderir; map katmanı UI birimine çevirir.
export interface PulsePatientState {
  /** Heart rate — 1/min */
  HeartRate_per_min?: number;
  /** Systolic arterial pressure — mmHg */
  SystolicArterialPressure_mmHg?: number;
  /** Diastolic arterial pressure — mmHg */
  DiastolicArterialPressure_mmHg?: number;
  /** Oxygen saturation — fraction 0..1 */
  OxygenSaturation?: number;
  /** Respiration rate — 1/min */
  RespirationRate_per_min?: number;
  /** Core temperature — °C */
  CoreTemperature_C?: number;
  /** End tidal CO2 — mmHg */
  EndTidalCarbonDioxidePressure_mmHg?: number;
  /** Mean arterial pressure — mmHg */
  MeanArterialPressure_mmHg?: number;
  /** Blood glucose — mg/dL */
  BloodGlucoseConcentration_mg_Per_dL?: number;
  /** Simülasyon zamanı — sn */
  SimulationTime_s?: number;
}

// ------------------------------------------------------------
// Pulse aksiyon sözleşmesi (UI → sidecar)
// ------------------------------------------------------------
// MediSim ActionRef → Pulse "action" mesajı. Sidecar bunu Pulse
// SEAction nesnelerine (SubstanceBolus, vb.) çevirir.
export interface PulseActionMessage {
  kind: "substance_bolus" | "ventilation" | "fluid" | "raw";
  medisim_action: ActionRef;
  /** Pulse substance adı (ör. "Epinephrine") — map tablosundan */
  substance?: string;
  dose_mg?: number;
}

export interface PulseProviderOptions {
  /** Sidecar WebSocket URL'i. Verilmezse provider offline (Simple delege). */
  wsUrl?: string;
  /** Pulse hazır olana kadar fizyolojiyi yürütecek yedek sağlayıcı.
      Varsayılan: senaryodan türetilen SimplePhysiologyProvider. */
  fallback?: PhysiologyProvider;
  /** Bağlantı durumu değişince UI'a haber ver (HUD "PULSE BAĞLI" rozeti vb.). */
  onConnectionChange?: (connected: boolean) => void;
  /** Test/SSR ortamında WebSocket enjekte etmek için (default: globalThis.WebSocket). */
  webSocketImpl?: typeof WebSocket;
}

// MediSim ilaç id → Pulse substance adı. Faz 3'te genişler.
const SUBSTANCE_MAP: Record<string, string> = {
  adrenalin: "Epinephrine",
  noradrenalin: "Norepinephrine",
  salin_09: "Saline",
  ringer_laktat: "RingersLactate",
};

/** Pulse state → MediSim vitals. Eksik alanlar mevcut vitalden korunur. */
export function mapPulseStateToVitals(
  current: PatientVitals,
  state: PulsePatientState
): PatientVitals {
  const next: PatientVitals = { ...current };
  if (state.HeartRate_per_min !== undefined)
    next.hr = Math.round(state.HeartRate_per_min);
  if (state.SystolicArterialPressure_mmHg !== undefined)
    next.bp_systolic = Math.round(state.SystolicArterialPressure_mmHg);
  if (state.DiastolicArterialPressure_mmHg !== undefined)
    next.bp_diastolic = Math.round(state.DiastolicArterialPressure_mmHg);
  if (state.OxygenSaturation !== undefined)
    next.spo2 = Math.round(state.OxygenSaturation * 100);
  if (state.RespirationRate_per_min !== undefined)
    next.rr = Math.round(state.RespirationRate_per_min);
  if (state.CoreTemperature_C !== undefined)
    next.temp = Math.round(state.CoreTemperature_C * 10) / 10;
  if (state.EndTidalCarbonDioxidePressure_mmHg !== undefined)
    next.etco2 = Math.round(state.EndTidalCarbonDioxidePressure_mmHg);
  if (state.MeanArterialPressure_mmHg !== undefined)
    next.map = Math.round(state.MeanArterialPressure_mmHg);
  if (state.BloodGlucoseConcentration_mg_Per_dL !== undefined)
    next.glucose = Math.round(state.BloodGlucoseConcentration_mg_Per_dL);
  return next;
}

/** MediSim aksiyonu → Pulse aksiyon mesajı (sidecar'a gönderilecek). */
export function mapActionToPulse(action: ActionRef): PulseActionMessage {
  if (action.type === "give_medication") {
    const substance = SUBSTANCE_MAP[action.target_id];
    if (substance) {
      return { kind: "substance_bolus", medisim_action: action, substance };
    }
  }
  return { kind: "raw", medisim_action: action };
}

// ------------------------------------------------------------
// PulsePhysiologyProvider
// ------------------------------------------------------------
// PhysiologyProvider arayüzünü implemente eder — Faz 1 koduyla birebir
// değiştirilebilir. Sidecar canlı olana kadar fallback'a delege eder.
export function createPulsePhysiologyProvider(
  scenario: Scenario,
  options: PulseProviderOptions = {}
): PhysiologyProvider {
  const fallback =
    options.fallback ?? createSimplePhysiologyProvider(scenario);

  let latestState: PulsePatientState | null = null;
  let connected = false;
  let socket: WebSocket | null = null;

  const WS = options.webSocketImpl ?? (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;

  if (options.wsUrl && WS) {
    try {
      socket = new WS(options.wsUrl);
      socket.onopen = () => {
        connected = true;
        options.onConnectionChange?.(true);
      };
      socket.onclose = () => {
        connected = false;
        options.onConnectionChange?.(false);
      };
      socket.onerror = () => {
        connected = false;
        options.onConnectionChange?.(false);
      };
      socket.onmessage = (ev: MessageEvent) => {
        try {
          latestState = JSON.parse(String(ev.data)) as PulsePatientState;
        } catch {
          // Bozuk frame yoksay — bir sonraki frame'i bekle
        }
      };
    } catch {
      // Bağlantı kurulamadı — sessizce offline kal, fallback devrede
      connected = false;
    }
  }

  return {
    tick(vitals, dtSec) {
      // Sidecar bağlı ve veri geldiyse Pulse otoritedir.
      if (connected && latestState) {
        return mapPulseStateToVitals(vitals, latestState);
      }
      // Aksi halde Faz 1 fizyolojisi yürür — senaryo bozulmaz.
      return fallback.tick(vitals, dtSec);
    },

    applyIntervention(vitals, action) {
      // Bağlıysa aksiyonu sidecar'a ilet (Pulse SEAction'a çevirir).
      if (connected && socket) {
        try {
          socket.send(JSON.stringify(mapActionToPulse(action)));
        } catch {
          // Gönderim başarısız — fallback yine de halt mantığını işlesin
        }
      }
      // Halt/recovery durum makinesi fallback'te de tutulur ki bağlantı
      // koparsa kötüleşme tutarlı devam etsin.
      return fallback.applyIntervention(vitals, action);
    },

    notifyStepChange(stepId) {
      fallback.notifyStepChange(stepId);
    },

    isPhaseHalted(phaseId) {
      return fallback.isPhaseHalted(phaseId);
    },

    getActivePhaseSignal(vitals) {
      // Faz-senkron sinyal (EKG/ses/görsel) fallback faz makinesinden gelir —
      // tick/applyIntervention zaten fallback'e delege ettiği için faz state'i
      // (activated/halted/phaseAge) Pulse swap'inde de canlı kalır. Pulse kendi
      // EKG paternini üretene dek bu doğru köprü (yoksa phaseSignal hep null →
      // faz-senkron EKG/kalp sesi/3D katman/narration kaybolurdu).
      return fallback.getActivePhaseSignal?.(vitals) ?? null;
    },

    getState(): PhysiologyProviderState {
      return fallback.getState();
    },
  };
}

/** UI debug/teardown için — açık socket'i kapat. */
export function closePulseProvider(socket: WebSocket | null): void {
  if (socket && socket.readyState <= 1) socket.close();
}
