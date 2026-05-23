// ============================================================
// patient-profile — senaryo hastasından 3D model profili çıkarımı
// ============================================================
// Sprint B.7: hasta çeşitliliği. Mevcut sahnede tek Rocketbox erişkin erkek
// modeli var — gelecekte female/pediatric/infant GLB asset'leri eklendiğinde
// bu modülün `modelUrl` field'ı doldurulur. Şimdilik tüm profiller aynı
// modelden parametric scale + skin tint farkıyla türetilir.
//
// Profile field'ları:
//   - category: yaş grubu (PALS sınıflaması ile uyumlu)
//   - sex: M/F (modeli farklı render etmek için, şimdilik skin tint hint)
//   - pregnant: gebelik flag (preeklampsi vs.)
//   - scaleFactor: AnatomicPatientModel MODEL_SCALE çarpanı
//   - displayLabel: TR UI etiketi ("8 aylık Erkek Bebek", "62 Yaş Kadın")
//   - skinHintRgb: female/elderly/infant için varsayılan ten tonu ipucu
//
// PALS yaş grupları (klinik standart):
//   - infant: 0-1 yıl (< 12 ay)
//   - toddler: 1-2 yıl (12-35 ay)
//   - child / pediatric: 3-11 yıl
//   - adolescent: 12-17 yıl
//   - adult: 18-64 yıl
//   - elderly: 65+ yıl
// ============================================================

export type PatientCategory =
  | "infant"        // < 1 yıl (PALS bebek)
  | "toddler"       // 1-2 yıl
  | "pediatric"     // 3-11 yıl (PALS çocuk)
  | "adolescent"    // 12-17 yıl
  | "adult"         // 18-64 yıl
  | "elderly";      // 65+ yıl

export type PatientSex = "M" | "F";

export interface PatientProfile {
  category: PatientCategory;
  sex: PatientSex;
  /** Gebelik flag — senaryo medical_history'sinde belirtilirse true. */
  pregnant?: boolean;
  /** AnatomicPatientModel MODEL_SCALE çarpanı (varsayılan 1.0 = erişkin). */
  scaleFactor: number;
  /** TR UI etiketi: "8 aylık Erkek Bebek" / "62 Yaş Kadın" vb. */
  displayLabel: string;
  /**
   * Cilt tonu varsayılan ipucu (RGB triplet, AnatomicPatientModel skinTint
   * `manual` modunda baz alınabilir). Female/elderly/infant için hafif
   * varyasyon — tek model tasarımının görsel çeşitliliği sağlar.
   */
  skinHintRgb?: [number, number, number];
}

interface PatientFields {
  age: number;
  sex?: string;
  /** Senaryo medical_history içinde gebelik flag (preeklampsi). */
  medical_history?: { gebelik?: boolean } | null | undefined;
}

/**
 * Yaş ay/yıl bilgisini PatientCategory'ye çevirir.
 * age: 0 → bebek (history'de ay belirtilir, default 8 ay)
 * age: 1-2 → toddler
 * age: 3-11 → pediatric
 * age: 12-17 → adolescent
 * age: 18-64 → adult
 * age: 65+ → elderly
 */
export function categorizeByAge(age: number): PatientCategory {
  if (age < 1) return "infant";
  if (age < 3) return "toddler";
  if (age < 12) return "pediatric";
  if (age < 18) return "adolescent";
  if (age < 65) return "adult";
  return "elderly";
}

/**
 * PatientCategory'ye uygun model scale çarpanı.
 * Rocketbox erişkin modeli (~1.80m) baz alır:
 *   infant 50cm → 0.28
 *   toddler 85cm → 0.47
 *   pediatric 135cm (ortalama) → 0.75
 *   adolescent 165cm → 0.92
 *   adult 180cm → 1.0
 *   elderly 175cm → 0.97 (hafif kifoz/küçülme proxy)
 */
export function categoryToScale(category: PatientCategory): number {
  switch (category) {
    case "infant":     return 0.28;
    case "toddler":    return 0.47;
    case "pediatric":  return 0.75;
    case "adolescent": return 0.92;
    case "adult":      return 1.00;
    case "elderly":    return 0.97;
  }
}

/**
 * TR cinsiyet etiketi.
 */
export function sexLabel(sex: PatientSex): string {
  return sex === "F" ? "Kadın" : "Erkek";
}

/**
 * PALS yaş grubu TR etiketi.
 */
export function categoryLabel(category: PatientCategory): string {
  switch (category) {
    case "infant":     return "Bebek";
    case "toddler":    return "Küçük Çocuk";
    case "pediatric":  return "Çocuk";
    case "adolescent": return "Adolesan";
    case "adult":      return "Erişkin";
    case "elderly":    return "Yaşlı";
  }
}

/**
 * Profil display label: "62 Yaş Kadın" / "8 aylık Erkek Bebek" / "Yaşlı Erkek (72)".
 * age=0 → "Bebek" + sex (history'de ay yapısı varsa upstream'de detaylandırılır).
 */
function formatDisplayLabel(age: number, sex: PatientSex, category: PatientCategory): string {
  const sexLbl = sexLabel(sex);
  if (category === "infant") {
    return `${sexLbl} Bebek`;
  }
  if (category === "toddler") {
    return `${age} yaş ${sexLbl} (Küçük Çocuk)`;
  }
  if (category === "pediatric") {
    return `${age} yaş ${sexLbl} (Çocuk)`;
  }
  if (category === "adolescent") {
    return `${age} yaş ${sexLbl} (Adolesan)`;
  }
  if (category === "elderly") {
    return `${age} yaş ${sexLbl} (Yaşlı)`;
  }
  return `${age} yaş ${sexLbl}`;
}

/**
 * Cinsiyete + kategoriye göre varsayılan cilt tonu TINT multiplier'ı.
 * AnatomicPatientModel SKIN_TINT_PRESETS.normal [1,1,1] üstüne çarpılır:
 * - 1.0 = no change (default erkek erişkin)
 * - >1 R: pembe/kızıl yanak (infant, female)
 * - <1 R+G+B: soluk (elderly)
 */
function defaultSkinRgb(category: PatientCategory, sex: PatientSex): [number, number, number] {
  if (category === "infant") return [1.04, 0.96, 0.92]; // pembemsi-kızıl bebek cildi
  if (category === "toddler" || category === "pediatric") return [1.03, 0.97, 0.94];
  if (category === "elderly") return [0.93, 0.92, 0.90]; // soluk-fildişi yaşlı
  if (sex === "F") return [1.03, 0.99, 0.97]; // kadın hafif pembe-açık
  return [1.00, 1.00, 1.00]; // erişkin erkek default (Rocketbox base)
}

/**
 * Senaryonun `patient` field'ından PatientProfile türetir.
 * Sex M (varsayılan) / F (Kadın). age: 0 → infant.
 */
export function deriveProfile(patient: PatientFields): PatientProfile {
  const age = Math.max(0, Math.floor(patient.age ?? 30));
  const sex: PatientSex = patient.sex === "F" ? "F" : "M";
  const category = categorizeByAge(age);
  const pregnant = patient.medical_history?.gebelik ?? false;
  return {
    category,
    sex,
    pregnant,
    scaleFactor: categoryToScale(category),
    displayLabel: formatDisplayLabel(age, sex, category) + (pregnant ? " · Gebe" : ""),
    skinHintRgb: defaultSkinRgb(category, sex),
  };
}
