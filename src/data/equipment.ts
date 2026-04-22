import type { Equipment } from "@/engine";

export const EQUIPMENT: Record<string, Equipment> = {
  // Monitorizasyon
  ekg_12: {
    id: "ekg_12",
    name_tr: "12 Derivasyonlu EKG",
    category: "monitorizasyon",
  },
  pulse_oksimetre: {
    id: "pulse_oksimetre",
    name_tr: "Pulse Oksimetre",
    category: "monitorizasyon",
  },
  tansiyon_aleti: {
    id: "tansiyon_aleti",
    name_tr: "Tansiyon Aleti (Manuel)",
    category: "monitorizasyon",
  },
  monitor: {
    id: "monitor",
    name_tr: "Hasta Monitörü",
    category: "monitorizasyon",
  },
  glukometre: {
    id: "glukometre",
    name_tr: "Glukometre",
    category: "monitorizasyon",
  },
  kapnograf: {
    id: "kapnograf",
    name_tr: "Kapnograf (EtCO₂)",
    category: "monitorizasyon",
  },

  // Havayolu
  oksijen_maske: {
    id: "oksijen_maske",
    name_tr: "Rezervuarlı Oksijen Maskesi",
    category: "havayolu",
  },
  ambu: {
    id: "ambu",
    name_tr: "Balon-Valf-Maske (Ambu)",
    category: "havayolu",
  },
  entubasyon_seti: {
    id: "entubasyon_seti",
    name_tr: "Entübasyon Seti",
    category: "havayolu",
  },
  laringoskop: {
    id: "laringoskop",
    name_tr: "Laringoskop",
    category: "havayolu",
  },
  et_tup: {
    id: "et_tup",
    name_tr: "Endotrakeal Tüp",
    category: "havayolu",
  },
  lma: {
    id: "lma",
    name_tr: "Laringeal Maske (LMA)",
    category: "havayolu",
  },

  // Damar yolu
  iv_kateter_18g: {
    id: "iv_kateter_18g",
    name_tr: "18G IV Kateter",
    category: "damar_yolu",
  },
  iv_kateter_20g: {
    id: "iv_kateter_20g",
    name_tr: "20G IV Kateter",
    category: "damar_yolu",
  },
  santral_kateter: {
    id: "santral_kateter",
    name_tr: "Santral Venöz Kateter Seti",
    category: "damar_yolu",
  },
  io_seti: {
    id: "io_seti",
    name_tr: "İntraosseöz (IO) Yerleştirme Seti",
    category: "damar_yolu",
  },

  // Defibrilasyon
  defibrilator: {
    id: "defibrilator",
    name_tr: "Defibrilatör",
    category: "defibrilasyon",
  },
  aed: {
    id: "aed",
    name_tr: "Otomatik Eksternal Defibrilatör (AED)",
    category: "defibrilasyon",
  },

  // TCCC / Askeri
  turnike: {
    id: "turnike",
    name_tr: "Taktik Turnike (CAT)",
    category: "cerrahi",
  },
  combat_gauze: {
    id: "combat_gauze",
    name_tr: "Hemostatik Gazlı Bez (Combat Gauze)",
    category: "cerrahi",
  },
  iglu_tip_toraks: {
    id: "iglu_tip_toraks",
    name_tr: "İğne Torakostomi Seti (14G)",
    category: "cerrahi",
  },
  nazofaringeal: {
    id: "nazofaringeal",
    name_tr: "Nazofaringeal Havayolu",
    category: "havayolu",
  },

  // Koruyucu
  eldiven: {
    id: "eldiven",
    name_tr: "Steril Eldiven",
    category: "koruyucu",
  },
  onluk: {
    id: "onluk",
    name_tr: "Koruyucu Önlük",
    category: "koruyucu",
  },
  gozluk: {
    id: "gozluk",
    name_tr: "Koruyucu Gözlük",
    category: "koruyucu",
  },

  // Diğer
  stetoskop: {
    id: "stetoskop",
    name_tr: "Stetoskop",
    category: "monitorizasyon",
  },
  otoskop: {
    id: "otoskop",
    name_tr: "Otoskop",
    category: "monitorizasyon",
  },
  oftalmoskop: {
    id: "oftalmoskop",
    name_tr: "Oftalmoskop",
    category: "monitorizasyon",
  },
  ultrason: {
    id: "ultrason",
    name_tr: "Hasta Başı Ultrason (POCUS)",
    category: "monitorizasyon",
  },
  foley_sonda: {
    id: "foley_sonda",
    name_tr: "Foley Sonda",
    category: "diğer",
  },
  ng_sonda: {
    id: "ng_sonda",
    name_tr: "Nazogastrik Sonda",
    category: "diğer",
  },
};

export function getEquipment(id: string): Equipment | undefined {
  return EQUIPMENT[id];
}
