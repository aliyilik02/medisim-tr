// ============================================================
// MediSim TR — Ekipman-Etki Kataloğu (Blok 2) — DRAFT
// ============================================================
// ÖNCELİK ekipmanlar: havayolu / solunum / dolaşım / izlem.
// Kalan ~50 ekipman (cerrahi, lab, görüntüleme, termoregülasyon) sonraki tur.
//
// ⚠️⚠️ KLİNİK İÇERİK — REVIEWED_PENDING_ACTIVATION / ACTIVE değil ⚠️⚠️
// Klinik tur (22 Haz): öncelik ekipmanlar (havayolu/solunum/dolaşım/izlem)
// kaynaklı doğrulandı — her birinin ENDİKASYONU/eşiği bir kılavuza dayanır
// (AHA ACLS 2020, ERC 2021, ESC 2023, BTS Oksijen, ERS/ATS HFNC, ARDSNet).
// ÖNEMLİ: kılavuzlar "entübasyon SpO2'yi kaç sn'de kaç artırır" gibi DELTA
// vermez; effects.amount / onset_sec değerleri SİMÜLASYON KALİBRASYONUDUR
// (göreli sıralama fizyolojik: ETT>ventilatör>BVM>LMA>HFNC>NRB>nazal>NPA).
// status: "REVIEWED_PENDING_ACTIVATION" — ACTIVE'i SADECE Ali Bey verir.
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
      { vital: "spo2", amount: 12, toward: 98 }, // definitif havayolu + kontrollü ventilasyon → hipoksemi düzelir (miktar simülasyon kalibrasyonu)
    ],
    onset_sec: 30, // laringoskopi→tüp doğrulama→efektif ventilasyon ~20-40 sn
    airway_secured: true,
    opens_iv_route: false,
    note: "Definitif havayolu sağlandı, kontrollü ventilasyon başladı.",
    source: "AHA ACLS 2020 + TARD Zor Havayolu Kılavuzu (definitif havayolu endikasyonu; etki miktarı simülasyon kalibrasyonu)",
    status: "REVIEWED_PENDING_ACTIVATION",
  },
  lma: {
    equipment_id: "lma",
    label: "Laringeal Maske (LMA)",
    system: "havayolu",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 92 },
    effects: [
      { vital: "spo2", amount: 8, toward: 96 }, // supraglottik oksijenasyon, entübasyondan düşük (miktar simülasyon kalibrasyonu)
    ],
    onset_sec: 20, // hızlı yerleştirme — kurtarma havayolu
    airway_secured: true,
    opens_iv_route: false,
    note: "Supraglottik havayolu yerleştirildi (geçici/kurtarma havayolu).",
    source: "ERC 2021 Havayolu + TARD Zor Havayolu (supraglottik kurtarma havayolu endikasyonu; etki miktarı simülasyon kalibrasyonu)",
    status: "REVIEWED_PENDING_ACTIVATION",
  },
  ambu: {
    equipment_id: "ambu",
    label: "Balon-Valf-Maske (BVM) Ventilasyonu",
    system: "havayolu",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 92 },
    effects: [
      { vital: "spo2", amount: 9, toward: 96 }, // pozitif basınçlı ventilasyon — hipoventilasyonda oksijenasyon köprüsü (miktar simülasyon kalibrasyonu)
    ],
    onset_sec: 15, // maske kavrama + ilk etkin soluklar
    airway_secured: false, // geçici — aspirasyon riski sürer
    opens_iv_route: false,
    note: "Balon-valf-maske ile ventilasyon — geçici, havayolu güvende değil.",
    source: "AHA BLS/ACLS 2020 (balon-valf-maske pozitif basınçlı ventilasyon — solunum depresyonunda temel destek; etki miktarı simülasyon kalibrasyonu)",
    status: "REVIEWED_PENDING_ACTIVATION",
  },
  nazofaringeal: {
    equipment_id: "nazofaringeal",
    label: "Nazofaringeal Havayolu",
    system: "havayolu",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 94 },
    effects: [
      { vital: "spo2", amount: 3, toward: 95 }, // havayolu açıklığı sağlar, oksijenasyon kazancı marjinal (miktar simülasyon kalibrasyonu)
    ],
    onset_sec: 10, // hızlı yerleştirme
    airway_secured: false,
    opens_iv_route: false,
    note: "Nazofaringeal airway — havayolu açıklığı adjunktı.",
    source: "UÇEP-2020 + AHA 2020 Havayolu adjunktı (açıklık sağlar; oksijenasyon etkisi marjinal — simülasyon kalibrasyonu)",
    status: "REVIEWED_PENDING_ACTIVATION",
  },

  // ========== SOLUNUM / OKSİJENASYON ==========
  oksijen_maske: {
    equipment_id: "oksijen_maske",
    label: "Rezervuarlı Oksijen Maskesi",
    system: "solunum",
    // SADECE hipoksemide (SpO2<90) etki — ESC 2023/BTS: normoksemik hastada
    // rutin O2 endike DEĞİL (hiperoksi koroner vazokonstriksiyon → zarar).
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 90 },
    effects: [
      { vital: "spo2", amount: 4, toward: 96 }, // NRB ~%85-90 FiO2; hipoksemide birkaç sn'de +2-4%
    ],
    onset_sec: 20,
    opens_iv_route: false,
    note: "Yüksek akımlı oksijen (rezervuarlı maske) — yalnız hipoksemide.",
    source: "ESC 2023 ACS (rutin O2 SpO2<90) + BTS Oksijen Kılavuzu 2017",
    status: "REVIEWED_PENDING_ACTIVATION",
  },
  nazal_kanul: {
    equipment_id: "nazal_kanul",
    label: "Nazal Kanül",
    system: "solunum",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 90 },
    effects: [
      { vital: "spo2", amount: 2, toward: 94 }, // 1-6 L/dk düşük akım kazanımı
    ],
    onset_sec: 30,
    opens_iv_route: false,
    note: "Düşük akımlı oksijen (nazal kanül) — yalnız hipoksemide.",
    source: "ESC 2023 ACS (rutin O2 SpO2<90) + BTS Oksijen Kılavuzu 2017",
    status: "REVIEWED_PENDING_ACTIVATION",
  },
  hfnc: {
    equipment_id: "hfnc",
    label: "Yüksek Akımlı Nazal Kanül (HFNC)",
    system: "solunum",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 93 },
    effects: [
      { vital: "spo2", amount: 8, toward: 97 }, // yüksek akım oksijenasyon + hafif PEEP (miktar simülasyon kalibrasyonu)
      { vital: "rr", amount: -3, toward: 18 }, // solunum işi azalması (miktar simülasyon kalibrasyonu)
    ],
    onset_sec: 60, // akım/ısıtma dengeye ulaşma
    opens_iv_route: false,
    note: "HFNC başlandı — yüksek akım oksijenasyon + solunum işi desteği.",
    source: "ERS/ATS HFNC Klinik Uygulama Kılavuzu 2022 + Frat NEJM 2015 (akut hipoksemik solunum yetmezliğinde HFNC; etki miktarı simülasyon kalibrasyonu)",
    status: "REVIEWED_PENDING_ACTIVATION",
  },
  ventilator_mekanik: {
    equipment_id: "ventilator_mekanik",
    label: "Mekanik Ventilatör",
    system: "solunum",
    condition: { kind: "vital", vital: "spo2", op: "lt", value: 92 },
    effects: [
      { vital: "spo2", amount: 14, toward: 98 }, // kontrollü ventilasyon + PEEP ile oksijenasyon (miktar simülasyon kalibrasyonu)
      { vital: "etco2", amount: -8, toward: 40 }, // dakika ventilasyonu ile CO2 normalleşme (miktar simülasyon kalibrasyonu)
    ],
    onset_sec: 45, // ventilatör ayarı + akciğer dengeye ulaşma
    opens_iv_route: false,
    note: "Mekanik ventilasyon başladı (entübasyon gerektirir).",
    source: "ARDSNet akciğer-koruyucu ventilasyon + TARD Mekanik Ventilasyon (kontrollü ventilasyon oksijenasyon/CO2 düzeltir; etki miktarı simülasyon kalibrasyonu)",
    status: "REVIEWED_PENDING_ACTIVATION",
  },

  // ========== DOLAŞIM ==========
  defibrilator: {
    equipment_id: "defibrilator",
    label: "Defibrilasyon",
    system: "dolasim",
    // SADECE şoklanabilir ritimde (VF / nabızsız VT salvosu).
    condition: { kind: "rhythm", in: ["vfib", "vt_salvo"] },
    effects: [
      { vital: "hr", amount: -60, toward: 80 }, // başarılı defib → organize perfüze ritim HR
      { vital: "bp_systolic", amount: 30, toward: 100 }, // ROSC sonrası perfüzyon
    ],
    onset_sec: 0, // anlık (şok)
    opens_iv_route: false,
    note: "Defibrilasyon uygulandı — şoklanabilir ritim (VF/VT) sonlandırılmaya çalışıldı.",
    source: "AHA ACLS 2020 (şoklanabilir ritim algoritması, 200 J bifazik)",
    status: "REVIEWED_PENDING_ACTIVATION",
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
    source: "UÇEP-2020 / AHA ACLS (IV erişim — vital etkisi yok, yol açar)",
    status: "REVIEWED_PENDING_ACTIVATION",
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
    source: "UÇEP-2020 / AHA ACLS (IV erişim — vital etkisi yok, yol açar)",
    status: "REVIEWED_PENDING_ACTIVATION",
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
    source: "AHA ACLS 2020 (IV başarısız/gecikmeli ise IO erişim — vital etkisi yok, yol açar)",
    status: "REVIEWED_PENDING_ACTIVATION",
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
    source: "İzlem ekipmanı — fizyolojik etki yok (tanısal görünürlük).",
    status: "REVIEWED_PENDING_ACTIVATION",
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
    source: "ESC 2023 ACS (ilk 10 dk EKG Class I) — tanısal, vital etkisi yok.",
    status: "REVIEWED_PENDING_ACTIVATION",
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
    source: "İzlem ekipmanı — fizyolojik etki yok (SpO2 görünürlüğü).",
    status: "REVIEWED_PENDING_ACTIVATION",
  },
};

export function getEquipmentEffect(id: string): EquipmentEffect | undefined {
  return EQUIPMENT_EFFECTS[id];
}
