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

  // ========================================================
  // SOLUNUM SİSTEMİ (5) — Hafta 2 eklendi
  // ========================================================
  salbutamol: {
    id: "salbutamol",
    name_tr: "Salbutamol",
    name_en: "Salbutamol",
    category: "diğer",
    default_dose: "2.5-5 mg nebülizasyonla",
  },
  ipratropium: {
    id: "ipratropium",
    name_tr: "İpratropium Bromür",
    name_en: "Ipratropium",
    category: "diğer",
    default_dose: "0.5 mg nebülizasyonla",
  },
  magnezyum_sulfat: {
    id: "magnezyum_sulfat",
    name_tr: "Magnezyum Sülfat",
    name_en: "Magnesium Sulfate",
    category: "diğer",
    default_dose: "2 g IV (20 dk infüzyon)",
  },
  deksametazon: {
    id: "deksametazon",
    name_tr: "Deksametazon",
    name_en: "Dexamethasone",
    category: "diğer",
    default_dose: "8-10 mg IV",
  },
  hidrokortizon: {
    id: "hidrokortizon",
    name_tr: "Hidrokortizon Sodyum Süksinat",
    name_en: "Hydrocortisone",
    category: "diğer",
    default_dose: "100 mg IV (adrenal yetm.) / 200 mg/gün (septik şok)",
  },

  // ========================================================
  // ANALJEZİK + SEDATİF (5) — Hafta 2 eklendi
  // ========================================================
  parasetamol: {
    id: "parasetamol",
    name_tr: "Parasetamol",
    name_en: "Paracetamol",
    category: "analjezik",
    default_dose: "1 g IV (15 dk infüzyon)",
  },
  tramadol: {
    id: "tramadol",
    name_tr: "Tramadol",
    name_en: "Tramadol",
    category: "analjezik",
    default_dose: "50-100 mg IV yavaş",
  },
  ketamin: {
    id: "ketamin",
    name_tr: "Ketamin",
    name_en: "Ketamine",
    category: "sedatif",
    default_dose: "1-2 mg/kg IV (indüksiyon)",
  },
  propofol: {
    id: "propofol",
    name_tr: "Propofol",
    name_en: "Propofol",
    category: "sedatif",
    default_dose: "1.5-2.5 mg/kg IV (indüksiyon)",
  },
  etomidate: {
    id: "etomidate",
    name_tr: "Etomidat",
    name_en: "Etomidate",
    category: "sedatif",
    default_dose: "0.3 mg/kg IV",
  },

  // ========================================================
  // METABOLİK (3) — Hafta 2 eklendi
  // ========================================================
  dekstroz_50: {
    id: "dekstroz_50",
    name_tr: "Dekstroz %50",
    name_en: "Dextrose 50%",
    category: "sıvı",
    default_dose: "25 g (50 mL) IV push",
  },
  bikarbonat: {
    id: "bikarbonat",
    name_tr: "Sodyum Bikarbonat %8.4",
    name_en: "Sodium Bicarbonate",
    category: "diğer",
    default_dose: "1 mEq/kg IV (sadece pH<6.9)",
  },
  kalsiyum_glukonat: {
    id: "kalsiyum_glukonat",
    name_tr: "Kalsiyum Glukonat %10",
    name_en: "Calcium Gluconate",
    category: "diğer",
    default_dose: "10 mL (1 g) IV yavaş",
  },

  // ========================================================
  // ANTİBİYOTİK (4) — Hafta 2 eklendi
  // ========================================================
  piperasilin_tazobaktam: {
    id: "piperasilin_tazobaktam",
    name_tr: "Piperasilin-Tazobaktam",
    name_en: "Piperacillin-Tazobactam",
    category: "antibiyotik",
    default_dose: "4.5 g IV (30 dk)",
  },
  vankomisin: {
    id: "vankomisin",
    name_tr: "Vankomisin",
    name_en: "Vancomycin",
    category: "antibiyotik",
    default_dose: "15-20 mg/kg IV (60 dk)",
  },
  meropenem: {
    id: "meropenem",
    name_tr: "Meropenem",
    name_en: "Meropenem",
    category: "antibiyotik",
    default_dose: "1 g IV (30 dk)",
  },
  siprofloksasin: {
    id: "siprofloksasin",
    name_tr: "Siprofloksasin",
    name_en: "Ciprofloxacin",
    category: "antibiyotik",
    default_dose: "400 mg IV (60 dk)",
  },

  // ========================================================
  // ANTİEMETİK + ANTİALERJİK (3) — Hafta 2 eklendi
  // ========================================================
  ondansetron: {
    id: "ondansetron",
    name_tr: "Ondansetron",
    name_en: "Ondansetron",
    category: "diğer",
    default_dose: "4-8 mg IV yavaş",
  },
  metoklopramid: {
    id: "metoklopramid",
    name_tr: "Metoklopramid",
    name_en: "Metoclopramide",
    category: "diğer",
    default_dose: "10 mg IV yavaş",
  },
  difenhidramin: {
    id: "difenhidramin",
    name_tr: "Difenhidramin",
    name_en: "Diphenhydramine",
    category: "diğer",
    default_dose: "25-50 mg IV/IM",
  },

  // ========================================================
  // ANTİBİYOTİK — Ek (Hafta 2+, Faz 2)
  // ========================================================
  sefepim: {
    id: "sefepim",
    name_tr: "Sefepim",
    name_en: "Cefepime",
    category: "antibiyotik",
    default_dose: "2 g IV (30 dk) her 8-12 saatte",
  },
  levofloksasin: {
    id: "levofloksasin",
    name_tr: "Levofloksasin",
    name_en: "Levofloxacin",
    category: "antibiyotik",
    default_dose: "500 mg IV günde 1 kez",
  },
  klindamisin: {
    id: "klindamisin",
    name_tr: "Klindamisin",
    name_en: "Clindamycin",
    category: "antibiyotik",
    default_dose: "600-900 mg IV her 8 saatte",
  },
  metronidazol: {
    id: "metronidazol",
    name_tr: "Metronidazol",
    name_en: "Metronidazole",
    category: "antibiyotik",
    default_dose: "500 mg IV her 8 saatte",
  },
  asiklovir: {
    id: "asiklovir",
    name_tr: "Asiklovir IV",
    name_en: "Aciclovir",
    category: "antiviral",
    default_dose: "10 mg/kg IV her 8 saatte (30-60 dk)",
  },
  oseltamivir: {
    id: "oseltamivir",
    name_tr: "Oseltamivir",
    name_en: "Oseltamivir",
    category: "antiviral",
    default_dose: "75 mg PO günde 2 kez (5 gün)",
  },
  seftazidim: {
    id: "seftazidim",
    name_tr: "Seftazidim",
    name_en: "Ceftazidime",
    category: "antibiyotik",
    default_dose: "2 g IV her 8 saatte",
  },

  // ========================================================
  // ENDOKRİN (Faz 2)
  // ========================================================
  glukagon: {
    id: "glukagon",
    name_tr: "Glukagon",
    name_en: "Glucagon",
    category: "endokrin",
    default_dose: "1 mg IM/SC/IV (hipoglisemi veya BB OD)",
  },
  oktreotid: {
    id: "oktreotid",
    name_tr: "Oktreotid",
    name_en: "Octreotide",
    category: "endokrin",
    default_dose: "50-100 mcg SC/IV (varisel kanama: 25-50 mcg/saat infüzyon)",
  },

  // ========================================================
  // ANTİKOAGÜLAN / ANTİTROMBOTİK — Ek (Faz 2)
  // ========================================================
  dalteparin: {
    id: "dalteparin",
    name_tr: "Dalteparin",
    name_en: "Dalteparin",
    category: "antikoagulan",
    default_dose: "100 IU/kg SC 2x/gün veya 200 IU/kg SC 1x/gün",
  },
  protamin: {
    id: "protamin",
    name_tr: "Protamin Sülfat",
    name_en: "Protamine Sulfate",
    category: "antidot",
    default_dose: "1 mg / 100 IU heparin IV yavaş (max 50 mg)",
  },
  tdp: {
    id: "tdp",
    name_tr: "Taze Donmuş Plazma (TDP)",
    name_en: "Fresh Frozen Plasma",
    category: "sıvı",
    default_dose: "10-15 mL/kg IV",
  },

  // ========================================================
  // ANTİEPİLEPTİK (Faz 2)
  // ========================================================
  levetirasetam: {
    id: "levetirasetam",
    name_tr: "Levetirasetam",
    name_en: "Levetiracetam",
    category: "antiepileptik",
    default_dose: "1000-3000 mg IV (15 dk infüzyon)",
  },
  valproat: {
    id: "valproat",
    name_tr: "Valproik Asit IV",
    name_en: "Valproate",
    category: "antiepileptik",
    default_dose: "25-40 mg/kg IV (5-10 dk, maks 3 g)",
  },
  fenitoin: {
    id: "fenitoin",
    name_tr: "Fenitoin",
    name_en: "Phenytoin",
    category: "antiepileptik",
    default_dose: "15-20 mg/kg IV (50 mg/dk'dan yavaş)",
  },

  // ========================================================
  // DİĞER KRİTİK (Faz 2)
  // ========================================================
  n_asetilsistein: {
    id: "n_asetilsistein",
    name_tr: "N-Asetilsistein",
    name_en: "N-Acetylcysteine",
    category: "antidot",
    default_dose: "150 mg/kg IV 15 dk + 50 mg/kg 4 saat + 100 mg/kg 16 saat",
  },

  // ========================================================
  // ANTİDOTLAR + DİĞER KRİTİK (4) — Hafta 2 eklendi
  // ========================================================
  naloksan: {
    id: "naloksan",
    name_tr: "Naloksan (Narkan)",
    name_en: "Naloxone",
    category: "diğer",
    default_dose: "0.4 mg IV, 2-3 dk tekrar",
  },
  flumazenil: {
    id: "flumazenil",
    name_tr: "Flumazenil",
    name_en: "Flumazenil",
    category: "diğer",
    default_dose: "0.2 mg IV, 1 dk tekrar (max 3 mg)",
  },
  mannitol: {
    id: "mannitol",
    name_tr: "Mannitol %20",
    name_en: "Mannitol",
    category: "diğer",
    default_dose: "0.5-1 g/kg IV (20 dk)",
  },
  tiamin: {
    id: "tiamin",
    name_tr: "Tiamin (B1 Vitamini)",
    name_en: "Thiamine",
    category: "diğer",
    default_dose: "100 mg IV/IM",
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
