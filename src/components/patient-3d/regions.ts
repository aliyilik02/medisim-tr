// ============================================================
// Patient 3D — Bölge listesi (Sprint B.2.3+, B.5 genişletme)
// ============================================================
// Koordinatlar memory tablosundan: docs/memory/medisim_anatomik_landmark.md
// (8-head Vitruvian canon × v2.glb world bbox).
// Model bbox: y[-0.243, 0.778], x[-0.20, 0.20], z[-0.08, 0.09].
// Formula: world_y = -0.243 + ratio × 1.021
// Marker yüzey z: skin (0.085) + clearance (~0.040) ≈ 0.13. Yüksek z ile
// solunum AP expansion (1cm) sırasında marker arkada kalmasın.
// ============================================================

import type { ProcedureKind } from "./procedures/types";

// Sprint B.5+: chuma6oy "Male full body anatomy" modeli kalibrasyonu.
// 8-head Vitruvian canon teorik landmark'larından ~2 cm aşağı kaydırma
// gerek: gerçek anatomik modelde kafa+boyun proporsiyon olarak biraz
// daha büyük, gövde landmark'ları (sternum / nipple line / xiphoid /
// umbilicus) memory tablosundaki teorik Y'den AŞAĞIDA düşüyor.
// Görsel feedback ile ayarlanır — model değişirse bu constant rehesaplanmalı.
const TORSO_Y_OFFSET = -0.020;
const torsoY = (y: number): number => y + TORSO_Y_OFFSET;

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
    position: [0, 0.666, 0.110],
    placeholderNote:
      "Hava yolu değerlendirmesi ve maske takma noktası. Klinik review sonrası genişletilecek.",
    side: "anterior",
    availableProcedures: ["oxygen_mask"],
  },
  {
    // Karotis sağ — boyun yan içeri (sternokleidomastoid medial kenar),
    // suprasternal notch hizası ratio 0.85 → y=0.625
    id: "carotid-right",
    label: "Sağ Karotis",
    position: [0.030, 0.620, 0.080],
    placeholderNote:
      "Sağ a. carotis communis nabzı (boyun ön kenar, sternokleidomastoid medialinde). Şok değerlendirmesi.",
    side: "anterior",
  },
  {
    id: "carotid-left",
    label: "Sol Karotis",
    position: [-0.030, 0.620, 0.080],
    placeholderNote:
      "Sol a. carotis communis nabzı. Sağ ve sol asla aynı anda palpe edilmez (vasovagal/serebral hipoperfüzyon riski).",
    side: "anterior",
  },

  // ─── Kardiyak APE-T-M (5 nokta) ────────────────────────────
  {
    // Aortic — 2. ICS sağ sternal kenar
    id: "chest-aortic",
    label: "Aortik Odak (2. ICS sağ)",
    position: [0.02, torsoY(0.574), 0.100],
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
    position: [-0.02, torsoY(0.574), 0.100],
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
    position: [-0.02, torsoY(0.553), 0.100],
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
    position: [-0.025, torsoY(0.523), 0.100],
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
    position: [-0.085, torsoY(0.495), 0.100],
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
    position: [0.085, torsoY(0.555), 0.100],
    placeholderNote:
      "Sağ akciğer üst lob anterior auskültasyonu: 2-3. interkostal, midklavikular hat.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_wheeze",
  },
  {
    id: "lung-upper-left",
    label: "Sol Üst Lob (anterior)",
    position: [-0.085, torsoY(0.555), 0.100],
    placeholderNote:
      "Sol akciğer üst lob anterior auskültasyonu: 2-3. interkostal, midklavikular hat.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_wheeze",
  },
  {
    id: "lung-lower-right",
    label: "Sağ Alt Lob (anterior)",
    position: [0.105, torsoY(0.465), 0.090],
    placeholderNote:
      "Sağ akciğer alt lob anterior auskültasyonu: 5-6. interkostal, anterior aksiller hat. Pnömoni ralleri sıklıkla burada.",
    side: "anterior",
    availableProcedures: ["stethoscope"],
    auscultationSoundId: "lung_crackles",
  },
  {
    id: "lung-lower-left",
    label: "Sol Alt Lob (anterior)",
    position: [-0.105, torsoY(0.465), 0.090],
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
    position: [0, torsoY(0.431), 0.100],
    placeholderNote:
      "Epigastrik bölge: mide, pankreas, aort projeksiyonu. Palpasyon + oskültasyon (aort üfürümü).",
    side: "anterior",
  },
  {
    id: "abdomen-ruq",
    label: "Sağ Üst Kadran (RUQ)",
    position: [0.080, torsoY(0.450), 0.100],
    placeholderNote:
      "Sağ üst kadran: karaciğer, safra kesesi, duodenum başı. Murphy belirtisi, hepatomegali palpasyonu.",
    side: "anterior",
  },
  {
    id: "abdomen-luq",
    label: "Sol Üst Kadran (LUQ)",
    position: [-0.080, torsoY(0.450), 0.100],
    placeholderNote:
      "Sol üst kadran: mide, dalak, pankreas kuyruğu, sol böbrek üst pol. Splenomegali palpasyonu.",
    side: "anterior",
  },
  {
    id: "abdomen-rlq",
    label: "Sağ Alt Kadran (RLQ)",
    position: [0.080, torsoY(0.360), 0.100],
    placeholderNote:
      "Sağ alt kadran: çekum, apendiks, terminal ileum. McBurney noktası — apandisit hassasiyeti.",
    side: "anterior",
  },
  {
    id: "abdomen-llq",
    label: "Sol Alt Kadran (LLQ)",
    position: [-0.080, torsoY(0.360), 0.100],
    placeholderNote:
      "Sol alt kadran: sigmoid kolon, sol over/tuba (kadında). Divertikülit hassasiyeti.",
    side: "anterior",
  },
  {
    // Suprapubic — ratio 0.56 → y = 0.329
    id: "abdomen-suprapubic",
    label: "Suprapubik",
    position: [0, torsoY(0.329), 0.100],
    placeholderNote:
      "Suprapubik bölge: mesane, uterus (kadın). Globus, sistit/üriner retansiyon hassasiyeti.",
    side: "anterior",
  },

  // ─── Periferik nabız: femoral ──────────────────────────────
  {
    id: "femoral-right",
    label: "Sağ Femoral Nabız",
    position: [0.060, 0.200, 0.100],
    placeholderNote:
      "Sağ a. femoralis nabzı: inguinal ligament orta noktası altında. Şok ve aort koarktasyonu değerlendirmesi.",
    side: "anterior",
  },
  {
    id: "femoral-left",
    label: "Sol Femoral Nabız",
    position: [-0.060, 0.200, 0.100],
    placeholderNote:
      "Sol a. femoralis nabzı. Karotis ile beraber santral nabızdır — kardiyak arrest tanısında kullanılır.",
    side: "anterior",
  },

  // ─── Periferik nabız: radial (bilek) ──────────────────────────
  // Önkol distal palmar yüz, radius lateral kenarı. Sprint B.7+ — sirkülasyon
  // değerlendirmesi, şok evrelemesi (radial nabız kayboluyorsa SBP < 80mmHg).
  {
    id: "radial-right",
    label: "Sağ Radial Nabız",
    position: [0.320, 0.420, 0.040],
    placeholderNote:
      "Sağ a. radialis nabzı (bilek). SBP > ~80 mmHg ile palpe edilir; periferik perfüzyon ve şok evrelemesi.",
    side: "anterior",
  },
  {
    id: "radial-left",
    label: "Sol Radial Nabız",
    position: [-0.320, 0.420, 0.040],
    placeholderNote:
      "Sol a. radialis nabzı. Çift taraflı eşitlik kontrolü — aort diseksiyonunda diferansiyel nabız değerlendirmesi.",
    side: "anterior",
  },

  // ─── Periferik nabız: dorsalis pedis (ayak sırtı) ──────────────
  // Ayak dorsal yüz, 1. ve 2. metatarsal arası. Periferal arter hastalığı,
  // diyabet vasküler değerlendirmesi, kompartman sendromu kontrolü.
  {
    id: "dorsalis-pedis-right",
    label: "Sağ Dorsalis Pedis",
    position: [0.050, -0.220, 0.090],
    placeholderNote:
      "Sağ a. dorsalis pedis nabzı (ayak sırtı). Periferik vasküler hastalık, alt ekstremite iskemisi.",
    side: "anterior",
  },
  {
    id: "dorsalis-pedis-left",
    label: "Sol Dorsalis Pedis",
    position: [-0.050, -0.220, 0.090],
    placeholderNote:
      "Sol a. dorsalis pedis nabzı. Çift taraflı eşitsizlik akut/kronik vasküler obstrüksiyon işareti.",
    side: "anterior",
  },

  // ─── Periferik nabız: posterior tibial (iç ayak bileği) ────────
  // Medial malleol arka tarafı, calcaneal tendon önü. Diyabet ayağı,
  // alt ekstremite vasküler skoru (ABI hesaplama yerleri).
  {
    id: "posterior-tibial-right",
    label: "Sağ Posterior Tibial",
    position: [0.040, -0.190, 0.030],
    placeholderNote:
      "Sağ a. tibialis posterior nabzı (iç ayak bileği). Diyabetik ayak ve ABI değerlendirmesi.",
    side: "lateral",
  },
  {
    id: "posterior-tibial-left",
    label: "Sol Posterior Tibial",
    position: [-0.040, -0.190, 0.030],
    placeholderNote:
      "Sol a. tibialis posterior nabzı. Periferik nabızlar (radial+pedis+tibial) hep beraber kontrol edilir — şok evrelemesi.",
    side: "lateral",
  },
];
