// ============================================================
// Patient 3D — Prosedür altyapısı tipleri (Sprint B.2.1)
// ============================================================
// ProcedureKind union ileriye dönük tanımlı; B.2.1'de sadece
// "stethoscope" aktif. "oxygen_mask" B.2.2'de, "defibrillator"
// B.2.3'te eklenecek (ProcedureOverlay switch'ine satır eklenir).
// ============================================================

export type ProcedureKind = "stethoscope" | "oxygen_mask" | "defibrillator";

/**
 * Aktif prosedür context'i. PatientBody3D state'inde tutulur,
 * ProcedureOverlay'a prop olarak geçer. Animasyon tamamlandığında
 * onProcedureComplete callback'ine ActionRef'e dönüştürülerek iletilir.
 */
export interface ProcedureContext {
  kind: ProcedureKind;
  /** Hangi region üzerinden tetiklendi (regions.ts id'si). */
  regionId: string;
  /** Local-space target koordinatları (region.position ile aynı). */
  targetPosition: [number, number, number];
}
