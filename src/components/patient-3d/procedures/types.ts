// ============================================================
// Patient 3D — Prosedür altyapısı tipleri (Sprint B.2.1 → P0 ekipman)
// ============================================================
// ProcedureKind union ileriye dönük tanımlı. B.2.1'de "stethoscope",
// B.2.2'de "oxygen_mask" eklendi. "defibrillator" iskelet (henüz
// component yok → ProcedureOverlay null döner).
//
// P0 ekipman seti (hasta ÜZERİNDE kalıcı duran monitörizasyon/erişim):
//   - iv_line        — antekübital IV kanül + tüp + serum poşeti
//   - pulse_ox        — parmak ucu pulse oksimetre klipsi
//   - bp_cuff         — üst kol NIBP manşonu
//   - ekg_electrodes  — göğüs EKG elektrotları + kablolar
// Bunlar persistent: takıldıktan sonra sahnede kalır (maske + IV +
// EKG aynı anda durabilsin). Bkz. ProcedureContext.persistent.
// ============================================================

export type ProcedureKind =
  | "stethoscope"
  | "oxygen_mask"
  | "defibrillator"
  // P0 ekipman — hasta üzerinde kalıcı duran monitörizasyon/damar yolu
  | "iv_line"
  | "pulse_ox"
  | "bp_cuff"
  | "ekg_electrodes";

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
  /**
   * P0 ekipman: true ise animasyon tamamlandıktan sonra ekipman sahnede
   * KALIR (attached-equipment katmanına taşınır), unmount edilmez. Maske +
   * IV + pulse-ox + EKG aynı anda durabilsin diye. Aktif TAKMA anında yine
   * tek prosedür kuralı geçerli (tek el = tek hareket); kalıcılık sadece
   * takma bittikten sonra geçerli.
   */
  persistent?: boolean;
}
