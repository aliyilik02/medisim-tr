// ============================================================
// MediSim TR — Farmakoloji Preset Kütüphanesi
// ============================================================
// Tıkla-doldur ilaç etki şablonları.
// Senaryo yazarı ilaç tanımlarken preset seçer, motor otomatik uygular.
// Her preset: vital değişim aralıkları + farmakokinetik zamanlama.
//
// Değerler klinik literatür ortalamalarıdır (referanslar README'de):
// - Katzung Basic & Clinical Pharmacology, 15. baskı
// - UpToDate ilaç monografları (2024-2025 güncellemeleri)
// - ESC 2023, AHA/ACC 2022 kılavuzları
//
// Override mekanizması: Bir ilaç preset'i seçip üzerine vitals/timing
// override edebilir (src/data/medications.ts içinde).
// ============================================================

import type { PharmacologyPreset } from "./types";

// ------------------------------------------------------------
// Preset kayıtları
// ------------------------------------------------------------

export const PHARMACOLOGY_PRESETS: Record<string, PharmacologyPreset> = {
  // ----- KARDİYOVASKÜLER -----

  "sempatomimetik-guclu": {
    id: "sempatomimetik-guclu",
    label: "Sempatomimetik — güçlü (adrenalin tipi)",
    description:
      "Alfa+beta agonisti, güçlü vazokonstriksiyon + inotropi. Anafilaksi, kardiyak arrest, şok.",
    hr_range: [20, 40],
    sbp_range: [30, 50],
    dbp_range: [15, 30],
    spo2_range: [0, 2],
    rr_range: [2, 4],
    onset_sec: 30,
    peak_min: 2,
    duration_min: 8,
  },

  "sempatomimetik-orta": {
    id: "sempatomimetik-orta",
    label: "Sempatomimetik — orta (dopamin, dobutamin)",
    description:
      "Seçici beta-1 baskın, inotropi > vazokonstriksiyon. Kardiyak şok.",
    hr_range: [10, 25],
    sbp_range: [15, 30],
    dbp_range: [5, 15],
    onset_sec: 60,
    peak_min: 5,
    duration_min: 15,
  },

  "vazopresor-saf": {
    id: "vazopresor-saf",
    label: "Vazopresör — saf alfa (noradrenalin, fenilefrin)",
    description: "Vazokonstriksiyon baskın, HR değişimi minimal/reflex düşüş.",
    hr_range: [-10, 5],
    sbp_range: [25, 45],
    dbp_range: [15, 30],
    onset_sec: 30,
    peak_min: 2,
    duration_min: 10,
  },

  "beta-bloker": {
    id: "beta-bloker",
    label: "Beta-bloker (metoprolol, esmolol)",
    description:
      "HR ve SBP düşürür. Taşiaritmi, STEMI sonrası, HT. Bronkospazm riski.",
    hr_range: [-25, -10],
    sbp_range: [-20, -10],
    dbp_range: [-10, -5],
    onset_sec: 60,
    peak_min: 5,
    duration_min: 20,
  },

  "kalsiyum-kanal-bloker": {
    id: "kalsiyum-kanal-bloker",
    label: "Ca kanal blokeri — nondihidropiridin (diltiazem, verapamil)",
    description: "AV nod baskılar, HR ve SBP düşürür. Atriyal fibrilasyon.",
    hr_range: [-20, -10],
    sbp_range: [-15, -8],
    dbp_range: [-8, -4],
    onset_sec: 120,
    peak_min: 7,
    duration_min: 25,
  },

  "vazodilator-nitrat": {
    id: "vazodilator-nitrat",
    label: "Vazodilatör — nitrat (nitrogliserin, isosorbid)",
    description:
      "Venöz vazodilatasyon baskın, preload düşer. Göğüs ağrısı, akut kalp yetmezliği.",
    hr_range: [5, 15],
    sbp_range: [-25, -10],
    dbp_range: [-15, -8],
    pain_range: [-3, -1],
    onset_sec: 60,
    peak_min: 3,
    duration_min: 10,
  },

  "antiaritmik-amiodaron": {
    id: "antiaritmik-amiodaron",
    label: "Antiaritmik — klass III (amiodaron)",
    description:
      "Geniş spektrum antiaritmik. VT/VF, AF konversiyon. Yavaş etki.",
    hr_range: [-15, -5],
    sbp_range: [-10, 0],
    onset_sec: 300,
    peak_min: 15,
    duration_min: 40,
  },

  "antiaritmik-adenozin": {
    id: "antiaritmik-adenozin",
    label: "Antiaritmik — adenozin",
    description:
      "AV nod bloğu ile SVT terminasyonu. Etkisi çok kısa (saniyeler).",
    hr_range: [-80, -40], // Geçici asistoli — dikkat: sadece birkaç saniye
    sbp_range: [-5, 5],
    onset_sec: 10,
    peak_min: 0.3, // ~20 saniye
    duration_min: 1,
  },

  // ----- SOLUNUM -----

  "bronkodilator": {
    id: "bronkodilator",
    label: "Bronkodilatör — beta-2 agonist (salbutamol)",
    description:
      "Bronşları açar, SpO2 artar. Astım, KOAH atak. Taşikardi yapar.",
    hr_range: [10, 25],
    sbp_range: [0, 10],
    spo2_range: [3, 8],
    rr_range: [-4, -2],
    onset_sec: 120,
    peak_min: 10,
    duration_min: 30,
  },

  "kortikosteroid-sistemik": {
    id: "kortikosteroid-sistemik",
    label: "Kortikosteroid — sistemik (metilprednizolon, deksametazon)",
    description:
      "Anti-inflamatuar. Astım, anafilaksi, sepsis. Etki yavaş (saatler).",
    // Akut vital etkisi yok; klinik fayda geç gelir. Motor bunu simüle eder:
    spo2_range: [0, 2], // Uzun sürede hafif iyileşme
    rr_range: [-1, 0],
    onset_sec: 900, // 15 dk
    peak_min: 60,
    duration_min: 360,
  },

  // ----- ANALJEZİK / SEDATİF -----

  "opioid-guclu": {
    id: "opioid-guclu",
    label: "Opioid — güçlü (morfin, fentanil)",
    description:
      "Güçlü analjezi, solunum depresyonu riski. KOAH/astımda dikkat.",
    hr_range: [-5, 5],
    sbp_range: [-15, -5],
    rr_range: [-5, -2],
    spo2_range: [-3, -1],
    pain_range: [-5, -3],
    onset_sec: 60,
    peak_min: 5,
    duration_min: 30,
  },

  "opioid-orta": {
    id: "opioid-orta",
    label: "Opioid — orta (tramadol, meperidin)",
    description: "Orta düzey analjezi, solunum riski daha düşük.",
    hr_range: [0, 8],
    sbp_range: [-8, 0],
    rr_range: [-2, 0],
    pain_range: [-3, -1],
    onset_sec: 120,
    peak_min: 20,
    duration_min: 60,
  },

  "benzodiazepin": {
    id: "benzodiazepin",
    label: "Benzodiazepin (midazolam, diazepam)",
    description: "Sedatif, anksiyolitik, antikonvülzan. Solunum depresyonu.",
    hr_range: [-5, 5],
    sbp_range: [-10, -3],
    rr_range: [-3, -1],
    spo2_range: [-2, 0],
    gcs_range: [-4, -2],
    onset_sec: 60,
    peak_min: 3,
    duration_min: 20,
  },

  "nsaid-parenteral": {
    id: "nsaid-parenteral",
    label: "NSAID — parenteral (ketorolak, deksketoprofen)",
    description: "Non-opioid analjezi. Renal, GİS, kanama riski.",
    pain_range: [-3, -2],
    onset_sec: 300,
    peak_min: 30,
    duration_min: 240,
  },

  // ----- METABOLİK / ENDOKRİN -----

  "insulin-kisa": {
    id: "insulin-kisa",
    label: "İnsülin — kısa etkili (reguler, glulisine)",
    description:
      "Kan glukozu düşürür. DKA, hiperglisemi. Hipoglisemi riski.",
    glucose_range: [-80, -40],
    onset_sec: 900, // 15 dk (IV için daha hızlı, motor override)
    peak_min: 60,
    duration_min: 240,
  },

  "dekstroz-hipertonik": {
    id: "dekstroz-hipertonik",
    label: "Dekstroz %50 (hipoglisemi tedavisi)",
    description: "Hızlı glukoz yükseltir. Hipoglisemi acil tedavisi.",
    glucose_range: [60, 120],
    gcs_range: [3, 6], // Hipoglisemiye bağlı bilinç bulanıklığı düzelir
    onset_sec: 60,
    peak_min: 3,
    duration_min: 30,
  },

  // ----- ANTİKOAGÜLAN / ANTİAGREGAN -----
  // NOT: Bu grup anlık vital etki yapmaz; asıl fayda outcome bazlıdır
  // (STEMI'de re-perfüzyon hızı vb.). Senaryo motor sonucunu
  // `vitals_change` yerine `unlocks` üzerinden değerlendirir.

  "antikoagulan-parenteral": {
    id: "antikoagulan-parenteral",
    label: "Antikoagülan — parenteral (heparin, enoksaparin)",
    description:
      "Akut vital etki yok; re-perfüzyon ve emboli profilaksisi. Kanama riski.",
    onset_sec: 300,
    peak_min: 30,
    duration_min: 360,
  },

  "antiagregan": {
    id: "antiagregan",
    label: "Antiagregan (ASA, klopidogrel, tikagrelor)",
    description: "Akut vital etki yok; PCI ve sekonder koruma.",
    onset_sec: 600,
    peak_min: 60,
    duration_min: 1440,
  },

  // ----- SIVI / ELEKTROLİT -----

  "sivi-kristaloid-bolus": {
    id: "sivi-kristaloid-bolus",
    label: "Kristaloid bolus (SF, Ringer Laktat)",
    description: "Hipovolemi/sepsiste volüm replasmanı. SBP artar.",
    hr_range: [-10, -5],
    sbp_range: [10, 20],
    dbp_range: [5, 12],
    onset_sec: 180,
    peak_min: 8,
    duration_min: 45,
  },

  // ----- ANTİDOT -----

  "naloksan": {
    id: "naloksan",
    label: "Naloksan (opioid antidotu)",
    description: "Opioid zehirlenmesi / depresyonunu hızla geri çevirir.",
    rr_range: [4, 8], // Solunum baskılanması hızla düzelir
    spo2_range: [4, 8],
    gcs_range: [3, 6],
    onset_sec: 30,
    peak_min: 2,
    duration_min: 20, // Etkisi opioidden kısa — tekrar gerekebilir
  },

  "flumazenil": {
    id: "flumazenil",
    label: "Flumazenil (benzodiazepin antidotu)",
    description: "Benzodiazepin aşırı dozunu geri çevirir. Nöbet riski.",
    rr_range: [2, 5],
    spo2_range: [2, 5],
    gcs_range: [2, 5],
    onset_sec: 30,
    peak_min: 3,
    duration_min: 30,
  },
};

