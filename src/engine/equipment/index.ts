// Ekipman-etki motoru — merkezi ekipman→fizyoloji (Blok 2). DRAFT değerler.
export { EQUIPMENT_EFFECTS, getEquipmentEffect } from "./catalog";
export {
  evaluateEquipmentCondition,
  computeVitalActionDelta,
  resolveEquipmentEffect,
  resolveEquipmentById,
} from "./engine";
export type {
  EquipmentEffect,
  EquipmentCondition,
  EquipmentVitalAction,
  EquipmentTargetVital,
  EquipmentEffectContext,
  EquipmentResolution,
} from "./types";
