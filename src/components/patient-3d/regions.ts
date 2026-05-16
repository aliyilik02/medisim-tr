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

// Pozisyonlar Sprint B.1 anatomik model (patient-v1.glb) bbox'una göre:
// x[-0.32, 0.32], y[-0.24, 0.78], z[-0.22, 0.10]. Ön yüzey z≈0.10.
// Sprint B.1.1: marker'lar deri yüzeyinin hemen önüne yapışsın (z anterior
// yüzey + marker yarıçapı ~0.018). Yan göğüsler için yan yüzey daha içeri
// (z≈0.06), orta hattaki marker'lar full anterior'da.
// Sprint B.2.2: face-mouth region eklendi (oksijen maskesi için).
//   Yüz/ağız yaklaşık [0, 0.71, 0.10]; gerçek anatomik nokta klinik
//   review sonrası güncellenecek.
export const DEFAULT_REGIONS: PatientRegion[] = [
  {
    id: "face-mouth",
    label: "Yüz / Ağız",
    position: [0, 0.71, 0.10],
    placeholderNote:
      "Hava yolu değerlendirmesi ve maske takma noktası. Klinik review sonrası genişletilecek.",
    side: "anterior",
    availableProcedures: ["oxygen_mask"],
  },
  {
    id: "chest-front",
    label: "Göğüs Ön (Sternal)",
    position: [0, 0.55, 0.115],
    placeholderNote:
      "Auskültasyon ve inspeksiyon notu Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
  },
  {
    id: "chest-left",
    label: "Sol Göğüs (Kardiyak Alan)",
    position: [-0.16, 0.4, 0.085],
    placeholderNote:
      "Kardiyak oskültasyon noktaları Sprint A sonrası klinik review'da işaretlenecek.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
  },
  {
    id: "chest-right",
    label: "Sağ Göğüs (Pulmoner Alan)",
    position: [0.16, 0.4, 0.085],
    placeholderNote:
      "Pulmoner alan dinleme notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
  },
  {
    id: "abdomen-upper",
    label: "Üst Karın (Epigastrik)",
    position: [0, 0.1, 0.115],
    placeholderNote:
      "Epigastrik palpasyon ve oskültasyon bulguları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "abdomen-lower",
    label: "Alt Karın (Suprapubik)",
    position: [0, -0.08, 0.095],
    placeholderNote:
      "Suprapubik bölge muayene notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
];
