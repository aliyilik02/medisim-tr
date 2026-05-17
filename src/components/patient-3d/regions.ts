// ============================================================
// Patient 3D — Bölge listesi (Sprint B.2.3+)
// ============================================================
// Koordinatlar gerçek anatomik landmark'lara göre hesaplanmıştır.
// Referans: memory/medisim_anatomik_landmark.md (8-head Vitruvian canon,
// kardiyak APE-to-Man auskültasyon noktaları).
// Model bbox: y[-0.243, 0.778], x[-0.20, 0.20], z[-0.08, 0.09].
// Formula: world_y = -0.243 + ratio × 1.021
// ============================================================

import type { ProcedureKind } from "./procedures/types";

export type RegionSide = "anterior" | "lateral" | "posterior";

export interface PatientRegion {
  id: string;
  label: string;
  position: [number, number, number];
  placeholderNote: string;
  side: RegionSide;
  /** Sprint B.2: Bu bölgede tetiklenebilen 3D prosedürler. */
  availableProcedures?: ProcedureKind[];
  /**
   * Sprint B.4.7: Stetoskop ile dinleme tetiklendiğinde çalınacak ses ID'si
   * (public/sounds/auscultation/{auscultationSoundId}.ogg). Senaryo motoru
   * ileride patolojiye göre override edebilir.
   */
  auscultationSoundId?: string;
}

export const DEFAULT_REGIONS: PatientRegion[] = [
  {
    // Ağız: 8-head canon 0.89 oranı → y = 0.666
    id: "face-mouth",
    label: "Yüz / Ağız",
    position: [0, 0.666, 0.090],
    placeholderNote:
      "Hava yolu değerlendirmesi ve maske takma noktası. Klinik review sonrası genişletilecek.",
    side: "anterior",
    availableProcedures: ["oxygen_mask"],
  },
  {
    // Sternum orta — Erb's point yakını, genel auskültasyon "merkez" noktası
    // 8-head canon 0.77 → y = 0.543
    id: "chest-front",
    label: "Sternum (Erb noktası)",
    position: [0, 0.543, 0.115],
    placeholderNote:
      "Sternum orta hat; Erb noktası (3. ICS sol sternal kenar) S1+S2 dinleme.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "heart_normal",
  },
  {
    // Mitral / Apex — 5. ICS sol midclavicular
    // y = 0.495, x = -0.085 (sol midclavicular line)
    id: "chest-left",
    label: "Sol Apex (Mitral)",
    position: [-0.085, 0.495, 0.110],
    placeholderNote:
      "Mitral oskültasyon: 5. interkostal aralık, sol midklavikular hat. S1 burada en güçlü.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "heart_61bpm",
  },
  {
    // Aortic — 2. ICS sağ sternal kenar
    // y = 0.574, x = +0.02
    id: "chest-right",
    label: "Sağ Sternal (Aortik)",
    position: [0.02, 0.574, 0.110],
    placeholderNote:
      "Aortik oskültasyon: 2. interkostal aralık, sağ sternal kenar. Aort kapağı, aort darlığı üfürümü.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_crackles",
  },
  {
    // Epigastrium — xiphoid + umbilicus arası, 8-head canon 0.66 → y = 0.431
    id: "abdomen-upper",
    label: "Üst Karın (Epigastrik)",
    position: [0, 0.431, 0.095],
    placeholderNote:
      "Epigastrik palpasyon ve oskültasyon (mide / pankreas / aort).",
    side: "anterior",
  },
  {
    // Suprapubic — göbek + pubic arası, 8-head canon 0.56 → y = 0.329
    id: "abdomen-lower",
    label: "Alt Karın (Suprapubik)",
    position: [0, 0.329, 0.095],
    placeholderNote:
      "Suprapubik palpasyon (mesane / pelvik organlar). Pubic symphysis y=0.268 hizasının ~6 cm üstü.",
    side: "anterior",
  },
];
