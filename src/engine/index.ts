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
  startTimedEquipmentDelta,
  tickTimedEquipmentDeltas,
  type EquipmentEffect,
  type EquipmentCondition,
  type EquipmentVitalAction,
  type EquipmentTargetVital,
  type EquipmentEffectContext,
  type EquipmentResolution,
  type TimedEquipmentDelta,
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
export { PhaseStateMachine } from "./phase-state-machine";
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
  buildGuidelineComparison,
  extractGuidelineTags,
  describeActionRef,
  type GuidelineComparisonRow,
} from "./debrief-comparison";
export {
  decideAnimation,
  resolveDirectorClip,
  describeAnimationDecision,
  DEFAULT_MIN_HOLD_SEC,
  type AnimationDecision,
  type AnimationOverlay,
  type DirectorInput,
  type DirectorEvent,
  type DirectorEventType,
  type DirectorClip,
  type DirectorLayer,
} from "./animation-director";
export {
  buildVisemeTimeline,
  sampleViseme,
  visemeToArkit,
  visemeToJawAmplitude,
  classifyChar,
  LIPSYNC_ARKIT_KEYS,
  type Viseme,
  type VisemeEvent,
  type VisemeTimeline,
  type VisemeFrame,
  type BuildVisemeTimelineOptions,
} from "./lipsync";
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
