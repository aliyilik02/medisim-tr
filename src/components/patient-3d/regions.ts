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
      "Hava yolu değerlendirmesi ve havayolu girişimleri. Maske / balon-valf-maske / nazal kanül / entübasyon noktası.",
    side: "anterior",
    // Havayolu girişimleri ağız/burun bölgesinden: maske, Ambu, nazal
    // kanül (manifold burun altına denk gelir — bkz. NasalCannulaProcedure
    // NOSE_OFFSET_Y), entübasyon (laringoskop + ETT).
    availableProcedures: ["oxygen_mask", "bvm", "nasal_cannula", "intubation"],
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
    // EKG elektrotları göğüs merkezine yapışır (AHA torso yerleşimi bu
    // noktadan offset'lenir — bkz. EkgElectrodesProcedure).
    availableProcedures: ["stethoscope", "ekg_electrodes"],
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

  // ============================================================
  // P0 EKİPMAN — ekstremite landmark'ları (IV / NIBP / pulse-ox)
  // ============================================================
  // Koordinatlar 8-head canon + landmark doc'un IV/vasküler/periferik
  // nabız tablolarından TÜRETİLDİ (gözle tahmin YOK). Model bbox x_range
  // [-0.20, +0.20] olduğu için (kollar vücudun yanında) doc'taki ±0.21/
  // ±0.24 değerleri bbox içine clamp edildi — formula world_y = -0.243 +
  // ratio × 1.021 sabit kalır, sadece kol-yanda x daraltıldı.
  //
  // Klinik mantık: IV ve NIBP kafı AYNI kola takılırsa kaf şişerken IV
  // akışını keser → standart pratik KARŞIT kollar. Bu yüzden:
  //   - SOL kol  (x<0): IV kanül (antekübital) + pulse-ox (parmak ucu)
  //   - SAĞ kol  (x>0): NIBP manşonu (üst kol brakiyal)
  {
    // Antekübital fossa SOL — median kubital ven (1. tercih IV erişim).
    // Doc IV tablosu: (-0.21, 0.45). Kol-yanda x bbox'a clamp → -0.18.
    // ratio = (0.45+0.243)/1.021 = 0.679. z: ön kol anterolateral yüzey
    // (~0.06) + marker → 0.10.
    id: "arm-left-antecubital",
    label: "Sol Ön Kol (Antekübital)",
    position: [-0.18, 0.45, 0.10],
    placeholderNote:
      "Antekübital fossa — median kubital ven. Periferik IV kanül 1. tercih erişim noktası.",
    side: "anterior",
    availableProcedures: ["iv_line"],
  },
  {
    // Parmak ucu SOL — pulse oksimetre. Doc periferik: radial bilek
    // (-0.22, 0.32), el üstü (-0.24, 0.30). Parmak ucu bilekten distal →
    // daha aşağı y, x bbox'a clamp. ratio(0.22) = 0.453. z: el ~0.05 +
    // klips → 0.07.
    id: "finger-left-tip",
    label: "Sol Parmak Ucu",
    position: [-0.19, 0.22, 0.07],
    placeholderNote:
      "Parmak ucu — pulse oksimetre klipsi (SpO2 + nabız) ve kapiller kan şekeri (glukometre).",
    side: "anterior",
    // Parmak ucu: pulse-ox klipsi + kapiller kan şekeri ölçümü (lanset).
    availableProcedures: ["pulse_ox", "glucometer"],
  },
  {
    // Üst kol brakiyal SAĞ — NIBP manşonu. Doc periferik nabız tablosu:
    // brakiyal (±0.16, 0.48). Antekübitalin üstü (üst kol). x bbox içinde
    // → +0.17. ratio = (0.48+0.243)/1.021 = 0.708. z: üst kol ~0.07 +
    // kaf → 0.09. KARŞIT kol (IV solda) → kaf şişerken IV akışını kesmez.
    id: "arm-right-brachial",
    label: "Sağ Üst Kol (Brakiyal)",
    position: [0.17, 0.48, 0.09],
    placeholderNote:
      "Üst kol brakiyal arter hizası — NIBP (tansiyon) manşonu. IV'den karşıt kol (akış girişimi olmasın).",
    side: "anterior",
    availableProcedures: ["bp_cuff"],
  },

  // ============================================================
  // P1 EKİPMAN — acil hava yolu/kanama landmark'ları
  // ============================================================
  {
    // İğne torakostomi / göğüs mührü — 2. interkostal aralık (ICS)
    // midklaviküler hat (tansiyon pnömotoraks dekompresyonu klasik yer).
    // 8-head canon: 2. ICS / manubrium ratio 0.80 → y = 0.574.
    // Midclavicular line ≈ x = ±0.085 (auskültasyon tablosu apex MCL).
    // SOL hemitoraks seçildi (örnek dekompresyon tarafı). z: göğüs
    // anterior duvarı (chest-front 0.115 ile aynı hizada) → 0.115.
    id: "chest-2ics-mcl-left",
    label: "Sol 2. ICS Midklaviküler",
    position: [-0.085, 0.574, 0.115],
    placeholderNote:
      "2. interkostal aralık, sol midklavikular hat — tansiyon pnömotoraks iğne dekompresyonu / göğüs mührü.",
    side: "anterior",
    availableProcedures: ["chest_seal"],
  },
  {
    // Sol uyluk proksimal — CAT turnike "high and tight" yerleşimi.
    // 8-head canon: femoral (inguinal çukur) y=0.20, mid-thigh ratio
    // 0.375 → y=0.140. Proksimal uyluk bu ikisinin arası, inguinal
    // çukurun hemen distali → ratio ≈ 0.43 → y = -0.243 + 0.43×1.021
    // = 0.196 ≈ 0.19. x: üst uyluk landmark doc femoral x=±0.06 (bacaklar
    // üstte birbirine yakın) → SOL -0.06. z: uyluk anterior yüzey ~0.07.
    id: "thigh-left-proximal",
    label: "Sol Uyluk (Proksimal)",
    position: [-0.06, 0.19, 0.07],
    placeholderNote:
      "Uyluk proksimal — femoral çukurun distali. Ekstremite kanamasında CAT turnike 'high and tight' uygulama hattı.",
    side: "anterior",
    availableProcedures: ["tourniquet"],
  },
];
