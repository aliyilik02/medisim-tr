// ============================================================
// MediSim TR — Ekipman-Etki Kataloğu (Blok 2) — DRAFT
// ============================================================
// ÖNCELİK ekipmanlar: havayolu / solunum / dolaşım / izlem.
// Kalan ~50 ekipman (cerrahi, lab, görüntüleme, termoregülasyon) sonraki tur.
//
// ⚠️⚠️ KLİNİK İÇERİK — TÜM DEĞERLER DRAFT ⚠️⚠️
// amount / toward / onset_sec değerleri MAKUL başlangıçtır, klinik DEĞİL.
// Her değer TODO_KLINIK ile işaretli. Gerçek değerler (entübasyon SpO2'yi
// kaç sn'de kaç artırır, defib sonrası HR vb.) Claude.ai kaynaklı doğrulanacak,
// sonra Ali Bey ACTIVE'e alacak. status: "DRAFT" — ASLA ACTIVE değil.
//
// equipment_id'ler src/data/equipment.ts kataloğundan (geçerli id zorunlu).
// ============================================================

import type { EquipmentEffect } from "./types";

export const EQUIPMENT_EFFECTS: Record<string, EquipmentEffect> = {
  // ========== HAVAYOLU ==========
  entubasyon_seti: {
    equipment_id: "entubasyon_seti",
    label: "Endotrakeal Entübasyon",
    system: "havayolu",
    // Havayolu güvenliği + oksijenasyon — hipoksemi varsa belirgin düzelme.
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 92 },
    effects: [
      { vital: "spo2", amount: 12, toward: 98 }, // TODO_KLINIK: definitif havayolu sonrası oksijenasyon kazanımı — kaynak: zorunlu (AHA ACLS / TARD havayolu)
    ],
    onset_sec: 30, // TODO_KLINIK: entübasyon→efektif ventilasyon süresi
    airway_secured: true,
    opens_iv_route: false,
    note: "Definitif havayolu sağlandı, kontrollü ventilasyon başladı.",
    source: "TODO_KLINIK: AHA ACLS 2020 / TARD Zor Havayolu Kılavuzu",
    status: "DRAFT",
  },
  lma: {
    equipment_id: "lma",
    label: "Laringeal Maske (LMA)",
    system: "havayolu",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 92 },
    effects: [
      { vital: "spo2", amount: 8, toward: 96 }, // TODO_KLINIK: supraglottik havayolu oksijenasyon kazanımı (entübasyondan düşük)
    ],
    onset_sec: 20, // TODO_KLINIK
    airway_secured: true,
    opens_iv_route: false,
    note: "Supraglottik havayolu yerleştirildi (geçici/kurtarma havayolu).",
    source: "TODO_KLINIK: ERC 2021 Havayolu",
    status: "DRAFT",
  },
  ambu: {
    equipment_id: "ambu",
    label: "Balon-Valf-Maske (BVM) Ventilasyonu",
    system: "havayolu",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 92 },
    effects: [
      { vital: "spo2", amount: 9, toward: 96 }, // TODO_KLINIK: BVM ile pozitif basınçlı ventilasyon kazanımı
    ],
    onset_sec: 15, // TODO_KLINIK
    airway_secured: false, // geçici — aspirasyon riski sürer
    opens_iv_route: false,
    note: "Balon-valf-maske ile ventilasyon — geçici, havayolu güvende değil.",
    source: "TODO_KLINIK: AHA ACLS 2020",
    status: "DRAFT",
  },
  nazofaringeal: {
    equipment_id: "nazofaringeal",
    label: "Nazofaringeal Havayolu",
    system: "havayolu",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 94 },
    effects: [
      { vital: "spo2", amount: 3, toward: 95 }, // TODO_KLINIK: adjunkt havayolu marjinal kazanım
    ],
    onset_sec: 10, // TODO_KLINIK
    airway_secured: false,
    opens_iv_route: false,
    note: "Nazofaringeal airway — havayolu açıklığı adjunktı.",
    source: "TODO_KLINIK: UÇEP-2020 Havayolu",
    status: "DRAFT",
  },

  // ========== SOLUNUM / OKSİJENASYON ==========
  oksijen_maske: {
    equipment_id: "oksijen_maske",
    label: "Rezervuarlı Oksijen Maskesi",
    system: "solunum",
    // SADECE hipoksemide etki — normoksemik hastada SpO2 yükseltmez.
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 94 },
    effects: [
      { vital: "spo2", amount: 6, toward: 97 }, // TODO_KLINIK: NRB maske ~%85-90 FiO2 SpO2 yanıtı
    ],
    onset_sec: 30, // TODO_KLINIK
    opens_iv_route: false,
    note: "Yüksek akımlı oksijen (rezervuarlı maske) başlandı.",
    source: "TODO_KLINIK: BTS Oksijen Kılavuzu 2017",
    status: "DRAFT",
  },
  nazal_kanul: {
    equipment_id: "nazal_kanul",
    label: "Nazal Kanül",
    system: "solunum",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 94 },
    effects: [
      { vital: "spo2", amount: 3, toward: 95 }, // TODO_KLINIK: 1-6 L/dk düşük akım kazanımı
    ],
    onset_sec: 40, // TODO_KLINIK
    opens_iv_route: false,
    note: "Düşük akımlı oksijen (nazal kanül) başlandı.",
    source: "TODO_KLINIK: BTS Oksijen Kılavuzu 2017",
    status: "DRAFT",
  },
  hfnc: {
    equipment_id: "hfnc",
    label: "Yüksek Akımlı Nazal Kanül (HFNC)",
    system: "solunum",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 93 },
    effects: [
      { vital: "spo2", amount: 8, toward: 97 }, // TODO_KLINIK: HFNC oksijenasyon + hafif PEEP etkisi
      { vital: "rr", amount: -3, toward: 18 }, // TODO_KLINIK: solunum işi azalması
    ],
    onset_sec: 60, // TODO_KLINIK
    opens_iv_route: false,
    note: "HFNC başlandı — yüksek akım oksijenasyon + solunum işi desteği.",
    source: "TODO_KLINIK: ERS/ATS HFNC kılavuzu",
    status: "DRAFT",
  },
  ventilator_mekanik: {
    equipment_id: "ventilator_mekanik",
    label: "Mekanik Ventilatör",
    system: "solunum",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 92 },
    effects: [
      { vital: "spo2", amount: 14, toward: 98 }, // TODO_KLINIK: kontrollü ventilasyon + PEEP oksijenasyon
      { vital: "etco2", amount: -8, toward: 40 }, // TODO_KLINIK: dakika ventilasyonu ile CO2 normalleşme
    ],
    onset_sec: 45, // TODO_KLINIK
    opens_iv_route: false,
    note: "Mekanik ventilasyon başladı (entübasyon gerektirir).",
    source: "TODO_KLINIK: ARDSnet / TARD Mekanik Ventilasyon",
    status: "DRAFT",
  },

  // ========== DOLAŞIM ==========
  defibrilator: {
    equipment_id: "defibrilator",
    label: "Defibrilasyon",
    system: "dolasim",
    // SADECE şoklanabilir ritimde (VF / nabızsız VT salvosu).
    condition: { kind: "rhythm", in: ["vfib", "vt_salvo"] },
    effects: [
      { vital: "hr", amount: -60, toward: 80 }, // TODO_KLINIK: başarılı defib sonrası perfüze ritim HR (faz halt'i deterioration durdurur)
      { vital: "bp_systolic", amount: 30, toward: 100 }, // TODO_KLINIK: ROSC sonrası perfüzyon
    ],
    onset_sec: 0, // anlık (şok)
    opens_iv_route: false,
    note: "Defibrilasyon uygulandı — şoklanabilir ritim sonlandırılmaya çalışıldı.",
    source: "TODO_KLINIK: AHA ACLS 2020 (şoklanabilir ritim algoritması)",
    status: "DRAFT",
  },
  iv_kateter_18g: {
    equipment_id: "iv_kateter_18g",
    label: "18G IV Kateter",
    system: "dolasim",
    condition: { kind: "always" },
    effects: [], // yol açar, doğrudan vital etkisi yok (sıvı/ilaç ayrı)
    onset_sec: 0,
    opens_iv_route: true,
    note: "Geniş çaplı IV damar yolu açıldı (sıvı/ilaç yolu).",
    source: "TODO_KLINIK: UÇEP-2020",
    status: "DRAFT",
  },
  iv_kateter_20g: {
    equipment_id: "iv_kateter_20g",
    label: "20G IV Kateter",
    system: "dolasim",
    condition: { kind: "always" },
    effects: [],
    onset_sec: 0,
    opens_iv_route: true,
    note: "IV damar yolu açıldı (ilaç yolu).",
    source: "TODO_KLINIK: UÇEP-2020",
    status: "DRAFT",
  },
  io_seti: {
    equipment_id: "io_seti",
    label: "İntraosseöz (IO) Yol",
    system: "dolasim",
    condition: { kind: "always" },
    effects: [],
    onset_sec: 0,
    opens_iv_route: true,
    note: "IO yol açıldı — IV başarısızsa hızlı erişim (ilaç/sıvı yolu).",
    source: "TODO_KLINIK: AHA ACLS 2020 (IV/IO erişim)",
    status: "DRAFT",
  },

  // ========== İZLEM (vital etkisi yok — ölçüm/görünürlük) ==========
  monitor: {
    equipment_id: "monitor",
    label: "Hasta Monitörü",
    system: "izlem",
    condition: { kind: "always" },
    effects: [],
    onset_sec: 0,
    opens_iv_route: false,
    note: "Hasta monitörüne bağlandı — sürekli vital izlem.",
    source: "İzlem ekipmanı — fizyolojik etki yok.",
    status: "DRAFT",
  },
  ekg_12: {
    equipment_id: "ekg_12",
    label: "12 Derivasyonlu EKG",
    system: "izlem",
    condition: { kind: "always" },
    effects: [],
    onset_sec: 0,
    opens_iv_route: false,
    note: "12 derivasyonlu EKG çekildi — tanısal ritim/iskemi değerlendirmesi.",
    source: "İzlem/tanı ekipmanı — doğrudan vital etkisi yok.",
    status: "DRAFT",
  },
  pulse_oksimetre: {
    equipment_id: "pulse_oksimetre",
    label: "Pulse Oksimetre",
    system: "izlem",
    condition: { kind: "always" },
    effects: [],
    onset_sec: 0,
    opens_iv_route: false,
    note: "Pulse oksimetre takıldı — SpO2 sürekli izlem.",
    source: "İzlem ekipmanı — fizyolojik etki yok.",
    status: "DRAFT",
  },
};

export function getEquipmentEffect(id: string): EquipmentEffect | undefined {
  return EQUIPMENT_EFFECTS[id];
}