// ------------------------------------------------------------
// Yardımcı fonksiyon — preset'i güvenli biçimde al
// ------------------------------------------------------------

export function getPreset(
  presetId: string
): PharmacologyPreset | undefined {
  return PHARMACOLOGY_PRESETS[presetId];
}

export function listPresets(): PharmacologyPreset[] {
  return Object.values(PHARMACOLOGY_PRESETS);
}

// Senaryo editörü için grup bazlı liste
export const PRESET_GROUPS = {
  kardiyovaskuler: [
    "sempatomimetik-guclu",
    "sempatomimetik-orta",
    "vazopresor-saf",
    "beta-bloker",
    "kalsiyum-kanal-bloker",
    "vazodilator-nitrat",
    "antiaritmik-amiodaron",
    "antiaritmik-adenozin",
  ],
  solunum: ["bronkodilator", "kortikosteroid-sistemik"],
  analjezik_sedatif: [
    "opioid-guclu",
    "opioid-orta",
    "benzodiazepin",
    "nsaid-parenteral",
  ],
  metabolik: ["insulin-kisa", "dekstroz-hipertonik"],
  hemostaz: ["antikoagulan-parenteral", "antiagregan"],
  sivi: ["sivi-kristaloid-bolus"],
  antidot: ["naloksan", "flumazenil"],
} as const;
