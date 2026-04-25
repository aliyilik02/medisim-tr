// v2 (2026-04-25) — Katalog genişletme:
// + 10 laboratuvar item (TKS, CRP, troponin, BNP, BHB vb.)
// + 4 görüntüleme item (PA grafi, kraniyal BT, toraks CTA, EKO)
// + 2 havayolu (nazal kanül, HFNC)
// + 2 damar yolu (22G, 24G)
// + 2 cerrahi (torasentez, pediatrik LP)
// Toplam: 51 → 71. Yeni kategoriler: laboratuvar, goruntuleme.
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

  // ========================================================
  // HAFTA 2 — YENİ EKİPMAN (20)
  // ========================================================

  // --- Havayolu (ek) ---
  nazal_kanul: {
    id: "nazal_kanul",
    name_tr: "Nazal Kanül (1-6 L/dk)",
    category: "havayolu",
  },
  hfnc: {
    id: "hfnc",
    name_tr: "Yüksek Akımlı Nazal Kanül (HFNC)",
    category: "havayolu",
  },
  bvm_pediatrik: {
    id: "bvm_pediatrik",
    name_tr: "Pediatrik Balon-Valf-Maske",
    category: "havayolu",
  },
  pediatrik_oksijen_maske: {
    id: "pediatrik_oksijen_maske",
    name_tr: "Pediatrik Oksijen Maskesi (Rezervuarlı)",
    category: "havayolu",
  },
  i_gel: {
    id: "i_gel",
    name_tr: "i-Gel Supraglottik Havayolu",
    category: "havayolu",
  },
  videolaringoskop: {
    id: "videolaringoskop",
    name_tr: "Videolaringoskop (McGrath/GlideScope)",
    category: "havayolu",
  },
  bougie: {
    id: "bougie",
    name_tr: "Bougie (Entübasyon Yardımcısı)",
    category: "havayolu",
  },
  cricothyrotomy_seti: {
    id: "cricothyrotomy_seti",
    name_tr: "Krikotirotomi Seti (Cerrahi Havayolu)",
    category: "havayolu",
  },
  cpap: {
    id: "cpap",
    name_tr: "CPAP/BiPAP (Noninvaziv Ventilatör)",
    category: "havayolu",
  },

  // --- Solunum/ventilasyon ---
  ventilator_mekanik: {
    id: "ventilator_mekanik",
    name_tr: "Mekanik Ventilatör",
    category: "havayolu",
  },
  nebulizator: {
    id: "nebulizator",
    name_tr: "Nebülizatör (Ultrasonik/Jet)",
    category: "havayolu",
  },

  // --- Damar yolu / İnfüzyon ---
  iv_kateter_22g: {
    id: "iv_kateter_22g",
    name_tr: "22G IV Kateter",
    category: "damar_yolu",
  },
  iv_kateter_24g: {
    id: "iv_kateter_24g",
    name_tr: "24G IV Kateter (Pediatrik)",
    category: "damar_yolu",
  },
  pediatrik_io_seti: {
    id: "pediatrik_io_seti",
    name_tr: "Pediatrik İntraosseöz Seti (EZ-IO)",
    category: "damar_yolu",
  },
  infuzyon_pompasi: {
    id: "infuzyon_pompasi",
    name_tr: "İnfüzyon Pompası",
    category: "damar_yolu",
  },
  perfuzor: {
    id: "perfuzor",
    name_tr: "Şırınga Pompası (Perfüzör)",
    category: "damar_yolu",
  },
  arter_kateteri: {
    id: "arter_kateteri",
    name_tr: "Arter Kateteri (İnvaziv Arter Basıncı)",
    category: "damar_yolu",
  },

  // --- Tanı / Monitorizasyon (ek) ---
  kan_gazi_cihazi: {
    id: "kan_gazi_cihazi",
    name_tr: "Kan Gazı Analizörü (POC)",
    category: "monitorizasyon",
  },
  beden_sicakligi_probu: {
    id: "beden_sicakligi_probu",
    name_tr: "Merkezi Vücut Sıcaklığı Probu (Özofageal/Rektal)",
    category: "monitorizasyon",
  },
  lomber_ponksiyon_seti: {
    id: "lomber_ponksiyon_seti",
    name_tr: "Lomber Ponksiyon Seti",
    category: "cerrahi",
  },
  torasentez_seti: {
    id: "torasentez_seti",
    name_tr: "Torasentez Seti",
    category: "cerrahi",
  },
  lp_iglesi_pediatrik: {
    id: "lp_iglesi_pediatrik",
    name_tr: "Pediatrik Lomber Ponksiyon Seti",
    category: "cerrahi",
  },

  // --- Elektrofizyoloji / Kardiyak ---
  pediatrik_def_padleri: {
    id: "pediatrik_def_padleri",
    name_tr: "Pediatrik Defibrilasyon Padleri",
    category: "defibrilasyon",
  },
  transkutan_pacemaker: {
    id: "transkutan_pacemaker",
    name_tr: "Transkütan Geçici Kalp Pili",
    category: "defibrilasyon",
  },

  // --- Laboratuvar ---
  tam_kan_sayimi: {
    id: "tam_kan_sayimi",
    name_tr: "Tam Kan Sayımı (TKS)",
    category: "laboratuvar",
  },
  crp: {
    id: "crp",
    name_tr: "C-Reaktif Protein (CRP)",
    category: "laboratuvar",
  },
  prokalsitonin: {
    id: "prokalsitonin",
    name_tr: "Prokalsitonin (PCT)",
    category: "laboratuvar",
  },
  troponin_i: {
    id: "troponin_i",
    name_tr: "Yüksek Duyarlıklı Troponin I (hs-cTnI)",
    category: "laboratuvar",
  },
  bnp: {
    id: "bnp",
    name_tr: "NT-proBNP",
    category: "laboratuvar",
  },
  d_dimer: {
    id: "d_dimer",
    name_tr: "D-Dimer",
    category: "laboratuvar",
  },
  laktat: {
    id: "laktat",
    name_tr: "Kan Laktatı",
    category: "laboratuvar",
  },
  idrar_tahlili: {
    id: "idrar_tahlili",
    name_tr: "Tam İdrar Tahlili (TİT)",
    category: "laboratuvar",
  },
  beta_hidroksibutirat: {
    id: "beta_hidroksibutirat",
    name_tr: "Kanda β-Hidroksibütirat (BHB)",
    category: "laboratuvar",
  },
  kan_kulturu: {
    id: "kan_kulturu",
    name_tr: "Kan Kültürü (Aerobik + Anaerobik)",
    category: "laboratuvar",
  },

  // --- Görüntüleme ---
  akciger_grafisi: {
    id: "akciger_grafisi",
    name_tr: "PA Akciğer Grafisi",
    category: "goruntuleme",
  },
  bt_kraniyal: {
    id: "bt_kraniyal",
    name_tr: "Kontrastsız Kraniyal BT",
    category: "goruntuleme",
  },
  bt_toraks_anjio: {
    id: "bt_toraks_anjio",
    name_tr: "Toraks BT Anjiyografi (CTA)",
    category: "goruntuleme",
  },
  ekokardiyografi: {
    id: "ekokardiyografi",
    name_tr: "Yatak Başı Ekokardiyografi (TTE)",
    category: "goruntuleme",
  },

  // --- Termoregülasyon ---
  sicak_battaniye: {
    id: "sicak_battaniye",
    name_tr: "Isıtıcı Battaniye (Forced Air Warmer)",
    category: "diğer",
  },
  sogutma_battaniye: {
    id: "sogutma_battaniye",
    name_tr: "Soğutma Sistemi (Hedefli Sıcaklık Yönetimi)",
    category: "diğer",
  },
};

export function getEquipment(id: string): Equipment | undefined {
  return EQUIPMENT[id];
}
