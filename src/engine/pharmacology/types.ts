// ============================================================
// MediSim TR — Farmakoloji Motoru Tipleri
// ============================================================
// Bu dosya ilaç etkileri motorunun veri şemasıdır.
// Ana types.ts'deki Medication tipi burada ExtendedMedication ile
// zenginleştirilir. Senaryolar yine sadece medication id'si kullanır;
// motor çalışma anında bu şemayı okur.
//
// NOT (23 Nisan 2026): Bu dosya ve ../types.ts içerikleri daha önce
// yer değiştirmişti — düzeltildi.
// ============================================================

import type { PatientVitals, PatientModifiers, Difficulty } from "../types";

// ------------------------------------------------------------
// EKG Etki Parametreleri — ilaçların EKG dalga formu üzerindeki etkisi
// ------------------------------------------------------------
// Her parametre 0 = baz değer, delta olarak yorumlanır.
// qrs_amplitude_pct ve t_amplitude_pct için 1.0 = değişmez; örn. 1.15 = %15 artış.
// Diğer alanlar mv veya ms cinsinden delta.

export interface EcgEffect {
  qrs_amplitude_pct?: number;   // 1.0 = değişmez, 1.15 = %15 yüksek R dalgası
  qrs_duration_ms?: number;     // delta ms — pozitif = QRS genişler
  st_elevation_mv?: number;     // delta mV — pozitif = elevasyon, negatif = depresyon
  qt_interval_ms?: number;      // delta ms — pozitif = QT uzar
  t_amplitude_pct?: number;     // 1.0 = değişmez, 1.8 = sivri T (hiperkalemi)
}

// ------------------------------------------------------------
// Vital Delta — motorun vital üzerine etki vektörü
// ------------------------------------------------------------
// Her sayı iki eleman dizisi: [min, max] aralık. Motor rastgele seçer
// veya varsayılan olarak ortayı alır. Negatif = düşürür.

export type Range = [number, number];

export interface VitalDelta {
  hr_range?: Range;             // +20..+40 beats/dk
  sbp_range?: Range;            // Sistolik
  dbp_range?: Range;            // Diyastolik
  spo2_range?: Range;           // SpO2 % (genelde küçük)
  rr_range?: Range;             // Solunum /dk
  temp_range?: Range;           // °C (genelde küçük, antipiretik için)
  glucose_range?: Range;        // mg/dL (insülin, dekstroz)
  pain_range?: Range;           // 0-10 (analjezik = negatif)
  gcs_range?: Range;            // Sedatif = negatif
}

// ------------------------------------------------------------
// Zaman parametreleri (saniye/dakika)
// ------------------------------------------------------------
// Farmakokinetik: onset → peak → duration eğrisi.
// Motor bu 3 değeri kullanarak tick başına etki yüzdesini hesaplar.

export interface PharmacokineticTiming {
  onset_sec: number;     // İlaç etkisi başlayana kadar geçen süre
  peak_min: number;      // Etkinin tepeye ulaştığı süre (dakika)
  duration_min: number;  // Toplam etki süresi (dakika)
}

// ------------------------------------------------------------
// Farmakoloji Preset — tıkla-doldur şablonları
// ------------------------------------------------------------

export interface PharmacologyPreset extends VitalDelta, PharmacokineticTiming {
  id: string;           // 'sempatomimetik-guclu'
  label: string;        // Gösterim — senaryo editörü için
  description?: string;
}

// ------------------------------------------------------------
// Doz bandı — doğru/hatalı sınırı
// ------------------------------------------------------------

export interface MedicationDoseBand {
  default_dose: number;     // Standart doz (sayısal)
  dose_unit: DoseUnit;
  dose_route: DoseRoute;
  // Kiloya göre hesaplanıyorsa (çocuklar ve kritik ilaçlar için):
  weight_based?: boolean;   // true ise default_dose aslında mg/kg
  max_single_dose?: number; // Mutlak tavan (örn. heparin 60 IU/kg ama max 4000)
  // Band
  band_lower_pct: number;   // 0.8 varsayılan
  band_upper_pct: number;   // 1.2 varsayılan
  // Bandın dışı için ceza (default_wrong_penalty ile uyumlu)
  under_dose_penalty?: number;
  over_dose_penalty?: number;
}

