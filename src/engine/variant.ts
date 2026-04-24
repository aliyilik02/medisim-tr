// ============================================================
// MediSim TR — Hasta Varyantı Uygulaması
// ============================================================
// Aynı senaryo, farklı klinik tablo. startSession'da variantId
// verilirse bu modül hastayı, vitalleri ve adımları override eder.
// Saf fonksiyon — React/UI import etmez.
// ============================================================

import type {
  Scenario,
  PatientVariant,
  Patient,
  PatientVitals,
  Step,
} from "./types";

export function findVariant(
  scenario: Scenario,
  variantId: string | undefined
): PatientVariant | null {
  if (!variantId) return null;
  return scenario.variants?.find((v) => v.id === variantId) ?? null;
}

export function applyPatientVariant(
  base: Patient,
  variant: PatientVariant
): Patient {
  return {
    ...base,
    ...variant.patient,
    history_items: variant.patient.history_items ?? base.history_items,
    allergies: variant.patient.allergies ?? base.allergies,
    current_medications:
      variant.patient.current_medications ?? base.current_medications,
    modifiers: { ...base.modifiers, ...variant.patient.modifiers },
  };
}

export function applyVitalsVariant(
  base: PatientVitals,
  variant: PatientVariant
): PatientVitals {
  return { ...base, ...variant.initial_vitals };
}

export function applyStepVariant(step: Step, variant: PatientVariant): Step {
  const override = variant.step_overrides?.[step.id];
  if (!override) return step;
  return { ...step, ...override } as Step;
}

export function applyStepsVariant(steps: Step[], variant: PatientVariant): Step[] {
  return steps.map((s) => applyStepVariant(s, variant));
}

/**
 * Senaryoyu bir varyantla "çözer" — yeni Scenario nesnesi döner.
 * Varyant yoksa orijinal senaryo değişmeden döner.
 * UI ve engine çözülmüş senaryoyu sanki base gibi kullanabilir.
 */
export function resolveScenarioVariant(
  scenario: Scenario,
  variantId: string | undefined
): Scenario {
  const variant = findVariant(scenario, variantId);
  if (!variant) return scenario;

  return {
    ...scenario,
    patient: applyPatientVariant(scenario.patient, variant),
    initial_vitals: applyVitalsVariant(scenario.initial_vitals, variant),
    steps: applyStepsVariant(scenario.steps, variant),
  };
}
