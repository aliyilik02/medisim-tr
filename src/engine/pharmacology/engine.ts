// ============================================================
// MediSim TR — Farmakoloji Motoru
// ============================================================
// İlaç uygulandığında ne olur? 4 ana iş:
//   1. administerMedication — Doz değerlendirme + kontrendikasyon +
//      modifier uygulaması → ActiveMedication oluştur
//   2. tick — Aktif ilaçların her tick'teki vital katkısını hesapla
//      (onset → peak → duration eğrisi)
//   3. Kontrendikasyon tetikleme — hasta durumuna göre eşleşme
//   4. Modifier zinciri — hasta özelliklerine göre etki çarpanı
//
// Bu motor saf fonksiyonel: girdi al, çıktı dön. React/UI bağımsız.
// ============================================================

import type {
  PatientVitals,
  Patient,
} from "../types";
import type {
  ExtendedMedication,
  ActiveMedication,
  Contraindication,
  ContraindicationTrigger,
  MedicationAdministrationResult,
  PharmacologyTickResult,
  VitalDelta,
  PharmacokineticTiming,
  Range,
  MedicationDoseBand,
} from "./types";
import type { MedicationTimingOverride } from "../types";
import { PHARMACOLOGY_PRESETS } from "./presets";

// ============================================================
// 1. Doz değerlendirme
// ============================================================

/**
 * Verilen dozun band içinde olup olmadığını belirler.
 * Kiloya bağlı dozlar için patient_weight_kg kullanılır.
 */
export function evaluateDose(
  givenDose: number,
  band: MedicationDoseBand,
  patientWeightKg?: number
): "correct" | "under_dose" | "over_dose" {
  // Hedef dozu hesapla (kiloya bağlı ise default_dose = mg/kg)
  let targetDose = band.default_dose;
  if (band.weight_based && patientWeightKg) {
    targetDose = band.default_dose * patientWeightKg;
    // Max tek doz sınırı uygula (örn. heparin 60 IU/kg maks 4000 IU)
    if (band.max_single_dose && targetDose > band.max_single_dose) {
      targetDose = band.max_single_dose;
    }
  }

  const lowerBound = targetDose * band.band_lower_pct;
  const upperBound = targetDose * band.band_upper_pct;

  if (givenDose < lowerBound) return "under_dose";
  if (givenDose > upperBound) return "over_dose";
  return "correct";
}

/**
 * Doz değerlendirmesine göre puan hesapla.
 * Correct: 0 (ana puan outcome'dan gelir, band cezalandırma amaçlı)
 * Under/over: band.under_dose_penalty / over_dose_penalty
 */
export function getDosePenalty(
  evaluation: "correct" | "under_dose" | "over_dose",
  band: MedicationDoseBand
): number {
  if (evaluation === "correct") return 0;
  if (evaluation === "under_dose") return band.under_dose_penalty ?? -5;
  return band.over_dose_penalty ?? -5;
}

// ============================================================
// 2. Modifier zinciri — hasta özelliklerine göre etki çarpanı
// ============================================================

/**
 * Hastanın aktif modifier'larını göz önünde bulundurarak etki çarpanını
 * hesaplar. Çarpan zinciri: tüm aktif modifier'lar çarpılır.
 * Örnek: hasta beta-bloker altında + 70 yaş üstü →
 *   0.4 × 0.7 = 0.28 (etki %28'e iner)
 */
export function computeEffectMultiplier(
  medication: ExtendedMedication,
  patient: Patient
): number {
  if (!medication.modifiers) return 1.0;

  let multiplier = 1.0;
  const mods = medication.modifiers;
  const patientMods = patient.modifiers ?? {};

  // Modifier flag'i hastada açıksa, ilaçtaki değerini çarpana dahil et
  if (patientMods.beta_blocker && mods.beta_blocker !== undefined) {
    multiplier *= mods.beta_blocker;
  }
  if (patientMods.karaciger_yetm && mods.karaciger_yetm !== undefined) {
    multiplier *= mods.karaciger_yetm;
  }
  if (patientMods.bobrek_yetm && mods.bobrek_yetm !== undefined) {
    multiplier *= mods.bobrek_yetm;
  }
  if (patientMods.gebelik && mods.gebelik !== undefined) {
    multiplier *= mods.gebelik;
  }

  // Yaş türetilen modifier'lar
  if (patient.age >= 70 && mods.yasli_70plus !== undefined) {
    multiplier *= mods.yasli_70plus;
  }
  if (patient.age < 18 && mods.pediatrik !== undefined) {
    multiplier *= mods.pediatrik;
  }

  return multiplier;
}