export type DoseUnit = "mg" | "mcg" | "g" | "IU" | "mL" | "mEq" | "mmol";

export type DoseRoute =
  | "IV_push"       // IV bolus
  | "IV_infusion"   // IV perfüzyon
  | "IM"
  | "SC"
  | "PO"
  | "SL"            // Sublingual
  | "nebul"         // Nebülizatör
  | "inhalasyon"
  | "rektal"
  | "topikal";

// ------------------------------------------------------------
// Hasta çarpanları — modifier sistemi
// ------------------------------------------------------------
// Her ilaç için opsiyonel. Motor çarpan zincirini uygular:
// gercek_etki = temel_etki × (beta_blocker ? X : 1) × (karaciger ? Y : 1) × ...

export interface MedicationModifiers {
  // Çarpan: 0 = hiç etki yok, 1 = tam etki, >1 = artmış etki
  beta_blocker?: number;       // örn. adrenalin: 0.4
  karaciger_yetm?: number;
  bobrek_yetm?: number;
  gebelik?: number;            // Sayı: çarpan. 'kontrendike' ise contraindications'a koy.
  yasli_70plus?: number;       // Age ≥ 70 ise uygulanır
  pediatrik?: number;          // Age < 18 ise uygulanır
}

// ------------------------------------------------------------
// Kontrendikasyon şeması
// ------------------------------------------------------------

export type ContraindicationSeverity = "uyari" | "orta" | "kritik";

export type ContraindicationTrigger =
  // Hasta modifier'ı tetikler (gebelik, beta_blocker altında, vb.)
  | { kind: "modifier"; modifier: keyof PatientModifiers }
  // Geçmiş/özgeçmiş anahtar kelime (astim, koah, vb.)
  | { kind: "history"; keyword: string }
  // Alerji
  | { kind: "allergy"; keyword: string }
  // Eşzamanlı başka ilaç varsa (örn. MAOi + meperidin)
  | { kind: "concurrent_med"; medication_id: string }
  // Vital eşiği (örn. SBP < 90 → nitrat verme)
  | { kind: "vital"; param: keyof PatientVitals; op: "<" | ">" | "<=" | ">="; value: number };

export interface Contraindication {
  trigger: ContraindicationTrigger;
  severity: ContraindicationSeverity;
  effect: string;                        // 'bronkospazm', 'hipotansiyon', 'solunum_depresyonu'
  effect_vitals?: VitalDelta;            // Vital üzerine anlık etki (orta/kritik için)
  grace_sec?: number;                    // Kritik: düzeltme süresi (örn. 60)
  penalty: number;                       // Puan cezası
  message: string;                       // Öğrenciye gösterilecek uyarı/popup metni
  feedback: string;                      // Debrief notu
  // Düzeltici aksiyonlar (kritik şiddette grace_sec içinde yapılırsa ceza azalır)
  antidotes?: string[];                  // Medication id'leri (örn. naloksan)
}

// ------------------------------------------------------------
// Genişletilmiş İlaç — farmakoloji motorunun kullandığı tam tip
// ------------------------------------------------------------
// NOT: Temel Medication tipi (types.ts) yalnızca kimlik ve kategori içerir.
// Motor bu ExtendedMedication'u ayrı kataloğundan okur:
// src/data/medications.ts → id bazlı.

