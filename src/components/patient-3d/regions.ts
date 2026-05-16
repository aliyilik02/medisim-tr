// ============================================================
// Patient 3D — PLACEHOLDER bölge listesi (Sprint A)
// ============================================================
// UYARI: Buradaki konum (position) değerleri tamamen PLACEHOLDER'dır.
// Gerçek anatomik koordinatlar Sprint A bittikten sonra ayrı bir PR'da,
// klinik review ile güncellenecek. Auskültasyon noktaları, palpasyon
// alanları ve fizik muayene bulguları klinik karardır — Sprint A
// kapsamında YOK.
// ============================================================

import type { ProcedureKind } from "./procedures/types";

export type RegionSide = "anterior" | "lateral" | "posterior";

export interface PatientRegion {
  id: string;
  label: string;
  /** PLACEHOLDER — Sprint A sonrası klinik review'da gerçek koordinatlar girilecek. */
  position: [number, number, number];
  placeholderNote: string;
  side: RegionSide;
  /** Sprint B.2: Bu bölgede tetiklenebilen 3D prosedürler. */
  availableProcedures?: ProcedureKind[];
}

// Sprint B.2.3 koordinat alanı (patient-v2.glb wrapper-transformed):
// AnatomicPatientModel scale 0.107 + y+0.49 uyguluyor → world bbox
// x[-0.20, 0.20], y[-0.24, 0.78], z[-0.08, 0.09]. v2 tam beden,
// proporsiyonlar v1 torso'dan farklı; aşağıdaki koordinatlar v2
// anatomisine göre yeniden ayarlandı.
// Hâlâ PLACEHOLDER — klinik review sonrası gerçek anatomik landmark'lara
// göre fine-tune edilecek.
export const DEFAULT_REGIONS: PatientRegion[] = [
  {
    id: "face-mouth",
    label: "Yüz / Ağız",
    position: [0, 0.68, 0.090],
    placeholderNote:
      "Hava yolu değerlendirmesi ve maske takma noktası. Klinik review sonrası genişletilecek.",
    side: "anterior",
    availableProcedures: ["oxygen_mask"],
  },
  {
    id: "chest-front",
    label: "Göğüs Ön (Sternal)",
    position: [0, 0.50, 0.115],
    placeholderNote:
      "Auskültasyon ve inspeksiyon notu Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
  },
  {
    id: "chest-left",
    label: "Sol Göğüs (Kardiyak Alan)",
    position: [-0.07, 0.44, 0.110],
    placeholderNote:
      "Kardiyak oskültasyon noktaları Sprint A sonrası klinik review'da işaretlenecek.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
  },
  {
    id: "chest-right",
    label: "Sağ Göğüs (Pulmoner Alan)",
    position: [0.07, 0.44, 0.110],
    placeholderNote:
      "Pulmoner alan dinleme notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
  },
  {
    id: "abdomen-upper",
    label: "Üst Karın (Epigastrik)",
    position: [0, 0.38, 0.095],
    placeholderNote:
      "Epigastrik palpasyon ve oskültasyon bulguları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "abdomen-lower",
    label: "Alt Karın (Suprapubik)",
    position: [0, 0.22, 0.095],
    placeholderNote:
      "Suprapubik bölge muayene notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
];
