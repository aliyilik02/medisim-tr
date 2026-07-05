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
  getPedagogy,
  resolveEquipmentById,
  startTimedEquipmentDelta,
  type EquipmentEffectContext,
  type SessionState,
  type ActionRef,
  type DecisionOption,
  type PlayMode,
  type Difficulty,
  type Scenario,
  type Step,
  type PhysiologyProvider,
  type PhaseSignal,
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

// Faz sinyali değişti mi? Her tick'te session.vitals yeni obje → effect koşar;
// bu sığ kıyas yalnız anlamlı değişimde (EKG/ses/görsel/recovering) state yazar →
// gereksiz re-render yok (monitör/ses/görsel ancak faz değişince güncellenir).
function phaseSignalsEqual(
  a: PhaseSignal | null,
  b: PhaseSignal | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.phaseId !== b.phaseId ||
    a.ekg !== b.ekg ||
    a.heartSound !== b.heartSound ||
    a.recovering !== b.recovering
  )
    return false;
  const av = a.visual;
  const bv = b.visual;
  return (
    av.cyanosis_boost === bv.cyanosis_boost &&
    av.pallor_boost === bv.pallor_boost &&
    av.diaphoresis_boost === bv.diaphoresis_boost &&
    av.mottled_boost === bv.mottled_boost &&
    av.breath_stopped === bv.breath_stopped
  );
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
  // Faz-senkron sinyal (TEK kaynak): dominant fazın EKG paterni + kalp sesi +
  // görsel. Monitör, oskültasyon ve 3D görsel hepsi bunu okur. Her tick yeniden
  // hesaplanır, yalnız anlamlı değişimde state'e yazılır (phaseSignalsEqual).
  const [phaseSignal, setPhaseSignal] = useState<PhaseSignal | null>(null);
  // Ekipman mapper'ı (Blok 2) defib ritim koşulu için aktif EKG paternini
  // okur. Ref ile stale-closure ve handleAction dep-churn'ü önlenir.
  const phaseSignalRef = useRef<PhaseSignal | null>(null);
  phaseSignalRef.current = phaseSignal;

  const { feedback, show, clear } = useFeedback();

  // Pedagojik mod davranışı (egitim=öğretici, klinik=uygulama, sinav=sınav).
  // NOT: anlık geri bildirim bastırma FeedbackToast'ın işi (sinav'da metni gizler,
  // puan deltasını gösterir) — burada show() koşulsuz çağrılır ki 2D quiz sinav
  // davranışı (puan-deltası görünür) korunsun. pedagogy return'de expose edilir.
  const pedagogy = useMemo(
    () => getPedagogy(session?.mode ?? "klinik"),
    [session?.mode]
  );

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
  }, [provider, session?.current_step_id]);

  // Faz-senkron sinyali her tick'te yeniden hesapla (session.vitals değişince).
  // Tek kaynak: provider.getActivePhaseSignal. Eşitse state'e yazma (re-render
  // yok). Provider yoksa (2D quiz / Pulse) veya sinyal tanımsızsa → null.
  const liveVitalsForSignal = session?.vitals;
  useEffect(() => {
    if (!provider || !liveVitalsForSignal) {
      setPhaseSignal((prev) => (prev === null ? prev : null));
      return;
    }
    const next = provider.getActivePhaseSignal?.(liveVitalsForSignal) ?? null;
    setPhaseSignal((prev) => (phaseSignalsEqual(prev, next) ? prev : next));
  }, [provider, liveVitalsForSignal]);

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

  // ----- Otomatik başlatma (3D akışı)
  // NOT: autoStartMode ile manuel start() KARŞILIKLI DIŞLAYICIDIR. autoStartMode
  // verildiğinde bu effect senaryo değişiminde session'ı yeniden açar → manuel
  // start() çağrısını ezer. 2D katman (ScenarioPlayPage) autoStartMode VERMEZ,
  // start() kullanır; 3D katman autoStartMode verir, start() çağırmaz.
  useEffect(() => {
    if (!scenario || !autoStartMode) return;
    setSession(startSession(scenario, autoStartMode, scenario.difficulty));
    setActionsThisStep([]);
    setScoredActionsThisStep(0);
    setPointsThisStep(0);
    setCriticalErrorsThisStep(0);
    setDecisionAnswered(null);
    setDecisionMultiAnswered(null);
    setCriticalInfo(null);
    setHaltedPhaseIds([]);
    setPhaseSignal(null);
    setOpenLabPanelId(null);
    setOpenImagingId(null);
    setLabCountdownInfo(null);
  }, [scenario, autoStartMode]);

  const currentStep: Step | null =
    rs && session ? getCurrentStep(rs, session) : null;

  // Öğretici (egitim) modunda otomatik adım geçişi YOK — öğrenci "Sonraki
  // Adıma Geç" ile kendi temposunda ilerletir. unlock'lu aksiyonun hedef adımı
  // burada bekletilir ki manuel devam onu kullansın (linear pickNextStep'e
  // düşüp dinamik unlock kaybolmasın). Klinik/sınav modunda eski otomatik akış.
  const pendingUnlockRef = useRef<string | null>(null);

  // ----- Adım sonlandırma
  const finishStep = useCallback(
    (unlockId: string | null, overridePoints?: number, overrideActions?: ActionRef[]) => {
      if (!currentStep || !rs) return;

      const pts = overridePoints !== undefined ? overridePoints : pointsThisStep;
      // overrideActions: karar handler'ları setTimeout ile ESKİ closure'ı
      // çağırır — state'e yazılan sentetik decision aksiyonu bu yolla taşınır
      // (debrief kılavuz-karşılaştırması "ne seçtin"i görebilsin).
      const actions = overrideActions ?? actionsThisStep;
      const critErrors = criticalErrorsThisStep;
      const stepId = currentStep.id;

      setSession((s) => {
        // finished guard: "Bitir" sonrası bekleyen karar/unlock timer'ı
        // (setTimeout(finishStep)) ateşlenirse oturuma tekrar yazmasın.
        if (!s || s.finished) return s;
        // unlock/dal hedefi pickNextStep'ten geçer: zorluk kapısına uymayan
        // hedef linear akışa düşer (ham unlockId ataması kapı atlatıyordu).
        const nextStepId = pickNextStep(
          rs,
          stepId,
          unlockId ? [unlockId] : [],
          s.selected_difficulty
        );

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
      setScoredActionsThisStep(0);
      setPointsThisStep(0);
      setCriticalErrorsThisStep(0);
      setDecisionAnswered(null);
      setDecisionMultiAnswered(null);
      pendingUnlockRef.current = null;
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
        // 3D muayene politikası: karar/bilgi adımında fizik muayene serbest
        // (sessiz). 2D quiz (penalize): her zaman uyarı göster.
        if (examPolicy === "free" && isExamLike) return;
        show({
          text: "Bu adımda envanter kullanılmıyor.",
          points: 0,
          type: "neutral",
        });
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
            // TEK SAAT: provider'lı (3D) oturumda administered_at/expires_at
            // simüle eksende yazılır — useVitalsTick pharma tick'i de aynı
            // eksenle okur. Provider'sız (2D quiz) oturumda wall-clock korunur.
            now: provider ? (session.sim_time_ms ?? session.started_at) : Date.now(),
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

      // Merkezi ekipman-etki mapper'ı (Blok 2) — OPT-IN.
      // Senaryo use_central_equipment_effects:true derse, use_equipment aksiyonu
      // merkezi fizyolojiden geçer (entübasyon SpO2, O2 hipoksemide, defib ritimde).
      // Flag yoksa bu blok atlanır → eski elle vitals_change çalışır (çakışma yok).
      // ⚠️ Etki değerleri DRAFT (equipment/catalog.ts).
      if (
        rs.use_central_equipment_effects &&
        action.type === "use_equipment"
      ) {
        const ctx: EquipmentEffectContext = {
          vitals: session.vitals,
          patient: rs.patient,
          ekg: phaseSignalRef.current?.ekg,
        };
        const resolution = resolveEquipmentById(action.target_id, ctx);
        if (resolution && resolution.applied) {
          // onset_sec>0 → ramp'e al (useVitalsTick her tick lineer uygular);
          // onset_sec=0 veya delta boş → eski anlık davranış.
          const timed = startTimedEquipmentDelta(resolution);
          if (timed) {
            setSession((s) =>
              s
                ? {
                    ...s,
                    pending_equipment_deltas: [
                      ...(s.pending_equipment_deltas ?? []),
                      timed,
                    ],
                  }
                : s
            );
          } else if (Object.keys(resolution.delta).length > 0) {
            const delta = resolution.delta;
            setSession((s) =>
              s
                ? {
                    ...s,
                    baseline_vitals: applyVitalsChange(s.baseline_vitals, delta),
                    vitals: applyVitalsChange(s.vitals, delta),
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
      // deterioration trendi ile zaten işliyor). 2D quiz (penalize): freeExam
      // hiç tetiklenmez → eşleşmeyen aksiyon normal puanlanır (eski davranış).
      const freeExam =
        examPolicy === "free" && isExamLike && !evaluation.matched_outcome;

      // Çift cezalama önleme: senaryo outcome'ı varsa pharma puanı yutulur
      const effectivePharmaPoints = evaluation.matched_outcome
        ? 0
        : pharmaPoints;
      const totalPoints = freeExam
        ? 0
        : evaluation.points + effectivePharmaPoints;
      const isCritical =
        !freeExam && (evaluation.critical || pharmaCritical !== null);

      // 2D quiz: pharma puan farkını feedback metnine ekle (eski davranış).
      let feedbackText = freeExam
        ? "Muayene yapıldı — bulgular değerlendirildi."
        : evaluation.feedback;
      if (
        pharmaFeedbackText &&
        !freeExam &&
        effectivePharmaPoints < 0 &&
        !pharmaCritical
      ) {
        feedbackText += ` (Farmakoloji: ${effectivePharmaPoints} — doz/kontrendikasyon)`;
      }

      show({
        text: feedbackText,
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
      if (!freeExam) setScoredActionsThisStep((n) => n + 1);
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
        if (session.mode === "egitim") {
          // Öğretici: otomatik geçme — hedef adımı beklet, öğrenci ilerletsin.
          pendingUnlockRef.current = evaluation.unlocks[0];
        } else {
          const stepTotalPts = pointsThisStep + totalPoints;
          setTimeout(() => finishStep(evaluation.unlocks[0], stepTotalPts), 1200);
        }
      }
    },
    [
      rs,
      session,
      currentStep,
      provider,
      show,
      pointsThisStep,
      finishStep,
      examPolicy,
      pharmaFeedbackText,
    ]
  );

  // ----- Karar handler'ları
  const handleDecision = useCallback(
    (option: DecisionOption) => {
      if (!rs || !session || !currentStep) return;
      if (currentStep.kind !== "decision" || decisionAnswered) return;

      // Karar → fizyoloji köprüsü: reperfüzyon gibi kritik kararlar
      // deterioration fazını durdurur. handleAction yalnız ActionRef alır;
      // karar seçenekleri "decision" ActionType'ı ile sentezlenir →
      // deterioration.halted_by [{type:"decision", target_id: option.id}] eşleşir.
      if (provider) {
        provider.applyIntervention(session.vitals, {
          type: "decision",
          target_id: option.id,
        });
        setHaltedPhaseIds(provider.getState().halted);
      }

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
      // Kararı sonuç kaydına yaz — debrief "ne seçtin"i gösterebilsin
      // (sentetik ActionRef; deterioration halted_by ile aynı sözleşme).
      const decisionAction: ActionRef = { type: "decision", target_id: option.id };
      setActionsThisStep((prev) => [...prev, decisionAction]);
      // Dallanan karar: seçeneğin next_step_id'si akışı yönlendirir
      // (finishStep zorluk kapısını uygular). Öğretici modda otomatik geçme
      // yok — dal hedefi bekletilir, öğrenci "Sonraki Adıma Geç" ile ilerler.
      if (session.mode === "egitim") {
        pendingUnlockRef.current = evaluation.next_step_id;
      } else {
        setTimeout(
          () =>
            finishStep(evaluation.next_step_id, evaluation.points, [decisionAction]),
          1800
        );
      }
    },
    [rs, session, currentStep, decisionAnswered, show, finishStep, provider]
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
      // Çoklu karar seçimlerini de sonuç kaydına yaz (debrief görünürlüğü).
      const decisionActions: ActionRef[] = optionIds.map((id) => ({
        type: "decision",
        target_id: id,
      }));
      setActionsThisStep((prev) => [...prev, ...decisionActions]);
      if (session.mode === "egitim") {
        pendingUnlockRef.current = evaluation.next_step_id;
      } else {
        setTimeout(
          () =>
            finishStep(evaluation.next_step_id, evaluation.points, decisionActions),
          2200
        );
      }
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
  // Manuel "Sonraki Adıma Geç" — action + (öğretici modda) decision için ortak.
  // Bekletilen unlock varsa onu kullan (öğretici: unlock'lu aksiyon otomatik
  // geçmemişti); yoksa linear akış (finishStep(null) → pickNextStep).
  const handleActionStepContinue = useCallback(() => {
    const unlock = pendingUnlockRef.current;
    pendingUnlockRef.current = null;
    finishStep(unlock);
  }, [finishStep]);

  // Tüm adım/oturum yan-state'ini sıfırla — start/restart ortak yardımcısı.
  const resetStepState = useCallback(() => {
    setActionsThisStep([]);
    setScoredActionsThisStep(0);
    setPointsThisStep(0);
    setCriticalErrorsThisStep(0);
    setDecisionAnswered(null);
    setDecisionMultiAnswered(null);
    setCriticalInfo(null);
    setHaltedPhaseIds([]);
    setPhaseSignal(null);
    setOpenLabPanelId(null);
    setOpenImagingId(null);
    setLabCountdownInfo(null);
  }, []);

  // Manuel başlatma — 2D quiz katmanı ModeSelector akışı (mod/zorluk/varyant
  // kullanıcı seçer). autoStartMode'lu 3D akışı bunu kullanmaz.
  const start = useCallback(
    (mode: PlayMode, difficulty: Difficulty, variantId?: string) => {
      if (!scenario) return;
      setSession(startSession(scenario, mode, difficulty, variantId));
      resetStepState();
    },
    [scenario, resetStepState]
  );

  const restart = useCallback(() => {
    if (!scenario || !autoStartMode) {
      setSession(null);
      resetStepState();
      return;
    }
    setSession(startSession(scenario, autoStartMode, scenario.difficulty));
    resetStepState();
  }, [scenario, autoStartMode, resetStepState]);

  // Action: min_actions karşılanınca. Öğretici (egitim) modda DECISION de manuel
  // ilerler (otomatik setTimeout kaldırıldı) → cevap verilince "devam" çıkar.
  const canContinue =
    (currentStep?.kind === "action" &&
      (!currentStep.min_actions ||
        scoredActionsThisStep >= currentStep.min_actions)) ||
    (session?.mode === "egitim" &&
      currentStep?.kind === "decision" &&
      (decisionAnswered !== null || decisionMultiAnswered !== null));

  return {
    // State
    session,
    setSession,
    resolvedScenario: rs,
    currentStep,
    pedagogy,
    actionsThisStep,
    scoredActionsThisStep,
    canContinue,
    decisionAnswered,
    decisionMultiAnswered,
    criticalInfo,
    setCriticalInfo,
    haltedPhaseIds,
    phaseSignal,
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
    start,
    restart,
  };
}