export interface ExtendedMedication {
  id: string;                            // Medication.id ile eşleşir
  // Farmakokinetik
  preset?: string;                       // 'sempatomimetik-guclu' — PHARMACOLOGY_PRESETS
  vitals?: VitalDelta;                   // Preset override / preset yoksa tek kaynak
  timing?: PharmacokineticTiming;        // Preset override / preset yoksa tek kaynak
  // EKG etkisi — ilaç aktifken EKG dalga formunu nasıl değiştirir
  ecg_effect?: EcgEffect;
  // Dozaj
  dose_band: MedicationDoseBand;
  // Hasta özelliğine göre modifiye
  modifiers?: MedicationModifiers;
  // Kontrendikasyonlar — çoklu
  contraindications?: Contraindication[];
}

// ------------------------------------------------------------
// Aktif İlaç — runtime state (hasta sisteminde dolaşan ilaçlar)
// ------------------------------------------------------------

export interface ActiveMedication {
  instance_id: string;             // Uygulanan spesifik doz (uuid)
  medication_id: string;
  administered_at: number;         // timestamp (ms)
  dose_given: number;              // Verilen gerçek doz
  dose_unit: DoseUnit;
  // Hesaplanmış (hasta modifier'ları uygulanmış) etki
  effective_vitals: VitalDelta;    // Bu örnek için nihai delta
  // EKG etkisi — ilaç aktifken uygulanacak EKG parametre değişimleri
  effective_ecg?: EcgEffect;
  // Farmakokinetik
  timing: PharmacokineticTiming;
  // Bitiş zamanı (administered_at + duration_min). Motor bunu geçince ilaç listeden düşer.
  expires_at: number;
  // Doz band durumu
  dose_evaluation: "correct" | "under_dose" | "over_dose";
  // Bu uygulama hangi adımdan yapıldı? (izlenebilirlik için)
  source_step_id?: string;
}

// ------------------------------------------------------------
// Motor tick çıktısı
// ------------------------------------------------------------
// Her tick'te: aktif ilaçların vital üzerine kümülatif etkisini hesapla.

export interface PharmacologyTickResult {
  vitals_delta: Partial<PatientVitals>; // Bu tick'te eklenecek/çıkarılacak
  ecg_delta: EcgEffect;                 // Aktif ilaçların kümülatif EKG etkisi
  expired_instance_ids: string[];       // Bu tick'te biten ilaçlar
  active_count: number;
}

// ------------------------------------------------------------
// Uygulama sonucu — öğrenci ilaç verdiğinde motor bunu döner
// ------------------------------------------------------------

export interface MedicationAdministrationResult {
  success: boolean;                      // Triage: verildi mi, yoksa kritik kontrendikasyonla bloklandı mı
  active_instance?: ActiveMedication;    // Başarılıysa oluşan aktif kayıt
  dose_evaluation: "correct" | "under_dose" | "over_dose";
  triggered_contraindications: Contraindication[]; // Tetiklenen uyarı/orta/kritik
  points_delta: number;                  // Bu uygulamanın puan etkisi (band + kontrendikasyon)
  requires_correction?: {                // Kritik kontrendikasyon varsa
    grace_sec: number;
    expected_antidotes: string[];
    expires_at: number;
  };
}

// ------------------------------------------------------------
// Zaman ölçek yardımcısı
// ------------------------------------------------------------

export interface TimeScaleConfig {
  egitim: number;  // Varsayılan 8.0 — hızlı öğrenme modu
  klinik: number;  // Varsayılan 3.0 — gerçekçi hissi, hızlandırılmış (YENİ)
  sinav: number;   // Varsayılan 1.0 — gerçek zaman, sınav modu
}

export const DEFAULT_TIME_SCALE: TimeScaleConfig = {
  egitim: 8.0,   // 8x daha hızlı — kavram pekiştirme için
  klinik: 3.0,   // 3x — "hasta başındayım ama demo" hissi
  sinav: 1.0,    // Gerçek zaman
};

// ------------------------------------------------------------
// Zorluk filtresi yardımcı tipi (Step/Outcome filtrelemede kullanılır)
// ------------------------------------------------------------

export interface DifficultyFilterable {
  min_difficulty?: Difficulty;
  max_difficulty?: Difficulty;
}
