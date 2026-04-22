import { useState, useMemo } from "react";
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
  type SessionState,
  type ActionRef,
  type DecisionOption,
  type PlayMode,
} from "@/engine";
import { PatientCard } from "@/components/PatientCard";
import { VitalsMonitor } from "@/components/VitalsMonitor";
import { InventoryPanel } from "@/components/InventoryPanel";
import { StepDisplay } from "@/components/StepDisplay";
import { DebriefScreen } from "@/components/DebriefScreen";
import { FeedbackToast, useFeedback } from "@/components/FeedbackToast";
import {
  ArrowLeft,
  GraduationCap,
  Timer,
  Activity as ActivityIcon,
} from "lucide-react";

export function ScenarioPlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scenario = useMemo(() => (id ? getScenario(id) : undefined), [id]);

  const [session, setSession] = useState<SessionState | null>(null);
  const [actionsThisStep, setActionsThisStep] = useState<ActionRef[]>([]);
  const [pointsThisStep, setPointsThisStep] = useState(0);
  const [criticalErrorsThisStep, setCriticalErrorsThisStep] = useState(0);
  const [decisionAnswered, setDecisionAnswered] = useState<{
    optionId: string;
    feedback: string;
  } | null>(null);

  const { feedback, show, clear } = useFeedback();

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

  // ----- Mode selection (oyun başlamadan önce)
  if (!session) {
    return (
      <ModeSelector
        title={scenario.title}
        description={scenario.description}
        onStart={(mode) => setSession(startSession(scenario, mode))}
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
        }}
      />
    );
  }

  const currentStep = getCurrentStep(scenario, session);
  if (!currentStep) {
    // Bu dal teorik olarak ulaşılmaz — finishStep zaten finalize ediyor.
    // Ama defensive olarak debrief'e zorla geçiş.
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

    const evaluation = evaluateAction(currentStep, action, scenario);
    const isPositive = evaluation.points > 0;

    show({
      text: evaluation.feedback,
      points: evaluation.points,
      type: evaluation.critical
        ? "critical"
        : isPositive
        ? "positive"
        : "negative",
    });

    setActionsThisStep((prev) => [...prev, action]);
    setPointsThisStep((p) => p + evaluation.points);
    if (evaluation.critical) {
      setCriticalErrorsThisStep((c) => c + 1);
    }

    // Vital güncellemesi
    if (evaluation.vitals_change && session) {
      setSession({
        ...session,
        vitals: applyVitalsChange(session.vitals, evaluation.vitals_change),
      });
    }

    // Otomatik unlock — sonraki adıma geç
    if (evaluation.unlocks.length > 0) {
      // Kullanıcıya biraz zaman ver feedback görsün
      setTimeout(() => {
        finishStep(evaluation.unlocks[0]);
      }, 1200);
    }
  };

  // ----- Decision handler
  const handleDecision = (option: DecisionOption) => {
    if (currentStep.kind !== "decision" || decisionAnswered) return;

    const evaluation = evaluateDecision(currentStep, option.id);
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

    // Karar adımı tek seferlik — kısa bir delay sonra sonraki adım
    setTimeout(() => {
      finishStep(null);
    }, 1800);
  };

  // ----- Info step — devam et
  const handleInfoContinue = () => {
    finishStep(null);
  };

  // ----- Manuel "sonraki adıma geç" (aksiyon adımları için)
  const handleActionStepContinue = () => {
    finishStep(null);
  };

  // ----- Adım bitirme ortak mantığı
  const finishStep = (unlockId: string | null) => {
    if (!session || !currentStep) return;

    const nextStepId =
      unlockId ?? pickNextStep(scenario, currentStep.id, []);

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

  const stepIndex = scenario.steps.findIndex((s) => s.id === currentStep.id);
  const stepCount = scenario.steps.length;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-ink-950/95 backdrop-blur-md border-b border-ink-700/50">
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
                <>
                  <GraduationCap className="w-3 h-3 mr-1 inline" />
                  Eğitim
                </>
              ) : (
                <>
                  <Timer className="w-3 h-3 mr-1 inline" />
                  Sınav
                </>
              )}
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

          <div className="flex items-center gap-2 font-mono text-sm">
            <ActivityIcon className="w-4 h-4 text-brand-light" />
            <span className="text-ink-100">{session.total_score}</span>
            <span className="text-ink-500">puan</span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="grid lg:grid-cols-[320px_1fr_320px] gap-4">
          {/* Left — patient & vitals */}
          <aside className="space-y-4 order-2 lg:order-1">
            <PatientCard patient={scenario.patient} />
            <VitalsMonitor vitals={session.vitals} />
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

      <FeedbackToast
        feedback={feedback}
        mode={session.mode}
        onClose={clear}
      />
    </div>
  );
}

// ------------------------------------------------------------
// Mode Selector — oyuna başlamadan önce mod seçimi
// ------------------------------------------------------------

function ModeSelector({
  title,
  description,
  onStart,
  onBack,
}: {
  title: string;
  description: string;
  onStart: (mode: PlayMode) => void;
  onBack: () => void;
}) {
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
          {title}
        </h1>
        <p className="text-ink-300 leading-relaxed mb-10">{description}</p>

        <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-4">
          Oyun Modu
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={() => onStart("egitim")}
            className="panel-inset p-6 text-left hover:border-brand/40 transition group"
          >
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap className="w-6 h-6 text-brand-light" />
              <h3 className="font-display text-xl text-ink-50">Eğitim Modu</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Her aksiyonda anında feedback alırsın. Yanlışlar açıklanır, doğrular
              pekiştirilir. Pratik için ideal.
            </p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>· Anında açıklama</li>
              <li>· Süre baskısı yok</li>
              <li>· Öğrenmeye odaklı</li>
            </ul>
          </button>

          <button
            onClick={() => onStart("sinav")}
            className="panel-inset p-6 text-left hover:border-clinical-warning/40 transition group"
          >
            <div className="flex items-center gap-3 mb-3">
              <Timer className="w-6 h-6 text-clinical-warning" />
              <h3 className="font-display text-xl text-ink-50">Sınav Modu</h3>
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-3">
              Feedback gizlenir, sadece puan değişimi görünür. Sonunda harf notu
              ve detaylı debrief. Değerlendirme için.
            </p>
            <ul className="text-xs text-ink-400 space-y-1">
              <li>· Feedback debrief'te</li>
              <li>· Zaman sınırları aktif</li>
              <li>· Harf notu (A-F)</li>
            </ul>
          </button>
        </div>
      </div>
    </div>
  );
}
