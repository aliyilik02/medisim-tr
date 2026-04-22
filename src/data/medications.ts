import type { Medication } from "@/engine";

export const MEDICATIONS: Record<string, Medication> = {
  // Kardiyak
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
    category: "kardiyak",
    default_dose: "600 mg yükleme PO",
  },
  heparin: {
    id: "heparin",
    name_tr: "Heparin (Fraksiyone Olmayan)",
    category: "antikoagulan",
    default_dose: "60 U/kg bolus IV",
  },
  nitrogliserin: {
    id: "nitrogliserin",
    name_tr: "Nitrogliserin (Sublingual)",
    category: "kardiyak",
    default_dose: "0.4 mg SL, 5 dk aralıkla x3",
  },
  metoprolol: {
    id: "metoprolol",
    name_tr: "Metoprolol",
    category: "kardiyak",
    default_dose: "5 mg IV yavaş",
  },
  adrenalin: {
    id: "adrenalin",
    name_tr: "Adrenalin (Epinefrin)",
    category: "kardiyak",
    default_dose: "1 mg IV (kardiyak arrest), 0.3-0.5 mg IM (anafilaksi)",
  },
  amiodaron: {
    id: "amiodaron",
    name_tr: "Amiodaron",
    category: "antiaritmik",
    default_dose: "300 mg IV bolus",
  },
  atropin: {
    id: "atropin",
    name_tr: "Atropin",
    category: "kardiyak",
    default_dose: "0.5 mg IV, 3-5 dk aralıkla",
  },

  // Analjezik / Sedatif
  morfin: {
    id: "morfin",
    name_tr: "Morfin Sülfat",
    category: "analjezik",
    default_dose: "2-4 mg IV",
    contraindications: ["hipotansiyon", "solunum depresyonu"],
  },
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

  // Antibiyotik / Acil
  seftriakson: {
    id: "seftriakson",
    name_tr: "Seftriakson",
    category: "antibiyotik",
    default_dose: "2 g IV",
  },

  // Anafilaksi
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

  // Sıvı
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

  // Metabolik
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

  // Tenecteplase (tromboliz)
  tenecteplase: {
    id: "tenecteplase",
    name_tr: "Tenekteplaz",
    category: "kardiyak",
    default_dose: "Kiloya göre IV bolus",
  },
};

export function getMedication(id: string): Medication | undefined {
  return MEDICATIONS[id];
}
