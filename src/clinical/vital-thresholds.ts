// ============================================================
// PALS 2015 Yaş Spesifik Vital Alarm Threshold Util — Sprint B.3
// ============================================================
// Hasta yaşı (+ opsiyonel kilo) → normal/uyarı/kritik vital aralıkları.
// Skill: .claude/skills/vital-signs-hud/SKILL.md
// Master rapor: docs/MASTER-REPORT-v3.md Bölüm 9.C
// ============================================================

import type { PatientVitals } from "@/engine";

export type VitalStatus = "stable" | "warning" | "critical";

export type AgeGroup =
  | "neonate"      // <28 gün
  | "infant"       // 1-12 ay
  | "toddler"      // 1-2 y
  | "preschool"    // 3-5 y
  | "school"       // 6-11 y
  | "adolescent"   // 12-17 y
  | "adult"        // 18-65 y
  | "geriatric";   // >65 y

export interface VitalRange {
  /** Normal aralık alt sınırı. */
  normalMin: number;
  /** Normal aralık üst sınırı. */
  normalMax: number;
  /** Uyarı eşiği (bu sınır dışı = warning). */
  warningMin: number;
  warningMax: number;
  /** Kritik eşiği (bu sınır dışı = critical). */
  criticalMin: number;
  criticalMax: number;
}

export interface VitalThresholds {
  hr: VitalRange;
  rr: VitalRange;
  sbp: VitalRange;
  spo2: VitalRange;
  temp: VitalRange;
}

/** Yaş (yıl) → AgeGroup. */
export function getAgeGroup(ageYears: number, ageDays?: number): AgeGroup {
  if (ageYears === 0 && ageDays !== undefined && ageDays < 28) return "neonate";
  if (ageYears < 1) return "infant";
  if (ageYears < 3) return "toddler";
  if (ageYears < 6) return "preschool";
  if (ageYears < 12) return "school";
  if (ageYears < 18) return "adolescent";
  if (ageYears < 65) return "adult";
  return "geriatric";
}

/**
 * PALS 2015 yaş-spesifik vital aralıkları (kanonik, master rapor 9.C).
 * Range: [normalMin, normalMax] = uyanık HR / standart RR / SBP.
 * warning sınırları normal ± genişletilmiş, critical sınırları PALS hipotansiyon eşikleri.
 */
