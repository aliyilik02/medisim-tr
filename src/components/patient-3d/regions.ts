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

// Pozisyonlar Sprint B.1 anatomik model (patient-v1.glb) bbox'una göre:
// x[-0.32, 0.32], y[-0.24, 0.78], z[-0.22, 0.10]. Ön yüzey z≈0.10.
// Marker'lar küçük z offset ile model yüzeyinin önünde duruyor (z-fight yok).
export const DEFAULT_REGIONS: PatientRegion[] = [
  {
    id: "chest-front",
    label: "Göğüs Ön (Sternal)",
    position: [0, 0.55, 0.13],
    placeholderNote:
      "Auskültasyon ve inspeksiyon notu Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "chest-left",
    label: "Sol Göğüs (Kardiyak Alan)",
    position: [-0.16, 0.4, 0.12],
    placeholderNote:
      "Kardiyak oskültasyon noktaları Sprint A sonrası klinik review'da işaretlenecek.",
    side: "anterior",
  },
  {
    id: "chest-right",
    label: "Sağ Göğüs (Pulmoner Alan)",
    position: [0.16, 0.4, 0.12],
    placeholderNote:
      "Pulmoner alan dinleme notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "abdomen-upper",
    label: "Üst Karın (Epigastrik)",
    position: [0, 0.1, 0.13],
    placeholderNote:
      "Epigastrik palpasyon ve oskültasyon bulguları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
  {
    id: "abdomen-lower",
    label: "Alt Karın (Suprapubik)",
    position: [0, -0.15, 0.12],
    placeholderNote:
      "Suprapubik bölge muayene notları Sprint A sonrası klinik review'da eklenecek.",
    side: "anterior",
  },
];
