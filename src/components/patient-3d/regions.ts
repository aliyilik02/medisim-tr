// ============================================================
// Patient 3D — Bölge listesi (Sprint B.2.3+, B.5 genişletme)
// ============================================================
// Koordinatlar memory tablosundan: docs/memory/medisim_anatomik_landmark.md
// (8-head Vitruvian canon × v2.glb world bbox).
// Model bbox: y[-0.243, 0.778], x[-0.20, 0.20], z[-0.08, 0.09].
// Formula: world_y = -0.243 + ratio × 1.021
// Marker yüzey z: skin (0.085-0.09) + marker yarıçapı (0.010) ≈ 0.10-0.115.
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
  // ─── Baş / Boyun ───────────────────────────────────────────
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
    // Karotis sağ — boyun yan, suprasternal notch hizası ratio 0.85 → y=0.625
    id: "carotid-right",
    label: "Sağ Karotis",
    position: [0.05, 0.620, 0.080],
    placeholderNote:
      "Sağ a. carotis communis nabzı (boyun ön kenar, sternokleidomastoid medialinde). Şok değerlendirmesi.",
    side: "anterior",
  },
  {
    id: "carotid-left",
    label: "Sol Karotis",
    position: [-0.05, 0.620, 0.080],
    placeholderNote:
      "Sol a. carotis communis nabzı. Sağ ve sol asla aynı anda palpe edilmez (vasovagal/serebral hipoperfüzyon riski).",
    side: "anterior",
  },

  // ─── Kardiyak APE-T-M (5 nokta) ────────────────────────────
  {
    // Aortic — 2. ICS sağ sternal kenar
    id: "chest-aortic",
    label: "Aortik Odak (2. ICS sağ)",
    position: [0.02, 0.574, 0.110],
    placeholderNote:
      "Aortik oskültasyon: 2. interkostal aralık, sağ sternal kenar. Aort kapağı, aort darlığı üfürümü en iyi burada duyulur.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "heart_normal",
  },
  {
    // Pulmonic — 2. ICS sol sternal kenar
    id: "chest-pulmonic",
    label: "Pulmoner Odak (2. ICS sol)",
    position: [-0.02, 0.574, 0.110],
    placeholderNote:
      "Pulmonik oskültasyon: 2. interkostal aralık, sol sternal kenar. Pulmoner kapak, P2 sesi.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "heart_normal",
  },
  {
    // Erb's — 3. ICS sol sternal kenar (S1+S2 ikisi de iyi duyulur)
    id: "chest-erb",
    label: "Erb Noktası (3. ICS sol)",
    position: [-0.02, 0.553, 0.110],
    placeholderNote:
      "Erb noktası: 3. interkostal aralık, sol sternal kenar. S1 ve S2 birlikte en iyi duyulan nokta; aort yetmezliği üfürümü.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "heart_normal",
  },
  {
    // Tricuspid — 4. ICS sol alt sternal kenar
    id: "chest-tricuspid",
    label: "Triküspid Odak (4. ICS sol)",
    position: [-0.025, 0.523, 0.110],
    placeholderNote:
      "Triküspid oskültasyon: 4. interkostal aralık, sol sternal kenar alt. Triküspid kapağı, sağ kalp.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "heart_normal",
  },
  {
    // Mitral / Apex — 5. ICS sol midclavicular
    id: "chest-mitral",
    label: "Mitral / Apeks (5. ICS sol MCL)",
    position: [-0.085, 0.495, 0.108],
    placeholderNote:
      "Mitral oskültasyon: 5. interkostal aralık, sol midklavikular hat. Apeks vurusu, S1 burada en güçlü.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "heart_61bpm",
  },

  // ─── Pulmoner oskültasyon (anterior 4 lob) ─────────────────
  {
    id: "lung-upper-right",
    label: "Sağ Üst Lob (anterior)",
    position: [0.085, 0.555, 0.105],
    placeholderNote:
      "Sağ akciğer üst lob anterior auskültasyonu: 2-3. interkostal, midklavikular hat.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_wheeze",
  },
  {
    id: "lung-upper-left",
    label: "Sol Üst Lob (anterior)",
    position: [-0.085, 0.555, 0.105],
    placeholderNote:
      "Sol akciğer üst lob anterior auskültasyonu: 2-3. interkostal, midklavikular hat.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_wheeze",
  },
  {
    id: "lung-lower-right",
    label: "Sağ Alt Lob (anterior)",
    position: [0.105, 0.465, 0.100],
    placeholderNote:
      "Sağ akciğer alt lob anterior auskültasyonu: 5-6. interkostal, anterior aksiller hat. Pnömoni ralleri sıklıkla burada.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_crackles",
  },
  {
    id: "lung-lower-left",
    label: "Sol Alt Lob (anterior)",
    position: [-0.105, 0.465, 0.100],
    placeholderNote:
      "Sol akciğer alt lob anterior auskültasyonu: 5-6. interkostal, anterior aksiller hat.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_crackles",
  },

  // ─── Karın 4 kadran + midline ──────────────────────────────
  {
    // Epigastrium — xiphoid + umbilicus arası, ratio 0.66 → y = 0.431
    id: "abdomen-epigastric",
    label: "Epigastrik (üst orta)",
    position: [0, 0.431, 0.095],
    placeholderNote:
      "Epigastrik bölge: mide, pankreas, aort projeksiyonu. Palpasyon + oskültasyon (aort üfürümü).",
    side: "anterior",
  },
  {
    id: "abdomen-ruq",
    label: "Sağ Üst Kadran (RUQ)",
    position: [0.080, 0.450, 0.095],
    placeholderNote:
      "Sağ üst kadran: karaciğer, safra kesesi, duodenum başı. Murphy belirtisi, hepatomegali palpasyonu.",
    side: "anterior",
  },
  {
    id: "abdomen-luq",
    label: "Sol Üst Kadran (LUQ)",
    position: [-0.080, 0.450, 0.095],
    placeholderNote:
      "Sol üst kadran: mide, dalak, pankreas kuyruğu, sol böbrek üst pol. Splenomegali palpasyonu.",
    side: "anterior",
  },
  {
    id: "abdomen-rlq",
    label: "Sağ Alt Kadran (RLQ)",
    position: [0.080, 0.360, 0.095],
    placeholderNote:
      "Sağ alt kadran: çekum, apendiks, terminal ileum. McBurney noktası — apandisit hassasiyeti.",
    side: "anterior",
  },
  {
    id: "abdomen-llq",
    label: "Sol Alt Kadran (LLQ)",
    position: [-0.080, 0.360, 0.095],
    placeholderNote:
      "Sol alt kadran: sigmoid kolon, sol over/tuba (kadında). Divertikülit hassasiyeti.",
    side: "anterior",
  },
  {
    // Suprapubic — ratio 0.56 → y = 0.329
    id: "abdomen-suprapubic",
    label: "Suprapubik",
    position: [0, 0.329, 0.095],
    placeholderNote:
      "Suprapubik bölge: mesane, uterus (kadın). Globus, sistit/üriner retansiyon hassasiyeti.",
    side: "anterior",
  },

  // ─── Periferik nabız: femoral ──────────────────────────────
  {
    id: "femoral-right",
    label: "Sağ Femoral Nabız",
    position: [0.060, 0.200, 0.090],
    placeholderNote:
      "Sağ a. femoralis nabzı: inguinal ligament orta noktası altında. Şok ve aort koarktasyonu değerlendirmesi.",
    side: "anterior",
  },
  {
    id: "femoral-left",
    label: "Sol Femoral Nabız",
    position: [-0.060, 0.200, 0.090],
    placeholderNote:
      "Sol a. femoralis nabzı. Karotis ile beraber santral nabızdır — kardiyak arrest tanısında kullanılır.",
    side: "anterior",
  },
];
