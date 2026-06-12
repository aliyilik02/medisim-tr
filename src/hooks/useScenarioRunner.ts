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
}

export interface LabCountdownInfo {
  panelId: string;
  panelName: string;
  delaySec: number;
}

export function useScenarioRunner({
  scenario,
  autoStartMode,
}: UseScenarioRunnerParams) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [actionsThisStep, setActionsThisStep] = useState<ActionRef[]>([]);
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
    if (!rs || !session) return null;
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
  }, [provider, session?.current_step_id]);

  // ----- Lab / imaging
  const { getLabStatus, orderLab, getReadyPanel, imagingResults } =
    useLabResults({
      scenario: rs,
      sessionStartedAt: session?.started_at,
      sessionMode: session?.mode,
    });

  // ----- Canlı tick: farmakoloji + deterioration
  useVitalsTick({
    scenario: rs,
    session,
    setSession,
    paused: criticalInfo !== null,
    provider,
  });

  // ----- Otomatik başlatma (3D demo akışı)
  useEffect(() => {
    if (!scenario || !autoStartMode) return;
    setSession(startSession(scenario, autoStartMode, scenario.difficulty));
    setActionsThisStep([]);
    setPointsThisStep(0);
    setCriticalErrorsThisStep(0);
    setDecisionAnswered(null);
    setDecisionMultiAnswered(null);
    setCriticalInfo(null);
    setHaltedPhaseIds([]);
    setOpenLabPanelId(null);
    setOpenImagingId(null);
    setLabCountdownInfo(null);
  }, [scenario, autoStartMode]);

  const currentStep: Step | null =
    rs && session ? getCurrentStep(rs, session) : null;

  // ----- Adım sonlandırma
  const finishStep = useCallback(
    (unlockId: string | null, overridePoints?: number) => {
      if (!currentStep || !rs) return;

      const pts = overridePoints !== undefined ? overridePoints : pointsThisStep;
      const actions = actionsThisStep;
      const critErrors = criticalErrorsThisStep;
      const stepId = currentStep.id;

      setSession((s) => {
        if (!s) return s;
        const nextStepId =
          unlockId ?? pickNextStep(rs, stepId, [], s.selected_difficulty);

        let newSession = completeStep(
          s,
          stepId,
          pts,
          actions,
          critErrors,
          nextStepId
        );
        if (newSession.finished)
          newSession = finalizeSession(newSession, rs, "completed");
        return newSession;
      });

      setActionsThisStep([]);
      setPointsThisStep(0);
      setCriticalErrorsThisStep(0);
      setDecisionAnswered(null);
      setDecisionMultiAnswered(null);
    },
    [currentStep, rs, pointsThisStep, actionsThisStep, criticalErrorsThisStep]
  );

  // ----- Aksiyon handler (ilaç/ekipman/tetkik/prosedür)
  const handleAction = useCallback(
    (action: ActionRef) => {
      if (!rs || !session || !currentStep || session.finished) return;

      // Fizyoloji: doğru müdahale kötüleşmeyi durdurur — adım türünden bağımsız
      if (provider) {
        provider.applyIntervention(session.vitals, action);
        setHaltedPhaseIds(provider.getState().halted);
      }

      const isExamLike =
        action.type === "procedure" || action.type === "examine";

      if (currentStep.kind !== "action") {
        // 3D muayene politikası: karar/bilgi adımında fizik muayene serbest,
        // diğer aksiyonlar bu adımda işlenmez.
        if (!isExamLike) {
          show({
            text: "Bu adımda envanter kullanılmıyor.",
            points: 0,
            type: "neutral",
          });
        }
        return;
      }

      let pharmaPoints = 0;
      let pharmaCritical: CriticalContraindicationInfo | null = null;

      if (action.type === "give_medication") {
        const extended = getExtendedMedication(action.target_id);
        if (extended) {
          const doseGiven =
            extended.dose_band.default_dose *
            (extended.dose_band.weight_based ? rs.patient.weight_kg : 1);

          const result = administerMedication({
            medication: extended,
            doseGiven,
            patient: rs.patient,
            vitals: session.vitals,
            activeMedicationIds: session.active_medication_ids ?? [],
            sourceStepId: currentStep.id,
            timingOverride: rs.medication_timing_overrides?.[extended.id],
          });

          pharmaPoints = result.points_delta;

          if (result.requires_correction) {
            const criticalContra = result.triggered_contraindications.find(
              (c) => c.severity === "kritik"
            );
            if (criticalContra) {
              const medName =
                getMedication(action.target_id)?.name_tr ?? action.target_id;
              pharmaCritical = buildCriticalInfo({
                medicationName: medName,
                effect: criticalContra.effect,
                message: criticalContra.message,
                feedback: criticalContra.feedback,
                graceSec: result.requires_correction.grace_sec,
                antidotes: result.requires_correction.expected_antidotes,
              });
            }
          }

          if (result.active_instance) {
            const newActive = result.active_instance;
            setSession((s) =>
              s
                ? {
                    ...s,
                    active_medications: [
                      ...(s.active_medications ?? []),
                      newActive,
                    ],
                    active_medication_ids: [
                      ...(s.active_medication_ids ?? []),
                      newActive.medication_id,
                    ],
                  }
                : s
            );
          }
        }
      }

      const evaluation = evaluateAction(
        currentStep,
        action,
        rs,
        session.selected_difficulty
      );

      // 3D muayene politikası: senaryoda karşılığı olmayan muayene/prosedür
      // cezalandırılmaz (fizik muayene öğrenmenin parçası; zaman maliyeti
      // deterioration trendi ile zaten işliyor).
      const freeExam = isExamLike && !evaluation.matched_outcome;

      // Çift cezalama önleme: senaryo outcome'ı varsa pharma puanı yutulur
      const effectivePharmaPoints = evaluation.matched_outcome
        ? 0
        : pharmaPoints;
      const totalPoints = freeExam
        ? 0
        : evaluation.points + effectivePharmaPoints;
      const isCritical =
        !freeExam && (evaluation.critical || pharmaCritical !== null);

      show({
        text: freeExam
          ? "Muayene yapıldı — bulgular değerlendirildi."
          : evaluation.feedback,
        points: totalPoints,
        type: isCritical
          ? "critical"
          : freeExam
          ? "neutral"
          : totalPoints > 0
          ? "positive"
          : "negative",
      });

      setActionsThisStep((prev) => [...prev, action]);
      setPointsThisStep((p) => p + totalPoints);
      if (isCritical) setCriticalErrorsThisStep((c) => c + 1);

      if (evaluation.vitals_change) {
        const vc = evaluation.vitals_change;
        setSession((s) =>
          s
            ? {
                ...s,
                baseline_vitals: applyVitalsChange(s.baseline_vitals, vc),
                vitals: applyVitalsChange(s.vitals, vc),
              }
            : s
        );
      }

      if (pharmaCritical) setCriticalInfo(pharmaCritical);

      if (evaluation.unlocks.length > 0 && !pharmaCritical) {
        const stepTotalPts = pointsThisStep + totalPoints;
        setTimeout(() => finishStep(evaluation.unlocks[0], stepTotalPts), 1200);
      }
    },
    [rs, session, currentStep, provider, show, pointsThisStep, finishStep]
  );

  // ----- Karar handler'ları
  const handleDecision = useCallback(
    (option: DecisionOption) => {
      if (!rs || !session || !currentStep) return;
      if (currentStep.kind !== "decision" || decisionAnswered) return;

      const evaluation = evaluateDecision(
        currentStep,
        option.id,
        session.selected_difficulty,
        rs
      );
      if (!evaluation) return;

      setDecisionAnswered({ optionId: option.id, feedback: option.feedback });
      show({
        text: evaluation.feedback,
        points: evaluation.points,
        type: evaluation.points > 0 ? "positive" : "negative",
      });
      setPointsThisStep(evaluation.points);
      setTimeout(() => finishStep(null, evaluation.points), 1800);
    },
    [rs, session, currentStep, decisionAnswered, show, finishStep]
  );

  const handleDecisionMulti = useCallback(
    (optionIds: string[]) => {
      if (!rs || !session || !currentStep) return;
      if (currentStep.kind !== "decision" || decisionMultiAnswered) return;

      const evaluation = evaluateDecisionMulti(
        currentStep,
        optionIds,
        session.selected_difficulty,
        rs
      );
      if (!evaluation) return;

      setDecisionMultiAnswered({ optionIds, feedback: evaluation.feedback });
      show({
        text: evaluation.all_correct
          ? "Mükemmel! Tüm doğrular seçildi."
          : evaluation.points > 0
          ? "Kısmi başarı — bazı doğrular eksik."
          : "Hatalı veya eksik seçim.",
        points: evaluation.points,
        type: evaluation.points > 0 ? "positive" : "negative",
      });
      setPointsThisStep(evaluation.points);
      setTimeout(() => finishStep(null, evaluation.points), 2200);
    },
    [rs, session, currentStep, decisionMultiAnswered, show, finishStep]
  );

  // ----- Lab sipariş
  const handleOrderLab = useCallback(
    (panelId: string) => {
      if (!rs) return;
      if (
        currentStep?.kind === "action" &&
        currentStep.expected_outcomes.some(
          (o) =>
            o.action.type === "order_test" && o.action.target_id === panelId
        )
      ) {
        handleAction({ type: "order_test", target_id: panelId });
      }
      orderLab(panelId);
      const delaySec = getEffectiveDelaySec(rs, panelId, session?.mode);
      const panelName = rs.lab_panels?.[panelId]?.name_tr ?? panelId;
      setLabCountdownInfo({ panelId, panelName, delaySec });
    },
    [rs, currentStep, handleAction, orderLab, session?.mode]
  );

  // ----- Kritik kontrendikasyon süresi doldu
  const handleCriticalExpired = useCallback(() => {
    if (!rs) return;
    setCriticalInfo(null);
    show({
      text: "Kritik kontrendikasyon düzeltme süresi doldu. Hastada ciddi komplikasyon gelişti.",
      points: -30,
      type: "critical",
    });
    setSession((s) => {
      if (!s) return s;
      return finalizeSession(
        { ...s, total_score: s.total_score - 30 },
        rs,
        "abandoned"
      );
    });
  }, [rs, show]);

  // ----- Erken bitirme ("Bitir" butonu)
  const finishEarly = useCallback(() => {
    if (!rs) return;
    setSession((s) => {
      if (!s || s.finished) return s;
      const hasProgress =
        pointsThisStep !== 0 ||
        actionsThisStep.length > 0 ||
        criticalErrorsThisStep > 0;
      const flushed =
        hasProgress && currentStep
          ? completeStep(
              s,
              currentStep.id,
              pointsThisStep,
              actionsThisStep,
              criticalErrorsThisStep,
              null
            )
          : s;
      return finalizeSession(flushed, rs, "partial");
    });
  }, [rs, currentStep, pointsThisStep, actionsThisStep, criticalErrorsThisStep]);

  const handleInfoContinue = useCallback(() => finishStep(null), [finishStep]);
  const handleActionStepContinue = useCallback(
    () => finishStep(null),
    [finishStep]
  );

  const restart = useCallback(() => {
    if (!scenario || !autoStartMode) {
      setSession(null);
      return;
    }
    setSession(startSession(scenario, autoStartMode, scenario.difficulty));
    setActionsThisStep([]);
    setPointsThisStep(0);
    setCriticalErrorsThisStep(0);
    setDecisionAnswered(null);
    setDecisionMultiAnswered(null);
    setCriticalInfo(null);
    setHaltedPhaseIds([]);
    setOpenLabPanelId(null);
    setOpenImagingId(null);
    setLabCountdownInfo(null);
  }, [scenario, autoStartMode]);

  const canContinue =
    currentStep?.kind === "action" &&
    (!currentStep.min_actions ||
      actionsThisStep.length >= currentStep.min_actions);

  return {
    // State
    session,
    setSession,
    resolvedScenario: rs,
    currentStep,
    actionsThisStep,
    canContinue,
    decisionAnswered,
    decisionMultiAnswered,
    criticalInfo,
    setCriticalInfo,
    haltedPhaseIds,
    feedback,
    clearFeedback: clear,
    // Lab/imaging
    getLabStatus,
    getReadyPanel,
    imagingResults,
    openLabPanelId,
    setOpenLabPanelId,
    openImagingId,
    setOpenImagingId,
    labCountdownInfo,
    setLabCountdownInfo,
    // Handler'lar
    handleAction,
    handleDecision,
    handleDecisionMulti,
    handleOrderLab,
    handleInfoContinue,
    handleActionStepContinue,
    handleCriticalExpired,
    finishEarly,
    restart,
  };
}
