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
//
// P1/P2 ekipman seti (acil hava yolu + kanama + ölçüm):
//   - bvm            — Ambu balon-valf-maske (anlık ventilasyon)
//   - intubation     — laringoskop + ETT yerleştirme (anlık)
//   - tourniquet     — CAT turnike (persistent, ekstremite proksimal)
//   - chest_seal     — iğne torakostomi / göğüs mührü (persistent)
//   - nasal_cannula  — nazal kanül düşük akış O2 (persistent)
//   - glucometer     — parmak ucu kan şekeri ölçümü (anlık)
// ============================================================

export type ProcedureKind =
  | "stethoscope"
  | "oxygen_mask"
  | "defibrillator"
  // P0 ekipman — hasta üzerinde kalıcı duran monitörizasyon/damar yolu
  | "iv_line"
  | "pulse_ox"
  | "bp_cuff"
  | "ekg_electrodes"
  // P1 ekipman — acil hava yolu + kanama kontrolü
  | "bvm"
  | "intubation"
  | "tourniquet"
  | "chest_seal"
  // P2 ekipman — basit O2 + ölçüm
  | "nasal_cannula"
  | "glucometer";

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
