// ============================================================
// Patient 3D — PLACEHOLDER bölge listesi (Sprint A)
// ============================================================
// UYARI: Buradaki konum (position) değerleri tamamen PLACEHOLDER'dır.
// Gerçek anatomik koordinatlar Sprint A bittikten sonra ayrı bir PR'da,
// klinik review ile güncellenecek. Auskültasyon noktaları, palpasyon
// alanları ve fizik muayene bulguları klinik karardır — Sprint A
// kapsamında YOK.
// ============================================================

export type RegionSide = "anterior" | "lateral" | "posterior";

export interface PatientRegion {
  id: string;
  label: string;
  /** PLACEHOLDER — Sprint A sonrası klinik review'da gerçek koordinatlar girilecek. */
  position: [number, number, number];
  placeholderNote: string;
  side: RegionSide;
}

export const DEFAULT_REGIONS: PatientRegion[] = [
  {
    id: "chest-front",
    label: "Göğüs Ön (Sternal)",
    position: [0, 0.55, 0.42],
    placeholderNote:
      "Auskültasyon ve inspeksiyon notu Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "chest-left",
    label: "Sol Göğüs (Kardiyak Alan)",
    position: [-0.28, 0.5, 0.32],
    placeholderNote:
      "Kardiyak oskültasyon noktaları Sprint A sonrası klinik review'da işaretlenecek.",
    side: "anterior",
  },
  {
    id: "chest-right",
    label: "Sağ Göğüs (Pulmoner Alan)",
    position: [0.28, 0.5, 0.32],
    placeholderNote:
      "Pulmoner alan dinleme notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "abdomen-upper",
    label: "Üst Karın (Epigastrik)",
    position: [0, -0.05, 0.4],
    placeholderNote:
      "Epigastrik palpasyon ve oskültasyon bulguları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "abdomen-lower",
    label: "Alt Karın (Suprapubik)",
    position: [0, -0.55, 0.35],
    placeholderNote:
      "Suprapubik bölge muayene notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
];
