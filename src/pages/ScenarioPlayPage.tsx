import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getScenario } from "@/data/scenarios";
import {
  startSession,
  getCurrentStep,
  evaluateAction,
  evaluateDecision,
  completeStep,
  finalizeSession,
  applyVitalsChange,
  pickNextStep,
  getVisibleOptions,
  type SessionState,
  type ActionRef,
  type DecisionOption,
  type PlayMode,
  type Difficulty,
  type Scenario,
} from "@/engine";
import { getExtendedMedication } from "@/data/medications-extended";
import {
  administerMedication,
} from "@/engine/pharmacology/engine";
import { getMedication } from "@/data/medications";
import { useVitalsTick } from "@/hooks/useVitalsTick";
import { useMonitorSounds } from "@/hooks/useMonitorSounds";
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
import {
  ArrowLeft,
  GraduationCap,
  Timer,
  Activity as ActivityIcon,
  Gauge,
  Volume2,
  VolumeX,
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
  const [criticalInfo, setCriticalInfo] =
    useState<CriticalContraindicationInfo | null>(null);

  const { feedback, show, clear } = useFeedback();

  // Canlı monitör tick — farmakoloji motorunu her X ms'de bir tetikler,
  // baseline + pharma delta formülüyle vitalleri günceller.
  // Kritik modal açıkken duraklat (kullanıcı karar vermek zorunda olmalı).
  useVitalsTick({
    scenario,
    session,
    setSession,
    paused: criticalInfo !== null,
  });

  // localStorage senkronu — soundEnabled değişince kaydet
  useEffect(() => {
    localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "true" : "false");
  }, [soundEnabled]);

  // Monitör sesleri — HR senkron bip, kritik alarmlar
  useMonitorSounds({
    hr: session?.vitals.hr ?? 60,
    spo2: session?.vitals.spo2 ?? 98,
    enabled: soundEnabled && session !== null && !session.finished,
  });

  // Kritik süre dolduğunda — senaryoyu başarısız bitir
  const handleCriticalExpired = useCallback(() => {
    if (!session || !scenario) return;
    setCriticalInfo(null);
    show({
      text:
        "Kritik kontrendikasyon düzeltme süresi doldu. Hastada ciddi komplikasyon gelişti.",
      points: -30,
      type: "critical",
    });
    const finalized = finalizeSession(
      { ...session, total_score: session.total_score - 30 },
      scenario
    );
    setSession(finalized);
  }, [session, scenario, show]);

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

  // ----- Mode + difficulty selection (oyun başlamadan önce)
  if (!session) {
    return (
      <ModeSelector
        scenario={scenario}
        onStart={(mode, difficulty) =>
          setSession(startSession(scenario, mode, difficulty))
        }
        onBack={() => navigate("/senaryolar")}
      />
    );
  }

  // ----- Finished — show debrief
  if (session.finished) {
    return (
      <DebriefScreen
        scenario={scenario}
        session={session}
        onRestart={() => {
          setSession(null);
          setActionsThisStep([]);
          setPointsThisStep(0);
          setCriticalErrorsThisStep(0);
          setDecisionAnswered(null);
          setCriticalInfo(null);
        }}
      />
    );
  }

  const currentStep = getCurrentStep(scenario, session);
  if (!currentStep) {
    return (
      <DebriefScreen
        scenario={scenario}
        session={finalizeSession(session, scenario)}
        onRestart={() => setSession(null)}
      />
    );
  }

  // ----- Action handler (ilaç / ekipman)
  const handleAction = (action: ActionRef) => {
    if (currentStep.kind !== "action") {
      show({
        text: "Bu adımda envanter kullanılmıyor.",
        points: 0,
        type: "neutral",
      });
      return;
    }

    // Farmakoloji motorunu ilaç aksiyonları için çalıştır
    let pharmaPoints = 0;
    let pharmaCritical: CriticalContraindicationInfo | null = null;

    if (action.type === "give_medication") {
      const extended = getExtendedMedication(action.target_id);
      if (extended) {
        // Verilen doz — senaryo outcome'dan geliyor yoksa default
        const doseGiven = extended.dose_band.default_dose *
          (extended.dose_band.weight_based ? scenario.patient.weight_kg : 1);

        const result = administerMedication({
          medication: extended,
          doseGiven,
          patient: scenario.patient,
          vitals: session.vitals,
          activeMedicationIds: session.active_medication_ids ?? [],
          sourceStepId: currentStep.id,
          // Senaryo yazarı bu ilaç için özel timing tanımlamışsa kullan.
          // Ayarlanmayan alanlar ilacın kendi değerlerine fallback.
          timingOverride: scenario.medication_timing_overrides?.[extended.id],
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

        // Aktif ilaç listesine ekle — tam ActiveMedication objesi
        // (tick motoru instance_id, administered_at, effective_vitals,
        //  timing, expires_at bilgilerine ihtiyaç duyar)
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
                  // Eski alan da senkron tutulsun (geriye dönük uyum)
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

    // Senaryo motorunun outcome'ını al (puan + feedback + unlock)
    const evaluation = evaluateAction(
      currentStep,
      action,
      scenario,
      session.selected_difficulty
    );

    const totalPoints = evaluation.points + pharmaPoints;
    const isCritical = evaluation.critical || pharmaCritical !== null;
    const isPositive = totalPoints > 0;

    // Feedback mesajı — farmakoloji cezası varsa açıkla
    let combinedFeedback = evaluation.feedback;
    if (pharmaPoints !== 0 && !pharmaCritical) {
      combinedFeedback +=
        pharmaPoints < 0
          ? ` (Farmakoloji: ${pharmaPoints} — doz/kontrendikasyon)`
          : "";
    }

    show({
      text: combinedFeedback,
      points: totalPoints,
      type: isCritical ? "critical" : isPositive ? "positive" : "negative",
    });

    setActionsThisStep((prev) => [...prev, action]);
    setPointsThisStep((p) => p + totalPoints);
    if (isCritical) {
      setCriticalErrorsThisStep((c) => c + 1);
    }

    // Vital güncellemesi — outcome'dan gelen statik değişim
    // ÖNEMLİ: Canlı monitör baseline + pharma delta formülüyle çalışır.
    // Statik değişimi sadece `vitals`'a uygularsak, bir sonraki tick
    // baseline + delta hesaplayıp değişikliği siler. Bu yüzden her ikisine de
    // uyguluyoruz — baseline kaydı da değişmiş olur, tick bir sonraki sefer
    // yeni baseline'dan hesaplar.
    if (evaluation.vitals_change && session) {
      setSession({
        ...session,
        baseline_vitals: applyVitalsChange(
          session.baseline_vitals,
          evaluation.vitals_change
        ),
        vitals: applyVitalsChange(session.vitals, evaluation.vitals_change),
      });
    }

    // Kritik modal'ı göster
    if (pharmaCritical) {
      setCriticalInfo(pharmaCritical);
    }

    // Otomatik unlock — sonraki adıma geç
    if (evaluation.unlocks.length > 0 && !pharmaCritical) {
      setTimeout(() => {
        finishStep(evaluation.unlocks[0]);
      }, 1200);
    }
  };

  // ----- Decision handler
  const handleDecision = (option: DecisionOption) => {
    if (currentStep.kind !== "decision" || decisionAnswered) return;

    const evaluation = evaluateDecision(
      currentStep,
      option.id,
      session.selected_difficulty,
      scenario
    );
    if (!evaluation) return;

    setDecisionAnswered({
      optionId: option.id,
      feedback: option.feedback,
    });

    const isPositive = evaluation.points > 0;
    show({
      text: evaluation.feedback,
      points: evaluation.points,
      type: isPositive ? "positive" : "negative",
    });

    setPointsThisStep(evaluation.points);

    setTimeout(() => {
      finishStep(null);
    }, 1800);
  };

  const handleInfoContinue = () => finishStep(null);
  const handleActionStepContinue = () => finishStep(null);

  // ----- Adım bitirme ortak mantığı
  const finishStep = (unlockId: string | null) => {
    if (!session || !currentStep) return;

    const nextStepId =
      unlockId ??
      pickNextStep(scenario, currentStep.id, [], session.selected_difficulty);

    let newSession = completeStep(
      session,
      currentStep.id,
      pointsThisStep,
      actionsThisStep,
      criticalErrorsThisStep,
      nextStepId
    );

    if (newSession.finished) {
      newSession = finalizeSession(newSession, scenario);
    }

    setSession(newSession);
    setActionsThisStep([]);
    setPointsThisStep(0);
    setCriticalErrorsThisStep(0);
    setDecisionAnswered(null);
  };

  // ----- Continue rules
  const canContinue =
    currentStep.kind === "action" &&
    (!currentStep.min_actions ||
      actionsThisStep.length >= currentStep.min_actions);

  // Görünür adım listesini hesapla — sadece zorluğa uygun olanları göster
  // (useMemo kullanmıyoruz çünkü Rules of Hooks: erken return sonrası hook olamaz)
  const visibleSteps = scenario.steps.filter((s) => {
    const min = s.min_difficulty;
    const max = s.max_difficulty;
    const d = session.selected_difficulty;
    if (min !== undefined && d < min) return false;
    if (max !== undefined && d > max) return false;
    return true;
  });

  const stepIndex = visibleSteps.findIndex((s) => s.id === currentStep.id);
  const stepCount = visibleSteps.length;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-ink-950/95 backdrop-blur-md border-b border-ink-700/50">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-4">
          <button
            onClick={() => {
              if (
                confirm(
                  "Senaryodan çıkmak istediğinden emin misin? İlerleme kaybolacak."
                )
              ) {
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
                <>
                  <GraduationCap className="w-3 h-3 mr-1 inline" />
                  Eğitim
                </>
              ) : session.mode === "klinik" ? (
                <>
                  <ActivityIcon className="w-3 h-3 mr-1 inline" />
                  Klinik
                </>
              ) : (
                <>
                  <Timer className="w-3 h-3 mr-1 inline" />
                  Sınav
                </>
              )}
            </span>
            <span
              className="px-2 py-0.5 text-[10px] font-mono rounded bg-ink-800 text-ink-200 border border-ink-700 flex items-center gap-1"
              title={`Zorluk seviyesi: ${session.selected_difficulty}`}
            >
              <Gauge className="w-3 h-3" />
              Seviye {session.selected_difficulty}
            </span>
            <span className="text-xs font-mono text-ink-400">
              Adım {stepIndex + 1} / {stepCount}
            </span>
          </div>

          <div className="flex-1 mx-4 h-1 bg-ink-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-dark to-brand-light transition-all duration-500"
              style={{
                width: `${((stepIndex + 1) / stepCount) * 100}%`,
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
              <span className="text-ink-100">{session.total_score}</span>
              <span className="text-ink-500">puan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="grid lg:grid-cols-[320px_1fr_320px] gap-4">
          {/* Left — patient & vitals */}
          <aside className="space-y-4 order-2 lg:order-1">
            <PatientCard patient={scenario.patient} />
            <VitalsMonitor
              vitals={session.vitals}
              baseline={session.baseline_vitals}
              activeMedCount={session.active_medications?.length ?? 0}
              startedAt={session.started_at}
              ecgPattern={scenario.ekg_pattern}
            />
          </aside>

          {/* Center — current step */}
          <section className="order-1 lg:order-2">
            <StepDisplay
              step={currentStep}
              mode={session.mode}
              actionsThisStep={actionsThisStep.length}
              onDecisionSelect={handleDecision}
              onInfoContinue={handleInfoContinue}
              onActionStepContinue={handleActionStepContinue}
              canContinue={canContinue}
              decisionAnswered={decisionAnswered}
              visibleOptions={
                currentStep.kind === "decision"
                  ? getVisibleOptions(
                      currentStep,
                      session.selected_difficulty
                    )
                  : undefined
              }
            />
          </section>

          {/* Right — inventory (only for action steps) */}
          <aside className="order-3">
            {currentStep.kind === "action" ? (
              <div className="h-[600px]">
                <InventoryPanel
                  availableMedications={scenario.available_medications}
                  availableEquipment={scenario.available_equipment}
                  onAction={handleAction}
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
        showGuidance={session.mode !== "sinav"}
        onResolved={() => setCriticalInfo(null)}
        onExpired={handleCriticalExpired}
        onDismiss={() => setCriticalInfo(null)}
      />
    </div>
  );
}

// ============================================================
// Mode + Difficulty Selector
// ============================================================

function ModeSelector({
  scenario,
  onStart,
  onBack,
}: {
  scenario: Scenario;
  onStart: (mode: PlayMode, difficulty: Difficulty) => void;
  onBack: () => void;
}) {
  const supported: Difficulty[] =
    scenario.supported_difficulties ?? [1, 2, 3, 4, 5];

  // İlk seçimde senaryonun default difficulty'si (desteklenirse)
  const initialDiff: Difficulty = supported.includes(scenario.difficulty)
    ? scenario.difficulty
    : supported[0];

  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>(initialDiff);

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
        <p className="text-ink-300 leading-relaxed mb-10">
          {scenario.description}
        </p>

        {/* Difficulty selector */}
        <div className="mb-10">
          <DifficultySelector
            supported={supported}
            selected={selectedDifficulty}
            onSelect={setSelectedDifficulty}
          />
        </div>

        {/* Mode selector */}
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-4">
          Oyun Modu
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <button
            onClick={() => onStart("egitim", selectedDifficulty)}
            className="panel-inset p-5 text-left hover:border-brand/40 transition group"
          >
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-brand-light" />
              <h3 className="font-display text-lg text-ink-50">Eğitim</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Anında feedback. Hızlı öğrenme, tekrar oynanabilirlik. Kavram pekiştirme için.
            </p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>· Anında açıklama</li>
              <li>· 8× hızlandırılmış</li>
              <li>· Öğrenmeye odaklı</li>
            </ul>
          </button>

          <button
            onClick={() => onStart("klinik", selectedDifficulty)}
            className="panel-inset p-5 text-left hover:border-clinical-info/40 transition group"
          >
            <div className="flex items-center gap-2 mb-3">
              <ActivityIcon className="w-5 h-5 text-clinical-info" />
              <h3 className="font-display text-lg text-ink-50">Klinik</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Hasta başındaymış gibi. Monitör gerçekçi çalışır ama bekleme yok. Vaka tartışması için.
            </p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>· Anında feedback</li>
              <li>· 3× gerçekçi hız</li>
              <li>· Hasta başı hissi</li>
            </ul>
          </button>

          <button
            onClick={() => onStart("sinav", selectedDifficulty)}
            className="panel-inset p-5 text-left hover:border-clinical-warning/40 transition group"
          >
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-5 h-5 text-clinical-warning" />
              <h3 className="font-display text-lg text-ink-50">Sınav</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Feedback gizli, sadece puan. Sonunda harf notu ve debrief. Değerlendirme için.
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
