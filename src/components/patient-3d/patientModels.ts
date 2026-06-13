// ============================================================
// MediSim TR — Hasta model varyantları (CC0, MPFB2)
// ============================================================
// 4 varyant: female-adult / male-adult / child / elderly.
// Hepsi MPFB2 ile üretildi (CC0), 52 ARKit blendshape + Skin_Body materyal.
// Üretim: `blender-medical-modeling` skill. Atıf: LICENSE-3D.md.
//
// scale/yOffset: her varyant AYNI canonical world kutusuna oturur
// (ayak y=-0.243, baş y=0.778). Böylece breathing chest/abdomen merkezi
// (patientShader, WORLD koord) + regions.ts marker'ları + CameraRig
// TÜM varyantlarda DEĞİŞMEDEN geçerli kalır (boy farkı world'de eşitlenir,
// klinik landmark hizası korunur). Değerler GLB getBounds'tan hesaplandı.
// ============================================================

export type PatientVariant = "female-adult" | "male-adult" | "child" | "elderly";

export interface PatientModelDef {
  url: string;
  /** Wrapper group scale — varyant boyunu canonical world kutusuna çeker. */
  scale: number;
  /** Wrapper group Y offset (world). Tüm varyantlarda ayak y=-0.243. */
  yOffset: number;
}

export const PATIENT_MODELS: Record<PatientVariant, PatientModelDef> = {
  "female-adult": { url: "/3d/patient-female-adult.glb", scale: 0.6404, yOffset: -0.243 },
  "male-adult": { url: "/3d/patient-male-adult.glb", scale: 0.5397, yOffset: -0.243 },
  "child": { url: "/3d/patient-child.glb", scale: 0.8432, yOffset: -0.243 },
  "elderly": { url: "/3d/patient-elderly.glb", scale: 0.5786, yOffset: -0.243 },
};

export const DEFAULT_PATIENT_VARIANT: PatientVariant = "female-adult";

// ============================================================
// Etnik ten tonu presetleri (Skin_Body materyal baseColor).
// Cyanosis/pallor/jaundice tint'i (uSkinTint, çarpımsal) bunun ÜZERİNE biner →
// her ten tonunda klinik renk değişimi göreceli olarak doğru kalır.
// Değerler lineer-RGB yaklaşık (Principled baseColor). TR bağlamı default: akdeniz.
// ============================================================
export type SkinTone = "fair" | "mediterranean" | "tan" | "brown" | "dark";

export const SKIN_TONE_PRESETS: Record<SkinTone, [number, number, number]> = {
  fair: [0.92, 0.78, 0.70],
  mediterranean: [0.82, 0.62, 0.52],
  tan: [0.70, 0.50, 0.40],
  brown: [0.52, 0.36, 0.26],
  dark: [0.36, 0.24, 0.18],
};

export const DEFAULT_SKIN_TONE: SkinTone = "mediterranean";

/** Hasta verisinden ten tonunu türetir (scenario `skin_tone` alanı veya default). */
export function patientToSkinTone(p: { skin_tone?: string }): SkinTone {
  if (p.skin_tone && p.skin_tone in SKIN_TONE_PRESETS) {
    return p.skin_tone as SkinTone;
  }
  return DEFAULT_SKIN_TONE;
}

/**
 * Hasta verisinden (yaş + cinsiyet + opsiyonel avatar_id) model varyantını türetir.
 * - `avatar_id` doğrudan bir varyant key'i ise onu kullanır (senaryo override).
 * - yaş < 13 → child, yaş ≥ 65 → elderly, aksi halde cinsiyete göre erişkin.
 */
export function patientToVariant(p: {
  age?: number;
  sex?: "M" | "F";
  avatar_id?: string;
}): PatientVariant {
  if (p.avatar_id && p.avatar_id in PATIENT_MODELS) {
    return p.avatar_id as PatientVariant;
  }
  const age = p.age ?? 30;
  if (age < 13) return "child";
  if (age >= 65) return "elderly";
  return p.sex === "M" ? "male-adult" : "female-adult";
}
