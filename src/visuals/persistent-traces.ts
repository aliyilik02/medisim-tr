// ============================================================
// Kalıcı iz katmanı (D kararı, 13 Tem 2026 — Ali Bey onaylı)
// ============================================================
// Müdahaleler geçici ara-sahne DEĞİL, durumu kalıcı değiştiren izler bırakır.
// Kombinatoryal patlamayı önleyen triyaj:
//   - Oksijen maskesi → TEK görsel-kalıcı iz (durum karesi maskeli varyanttan
//     seçilir; varyant yoksa base'e zarif düşüş).
//   - IV / EKG / monitör / manşon → görsel değil, UI çip şeridi (CaseStage).
//     Önlük altı / kadraj kenarı detaylar — kare çarpanı olmaya değmez.
// Saf TS — React import YOK (engine/UI ayrımı disipliniyle aynı).

import type { Patient2DStage } from "@/clinical/visual2d-mapper";
import type { AksiyonKey, MediaAsset, VisualSet } from "./visual-manifest";

/** Kalıcı iz anahtarları — hasta üzerinde takılı KALAN şeyler. */
export type TraceKey = "maske" | "iv" | "ekg" | "monitor" | "tansiyon";

/** Çip şeridi TR etiketleri. */
export const TRACE_LABELS: Record<TraceKey, string> = {
  maske: "O₂ maskesi",
  iv: "IV yol",
  ekg: "EKG",
  monitor: "Monitör",
  tansiyon: "NIBP manşonu",
};

/** Aksiyon → bıraktığı kalıcı iz. İz bırakmayanlar (ilaç verme, oskültasyon,
    kan alma, eko, defib, transfer) null — anlık işlemler. */
const ACTION_TRACE: Partial<Record<AksiyonKey, TraceKey>> = {
  "oksijen-maske": "maske",
  "iv-takma": "iv",
  "ekg-takma": "ekg",
  "monitor-baglama": "monitor",
  "tansiyon-olcme": "tansiyon",
};

export function traceForAction(key: AksiyonKey): TraceKey | null {
  return ACTION_TRACE[key] ?? null;
}

/** İz ekleme — idempotent, sıra korunur (çip şeridi takılış sırasıyla dizilir). */
export function addTrace(traces: readonly TraceKey[], key: TraceKey): TraceKey[] {
  return traces.includes(key) ? [...traces] : [...traces, key];
}

/** Durum karesi seçimi — izlere göre. Öncelik zinciri:
    1. maske + (ekg|monitör elektrotları) → kombo varyant (durumMaskeEkg)
    2. maske → maskeli varyant (durumMaske)
    3. base kare
    Her basamak eksikse bir altına zarif düşer.
    ARREST İSTİSNASI: arrestte basit yüz maskesi klinik olarak çıkar
    (BVM/entübasyon) — maske/kombo varyant asla seçilmez, base arrest döner. */
export function resolveDurumAsset(
  set: VisualSet,
  stage: Patient2DStage,
  traces: readonly TraceKey[],
): MediaAsset {
  if (stage !== "arrest" && traces.includes("maske")) {
    if (traces.includes("ekg") || traces.includes("monitor")) {
      const kombo = set.durumMaskeEkg?.[stage];
      if (kombo) return kombo;
    }
    const maskeli = set.durumMaske?.[stage];
    if (maskeli) return maskeli;
  }
  return set.durum[stage];
}