export function getThresholds(ageGroup: AgeGroup): VitalThresholds {
  // Yaş bazlı HR/RR/SBP (PALS 2015, uyanık)
  const table: Record<AgeGroup, Pick<VitalThresholds, "hr" | "rr" | "sbp">> = {
    neonate: {
      hr:  { normalMin: 100, normalMax: 205, warningMin: 90,  warningMax: 220, criticalMin: 80,  criticalMax: 250 },
      rr:  { normalMin: 30,  normalMax: 53,  warningMin: 25,  warningMax: 60,  criticalMin: 20,  criticalMax: 70 },
      sbp: { normalMin: 67,  normalMax: 84,  warningMin: 60,  warningMax: 90,  criticalMin: 50,  criticalMax: 100 },
    },
    infant: {
      hr:  { normalMin: 100, normalMax: 190, warningMin: 90,  warningMax: 210, criticalMin: 80,  criticalMax: 230 },
      rr:  { normalMin: 30,  normalMax: 53,  warningMin: 25,  warningMax: 60,  criticalMin: 20,  criticalMax: 70 },
      sbp: { normalMin: 72,  normalMax: 104, warningMin: 65,  warningMax: 115, criticalMin: 55,  criticalMax: 130 },
    },
    toddler: {
      hr:  { normalMin: 98,  normalMax: 140, warningMin: 85,  warningMax: 160, criticalMin: 70,  criticalMax: 180 },
      rr:  { normalMin: 22,  normalMax: 37,  warningMin: 18,  warningMax: 45,  criticalMin: 15,  criticalMax: 55 },
      sbp: { normalMin: 86,  normalMax: 106, warningMin: 75,  warningMax: 115, criticalMin: 65,  criticalMax: 130 },
    },
    preschool: {
      hr:  { normalMin: 80,  normalMax: 120, warningMin: 70,  warningMax: 140, criticalMin: 60,  criticalMax: 160 },
      rr:  { normalMin: 20,  normalMax: 28,  warningMin: 16,  warningMax: 35,  criticalMin: 12,  criticalMax: 45 },
      sbp: { normalMin: 89,  normalMax: 112, warningMin: 80,  warningMax: 120, criticalMin: 70,  criticalMax: 135 },
    },
    school: {
      hr:  { normalMin: 75,  normalMax: 118, warningMin: 65,  warningMax: 135, criticalMin: 55,  criticalMax: 155 },
      rr:  { normalMin: 18,  normalMax: 25,  warningMin: 14,  warningMax: 32,  criticalMin: 10,  criticalMax: 40 },
      sbp: { normalMin: 97,  normalMax: 115, warningMin: 85,  warningMax: 125, criticalMin: 75,  criticalMax: 140 },
    },
    adolescent: {
      hr:  { normalMin: 60,  normalMax: 100, warningMin: 50,  warningMax: 120, criticalMin: 40,  criticalMax: 140 },
      rr:  { normalMin: 12,  normalMax: 20,  warningMin: 10,  warningMax: 25,  criticalMin: 8,   criticalMax: 32 },
      sbp: { normalMin: 110, normalMax: 131, warningMin: 95,  warningMax: 145, criticalMin: 85,  criticalMax: 160 },
    },
    adult: {
      hr:  { normalMin: 60,  normalMax: 100, warningMin: 50,  warningMax: 120, criticalMin: 40,  criticalMax: 140 },
      rr:  { normalMin: 12,  normalMax: 20,  warningMin: 10,  warningMax: 25,  criticalMin: 8,   criticalMax: 32 },
      sbp: { normalMin: 90,  normalMax: 120, warningMin: 85,  warningMax: 160, criticalMin: 75,  criticalMax: 180 },
    },
    geriatric: {
      hr:  { normalMin: 60,  normalMax: 100, warningMin: 50,  warningMax: 110, criticalMin: 40,  criticalMax: 130 },
      rr:  { normalMin: 12,  normalMax: 20,  warningMin: 10,  warningMax: 24,  criticalMin: 8,   criticalMax: 30 },
      sbp: { normalMin: 110, normalMax: 130, warningMin: 95,  warningMax: 160, criticalMin: 85,  criticalMax: 180 },
    },
  };

  const ageRanges = table[ageGroup];

  return {
    ...ageRanges,
    // SpO2 ve sıcaklık yaş bağımsız (yenidoğan ilk gün düşük baseline hariç)
    spo2: {
      normalMin: 95, normalMax: 100,
      warningMin: 92, warningMax: 100,
      criticalMin: 88, criticalMax: 100,
    },
    temp: {
      normalMin: 36.0, normalMax: 38.0,
      warningMin: 35.5, warningMax: 38.5,
      criticalMin: 35.0, criticalMax: 39.5,
    },
  };
}

/** Tek bir vital değeri yaş-spesifik threshold ile karşılaştır. */
export function getVitalStatus(value: number, range: VitalRange): VitalStatus {
  if (value < range.criticalMin || value > range.criticalMax) return "critical";
  if (value < range.warningMin || value > range.warningMax) return "warning";
  if (value < range.normalMin || value > range.normalMax) return "warning";
  return "stable";
}

/** Tüm vital'leri bir kerede değerlendir. */
export function evaluateVitals(
  vitals: PatientVitals,
  ageYears: number,
): Record<"hr" | "rr" | "sbp" | "spo2" | "temp", VitalStatus> {
  const group = getAgeGroup(ageYears);
  const t = getThresholds(group);
  return {
    hr:   getVitalStatus(vitals.hr,           t.hr),
    rr:   getVitalStatus(vitals.rr,           t.rr),
    sbp:  getVitalStatus(vitals.bp_systolic,  t.sbp),
    spo2: getVitalStatus(vitals.spo2,         t.spo2),
    temp: getVitalStatus(vitals.temp,         t.temp),
  };
}

/** En kritik vital'i döndür (worst-case alarm için). */
export function worstVitalStatus(
  statuses: Record<string, VitalStatus>,
): VitalStatus {
  const values = Object.values(statuses);
  if (values.includes("critical")) return "critical";
  if (values.includes("warning")) return "warning";
  return "stable";
}

/** Yaş grubu TR etiketi. */
export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  neonate:    "Yenidoğan",
  infant:     "Bebek",
  toddler:    "Toddler",
  preschool:  "Okul öncesi",
  school:     "Okul çağı",
  adolescent: "Adolesan",
  adult:      "Erişkin",
  geriatric:  "Geriatrik",
};
