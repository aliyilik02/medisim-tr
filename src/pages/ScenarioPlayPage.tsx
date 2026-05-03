import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getScenario } from "@/data/scenarios";
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
  getVisibleOptions,
  resolveScenarioVariant,
  type SessionState,
  type ActionRef,
  type DecisionOption,
  type PlayMode,
  type Difficulty,
  type Scenario,
} from "@/engine";
import { getExtendedMedication } from "@/data/medications-extended";
import { administerMedication } from "@/engine/pharmacology/engine";
import { getMedication } from "@/data/medications";
import { seededShuffle } from "@/lib/shuffle";
import { useVitalsTick } from "@/hooks/useVitalsTick";
import { useMonitorSounds } from "@/hooks/useMonitorSounds";
import { useLabResults } from "@/hooks/useLabResults";
import { PatientCard } from "@/components/PatientCard";
import { VitalsMonitor } from "@/components/VitalsMonitor";
import { InventoryPanel } from "@/components/InventoryPanel";
import { StepDisplay } from "@/components/StepDisplay";
import { DebriefScreen } from "@/components/DebriefScreen";
import { FeedbackToast, useFeedback } from "@/components/FeedbackToast";
import { DifficultySelector } from "@/components/DifficultySelector";
import {
  CriticalContraindicationModal,
  buildCriticalInfo,
  type CriticalContraindicationInfo,
} from "@/components/CriticalContraindicationModal";
import { LabResultsModal } from "@/components/LabResultsModal";
import { LabOrderCountdownModal } from "@/components/LabOrderCountdownModal";
import { ImagingResultsModal } from "@/components/ImagingResultsModal";
import { cn } from "@/lib/cn";
import {
  applySpecialtyTheme,
  resetSpecialtyTheme,
  getSpecialtyTheme,
} from "@/hooks/useSpecialtyTheme";
import { getEffectiveDelaySec } from "@/engine";
import {
  ArrowLeft,
  GraduationCap,
  Timer,
  Activity as ActivityIcon,
  Gauge,
  Volume2,
  VolumeX,
  Layers,
} from "lucide-react";

const SOUND_STORAGE_KEY = "medisim_sound_enabled";