/**
 * Modifier çarpanını VitalDelta'ya uygula.
 * Her vital aralığının her iki ucunu da çarpar (aralık korunur).
 */
export function applyMultiplierToDelta(
  delta: VitalDelta,
  multiplier: number
): VitalDelta {
  const scaled: VitalDelta = {};
  const scale = (range?: Range): Range | undefined =>
    range ? [range[0] * multiplier, range[1] * multiplier] : undefined;

  scaled.hr_range = scale(delta.hr_range);
  scaled.sbp_range = scale(delta.sbp_range);
  scaled.dbp_range = scale(delta.dbp_range);
  scaled.spo2_range = scale(delta.spo2_range);
  scaled.rr_range = scale(delta.rr_range);
  scaled.temp_range = scale(delta.temp_range);
  scaled.glucose_range = scale(delta.glucose_range);
  scaled.pain_range = scale(delta.pain_range);
  scaled.gcs_range = scale(delta.gcs_range);

  return scaled;
}

// ============================================================
// 3. Kontrendikasyon tetikleme
// ============================================================

/**
 * Bir kontrendikasyon tetiğinin mevcut hasta/vital durumunda aktif olup
 * olmadığını kontrol eder.
 */
export function evaluateTrigger(
  trigger: ContraindicationTrigger,
  patient: Patient,
  vitals: PatientVitals,
  activeMedicationIds: string[]
): boolean {
  switch (trigger.kind) {
    case "modifier": {
      const patientMods = patient.modifiers ?? {};
      return patientMods[trigger.modifier] === true;
    }
    case "history": {
      const keyword = trigger.keyword.toLowerCase();
      return patient.history_items.some((h) =>
        h.toLowerCase().includes(keyword)
      );
    }
    case "allergy": {
      const keyword = trigger.keyword.toLowerCase();
      return patient.allergies.some((a) =>
        a.toLowerCase().includes(keyword)
      );
    }
    case "concurrent_med": {
      return activeMedicationIds.includes(trigger.medication_id);
    }
    case "vital": {
      const value = vitals[trigger.param];
      if (value === undefined) return false;
      switch (trigger.op) {
        case "<":
          return value < trigger.value;
        case ">":
          return value > trigger.value;
        case "<=":
          return value <= trigger.value;
        case ">=":
          return value >= trigger.value;
      }
    }
  }
}

/**
 * İlacın tüm kontrendikasyonlarını kontrol edip tetiklenenleri döndürür.
 */
export function checkContraindications(
  medication: ExtendedMedication,
  patient: Patient,
  vitals: PatientVitals,
  activeMedicationIds: string[]
): Contraindication[] {
  if (!medication.contraindications) return [];
  return medication.contraindications.filter((c) =>
    evaluateTrigger(c.trigger, patient, vitals, activeMedicationIds)
  );
}

// ============================================================
// 4. İlaç uygulama — ana giriş noktası
// ============================================================

/**
 * Öğrenci bir ilaç uyguladığında motor bunu çağırır:
 *   - Dozu değerlendirir
 *   - Kontrendikasyonları kontrol eder
 *   - Modifier'ları uygular
 *   - Vital etkisini hesaplar
 *   - ActiveMedication kaydı döner
 *
 * Kritik kontrendikasyon varsa: aktif kayıt yine oluşturulur
 * (hasta ilacı aldı çünkü) ama requires_correction alanı doldurulur.
 */
