=== STEMI SENARYO İÇERİĞİ ===
--- stemi.ts tam yapısı (ilk 200 satır) ---
import type { Scenario } from "@/engine";

// ============================================================
// STEMI Senaryosu — Anterior STEMI, 62y Erkek
// ============================================================
// Zorluk seviyeleri 1-5 destekli.
// S1-2: Temel tanı ve ABCDE, ASA+P2Y12+heparin+PCI
// S3:   + Aort diseksiyonu ekartasyonu, kapı-balon hesabı, EKG nüansları
// S4-5: + Tikagrelor/prasugrel seçimi, sağ ventrikül/posterior MI kontrolü,
//         PCI sonrası yönetim (DAPT, statin, ACEi), komplikasyon dalı
// ============================================================

export const scenario_stemi: Scenario = {
  id: "kardiyoloji-stemi-001",
  version: "0.3.0",
  title: "62 Yaş Erkek — Akut Göğüs Ağrısı (STEMI)",
  description:
    "2 saattir süren retrosternal göğüs ağrısı, sol kola yayılan. STEMI yönetimi ve reperfüzyon kararı. Lab paralel akış, troponin kinetik, yatak başı EKO ve kardiyojenik şok yönetimi.",
  specialty: "kardiyoloji",
  tags: ["stemi", "acil", "kardiyak", "ekg", "reperfüzyon"],
  difficulty: 3,
  supported_difficulties: [1, 2, 3, 4, 5],
  estimated_minutes: 18,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ESC 2023, AHA/ACC 2022, TKD 2022 uyumlu",
  last_updated: "2026-04-23",

  // ICD-10 + SNOMED CT (REVIEWED_PENDING_ACTIVATION — kullanıcı onayı 2026-05-04)
  clinical_codes: { icd10: "I21.0", snomed_ct: "401303003" },

  patient: {
    age: 62,
    sex: "M",
    weight_kg: 84,
    height_cm: 174,
    chief_complaint:
      "2 saat önce başlayan, sol kola yayılan, sıkıştırıcı göğüs ağrısı. İstirahatte geçmiyor.",
    history_items: [
      "HT (20 yıl, düzensiz ilaç kullanımı)",
      "DM Tip 2 (8 yıl, metformin)",
      "30 paket-yıl sigara",
      "Babası 58 yaşında MI'dan ex",
    ],
    allergies: [],
    current_medications: ["Metformin 1000 mg 2x1", "Ramipril 5 mg 1x1"],
    modifiers: {
      // Farmakoloji motoru için: hasta herhangi bir özel çarpan durumunda değil.
      // (ACEi kullanımı klasik modifier'a girmez)
    },
  },

  initial_vitals: {
    hr: 104,
    bp_systolic: 148,
    bp_diastolic: 92,
    spo2: 94,
    temp: 36.7,
    rr: 22,
    pain: 8,
    glucose: 186,
    gcs: 15,
  },

  available_medications: [
    "aspirin",
    "klopidogrel",
    "tikagrelor",        // S4-5
    "prasugrel",         // S4-5
    "heparin",
    "enoksaparin",       // S3+
    "nitrogliserin",
    "metoprolol",
    "morfin",
    "fentanil",
    "tenecteplase",
    "atropin",
    "adrenalin",
    "amiodaron",         // VT/VF dalı için
    "lidokain",          // VT alternatifi
    "norepinefrin",      // Kardiyojenik şok: 1. tercih vazopressör (SOAP-II)
    "dobutamin",         // Kardiyojenik şok: inotropik destek
    "dopamin",           // Kardiyojenik şok: eski seçenek (SOAP-II'de kötü)
    "furosemid",         // Pulmoner ödem
    "atorvastatin",      // Yüksek doz statin (80 mg) — sekonder profilaksi
  ],

  available_equipment: [
    "ekg_12",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "monitor",
    "oksijen_maske",
    "iv_kateter_18g",
    "iv_kateter_20g",
    "defibrilator",
    "stetoskop",
    "ekokardiyografi",
    "kan_gazi_cihazi",
  ],

  ekg_pattern: "stemi",

  lab_panels: {
    "stemi-troponin-hs": {
      id: "stemi-troponin-hs",
      name_tr: "Troponin I hs + CK-MB (Kardiyak Belirteçler)",
      collected_at_min: 15,
      comment:
        "⚠️ STEMI tanısı klinik + EKG ile konur — troponin BEKLENMEZ. Paralel istenir, risk stratifikasyonu + infarkt boyutu için.",
      results: [
        {
          parameter: "Troponin I hs (Baseline)",
          value: 0.45,
          unit: "ng/mL",
          reference_range: "<0.04",
          flag: "HH",
          interpretation:
            "Yüksek baseline — STEMI'de beklenen erken yükseliş. Klinik+EKG tanısını destekler. Kinetik değerlendirme için 3. saatte tekrar.",
        },
        {
          parameter: "CK-MB",
          value: 78,
          unit: "U/L",
          reference_range: "<25",
          flag: "HH",
          interpretation:
            "Yükselmiş — miyokard hasarı ile uyumlu. İnfarkt boyutu ve kinetik için seri ölçüm.",
        },
      ],
    },
    "stemi-cbc-bmp": {
      id: "stemi-cbc-bmp",
      name_tr: "CBC + BMP — Kontrast Öncesi Değerlendirme",
      collected_at_min: 10,
      comment: "Hızlı acil lab — 10dk. Kontrast güvenliği + elektrolit için kritik.",
      results: [
        {
          parameter: "Hemoglobin",
          value: 13.8,
          unit: "g/dL",
          reference_range: "13.5-17.5",
          interpretation: "Normal — PCI öncesi baseline.",
        },
        {
          parameter: "WBC",
          value: 11200,
          unit: "/μL",
          reference_range: "4500-11000",
          flag: "H",
          interpretation: "Hafif yüksek — stres/inflamasyon.",
        },
        {
          parameter: "Trombosit",
          value: 218000,
          unit: "/μL",
          reference_range: "150.000-400.000",
        },
        {
          parameter: "Kreatinin (Cr)",
          value: 1.0,
          unit: "mg/dL",
          reference_range: "0.7-1.3",
          interpretation:
            "Normal — eGFR >60. Kontrast güvenli. Cr <1.5 → kontrast nefropatisi riski düşük.",
        },
        {
          parameter: "BUN",
          value: 18,
          unit: "mg/dL",
          reference_range: "7-20",
        },
        {
          parameter: "Glukoz",
          value: 165,
          unit: "mg/dL",
          reference_range: "70-110",
          flag: "H",
          interpretation:
            "Stres hiperglisemisi — DM Tip 2 hastada beklenen. Akut faz hedefi <180 mg/dL.",
        },
        {
          parameter: "Potasyum (K)",
          value: 4.3,
          unit: "mEq/L",
          reference_range: "3.5-5.0",
          interpretation:
            "Normal — aritmik aralık içinde güvenli. Hipokalemi (<3.5) VT/VF riskini artırır.",
        },
        {
          parameter: "Sodyum (Na)",
          value: 139,
          unit: "mEq/L",
          reference_range: "136-145",
        },
      ],
    },
    "stemi-coag-lipid": {
      id: "stemi-coag-lipid",

--- stemi.ts kaç satır toplam ---
1305 src/data/scenarios/stemi.ts

=== VİTAL SHAPE: vital nasıl tanımlı, tipi ne ===
10:// baseline_vitals ve active_medications eklendi.
36:  hr: number;              // Kalp hızı /dk
39:  spo2: number;            // Oksijen satürasyonu %
41:  rr: number;              // Solunum sayısı /dk
46:  // Faz 1 — genişletilmiş vitaller
56:  urine_output_ml_hr?: number;   // Saatlik idrar çıkışı mL/saat
140:  vitals_change?: Partial<PatientVitals>; // Aksiyondan sonra vitaller değişir mi (statik; dinamik için farmakoloji motoru)
247:export interface AlarmThresholds {
248:  hr_low?: number;
249:  hr_high?: number;
250:  spo2_low?: number;
265:  alarm_thresholds?: Partial<AlarmThresholds>;
324:// Senaryo yazarı tedavisiz kalan hastanın vital trendini tanımlar.
332:// Trend uygulanabilir sayısal vital alanları (boolean pupil_reactive hariç)
334:  | "hr"
337:  | "spo2"
339:  | "rr"
346:  vital: TrendableVital;
349:  /** Alt sınır — vital bunun altına inmez (kötüleşme tabanı / iyileşme hedefi) */
351:  /** Üst sınır — vital bunun üstüne çıkmaz */
365:  vital: TrendableVital;
375: * vital-eşik state-transition mantığını A'nın deterioration modeline ekler
383:  /** Vital eşik koşulu tutulunca tetikle (vital-eşik-tetikli) */
384:  when_vital?: VitalCondition;
402:      (zaman/vital-eşik tetikli durum geçişi). Verilmezse eski davranış. */
475:  initial_vitals?: Partial<PatientVitals>;
525:  initial_vitals: PatientVitals;
609:  // Baseline = ilaçsız "temel" vitaller. Canlı monitör için referans noktası.
610:  // Statik vital değişimleri (evaluateAction outcome'ı) baseline'a işler.
612:  baseline_vitals: PatientVitals;
614:  // Gösterilen (canlı) vitaller = baseline + pharmacology tick delta.
616:  vitals: PatientVitals;
620:  // (eğitim 8×) ikisine eşit uygulanır, tarayıcı tab throttling ikisini
626:  // effective_vitals, timing, expires_at). Tipe Pharmacology namespace'inden erişilir:

=== MOTOR: useScenarioRunner ne yapıyor ===
// ============================================================
// useScenarioRunner — Oynanabilir Döngü Orkestrasyonu (Faz 1)
// ============================================================
// Sanal Hasta Planı v1 §4.1 — ScenarioPlayPage'deki aksiyon/karar/
// adım/lab orkestrasyon mantığının hook'a alınmış hâli; 3D sayfa
// (/dialog-3d-demo) bunu kullanır. ScenarioPlayPage bilinçli olarak
// DOKUNULMADAN bırakıldı (regresyon riski) — sonraki sprintte o sayfa
// da bu hook'a geçirilebilir.
//
// Eklenenler (quiz oynatıcıdan farklar):
//   1. PhysiologyProvider yaşam döngüsü — session başına instance,
//      adım değişiminde notifyStepChange, aksiyonda applyIntervention.
//   2. 3D muayene politikası: eşleşmeyen "procedure"/"examine"
//      aksiyonları CEZASIZ (fizik muayene serbesttir; zaman maliyeti
//      zaten deterioration ile işler).
//   3. haltedPhaseIds React state'i — oskültasyon resolved ses geçişi
//      ve UI göstergeleri için reaktif sinyal.
// ============================================================

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  startSession,
  getCurrentStep,
  evaluateAction,
  evaluateDecision,
  evaluateDecisionMulti,
  completeStep,
  finalizeSession,
  applyVitalsChange,
  pickNextStep,
  resolveScenarioVariant,
  getEffectiveDelaySec,
  createSimplePhysiologyProvider,
  type SessionState,
  type ActionRef,
  type DecisionOption,
  type PlayMode,
  type Difficulty,
  type Scenario,
  type Step,
  type PhysiologyProvider,
} from "@/engine";
import { getExtendedMedication } from "@/data/medications-extended";
import { administerMedication } from "@/engine/pharmacology/engine";
import { getMedication } from "@/data/medications";
import { useVitalsTick } from "@/hooks/useVitalsTick";
import { useLabResults } from "@/hooks/useLabResults";
import { useFeedback } from "@/components/FeedbackToast";
import {
  buildCriticalInfo,
  type CriticalContraindicationInfo,
} from "@/components/CriticalContraindicationModal";

interface UseScenarioRunnerParams {
  scenario: Scenario | undefined;
  /** Otomatik başlatma modu — verilirse mount/senaryo değişiminde session açılır */
  autoStartMode?: PlayMode;
  /**
   * Fizyoloji sağlayıcısı (deterioration + TEK SAAT) açık mı.
   * Default: true (3D pahalı katman). 2D quiz katmanı `false` geçer —
   * statik baseline + wall-clock farmakoloji (eski ScenarioPlayPage davranışı).
   */
  enablePhysiology?: boolean;
  /**
   * Muayene/prosedür politikası.
   * "free" (default, 3D): senaryoda karşılığı olmayan examine/procedure
   *   cezasız (fizik muayene serbest; zaman maliyeti deterioration ile işler).
   * "penalize" (2D quiz): eşleşmeyen aksiyon normal puanlanır (eski davranış).
   */
  examPolicy?: "free" | "penalize";
  /**
   * Pharma puan farkını feedback metnine ekle ("(Farmakoloji: -X …)").
   * Default: false (3D). 2D quiz `true` geçer (eski ScenarioPlayPage metni).
   */
  pharmaFeedbackText?: boolean;
}

export interface LabCountdownInfo {
  panelId: string;
  panelName: string;
  delaySec: number;
}

export function useScenarioRunner({
  scenario,
  autoStartMode,
  enablePhysiology = true,
  examPolicy = "free",
  pharmaFeedbackText = false,
}: UseScenarioRunnerParams) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [actionsThisStep, setActionsThisStep] = useState<ActionRef[]>([]);
  // min_actions sayacı: serbest muayene (eşleşmeyen examine/procedure)
  // SAYILMAZ — 3 stetoskop ile adım atlanamasın. Tam liste (actionsThisStep)
  // debrief zaman çizelgesi için korunur.
  const [scoredActionsThisStep, setScoredActionsThisStep] = useState(0);
  const [pointsThisStep, setPointsThisStep] = useState(0);
  const [criticalErrorsThisStep, setCriticalErrorsThisStep] = useState(0);
  const [decisionAnswered, setDecisionAnswered] = useState<{
    optionId: string;
    feedback: string;
  } | null>(null);
  const [decisionMultiAnswered, setDecisionMultiAnswered] = useState<{
    optionIds: string[];
    feedback: string;
  } | null>(null);
  const [criticalInfo, setCriticalInfo] =
    useState<CriticalContraindicationInfo | null>(null);
  const [openLabPanelId, setOpenLabPanelId] = useState<string | null>(null);
  const [openImagingId, setOpenImagingId] = useState<string | null>(null);
  const [labCountdownInfo, setLabCountdownInfo] =
    useState<LabCountdownInfo | null>(null);
  // Reaktif fizyoloji sinyali — oskültasyon resolved ses geçişi bunu izler
  const [haltedPhaseIds, setHaltedPhaseIds] = useState<string[]>([]);

  const { feedback, show, clear } = useFeedback();

  const resolvedScenario = useMemo(
    () =>
      scenario
        ? resolveScenarioVariant(scenario, session?.variant_id)
        : undefined,
    [scenario, session?.variant_id]
  );
  const rs = resolvedScenario;

  // ----- PhysiologyProvider yaşam döngüsü — session başına bir instance.
  // useRef + session kimliği: restart'ta yeni provider, tick'lerde aynısı.
  const providerRef = useRef<{
    key: string;
    provider: PhysiologyProvider;
  } | null>(null);

  const provider = useMemo(() => {
    if (!enablePhysiology || !rs || !session) return null;
    const key = `${rs.id}:${session.started_at}`;
    if (providerRef.current?.key !== key) {
      providerRef.current = {
        key,
        provider: createSimplePhysiologyProvider(rs),
      };
    }
    return providerRef.current.provider;
  }, [rs, session]);

  // Adım değişimini sağlayıcıya bildir (active_from_step_id tetikleyicileri)
  useEffect(() => {
    if (provider && session?.current_step_id !== undefined) {
      provider.notifyStepChange(session.current_step_id);
    }

=== VİTALLER ŞU AN NASIL DEĞİŞİYOR ===
src/engine/pharmacology/engine.ts:7://   2. tick — Aktif ilaçların her tick'teki vital katkısını hesapla
src/engine/pharmacology/engine.ts:420: *   A) Baseline'ı ayrı tut, her tick'te baseline + Σdelta yeniden hesapla
src/engine/pharmacology/engine.ts:423: * DOĞRU olan: A. Baseline ayrı tutulur, tick her seferinde tam hesaplar.
src/engine/pharmacology/engine.ts:424: * Bu yüzden tick çıktısı baseline'a eklenecek delta'dır.
src/engine/pharmacology/engine.ts:426:export function tick(params: {
src/engine/pharmacology/engine.ts:485: * Baseline vitaller + tick delta'sı = gösterilecek canlı vitaller.
src/engine/pharmacology/engine.ts:486: * UI bunu her tick'te çağırır.
src/engine/pharmacology/engine.ts:518: * Tick hızını mod'a göre ayarla. Eğitim modunda 3x hızlı tick.
src/engine/pharmacology/engine.ts:519: * Kullanım: setInterval(tick, getTickIntervalMs(baseMs, mode, override))
src/engine/pharmacology/types.ts:54:// Motor bu 3 değeri kullanarak tick başına etki yüzdesini hesaplar.
src/engine/pharmacology/types.ts:200:// Motor tick çıktısı
src/engine/pharmacology/types.ts:202:// Her tick'te: aktif ilaçların vital üzerine kümülatif etkisini hesapla.
src/engine/pharmacology/types.ts:205:  vitals_delta: Partial<PatientVitals>; // Bu tick'te eklenecek/çıkarılacak
src/engine/pharmacology/types.ts:207:  expired_instance_ids: string[];       // Bu tick'te biten ilaçlar
src/engine/physiology.ts:9:// SimplePhysiologyProvider: senaryonun `deterioration` fazlarını
src/engine/physiology.ts:11:// motorunun tick delta'sı baseline'ın ÜSTÜNE eklenir (useVitalsTick).
src/engine/physiology.ts:34:  /** Bir tick'lik trend uygula. dtSec = simüle edilen saniye. Yeni vitals döner. */
src/engine/physiology.ts:35:  tick(vitals: PatientVitals, dtSec: number): PatientVitals;
src/engine/physiology.ts:112:  const phases: DeteriorationPhase[] = scenario.deterioration ?? [];
src/engine/physiology.ts:131:    tick(vitals, dtSec) {

=== FARMAKOLOJİ MOTORU ===
total 52
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 May  2 23:49 .
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 Jun 14 17:04 ..
-rw-r--r-- 1 Mehmet Ali Yılık 197121 21429 May  2 23:49 engine.ts
-rw-r--r-- 1 Mehmet Ali Yılık 197121 10289 May  2 23:49 presets.ts
-rw-r--r-- 1 Mehmet Ali Yılık 197121 11425 May  2 23:49 types.ts
src/engine/pharmacology/engine.ts:43:export function evaluateDose(
src/engine/pharmacology/engine.ts:71:export function getDosePenalty(
src/engine/pharmacology/engine.ts:90:export function computeEffectMultiplier(
src/engine/pharmacology/engine.ts:129:export function applyMultiplierToDelta(
src/engine/pharmacology/engine.ts:158:export function evaluateTrigger(
src/engine/pharmacology/engine.ts:204:export function checkContraindications(
src/engine/pharmacology/engine.ts:231:export function administerMedication(params: {
src/engine/pharmacology/engine.ts:354:export function computeProgress(
src/engine/pharmacology/engine.ts:426:export function tick(params: {
src/engine/pharmacology/engine.ts:488:export function computeLiveVitals(
src/engine/pharmacology/engine.ts:521:export function getTickIntervalMs(
src/engine/pharmacology/presets.ts:23:export const PHARMACOLOGY_PRESETS: Record<string, PharmacologyPreset> = {
src/engine/pharmacology/presets.ts:305:export function getPreset(
src/engine/pharmacology/presets.ts:311:export function listPresets(): PharmacologyPreset[] {
src/engine/pharmacology/presets.ts:316:export const PRESET_GROUPS = {
src/engine/pharmacology/types.ts:22:export interface EcgEffect {
src/engine/pharmacology/types.ts:36:export type Range = [number, number];
src/engine/pharmacology/types.ts:38:export interface VitalDelta {
src/engine/pharmacology/types.ts:56:export interface PharmacokineticTiming {
src/engine/pharmacology/types.ts:66:export interface PharmacologyPreset extends VitalDelta, PharmacokineticTiming {

=== HASTA 3D mevcut ===
total 148
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 Jun 15 01:10 .
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 Jun 15 23:44 ..
-rw-r--r-- 1 Mehmet Ali Yılık 197121 10043 Jun 13 15:49 AnatomicPatientModel.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121 10456 Jun 13 23:13 AnimatedPatientModel.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121  8334 Jun 13 14:57 CompactVitalsHUD.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121  3845 Jun 13 15:59 InspectionPanel.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121  8503 Jun 13 06:45 LICENSE-3D.md
-rw-r--r-- 1 Mehmet Ali Yılık 197121  8585 Jun 13 15:59 PatientBody3D.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121 19808 Jun 15 01:10 PatientRoomScene.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121  1457 May 16 02:28 RegionMarker.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121  4944 Jun 14 16:36 VentilatorDevice.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121  2047 May 20 18:46 auscultationAudio.ts
-rw-r--r-- 1 Mehmet Ali Yılık 197121  6812 Jun 14 01:25 equipmentMeshes.ts
-rw-r--r-- 1 Mehmet Ali Yılık 197121  3377 Jun 13 14:42 patientModels.ts
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 Jun 13 16:00 procedures
-rw-r--r-- 1 Mehmet Ali Yılık 197121 10488 Jun 13 16:00 regions.ts
-rw-r--r-- 1 Mehmet Ali Yılık 197121  1698 Jun 12 23:57 scenarioRegions.ts
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 Jun 13 15:49 shaders
src/components/patient-3d/AnatomicPatientModel.tsx
src/components/patient-3d/AnimatedPatientModel.tsx
src/components/patient-3d/LICENSE-3D.md
src/components/patient-3d/PatientBody3D.tsx
src/components/patient-3d/patientModels.ts
src/components/patient-3d/PatientRoomScene.tsx
src/components/patient-3d/procedures/PulseOxProcedure.tsx
src/components/patient-3d/procedures/useProcedureAnimation.ts
src/components/patient-3d/shaders/patientShader.ts

=== MONİTÖR ===
total 80
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 Jun 14 15:48 .
drwxr-xr-x 1 Mehmet Ali Yılık 197121     0 Jun 15 23:44 ..
-rw-r--r-- 1 Mehmet Ali Yılık 197121 24408 Jun 14 15:48 VitalMonitorScreen.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121 11638 Jun 14 02:01 WaveLane.tsx
-rw-r--r-- 1 Mehmet Ali Yılık 197121  1907 Jun 14 02:09 adapter.ts
-rw-r--r-- 1 Mehmet Ali Yılık 197121  6224 Jun 14 03:39 waveform-data.ts
-rw-r--r-- 1 Mehmet Ali Yılık 197121 16439 Jun 14 03:35 waveform-engine.ts
