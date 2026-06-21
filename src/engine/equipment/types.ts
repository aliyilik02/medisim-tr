// ============================================================
// MediSim TR — Ekipman-Etki Motoru Tipleri (Blok 2)
// ============================================================
// İlaç motoruna SİMETRİK merkezi ekipman→fizyoloji sistemi.
// pharmacology/types.ts deseni: katalog + koşul + etki + timing.
//
// ⚠️ KLİNİK İÇERİK: bu tiplerin DEĞER örnekleri (catalog.ts) DRAFT.
// Gerçek klinik miktarlar TODO_KLINIK etiketiyle Claude.ai turunda doldurulur.
// ============================================================

import type { PatientVitals, Patient, TrendableVital, EkgPattern } from "../types";

/** Ekipman etkisinin uygulanabileceği vital alanları (sayısal). */
export type EquipmentTargetVital = TrendableVital;

/** Tek bir vital üzerindeki ekipman etkisi.
 *  toward: vital bu HEDEFE doğru ilerletilir (aşırı düzeltme engellenir —
 *  örn. O2 maskesi SpO2'yi 98'e kadar çıkarır, 120'ye değil). amount: tek
 *  uygulamada hedefe doğru atılacak maksimum adım (mutlak birim). */
export interface EquipmentVitalAction {
  vital: EquipmentTargetVital;
  /** Hedefe doğru bu kadar birim ilerlet (pozitif = artır, negatif = azalt). */
  amount: number;
  /** Vital bu değere ulaşınca dur (yönlü clamp). Verilmezse sınırsız. */
  toward?: number;
}

/** Etkinin uygulanma KOŞULU — sağlanmazsa ekipman fizyolojik etki yapmaz
 *  (ama senaryo yine de aksiyonu puanlayabilir). Örn: O2 sadece hipoksemide,
 *  defib sadece şoklanabilir ritimde. */
export type EquipmentCondition =
  | { kind: "always" }
  /** Vital eşiği: vitals[vital] op value (örn. spo2 lt 94 → hipoksemi). */
  | { kind: "vital"; vital: EquipmentTargetVital; op: "lt" | "gt" | "lte" | "gte"; value: number }
  /** Aktif faz ritmi şu set içindeyse (defib: ["vfib","vt_salvo"]). */
  | { kind: "rhythm"; in: EkgPattern[] };

/** Ekipmanın fizyolojik/işlevsel profili. equipment_id → bu profil. */
export interface EquipmentEffect {
  /** src/data/equipment.ts katalog id'si ile eşleşmeli. */
  equipment_id: string;
  label: string;
  /** Kaba sistem grubu — UI/raporlama için. */
  system: "havayolu" | "solunum" | "dolasim" | "izlem";
  /** Etki uygulanma koşulu (verilmezse always). */
  condition?: EquipmentCondition;
  /** Koşul sağlanınca uygulanacak vital etkileri. İzlem ekipmanı için boş olabilir. */
  effects: EquipmentVitalAction[];
  /** DRAFT — etki başlangıç gecikmesi (sn). Şimdilik anlık uygulanır; tick-tabanlı
      onset eğrisi sonraki tur (TODO). Katalogda klinik metadata olarak tutulur. */
  onset_sec: number;
  /** true → havayolu güvenli (entübasyon/LMA). İleride aspirasyon riskini keser. */
  airway_secured?: boolean;
  /** true → IV/IO yolu açılır (ilaç uygulama yolu). */
  opens_iv_route?: boolean;
  /** Öğrenciye/debrief'e gösterilecek bulgu metni. */
  note: string;
  /** Klinik kaynak (DRAFT). */
  source: string;
  /** Klinik review durumu — başlangıç DRAFT. */
  status: "DRAFT" | "REVIEWED_PENDING_ACTIVATION" | "ACTIVE";
}

/** resolveEquipmentEffect girdisi — anlık hasta/ritim bağlamı. */
export interface EquipmentEffectContext {
  vitals: PatientVitals;
  patient: Patient;
  /** Aktif deterioration fazının EKG ritmi (defib koşulu için). */
  ekg?: EkgPattern;
}

/** resolveEquipmentEffect çıktısı. */
export interface EquipmentResolution {
  equipment_id: string;
  /** Koşul sağlandı ve etki uygulandı mı. */
  applied: boolean;
  /** baseline/vitals'a eklenecek delta (functional setSession ile uygulanır). */
  delta: Partial<PatientVitals>;
  airway_secured: boolean;
  opens_iv_route: boolean;
  /** Uygulandıysa note; uygulanmadıysa koşul-sağlanmadı açıklaması. */
  note: string;
}
