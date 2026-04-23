import type { Medication } from "@/engine";

// ============================================================
// MediSim TR — İlaç Kataloğu (Temel Kimlik)
// ============================================================
// Bu dosya ilaçların UI'da görünecek kimlik bilgilerini tutar.
// Farmakoloji motoru verileri (preset, doz band, modifier, kontrendikasyon)
// için: src/data/medications-extended.ts
// ============================================================
//
// FAZ 1 İÇERİĞİ:
// - Kardiyovasküler (30 ilaç) — Hafta 1 ✅
// - Solunum, analjezik, metabolik, antibiyotik, diğer (30 ilaç) — Hafta 2
//
// ============================================================

export const MEDICATIONS: Record<string, Medication> = {
  // ========================================================
  // ANTİAGREGAN (4)
  // ========================================================
  aspirin: {
    id: "aspirin",
    name_tr: "Asetilsalisilik Asit (Aspirin)",
    name_en: "Aspirin",
    category: "kardiyak",
    default_dose: "300 mg PO çiğnetilerek",
  },
  klopidogrel: {
    id: "klopidogrel",
    name_tr: "Klopidogrel",
    name_en: "Clopidogrel",
    category: "kardiyak",
    default_dose: "600 mg yükleme PO",
  },
  tikagrelor: {
    id: "tikagrelor",
    name_tr: "Tikagrelor",
    name_en: "Ticagrelor",
    category: "kardiyak",
    default_dose: "180 mg yükleme PO",
  },
  prasugrel: {
    id: "prasugrel",
    name_tr: "Prasugrel",
    name_en: "Prasugrel",
    category: "kardiyak",
    default_dose: "60 mg yükleme PO",
  },

  // ========================================================
  // ANTİKOAGÜLAN (4)
  // ========================================================
  heparin: {
    id: "heparin",
    name_tr: "Heparin (Fraksiyone Olmayan)",
    name_en: "Unfractionated Heparin",
    category: "antikoagulan",
    default_dose: "60 IU/kg IV bolus (max 4000 IU)",
  },
  enoksaparin: {
    id: "enoksaparin",
    name_tr: "Enoksaparin",
    name_en: "Enoxaparin",
    category: "antikoagulan",
    default_dose: "1 mg/kg SC (2x/gün) veya 30 mg IV bolus + 1 mg/kg SC",
  },
  fondaparinuks: {
    id: "fondaparinuks",
    name_tr: "Fondaparinuks",
    name_en: "Fondaparinux",
    category: "antikoagulan",
    default_dose: "2.5 mg SC/IV günde tek doz",
  },
  bivalirudin: {
    id: "bivalirudin",
    name_tr: "Bivalirudin",
    name_en: "Bivalirudin",
    category: "antikoagulan",
    default_dose: "0.75 mg/kg IV bolus + 1.75 mg/kg/saat infüzyon",
  },

  // ========================================================
  // TROMBOLİTİK (2)
  // ========================================================
  tenecteplase: {
    id: "tenecteplase",
    name_tr: "Tenekteplaz",
    name_en: "Tenecteplase",
    category: "kardiyak",
    default_dose: "Kiloya göre IV bolus (30-50 mg)",
  },
  alteplase: {
    id: "alteplase",
    name_tr: "Alteplaz",
    name_en: "Alteplase",
    category: "kardiyak",
    default_dose: "15 mg IV bolus + 0.75 mg/kg + 0.5 mg/kg infüzyon",
  },

  // ========================================================
  // NİTRATLAR / VAZODİLATÖR (3)
  // ========================================================
  nitrogliserin: {
    id: "nitrogliserin",
    name_tr: "Nitrogliserin (Sublingual)",
    name_en: "Nitroglycerin (SL)",
    category: "kardiyak",
    default_dose: "0.4 mg SL, 5 dk aralıkla x3",
  },
  nitrogliserin_iv: {
    id: "nitrogliserin_iv",
    name_tr: "Nitrogliserin (IV infüzyon)",
    name_en: "Nitroglycerin (IV)",
    category: "kardiyak",
    default_dose: "5-10 mcg/dk başla, titre et",
  },
  sodyum_nitroprussid: {
    id: "sodyum_nitroprussid",
    name_tr: "Sodyum Nitroprussid",
    name_en: "Sodium Nitroprusside",
    category: "kardiyak",
    default_dose: "0.3-0.5 mcg/kg/dk IV infüzyon",
  },

  // ========================================================
  // BETA-BLOKER (3)
  // ========================================================
  metoprolol: {
    id: "metoprolol",
    name_tr: "Metoprolol",
    name_en: "Metoprolol",
    category: "kardiyak",
    default_dose: "5 mg IV yavaş (5 dk aralıkla x3'e kadar)",
  },
  esmolol: {
    id: "esmolol",
    name_tr: "Esmolol",
    name_en: "Esmolol",
    category: "kardiyak",
    default_dose: "500 mcg/kg IV bolus + 50 mcg/kg/dk infüzyon",
  },
  labetalol: {
    id: "labetalol",
    name_tr: "Labetalol",
    name_en: "Labetalol",
    category: "kardiyak",
    default_dose: "10-20 mg IV (10 dk aralıkla)",
  },

  // ========================================================
  // KALSİYUM KANAL BLOKERİ (2)
  // ========================================================
  diltiazem: {
    id: "diltiazem",
    name_tr: "Diltiazem",
    name_en: "Diltiazem",
    category: "kardiyak",
    default_dose: "0.25 mg/kg IV bolus (2 dk'da)",
  },
  verapamil: {
    id: "verapamil",
    name_tr: "Verapamil",
    name_en: "Verapamil",
    category: "kardiyak",
    default_dose: "2.5-5 mg IV yavaş",
  },

  // ========================================================
  // ANTİARİTMİK (4)
  // ========================================================
  amiodaron: {
    id: "amiodaron",
    name_tr: "Amiodaron",
    name_en: "Amiodarone",
    category: "antiaritmik",
    default_dose: "300 mg IV bolus (VF/VT) veya 150 mg (stabil VT)",
  },
  lidokain: {
    id: "lidokain",
    name_tr: "Lidokain",
    name_en: "Lidocaine",
    category: "antiaritmik",
    default_dose: "1-1.5 mg/kg IV bolus",
  },
  adenozin: {
    id: "adenozin",
    name_tr: "Adenozin",
    name_en: "Adenosine",
    category: "antiaritmik",
    default_dose: "6 mg IV hızlı push (→ 12 mg → 12 mg)",
  },
  atropin: {
    id: "atropin",
    name_tr: "Atropin",
    name_en: "Atropine",
    category: "kardiyak",
    default_dose: "0.5 mg IV, 3-5 dk aralıkla (max 3 mg)",
  },

  // ========================================================
  // VAZOPRESÖR / İNOTROP (4)
  // ========================================================
  adrenalin: {
    id: "adrenalin",
    name_tr: "Adrenalin (Epinefrin)",
    name_en: "Epinephrine",
    category: "kardiyak",
    default_dose: "1 mg IV push (arrest) / 0.3-0.5 mg IM (anafilaksi)",
  },
  noradrenalin: {
    id: "noradrenalin",
    name_tr: "Noradrenalin (Norepinefrin)",
    name_en: "Norepinephrine",
    category: "kardiyak",
    default_dose: "0.05-0.1 mcg/kg/dk IV infüzyon, titre et",
  },
  dopamin: {
    id: "dopamin",
    name_tr: "Dopamin",
    name_en: "Dopamine",
    category: "kardiyak",
    default_dose: "5-20 mcg/kg/dk IV infüzyon",
  },
  dobutamin: {
    id: "dobutamin",
    name_tr: "Dobutamin",
    name_en: "Dobutamine",
    category: "kardiyak",
    default_dose: "2.5-10 mcg/kg/dk IV infüzyon",
  },

  // ========================================================
  // DİÜRETİK / AKUT KALP YETMEZLİĞİ (2)
  // ========================================================
  furosemid: {
    id: "furosemid",
    name_tr: "Furosemid",
    name_en: "Furosemide",
    category: "kardiyak",
    default_dose: "20-40 mg IV (naif) / ev dozunun 2 katı IV",
  },
  digoksin: {
    id: "digoksin",
    name_tr: "Digoksin",
    name_en: "Digoxin",
    category: "kardiyak",
    default_dose: "0.25 mg IV (yükleme 0.5 mg/24 saat)",
  },

  // ========================================================
  // HT KRİZİ (1)
  // ========================================================
  nikardipin: {
    id: "nikardipin",
    name_tr: "Nikardipin",
    name_en: "Nicardipine",
    category: "kardiyak",
    default_dose: "5 mg/saat IV infüzyon, titre et (max 15 mg/saat)",
  },

  // ========================================================
  // ANALJEZİK (göğüs ağrısı) — 1 tane
  // ========================================================
  morfin: {
    id: "morfin",
    name_tr: "Morfin Sülfat",
    name_en: "Morphine",
    category: "analjezik",
    default_dose: "2-4 mg IV",
    contraindications: ["hipotansiyon", "solunum depresyonu", "KOAH"],
  },

  // ========================================================
  // KARDİYOVASKÜLER-DIŞI (Hafta 2'de motor verileri eklenecek,
  // şimdilik temel kimlik korunuyor — mevcut senaryolar bunları kullanıyor)
  // ========================================================
  fentanil: {
    id: "fentanil",
    name_tr: "Fentanil",
    category: "analjezik",
    default_dose: "50-100 mcg IV",
  },
  midazolam: {
    id: "midazolam",
    name_tr: "Midazolam",
    category: "sedatif",
    default_dose: "1-2 mg IV",
  },
  seftriakson: {
    id: "seftriakson",
    name_tr: "Seftriakson",
    category: "antibiyotik",
    default_dose: "2 g IV",
  },
  prednisolon: {
    id: "prednisolon",
    name_tr: "Metilprednizolon",
    category: "diğer",
    default_dose: "125 mg IV",
  },
  feniramin: {
    id: "feniramin",
    name_tr: "Feniramin Maleat (Avil)",
    category: "diğer",
    default_dose: "45.5 mg IV yavaş",
  },
  salin_09: {
    id: "salin_09",
    name_tr: "%0.9 NaCl (İzotonik)",
    category: "sıvı",
    default_dose: "500-1000 mL IV hızlı",
  },
  ringer_laktat: {
    id: "ringer_laktat",
    name_tr: "Ringer Laktat",
    category: "sıvı",
    default_dose: "1000 mL IV",
  },
  insulin_regular: {
    id: "insulin_regular",
    name_tr: "Regüler İnsülin (Kristalize)",
    category: "diğer",
    default_dose: "0.1 U/kg/saat IV infüzyon",
  },
  kcl: {
    id: "kcl",
    name_tr: "Potasyum Klorür (KCl)",
    category: "diğer",
    default_dose: "10-20 mEq/saat IV",
  },
};

export function getMedication(id: string): Medication | undefined {
  return MEDICATIONS[id];
}

export function listMedicationsByCategory(
  category: Medication["category"]
): Medication[] {
  return Object.values(MEDICATIONS).filter((m) => m.category === category);
}