export function administerMedication(params: {
  medication: ExtendedMedication;
  doseGiven: number;
  patient: Patient;
  vitals: PatientVitals;
  activeMedicationIds: string[];
  sourceStepId?: string;
  now?: number;
  // Senaryo yazarının bu ilaç için belirlediği timing override.
  // Null/undefined ise ilacın kendi timing değerleri kullanılır.
  timingOverride?: MedicationTimingOverride;
}): MedicationAdministrationResult {
  const {
    medication,
    doseGiven,
    patient,
    vitals,
    activeMedicationIds,
    sourceStepId,
    now = Date.now(),
    timingOverride,
  } = params;

  // 1. Doz değerlendirme
  const doseEval = evaluateDose(
    doseGiven,
    medication.dose_band,
    patient.weight_kg
  );
  const dosePenalty = getDosePenalty(doseEval, medication.dose_band);

  // 2. Kontrendikasyon kontrolü
  const triggered = checkContraindications(
    medication,
    patient,
    vitals,
    activeMedicationIds
  );

  const contraPenalty = triggered.reduce((sum, c) => sum + c.penalty, 0);
  const criticalContra = triggered.find((c) => c.severity === "kritik");

  // 3. Farmakokinetik verileri hazırla (preset veya direct)
  const resolved = resolveEffects(medication);
  const vitalsDelta = resolved.vitalsDelta;
  // Senaryo override varsa timing üzerine yaz (verilen alanlar geçersiz kılar)
  const timing: PharmacokineticTiming = {
    onset_sec: timingOverride?.onset_sec ?? resolved.timing.onset_sec,
    peak_min: timingOverride?.peak_min ?? resolved.timing.peak_min,
    duration_min: timingOverride?.duration_min ?? resolved.timing.duration_min,
  };

  // 4. Modifier zinciri uygula
  const multiplier = computeEffectMultiplier(medication, patient);
  let effectiveDelta = applyMultiplierToDelta(vitalsDelta, multiplier);

  // 5. Doz band'ı etkiye uygula
  // Under_dose = etki %50'ye iner; over_dose = %140'a çıkar
  // (Sezgisel; literatürde doz-cevap eğrisi nonlinear ama bu simülatör için yeterli)
  if (doseEval === "under_dose") {
    effectiveDelta = applyMultiplierToDelta(effectiveDelta, 0.5);
  } else if (doseEval === "over_dose") {
    effectiveDelta = applyMultiplierToDelta(effectiveDelta, 1.4);
  }

  // 6. Kontrendikasyon anlık vital etkisini birleştir (orta/kritik şiddet)
  for (const c of triggered) {
    if (c.effect_vitals) {
      effectiveDelta = mergeVitalDelta(effectiveDelta, c.effect_vitals);
    }
  }

  // 7. ActiveMedication kaydı
  const expiresAt = now + timing.duration_min * 60 * 1000;
  const activeInstance: ActiveMedication = {
    instance_id: generateInstanceId(medication.id, now),
    medication_id: medication.id,
    administered_at: now,
    dose_given: doseGiven,
    dose_unit: medication.dose_band.dose_unit,
    effective_vitals: effectiveDelta,
    timing,
    expires_at: expiresAt,
    dose_evaluation: doseEval,
    source_step_id: sourceStepId,
  };

  // 8. Sonuç
  const result: MedicationAdministrationResult = {
    success: true,
    active_instance: activeInstance,
    dose_evaluation: doseEval,
    triggered_contraindications: triggered,
    points_delta: dosePenalty + contraPenalty,
  };

  if (criticalContra) {
    const graceSec = criticalContra.grace_sec ?? 60;
    result.requires_correction = {
      grace_sec: graceSec,
      expected_antidotes: criticalContra.antidotes ?? [],
      expires_at: now + graceSec * 1000,
    };
  }

  return result;
}

// ============================================================
// 5. Tick — her zaman diliminde vital güncellemesi
// ============================================================

/**
 * Bir ilacın ilerleme yüzdesini farmakokinetik eğrisine göre hesaplar:
 *   0 ... onset_sec     → 0 (henüz başlamadı)
 *   onset ... peak      → lineer 0→1
 *   peak ... (duration-peak) → 1 (plato)
 *   son üçte bir        → lineer 1→0 (temizleniyor)
 *
 * Basit ama klinik olarak makul bir yaklaşım.
 * Daha ileri: bi-eksponansiyel eğri ama bu fazla olur.
 */
export function computeProgress(
  elapsedSec: number,
  timing: PharmacokineticTiming
): number {
  const peakSec = timing.peak_min * 60;
  const durationSec = timing.duration_min * 60;
  const declineStartSec = durationSec * 0.66;

  if (elapsedSec < timing.onset_sec) return 0;
  if (elapsedSec >= durationSec) return 0;

  // Yükselme
  if (elapsedSec < peakSec) {
    const t = (elapsedSec - timing.onset_sec) / (peakSec - timing.onset_sec);
    return Math.max(0, Math.min(1, t));
  }

  // Plato
  if (elapsedSec < declineStartSec) return 1;

  // Düşüş
  const t = (elapsedSec - declineStartSec) / (durationSec - declineStartSec);
  return Math.max(0, Math.min(1, 1 - t));
}

