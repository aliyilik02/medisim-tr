// ============================================================
// Görsel Manifest — (arketip × ortam) bazlı evrensel görsel setleri
// ============================================================
// Görselli vaka akışı (/vaka/:id) pilotu. Görseller senaryoya özel DEĞİL:
// aynı (arketip×ortam) grubundaki TÜM senaryolar aynı seti paylaşır —
// 400 senaryo hedefinde kombinatoryal patlamayı önleyen model (Ali Bey
// kararı, 12 Tem 2026). Senaryo hiçbir görsel yolu taşımaz: arketip
// hastanın yaş/cinsiyetinden, ortam senaryonun uzmanlığından türetilir.
//
// MediaAsset.video: motion turu için hazır alan — Higgsfield image-to-video
// üretilince aynı anahtara kısa döngü videosu eklenir; oynatıcı
// (CaseStage) video ?? src seçer. Bugün statik.
//
// Saf TS — React import YOK. Dosya varlığı vitest kapısıyla kilitli
// (tests/visuals/visual-manifest.test.ts, PROP_CREDITS deseni).

import type { Patient2DStage } from "@/clinical/visual2d-mapper";
import type { Patient, Specialty } from "@/engine";

export type Arketip =
  | "eriskin-e"
  | "eriskin-k"
  | "yasli-e"
  | "yasli-k"
  | "cocuk" // illüstratif stil (foto-gerçekçi çocuk üretilmez — pivot kararı)
  | "asker";

export type Ortam = "hastane" | "acil" | "saha";

/** Aksiyon görsel anahtarları — Higgsfield üretim listesiyle birebir
    (docs/GORSEL-IHTIYAC-LISTESI.md). Ekipman/ilaç id'leri buraya
    action-visuals.ts zinciriyle çözülür. */
export type AksiyonKey =
  | "ekg-takma"
  | "monitor-baglama"
  | "tansiyon-olcme"
  | "iv-takma"
  | "ilac-iv"
  | "ilac-po"
  | "dilalti"
  | "oksijen-maske"
  | "defibrilasyon"
  | "eko"
  | "kan-alma"
  | "oskultasyon"
  | "transfer-pci";

export interface MediaAsset {
  src: string;
  /** Motion turu: kısa döngü videosu (varsa src yerine oynatılır). */
  video?: string;
  alt: string;
}

export interface VisualSet {
  durum: Record<Patient2DStage, MediaAsset>;
  /** Maskeli durum varyantları (D kararı, 13 Tem 2026): oksijen maskesi TEK
      görsel-kalıcı iz — takılınca durum karesi bu varyanttan seçilir, varyant
      yoksa base'e zarif düşüş. ARREST VARYANTI ÜRETİLMEZ (klinik: arrestte
      basit maske çıkar, BVM/entübasyona geçilir — resolveDurumAsset bastırır).
      Diğer izler (IV/EKG/monitör) görsel değil, UI çip katmanında taşınır
      (persistent-traces.ts). */
  durumMaske?: Partial<Record<Patient2DStage, MediaAsset>>;
  /** Kısmi — eksik aksiyon görseli zarif düşer (yalnız banner gösterilir). */
  aksiyon: Partial<Record<AksiyonKey, MediaAsset>>;
}

export type SetKey = `${Ortam}-${Arketip}`;

const HASTANE_ERISKIN_E: VisualSet = {
  durum: {
    baseline: {
      src: "/patients/hastane-eriskin-e/durum-01-baseline.png",
      alt: "Bilinçli hasta, göğüs ağrısıyla distresli",
    },
    sok: {
      src: "/patients/hastane-eriskin-e/durum-02-sok.png",
      alt: "Solgun, terli, yarı bilinçli hasta",
    },
    siyanoz: {
      src: "/patients/hastane-eriskin-e/durum-03-siyanoz.png",
      alt: "Dudaklarda morarma, hipoksik hasta",
    },
    "derin-sok": {
      src: "/patients/hastane-eriskin-e/durum-04-derin-sok.png",
      alt: "Gri cilt, yanıtsız hasta",
    },
    arrest: {
      src: "/patients/hastane-eriskin-e/durum-05-arrest.png",
      alt: "Bilinçsiz hasta, kardiyak arrest",
    },
  },
  // Maske varyantları (durum-XX-maske.png) Higgsfield'da üretilecek —
  // her durumun KENDİ karesi image-to-image girdisi olur (poz korunur).
  // Üretilince buraya eklenir; o güne dek base karelere zarif düşüş.
  durumMaske: {},
  // P1 kanıt seti (5/5, 13 Tem 2026). Kalan 8 kare (P2/P3) üretildikçe
  // eklenir; eksikken CaseStage yalnız aksiyon banner'ı gösterir.
  aksiyon: {
    "ekg-takma": {
      src: "/patients/hastane-eriskin-e/aksiyon-ekg-takma.png",
      alt: "Göğse EKG elektrotları yapıştırılıyor",
    },
    "iv-takma": {
      src: "/patients/hastane-eriskin-e/aksiyon-iv-takma.png",
      alt: "Kola IV kateter yerleştiriliyor, turnike bağlı",
    },
    "ilac-po": {
      src: "/patients/hastane-eriskin-e/aksiyon-ilac-po.png",
      alt: "Hasta tablet alıyor, su bardağı uzatılmış",
    },
    "ilac-iv": {
      src: "/patients/hastane-eriskin-e/aksiyon-ilac-iv.png",
      alt: "IV hattına enjektörle ilaç uygulanıyor",
    },
    "oksijen-maske": {
      src: "/patients/hastane-eriskin-e/aksiyon-oksijen-maske.png",
      alt: "Yüze oksijen maskesi yerleştiriliyor",
    },
  },
};

export const VISUAL_MANIFEST: Partial<Record<SetKey, VisualSet>> = {
  "hastane-eriskin-e": HASTANE_ERISKIN_E,
};

/** Hasta profili → arketip. Sınırlar: <16 çocuk, ≥65 yaşlı (PALS/geriatri
    ayrımıyla uyumlu kaba sunum sınırı — klinik değer değil, görsel seçim). */
export function patientToArketip(patient: Patient): Arketip {
  if (patient.age < 16) return "cocuk";
  const yasli = patient.age >= 65;
  const erkek = patient.sex === "M";
  if (yasli) return erkek ? "yasli-e" : "yasli-k";
  return erkek ? "eriskin-e" : "eriskin-k";
}

/** Senaryo uzmanlığı → ortam. Askeri senaryolarda arketip de asker'e döner. */
export function scenarioToOrtam(specialty: Specialty): Ortam {
  if (specialty === "askeri_tccc") return "saha";
  if (specialty === "acil") return "acil";
  return "hastane";
}

/** Set çözümü — yoksa null (sayfa zarif düşer: görselsiz oynanır).
    Askeri istisnası: saha ortamında arketip her zaman asker. */
export function resolveVisualSet(
  specialty: Specialty,
  patient: Patient,
): { key: SetKey; set: VisualSet } | null {
  const ortam = scenarioToOrtam(specialty);
  const arketip = ortam === "saha" ? "asker" : patientToArketip(patient);
  const key: SetKey = `${ortam}-${arketip}`;
  const set = VISUAL_MANIFEST[key];
  return set ? { key, set } : null;
}
