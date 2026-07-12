// ============================================================
// Aksiyon → görsel anahtar çözümleme (görselli vaka akışı)
// ============================================================
// Zincir (patlamayı önleyen ikinci kilit — 71 ekipmana 71 görsel GEREKMEZ):
//   1. target_id birebir eşleşme (ekg_12 → "ekg-takma")
//   2. ekipman kategorisi / ilaç veriliş yolu genel görseli
//   3. hiçbiri yoksa null → CaseStage aksiyon karesi atlar, banner kalır
// UI tarafı — engine'e dokunmaz; kataloglardan yalnız okur.

import type { ActionRef } from "@/engine";
import { EQUIPMENT } from "@/data/equipment";
import { getExtendedMedication } from "@/data/medications-extended";
import { MEDICATIONS } from "@/data/medications";
import type { AksiyonKey } from "./visual-manifest";

/** Banner + üretim listesi etiketleri (TR). */
export const AKSIYON_LABELS: Record<AksiyonKey, string> = {
  "ekg-takma": "12 derivasyonlu EKG çekiliyor",
  "monitor-baglama": "Monitör bağlanıyor",
  "tansiyon-olcme": "Tansiyon ölçülüyor",
  "iv-takma": "Damar yolu açılıyor",
  "ilac-iv": "IV ilaç uygulanıyor",
  "ilac-po": "Oral ilaç veriliyor",
  dilalti: "Dil altı ilaç veriliyor",
  "oksijen-maske": "Oksijen maskesi takılıyor",
  defibrilasyon: "Defibrilatör hazırlanıyor",
  eko: "Yatak başı EKO yapılıyor",
  "kan-alma": "Kan örneği alınıyor",
  oskultasyon: "Oskültasyon yapılıyor",
  "transfer-pci": "Kateter laboratuvarına transfer",
};

/** 1. basamak: target_id birebir. Ekipman + STEMI karar id'leri (pilot). */
const EXACT: Record<string, AksiyonKey> = {
  // ekipman
  ekg_12: "ekg-takma",
  monitor: "monitor-baglama",
  pulse_oksimetre: "monitor-baglama",
  tansiyon_aleti: "tansiyon-olcme",
  oksijen_maske: "oksijen-maske",
  iv_kateter_18g: "iv-takma",
  iv_kateter_20g: "iv-takma",
  defibrilator: "defibrilasyon",
  ekokardiyografi: "eko",
  kan_gazi_cihazi: "kan-alma",
  stetoskop: "oskultasyon",
  // STEMI reperfüzyon kararları (dallanma dahil)
  opt_pci_transfer: "transfer-pci",
  opt_pci_hesapla: "transfer-pci",
  opt_kurtarma_pci: "transfer-pci",
};

/** 2. basamak: ekipman kategorisi → genel görsel. */
const EQUIPMENT_CATEGORY_FALLBACK: Partial<Record<string, AksiyonKey>> = {
  monitorizasyon: "monitor-baglama",
  damar_yolu: "iv-takma",
  defibrilasyon: "defibrilasyon",
  havayolu: "oksijen-maske",
  laboratuvar: "kan-alma",
  goruntuleme: "eko",
};

/** İlaç veriliş yolu → genel görsel. Önce farmakoloji kataloğu (dose_route),
    yoksa UI doz metninden sezgi (örn. "300 mg PO çiğnetilerek"). */
function medicationVisual(targetId: string, dose?: string): AksiyonKey {
  const route = getExtendedMedication(targetId)?.dose_band.dose_route;
  const text = `${route ?? ""} ${dose ?? MEDICATIONS[targetId]?.default_dose ?? ""}`.toUpperCase();
  if (text.includes("SL") || text.includes("DİL ALTI") || text.includes("DIL ALTI")) return "dilalti";
  if (text.includes("PO") || text.includes("ORAL") || text.includes("ÇİĞNE")) return "ilac-po";
  return "ilac-iv"; // IV/IM/SC/inf — varsayılan parenteral kare
}

export interface ResolvedActionVisual {
  key: AksiyonKey;
  label: string;
}

/** ActionRef → görsel anahtar + banner etiketi. null → görsel gösterilmez. */
export function resolveActionVisual(action: ActionRef): ResolvedActionVisual | null {
  const exact = EXACT[action.target_id];
  if (exact) return { key: exact, label: AKSIYON_LABELS[exact] };

  if (action.type === "give_medication") {
    const key = medicationVisual(action.target_id, action.dose);
    return { key, label: AKSIYON_LABELS[key] };
  }
  if (action.type === "use_equipment" || action.type === "procedure") {
    const cat = EQUIPMENT[action.target_id]?.category;
    const key = cat ? EQUIPMENT_CATEGORY_FALLBACK[cat] : undefined;
    return key ? { key, label: AKSIYON_LABELS[key] } : null;
  }
  if (action.type === "order_test") {
    return { key: "kan-alma", label: AKSIYON_LABELS["kan-alma"] };
  }
  if (action.type === "examine") {
    return { key: "oskultasyon", label: AKSIYON_LABELS["oskultasyon"] };
  }
  return null; // decision (EXACT dışı) ve diğerleri — görsel yok
}