/**
 * VitalDelta aralığının ortasını alıp, progress ile ölçekler.
 * (Rastgele seçim yerine deterministik orta — test edilebilirlik için.)
 */
function deltaAtProgress(
  delta: VitalDelta,
  progress: number
): Partial<PatientVitals> {
  const result: Partial<PatientVitals> = {};
  const midScale = (r?: Range): number | undefined =>
    r ? ((r[0] + r[1]) / 2) * progress : undefined;

  const hr = midScale(delta.hr_range);
  if (hr !== undefined) result.hr = hr;
  const sbp = midScale(delta.sbp_range);
  if (sbp !== undefined) result.bp_systolic = sbp;
  const dbp = midScale(delta.dbp_range);
  if (dbp !== undefined) result.bp_diastolic = dbp;
  const spo2 = midScale(delta.spo2_range);
  if (spo2 !== undefined) result.spo2 = spo2;
  const rr = midScale(delta.rr_range);
  if (rr !== undefined) result.rr = rr;
  const temp = midScale(delta.temp_range);
  if (temp !== undefined) result.temp = temp;
  const glucose = midScale(delta.glucose_range);
  if (glucose !== undefined) result.glucose = glucose;
  const pain = midScale(delta.pain_range);
  if (pain !== undefined) result.pain = pain;
  const gcs = midScale(delta.gcs_range);
  if (gcs !== undefined) result.gcs = gcs;

  return result;
}

/**
 * Tick fonksiyonu: şu anki zaman için aktif ilaçların toplam vital etkisini
 * hesaplar. Dönen delta zaten kümülatiftir (tüm aktif ilaçlar toplanmış).
 *
 * NOT: Bu delta "baseline'dan sapma"dır. Yani vital baseline + delta =
 * şu anki vital. Motor bunu SessionState.vitals üzerinde nasıl uygular?
 * İki yaklaşım var:
 *   A) Baseline'ı ayrı tut, her tick'te baseline + Σdelta yeniden hesapla
 *   B) Mevcut vital'e ekle/çıkar (ama bu ilaç bitince eski vital'e dönmez)
 *
 * DOĞRU olan: A. Baseline ayrı tutulur, tick her seferinde tam hesaplar.
 * Bu yüzden tick çıktısı baseline'a eklenecek delta'dır.
 */
export function tick(params: {
  activeMedications: ActiveMedication[];
  now: number;
}): PharmacologyTickResult {
  const { activeMedications, now } = params;

  const cumulativeDelta: Partial<PatientVitals> = {};
  const expiredIds: string[] = [];
  let activeCount = 0;

  for (const med of activeMedications) {
    if (now >= med.expires_at) {
      expiredIds.push(med.instance_id);
      continue;
    }

    const elapsedSec = (now - med.administered_at) / 1000;
    const progress = computeProgress(elapsedSec, med.timing);

    if (progress === 0) continue;

    activeCount++;
    const contribution = deltaAtProgress(med.effective_vitals, progress);
    addToCumulative(cumulativeDelta, contribution);
  }

  return {
    vitals_delta: cumulativeDelta,
    expired_instance_ids: expiredIds,
    active_count: activeCount,
  };
}

/**
 * Baseline vitaller + tick delta'sı = gösterilecek canlı vitaller.
 * UI bunu her tick'te çağırır.
 */
export function computeLiveVitals(
  baseline: PatientVitals,
  delta: Partial<PatientVitals>
): PatientVitals {
  return {
    hr: roundVital(baseline.hr + (delta.hr ?? 0)),
    bp_systolic: roundVital(baseline.bp_systolic + (delta.bp_systolic ?? 0)),
    bp_diastolic: roundVital(
      baseline.bp_diastolic + (delta.bp_diastolic ?? 0)
    ),
    spo2: clampVital(baseline.spo2 + (delta.spo2 ?? 0), 0, 100),
    temp: +(baseline.temp + (delta.temp ?? 0)).toFixed(1),
    rr: roundVital(baseline.rr + (delta.rr ?? 0)),
    pain: baseline.pain !== undefined
      ? clampVital((baseline.pain ?? 0) + (delta.pain ?? 0), 0, 10)
      : undefined,
    glucose: baseline.glucose !== undefined
      ? roundVital((baseline.glucose ?? 0) + (delta.glucose ?? 0))
      : undefined,
    gcs: baseline.gcs !== undefined
      ? clampVital((baseline.gcs ?? 0) + (delta.gcs ?? 0), 3, 15)
      : undefined,
  };
}