export function ScenarioPlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scenario = useMemo(() => (id ? getScenario(id) : undefined), [id]);

  const [session, setSession] = useState<SessionState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    () => localStorage.getItem(SOUND_STORAGE_KEY) === "true"
  );
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
  const [criticalModalHidden, setCriticalModalHidden] = useState(false);
  const [openLabPanelId, setOpenLabPanelId] = useState<string | null>(null);
  const [openImagingId, setOpenImagingId] = useState<string | null>(null);
  const [labCountdownInfo, setLabCountdownInfo] = useState<{
    panelId: string;
    panelName: string;
    delaySec: number;
  } | null>(null);

  const { feedback, show, clear } = useFeedback();

  // Varyantlı senaryo — session.variant_id uygulanmış hali
  const resolvedScenario = useMemo(
    () =>
      scenario
        ? resolveScenarioVariant(scenario, session?.variant_id)
        : undefined,
    [scenario, session?.variant_id]
  );

  // Lab / imaging hook
  const { getLabStatus, orderLab, getReadyPanel, imagingResults } = useLabResults({
    scenario: resolvedScenario,
    sessionStartedAt: session?.started_at,
    sessionMode: session?.mode,
  });

  // Canlı monitör tick
  useVitalsTick({
    scenario: resolvedScenario,
    session,
    setSession,
    paused: criticalInfo !== null,
  });

  useEffect(() => {
    localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "true" : "false");
  }, [soundEnabled]);

  useMonitorSounds({
    hr: session?.vitals.hr ?? 60,
    spo2: session?.vitals.spo2 ?? 98,
    enabled: soundEnabled && session !== null && !session.finished,
  });

  // Specialty tema — mount'ta CSS değişkenleri inject et, unmount'ta temizle
  useEffect(() => {
    if (!scenario) return;
    applySpecialtyTheme(scenario.specialty);
    return () => resetSpecialtyTheme();
  }, [scenario?.specialty]);

  const handleCriticalExpired = useCallback(() => {
    if (!resolvedScenario) return;
    setCriticalInfo(null);
    setCriticalModalHidden(false);
    show({
      text: "Kritik kontrendikasyon düzeltme süresi doldu. Hastada ciddi komplikasyon gelişti.",
      points: -30,
      type: "critical",
    });
    // Modal timer async çağırır — functional form ile stale session.total_score riski ortadan kalkar
    setSession((s) => {
      if (!s) return s;
      return finalizeSession(
        { ...s, total_score: s.total_score - 30 },
        resolvedScenario,
        "abandoned"
      );
    });
  }, [resolvedScenario, show]);

  if (!scenario) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-3xl mb-4">Senaryo bulunamadı</h1>
        <Link to="/senaryolar" className="btn-primary">
          Senaryolara Dön
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <ModeSelector
        scenario={scenario}
        onStart={(mode, difficulty, variantId) =>
          setSession(startSession(scenario, mode, difficulty, variantId))
        }
        onBack={() => navigate("/senaryolar")}
      />
    );
  }

  if (session.finished) {
    return (
      <DebriefScreen
        scenario={resolvedScenario ?? scenario}
        session={session}
        onRestart={() => {
          setSession(null);
          setActionsThisStep([]);
          setPointsThisStep(0);
          setCriticalErrorsThisStep(0);
          setDecisionAnswered(null);
          setDecisionMultiAnswered(null);
          setCriticalInfo(null);
          setCriticalModalHidden(false);
        }}
      />
    );
  }

  const rs = resolvedScenario ?? scenario;
  const currentStep = getCurrentStep(rs, session);
  if (!currentStep) {
    return (
      <DebriefScreen
        scenario={rs}
        session={finalizeSession(session, rs)}
        onRestart={() => setSession(null)}
      />
    );
  }

  // ----- Aksiyon handler
  const handleAction = (action: ActionRef) => {
    if (currentStep.kind !== "action") {
      show({ text: "Bu adımda envanter kullanılmıyor.", points: 0, type: "neutral" });
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
                  active_medications: [...(s.active_medications ?? []), newActive],
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

    // Çift cezalama önleme:
    // Senaryo bu aksiyonu expected_outcomes'ta özel olarak ele aldıysa
    // (matched_outcome dolu), senaryo yazarının verdiği puan otoritedir.
    // Pharma engine'in eklediği puanı kullanma — ama kritik kontrendikasyon
    // modali yine açılır (klinik uyarı kaybolmaz).
    const effectivePharmaPoints = evaluation.matched_outcome ? 0 : pharmaPoints;

    const totalPoints = evaluation.points + effectivePharmaPoints;
    const isCritical = evaluation.critical || pharmaCritical !== null;

    let combinedFeedback = evaluation.feedback;
    if (effectivePharmaPoints !== 0 && !pharmaCritical) {
      combinedFeedback +=
        effectivePharmaPoints < 0
          ? ` (Farmakoloji: ${effectivePharmaPoints} — doz/kontrendikasyon)`
          : "";
    }

    show({
      text: combinedFeedback,
      points: totalPoints,
      type: isCritical ? "critical" : totalPoints > 0 ? "positive" : "negative",
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

    if (pharmaCritical) {
      setCriticalInfo(pharmaCritical);
      setCriticalModalHidden(false);
    }

    if (evaluation.unlocks.length > 0 && !pharmaCritical) {
      // Stale closure'u önle: toplam puanı şimdi hesapla, timeout'a geç
      const stepTotalPts = pointsThisStep + totalPoints;
      setTimeout(() => finishStep(evaluation.unlocks[0], stepTotalPts), 1200);
    }
  };

  // ----- Tekli karar handler
  const handleDecision = (option: DecisionOption) => {
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
    // overridePoints ile stale closure sorununu önle
    setTimeout(() => finishStep(null, evaluation.points), 1800);
  };

  // ----- Çoklu karar handler
  const handleDecisionMulti = (optionIds: string[]) => {
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
      type: evaluation.all_correct
        ? "positive"
        : evaluation.points > 0
        ? "positive"
        : "negative",
    });

    setPointsThisStep(evaluation.points);
    // overridePoints ile stale closure sorununu önle
    setTimeout(() => finishStep(null, evaluation.points), 2200);
  };

  // Lab ısmarlandığında: önce skor (eğer bu step'te order_test outcome varsa), sonra timer
  const handleOrderLab = (panelId: string) => {
    if (
      currentStep.kind === "action" &&
      currentStep.expected_outcomes.some(
        (o) => o.action.type === "order_test" && o.action.target_id === panelId
      )
    ) {
      handleAction({ type: "order_test", target_id: panelId });
    }
    orderLab(panelId);
    if (rs) {
      const delaySec = getEffectiveDelaySec(rs, panelId, session?.mode);
      const panelName = rs.lab_panels?.[panelId]?.name_tr ?? panelId;
      setLabCountdownInfo({ panelId, panelName, delaySec });
    }
  };

  const handleInfoContinue = () => finishStep(null);
  const handleActionStepContinue = () => finishStep(null);

  // overridePoints: decision/unlock timeout'larından geçilir
  // Functional setSession ile stale closure sorunu çözüldü: s her zaman güncel state
  const finishStep = (unlockId: string | null, overridePoints?: number) => {
    if (!currentStep) return;

    // Closure değerlerini yerel değişkenlere al — setSession callback'i bunları yakalar
    const pts = overridePoints !== undefined ? overridePoints : pointsThisStep;
    const actions = actionsThisStep;
    const critErrors = criticalErrorsThisStep;
    const stepId = currentStep.id;

    setSession((s) => {
      if (!s) return s;
      const nextStepId =
        unlockId ??
        pickNextStep(rs, stepId, [], s.selected_difficulty);

      let newSession = completeStep(
        s,           // stale closure yerine güncel state
        stepId,
        pts,
        actions,
        critErrors,
        nextStepId
      );

      if (newSession.finished) newSession = finalizeSession(newSession, rs, "completed");
      return newSession;
    });

    setActionsThisStep([]);
    setPointsThisStep(0);
    setCriticalErrorsThisStep(0);
    setDecisionAnswered(null);
    setDecisionMultiAnswered(null);
  };

  const canContinue =
    currentStep.kind === "action" &&
    (!currentStep.min_actions ||
      actionsThisStep.length >= currentStep.min_actions);

  const visibleSteps = rs.steps.filter((s) => {
    const d = session.selected_difficulty;
    if (s.min_difficulty !== undefined && d < s.min_difficulty) return false;
    if (s.max_difficulty !== undefined && d > s.max_difficulty) return false;
    return true;
  });

  const stepIndex = visibleSteps.findIndex((s) => s.id === currentStep.id);
  const stepCount = visibleSteps.length;

  const specialtyTheme = getSpecialtyTheme(rs.specialty);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-ink-950/95 backdrop-blur-md border-b border-ink-700/50">
        {/* Specialty accent stripe */}
        <div className="h-0.5 w-full" style={{ background: specialtyTheme.accent, opacity: 0.7 }} />
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-4">
          <button
            onClick={() => {
              if (confirm("Senaryodan çıkmak istediğinden emin misin? İlerleme kaybolacak.")) {
                navigate("/senaryolar");
              }
            }}
            className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Çık
          </button>

          <div className="h-4 w-px bg-ink-700" />

          <div className="flex items-center gap-2">
            <span className="tag tag-brand">
              {session.mode === "egitim" ? (
                <><GraduationCap className="w-3 h-3 mr-1 inline" />Eğitim</>
              ) : session.mode === "klinik" ? (
                <><ActivityIcon className="w-3 h-3 mr-1 inline" />Klinik</>
              ) : (
                <><Timer className="w-3 h-3 mr-1 inline" />Sınav</>
              )}
            </span>
            <span
              className="px-2 py-0.5 text-[10px] font-mono rounded bg-ink-800 text-ink-200 border border-ink-700 flex items-center gap-1"
              title={`Zorluk seviyesi: ${session.selected_difficulty}`}
            >
              <Gauge className="w-3 h-3" />
              Seviye {session.selected_difficulty}
            </span>
            {session.variant_id && (
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-ink-800 text-ink-300 border border-ink-700 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {scenario.variants?.find((v) => v.id === session.variant_id)?.label ?? session.variant_id}
              </span>
            )}
            <span className="text-xs font-mono text-ink-400">
              Adım {stepIndex + 1} / {stepCount}
            </span>
          </div>

          <div className="flex-1 mx-4 h-1 bg-ink-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${((stepIndex + 1) / stepCount) * 100}%`,
                background: specialtyTheme.accent,
              }}
            />
          </div>

          <div className="flex items-center gap-3 font-mono text-sm">
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className="flex items-center text-ink-400 hover:text-ink-100 transition"
              title={soundEnabled ? "Sesi kapat" : "Sesi aç"}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-clinical-stable" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-brand-light" />
              <span className="text-ink-100 tabular-nums">{session.total_score}</span>
              <span className="text-ink-500">puan</span>
            </div>
            {/* Erken bitir — partial olarak finalizeSession */}
            <button
              onClick={() => {
                if (confirm("Senaryoyu şimdi bitir ve sonuçları gör? (Aktif adımdaki puanın korunur, harf notu hesaplanmaz)")) {
                  setSession((s) => {
                    if (!s) return s;
                    // Aktif adımda iz bırakıldıysa (puan, aksiyon veya kritik hata) senkron flush
                    const hasProgress =
                      pointsThisStep !== 0 ||
                      actionsThisStep.length > 0 ||
                      criticalErrorsThisStep > 0;
                    const flushed = (hasProgress && currentStep)
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
                }
              }}
              className="text-xs text-ink-500 hover:text-clinical-warning border border-ink-700 hover:border-clinical-warning/50 rounded px-2 py-0.5 transition"
            >
              Bitir
            </button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="grid lg:grid-cols-[320px_1fr_320px] gap-4">
          <aside className="space-y-4 order-2 lg:order-1">
            <PatientCard patient={rs.patient} />
            <VitalsMonitor
              vitals={session.vitals}
              baseline={session.baseline_vitals}
              activeMedCount={session.active_medications?.length ?? 0}
              startedAt={session.started_at}
              ecgPattern={rs.ekg_pattern}
              ecgParams={session.current_ecg_params}
            />
          </aside>

          <section className="order-1 lg:order-2">
            <StepDisplay
              step={currentStep}
              mode={session.mode}
              actionsThisStep={actionsThisStep.length}
              onDecisionSelect={handleDecision}
              onDecisionMultiConfirm={handleDecisionMulti}
              onInfoContinue={handleInfoContinue}
              onActionStepContinue={handleActionStepContinue}
              canContinue={canContinue}
              decisionAnswered={decisionAnswered}
              decisionMultiAnswered={decisionMultiAnswered}
              visibleOptions={
                currentStep.kind === "decision"
                  ? seededShuffle(
                      getVisibleOptions(currentStep, session.selected_difficulty),
                      `${resolvedScenario?.id ?? scenario.id}:${currentStep.id}:${session.started_at}`
                    )
                  : undefined
              }
            />
          </section>

          <aside className="order-3">
            {currentStep.kind === "action" ? (
              <div className="h-[600px]">
                <InventoryPanel
                  availableMedications={rs.available_medications}
                  availableEquipment={rs.available_equipment}
                  onAction={handleAction}
                  labPanels={rs.lab_panels}
                  imagingResults={imagingResults}
                  getLabStatus={getLabStatus}
                  onOrderLab={handleOrderLab}
                  onViewLab={setOpenLabPanelId}
                  onViewImaging={setOpenImagingId}
                />
              </div>
            ) : (
              <div className="panel p-5 text-center text-sm text-ink-400">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 mb-2">
                  Envanter
                </div>
                Bu adımda envanter kullanılmıyor.
              </div>
            )}
          </aside>
        </div>
      </div>

      <FeedbackToast feedback={feedback} mode={session.mode} onClose={clear} />

      <CriticalContraindicationModal
        info={criticalInfo}
        hidden={criticalModalHidden}
        showGuidance={session.mode !== "sinav"}
        onResolved={() => { setCriticalInfo(null); setCriticalModalHidden(false); }}
        onExpired={handleCriticalExpired}
        onDismiss={() => setCriticalModalHidden(true)}
      />

      {/* Tetkik geri sayım modalı */}
      {labCountdownInfo && (
        <LabOrderCountdownModal
          panelName={labCountdownInfo.panelName}
          delaySec={labCountdownInfo.delaySec}
          onClose={() => setLabCountdownInfo(null)}
          onCountdownEnd={() => {
            setOpenLabPanelId(labCountdownInfo.panelId);
            setLabCountdownInfo(null);
          }}
        />
      )}

      {/* Lab sonuç modalı */}
      {openLabPanelId && (() => {
        const ready = getReadyPanel(openLabPanelId);
        if (!ready) return null;
        return (
          <LabResultsModal
            panel={ready.panel}
            history={ready.history}
            scenarioTimeMin={Math.floor((Date.now() - session.started_at) / 60000)}
            onClose={() => setOpenLabPanelId(null)}
          />
        );
      })()}

      {/* Görüntüleme modalı */}
      {openImagingId && (() => {
        const img = imagingResults.find((r) => r.id === openImagingId);
        if (!img) return null;
        return (
          <ImagingResultsModal
            result={img}
            onClose={() => setOpenImagingId(null)}
          />
        );
      })()}
    </div>
  );
}

