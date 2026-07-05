=== MOD SİSTEMİ VAR MI (mode/exam/practice geçen) ===
src/engine/engine.ts:16:  PlayMode,
src/engine/engine.ts:43:  mode: PlayMode,
src/engine/engine.ts:44:  difficulty?: Difficulty,
src/engine/engine.ts:51:    mode,
src/engine/engine.ts:52:    selected_difficulty: difficulty ?? scenario.difficulty,
src/engine/engine.ts:102:  difficulty?: Difficulty
src/engine/engine.ts:114:  // Seçili zorluk — verilmemişse senaryonun kendi difficulty'si
src/engine/engine.ts:115:  const selectedDiff: Difficulty = difficulty ?? scenario.difficulty;
src/engine/engine.ts:119:    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, selectedDiff)
src/engine/engine.ts:168: * min_difficulty: bu seviyeden itibaren görünür
src/engine/engine.ts:169: * max_difficulty: bu seviyeye kadar (dahil) görünür
src/engine/engine.ts:187:  difficulty: Difficulty
src/engine/engine.ts:190:    isVisibleAtDifficulty(s.min_difficulty, s.max_difficulty, difficulty)
src/engine/engine.ts:200:  difficulty: Difficulty
src/engine/engine.ts:204:    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, difficulty)
src/engine/engine.ts:221:  difficulty?: Difficulty,
src/engine/engine.ts:227:    difficulty ?? scenario?.difficulty ?? 3;
src/engine/engine.ts:237:      option.min_difficulty,
src/engine/engine.ts:238:      option.max_difficulty,
src/engine/engine.ts:346:  difficulty?: Difficulty,
src/engine/engine.ts:351:  const selectedDiff: Difficulty = difficulty ?? scenario?.difficulty ?? 3;
src/engine/engine.ts:354:    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, selectedDiff)
src/engine/engine.ts:408:  difficulty?: Difficulty
src/engine/engine.ts:410:  const selectedDiff: Difficulty = difficulty ?? scenario.difficulty;
src/engine/engine.ts:418:        isVisibleAtDifficulty(s.min_difficulty, s.max_difficulty, selectedDiff)

=== useScenarioRunner TAM İMZA ===
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

=== SCENARIO PLAY / PAGE dosyaları ===
src/pages/ScenarioBedPlayPage.tsx
src/pages/ScenarioPlayPage.tsx

=== PUANLAMA (score/puan) engine ===
src/engine/engine.ts
src/engine/grading.ts
src/engine/pharmacology/engine.ts
src/engine/pharmacology/types.ts
src/engine/types.ts

=== applyIntervention / aksiyon işleme ===
src/engine/pharmacology/engine.ts:5://   1. administerMedication — Doz değerlendirme + kontrendikasyon +
src/engine/pharmacology/engine.ts:231:export function administerMedication(params: {
src/engine/physiology.ts:39:  applyIntervention(vitals: PatientVitals, action: ActionRef): PatientVitals;
src/engine/physiology.ts:175:    applyIntervention(vitals, action) {
src/engine/pulse-physiology.ts:186:    applyIntervention(vitals, action) {
src/engine/pulse-physiology.ts:197:      return fallback.applyIntervention(vitals, action);
src/hooks/useScenarioRunner.ts:12://      adım değişiminde notifyStepChange, aksiyonda applyIntervention.
src/hooks/useScenarioRunner.ts:44:import { administerMedication } from "@/engine/pharmacology/engine";
src/hooks/useScenarioRunner.ts:235:  const handleAction = useCallback(
src/hooks/useScenarioRunner.ts:241:        provider.applyIntervention(session.vitals, action);
src/hooks/useScenarioRunner.ts:270:          const result = administerMedication({
src/hooks/useScenarioRunner.ts:478:        handleAction({ type: "order_test", target_id: panelId });
src/hooks/useScenarioRunner.ts:485:    [rs, currentStep, handleAction, orderLab, session?.mode]
src/hooks/useScenarioRunner.ts:532:  const handleActionStepContinue = useCallback(
src/hooks/useScenarioRunner.ts:605:    handleAction,

=== DeteriorationPhase tipi ===
src/engine/types.ts:355:/** Bir aksiyonun deterioration fazını durdurup durdurmadığını tarif eder.
src/engine/types.ts:375: * vital-eşik state-transition mantığını A'nın deterioration modeline ekler
src/engine/types.ts:389:export interface DeteriorationPhase {
src/engine/types.ts:410:// resolved_sound_id: ilişkili deterioration fazı durdurulduktan sonra
src/engine/types.ts:418:  /** Hangi deterioration fazına bağlı (resolved geçişi için) */
src/engine/types.ts:497:  /** Hâlâ review bekleyen klinik alanlar (ör. "deterioration", "auscultation"). */
src/engine/types.ts:576:  deterioration?: DeteriorationPhase[];
src/engine/types.ts:619:  // oturumlarda farmakoloji + deterioration AYNI eksende akar: mod hızı
src/engine/physiology.ts:9:// SimplePhysiologyProvider: senaryonun `deterioration` fazlarını
src/engine/physiology.ts:23:  DeteriorationPhase,
src/engine/physiology.ts:112:  const phases: DeteriorationPhase[] = scenario.deterioration ?? [];

=== anaflaksi deterioration örnek ===
304:  deterioration: [
305-    {
306-      id: "untreated-anaphylaxis",
307-      label: "Tedavisiz anaflaktik şok",
308-      trends: [
309-        { vital: "bp_systolic",  delta_per_sec: -0.067, floor: 50 },
310-        { vital: "bp_diastolic", delta_per_sec: -0.033, floor: 30 },
311-        { vital: "spo2",         delta_per_sec: -0.05,  floor: 72 },
312-        { vital: "hr",           delta_per_sec: 0.05,   ceiling: 152 },
313-        { vital: "rr",           delta_per_sec: 0.017,  ceiling: 40 },
314-      ],
315-      halted_by: [
316-        // site verilmedi — IM uyluk da, genel adrenalin de durdurur
317-        { type: "give_medication", target_id: "adrenalin" },
318-      ],
319-      recovery_trends: [
320-        { vital: "bp_systolic",  delta_per_sec: 0.1,   ceiling: 112 },
321-        { vital: "bp_diastolic", delta_per_sec: 0.05,  ceiling: 70 },
322-        { vital: "spo2",         delta_per_sec: 0.08,  ceiling: 97 },
323-        { vital: "hr",           delta_per_sec: -0.07, floor: 96 },
324-        { vital: "rr",           delta_per_sec: -0.03, floor: 16 },
325-      ],
326-    },
327-  ],
328-
329-  // Oskültasyon (DRAFT): bronkospazm → tüm ön göğüs odaklarında yaygın
330-  // wheezing; adrenalin sonrası (faz durunca) normal kalp sesine döner.
331-  // Ses dosyaları: public/sounds/auscultation/ (atıf: SOUNDS-LICENSE.md)
332-  auscultation: {
333-    // Not metinleri pulmoner alan terminolojisiyle (klinik ön-denetim
334-    // rötuşu): wheeze pulmoner bulgu — kardiyak odak adlarıyla etiketleme.

=== patientShader uniform listesi ===
6: * Ayrıca dynamic breathing speed (RR) desteği ekler.
11:uniform float uTime;
12:uniform float uBreathAmplitude;
13:uniform float uBreathSpeed; // Vital RR değerine bağlı dinamik nefes alma hızı
40:uniform vec3 uSkinTint;