// ============================================================
// 6. Zaman ölçek (eğitim vs sınav)
// ============================================================

/**
 * Tick hızını mod'a göre ayarla. Eğitim modunda 3x hızlı tick.
 * Kullanım: setInterval(tick, getTickIntervalMs(baseMs, mode, override))
 */
export function getTickIntervalMs(
  baseIntervalMs: number,
  mode: "egitim" | "klinik" | "sinav",
  override?: { egitim?: number; klinik?: number; sinav?: number }
): number {
  const defaultScale = { egitim: 8.0, klinik: 3.0, sinav: 1.0 };
  const scale =
    (override?.[mode] ?? defaultScale[mode]);
  return baseIntervalMs / scale;
}

// ============================================================
// Yardımcı fonksiyonlar (modül-içi)
// ============================================================

/**
 * Preset varsa preset'ten türet, override varsa üstüne yaz.
 * Preset yoksa direkt ilaç alanlarını kullan.
 */
function resolveEffects(med: ExtendedMedication): {
  vitalsDelta: VitalDelta;
  timing: PharmacokineticTiming;
} {
  let vitalsDelta: VitalDelta = {};
  let timing: PharmacokineticTiming = {
    onset_sec: 60,
    peak_min: 5,
    duration_min: 20,
  };

  if (med.preset) {
    const preset = PHARMACOLOGY_PRESETS[med.preset];
    if (preset) {
      vitalsDelta = {
        hr_range: preset.hr_range,
        sbp_range: preset.sbp_range,
        dbp_range: preset.dbp_range,
        spo2_range: preset.spo2_range,
        rr_range: preset.rr_range,
        temp_range: preset.temp_range,
        glucose_range: preset.glucose_range,
        pain_range: preset.pain_range,
        gcs_range: preset.gcs_range,
      };
      timing = {
        onset_sec: preset.onset_sec,
        peak_min: preset.peak_min,
        duration_min: preset.duration_min,
      };
    }
  }

  // Override: ilaçta açıkça tanımlıysa preset'in üstüne yaz
  if (med.vitals) {
    vitalsDelta = { ...vitalsDelta, ...med.vitals };
  }
  if (med.timing) {
    timing = { ...timing, ...med.timing };
  }

  return { vitalsDelta, timing };
}

/** İki VitalDelta'yı birleştir (toplama) — kontrendikasyon etkisi için */
function mergeVitalDelta(a: VitalDelta, b: VitalDelta): VitalDelta {
  const add = (x?: Range, y?: Range): Range | undefined => {
    if (!x && !y) return undefined;
    if (!x) return y;
    if (!y) return x;
    return [x[0] + y[0], x[1] + y[1]];
  };
  return {
    hr_range: add(a.hr_range, b.hr_range),
    sbp_range: add(a.sbp_range, b.sbp_range),
    dbp_range: add(a.dbp_range, b.dbp_range),
    spo2_range: add(a.spo2_range, b.spo2_range),
    rr_range: add(a.rr_range, b.rr_range),
    temp_range: add(a.temp_range, b.temp_range),
    glucose_range: add(a.glucose_range, b.glucose_range),
    pain_range: add(a.pain_range, b.pain_range),
    gcs_range: add(a.gcs_range, b.gcs_range),
  };
}

function addToCumulative(
  target: Partial<PatientVitals>,
  src: Partial<PatientVitals>
): void {
  for (const key of Object.keys(src) as Array<keyof PatientVitals>) {
    const v = src[key];
    if (v === undefined) continue;
    target[key] = (target[key] ?? 0) + v;
  }
}

function generateInstanceId(medId: string, now: number): string {
  // Basit deterministik id — backend'de uuid kullanırız
  return `${medId}-${now}-${Math.floor(Math.random() * 1000)}`;
}

function roundVital(n: number): number {
  return Math.round(n);
}

function clampVital(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
