// Ekipman-etki motoru — merkezi ekipman→fizyoloji (Blok 2). DRAFT değerler.
export { EQUIPMENT_EFFECTS, getEquipmentEffect } from "./catalog";
export {
  evaluateEquipmentCondition,
  computeVitalActionDelta,
  resolveEquipmentEffect,
  resolveEquipmentById,
  startTimedEquipmentDelta,
  tickTimedEquipmentDeltas,
} from "./engine";
export type {
  EquipmentEffect,
  EquipmentCondition,
  EquipmentVitalAction,
  EquipmentTargetVital,
  EquipmentEffectContext,
  EquipmentResolution,
  TimedEquipmentDelta,
} from "./types";