// ============================================================
// Mode + Difficulty + Variant Selector
// ============================================================

function ModeSelector({
  scenario,
  onStart,
  onBack,
}: {
  scenario: Scenario;
  onStart: (mode: PlayMode, difficulty: Difficulty, variantId?: string) => void;
  onBack: () => void;
}) {
  const supported: Difficulty[] = scenario.supported_difficulties ?? [1, 2, 3, 4, 5];
  const initialDiff: Difficulty = supported.includes(scenario.difficulty)
    ? scenario.difficulty
    : supported[0];

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(initialDiff);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);

  const hasVariants = (scenario.variants?.length ?? 0) > 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-50 mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Geri
      </button>

      <div className="panel p-8 md:p-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 mb-3">
          / Senaryo Başlangıcı
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-ink-50 mb-3">
          {scenario.title}
        </h1>
        <p className="text-ink-300 leading-relaxed mb-10">{scenario.description}</p>

        {/* Zorluk seçici */}
        <div className="mb-10">
          <DifficultySelector
            supported={supported}
            selected={selectedDifficulty}
            onSelect={setSelectedDifficulty}
          />
        </div>

        {/* Varyant seçici */}
        {hasVariants && (
          <div className="mb-10">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-4">
              Hasta Varyantı
            </div>
            <div className="grid gap-2">
              <VariantCard
                label="Standart Vaka"
                description={`${scenario.patient.age} yaş, ${scenario.patient.sex === "M" ? "Erkek" : "Kadın"} — ${scenario.patient.chief_complaint}`}
                selected={selectedVariantId === undefined}
                onSelect={() => setSelectedVariantId(undefined)}
              />
              {scenario.variants!.map((v) => (
                <VariantCard
                  key={v.id}
                  label={v.label}
                  description={v.description}
                  selected={selectedVariantId === v.id}
                  onSelect={() => setSelectedVariantId(v.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mod seçici */}
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-4">
          Oyun Modu
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <button
            onClick={() => onStart("egitim", selectedDifficulty, selectedVariantId)}
            className="panel-inset p-5 text-left hover:border-brand/40 transition group"
          >
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-brand-light" />
              <h3 className="font-display text-lg text-ink-50">Eğitim</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Anında feedback. Hızlı öğrenme, tekrar oynanabilirlik.
            </p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>· Anında açıklama</li>
              <li>· 8× hızlandırılmış</li>
              <li>· Öğrenmeye odaklı</li>
            </ul>
          </button>

          <button
            onClick={() => onStart("klinik", selectedDifficulty, selectedVariantId)}
            className="panel-inset p-5 text-left hover:border-clinical-info/40 transition group"
          >
            <div className="flex items-center gap-2 mb-3">
              <ActivityIcon className="w-5 h-5 text-clinical-info" />
              <h3 className="font-display text-lg text-ink-50">Klinik</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Hasta başındaymış gibi. 3× gerçekçi hız.
            </p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>· Anında feedback</li>
              <li>· 3× gerçekçi hız</li>
              <li>· Hasta başı hissi</li>
            </ul>
          </button>

          <button
            onClick={() => onStart("sinav", selectedDifficulty, selectedVariantId)}
            className="panel-inset p-5 text-left hover:border-clinical-warning/40 transition group"
          >
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-5 h-5 text-clinical-warning" />
              <h3 className="font-display text-lg text-ink-50">Sınav</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Feedback gizli. Sonunda harf notu ve debrief.
            </p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>· Feedback debrief'te</li>
              <li>· Gerçek zaman (1×)</li>
              <li>· Harf notu (A-F)</li>
            </ul>
          </button>
        </div>
      </div>
    </div>
  );
}

function VariantCard({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "text-left p-4 rounded-md border transition",
        selected
          ? "border-brand/50 bg-brand/5"
          : "border-ink-700 bg-ink-900/50 hover:border-ink-500"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition",
            selected ? "border-brand bg-brand" : "border-ink-600"
          )}
        />
        <div>
          <div className="text-sm font-medium text-ink-100">{label}</div>
          <div className="text-xs text-ink-400 mt-0.5 leading-snug">{description}</div>
        </div>
      </div>
    </button>
  );
}
