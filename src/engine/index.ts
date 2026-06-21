export * from "./types";
export * from "./engine";
export * as Pharmacology from "./pharmacology/types";
export {
  EQUIPMENT_EFFECTS,
  getEquipmentEffect,
  evaluateEquipmentCondition,
  computeVitalActionDelta,
  resolveEquipmentEffect,
  resolveEquipmentById,
  type EquipmentEffect,
  type EquipmentCondition,
  type EquipmentVitalAction,
  type EquipmentTargetVital,
  type EquipmentEffectContext,
  type EquipmentResolution,
} from "./equipment";
export { resolveScenarioVariant, findVariant, applyPatientVariant, applyVitalsVariant } from "./variant";
export { resolveLabPanel, getLabHistory, getResultDelaySec, getEffectiveDelaySec } from "./lab-resolver";
export {
  createSimplePhysiologyProvider,
  applyTrends,
  matchesAction,
  type PhysiologyProvider,
  type PhysiologyProviderState,
} from "./physiology";
export {
  createPulsePhysiologyProvider,
  mapPulseStateToVitals,
  mapActionToPulse,
  closePulseProvider,
  type PulsePatientState,
  type PulseActionMessage,
  type PulseProviderOptions,
} from "./pulse-physiology";
export {
  deriveGradeBands,
  getEffectiveGradeBands,
  getEffectivePassingScore,
  STANDARD_GRADE_THRESHOLDS,
} from "./grading";
export {
  PEDAGOGY,
  PEDAGOGY_ORDER,
  getPedagogy,
  type PedagogyBehavior,
} from "./pedagogy";
export {
  pickTeachingAction,
  teachingNarration,
  phaseTransitionNarration,
  type TeachingPlan,
} from "./teaching";
export { matchReasoningPrompt, isReasoningCorrect } from "./reasoning";
export {
  getClinicalStatus,
  isScenarioActive,
  buildReviewChecklist,
  autoChecksPass,
  manualChecklistKeys,
  canActivate,
  buildClinicalReviewSnippet,
  CLINICAL_STATUS_ORDER,
  CLINICAL_STATUS_LABEL,
  type ChecklistItem,
  type SnippetInput,
} from "./clinical-review";
