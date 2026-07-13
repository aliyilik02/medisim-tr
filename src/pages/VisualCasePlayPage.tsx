// ============================================================
// VisualCasePlayPage — görselli vaka akışı (/vaka/:id) · PİLOT
// ============================================================
// "Hasta hissi olan MedCase" (Ali Bey vizyonu, 12 Tem 2026): rol üstlen,
// hazır senaryo yollarını tıklayarak yürüt; hasta DURUM görseli deterioration
// ile değişir, her müdahale AKSİYON ara-sahnesi tetikler (CaseStage).
// TEMİZ iskelet — 3D yok, bayrak yok. Motorlar aynen: useScenarioRunner
// (senaryo/skor/lab/karar) + physiology (deterioration/faz-senkron) +
// farmakoloji + görsel katman (clinicalVisualMapping → visual2d-mapper).
// Görseller (arketip×ortam) manifest'inden (visual-manifest.ts) — senaryoya
// özel görsel YOK, 400 senaryoya ölçeklenir.
// Kapsam dışı (sonraki turlar): diyalog, ventilatör, muhakeme modalı,
// oskültasyon overlay, motion videoları, diğer arketip setleri.

import { useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Activity as ActivityIcon } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import { useScenarioRunner } from "@/hooks/useScenarioRunner";
import { useStableValue } from "@/hooks/useStableValue";
import { mapVitalsToVisuals, applyPhaseVisual } from "@/clinical/clinicalVisualMapping";
import { getPedagogy, PEDAGOGY_ORDER } from "@/engine";
import type { ActionRef, PlayMode } from "@/engine";
import { resolveVisualSet } from "@/visuals/visual-manifest";
import { resolveActionVisual } from "@/visuals/action-visuals";
import { addTrace, traceForAction, type TraceKey } from "@/visuals/persistent-traces";
import { CaseStage, type ActionCue } from "@/components/case-visual/CaseStage";
import { VitalMonitorScreen } from "@/components/monitor/VitalMonitorScreen";
import { patientVitalsToMonitor } from "@/components/monitor/adapter";
import { StepDisplay } from "@/components/StepDisplay";
import { InventoryPanel } from "@/components/InventoryPanel";
import { DebriefScreen } from "@/components/DebriefScreen";
import { FeedbackToast } from "@/components/FeedbackToast";
import { CriticalContraindicationModal } from "@/components/CriticalContraindicationModal";
import { LabResultsModal } from "@/components/LabResultsModal";
import { LabOrderCountdownModal } from "@/components/LabOrderCountdownModal";
import { ImagingResultsModal } from "@/components/ImagingResultsModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/cn";

// Rol — pilotta sunum katmanı (etiket + karşılama); aksiyon filtresi sonraki tur.
const ROLES = {
  doktor: "Doktor",
  hemsire: "Hemşire",
  acil: "Acil Hekimi",
  sihhiyeci: "Askeri Sıhhiyeci",
} as const;
type Role = keyof typeof ROLES;

function parseRole(raw: string | null): Role {
  return raw && raw in ROLES ? (raw as Role) : "doktor";
}

function parsePlayMode(raw: string | null): PlayMode {
  return raw && (PEDAGOGY_ORDER as string[]).includes(raw) ? (raw as PlayMode) : "egitim";
}

export function VisualCasePlayPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const role = parseRole(params.get("rol"));
  const playMode = parsePlayMode(params.get("mod"));

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === id) ?? null,
    [id],
  );

  if (!scenario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-ink-400">
        <div className="font-mono text-xs uppercase tracking-wider">Senaryo bulunamadı</div>
        <Link to="/senaryolar" className="btn-ghost text-sm">Senaryolara dön</Link>
      </div>
    );
  }
  return <CaseRunner scenario={scenario} role={role} playMode={playMode} />;
}

function CaseRunner({
  scenario,
  role,
  playMode,
}: {
  scenario: (typeof SCENARIOS)[number];
  role: Role;
  playMode: PlayMode;
}) {
  const runner = useScenarioRunner({ scenario, autoStartMode: playMode });
  const { session, currentStep } = runner;
  const pedagogy = getPedagogy(session?.mode ?? playMode);

  // Görsel set — (arketip×ortam), senaryodan türetilir. Set yoksa sayfa
  // görselsiz oynanır (uyarı şeridi) — akış asla kilitlenmez.
  const visual = useMemo(
    () => resolveVisualSet(scenario.specialty, scenario.patient),
    [scenario],
  );

  const liveVitals = session?.vitals ?? scenario.initial_vitals;
  const visualState = useStableValue(
    useMemo(
      () => applyPhaseVisual(mapVitalsToVisuals(liveVitals), runner.phaseSignal?.visual),
      [liveVitals, runner.phaseSignal],
    ),
  );

  // Aksiyon ara-sahnesi tetiği — motor çağrısından ÖNCE görsel cue düşer.
  const [actionCue, setActionCue] = useState<ActionCue | null>(null);
  const nonceRef = useRef(0);
  // Kalıcı izler (D kararı): maske/IV/EKG… takılınca hastada KALIR —
  // durum karesi varyantı + çip şeridi bundan beslenir. Fizik gerçeği:
  // motor aksiyonu puanca reddetse de ekipman hastaya takılmıştır.
  const [traces, setTraces] = useState<readonly TraceKey[]>([]);
  const cueFor = (action: ActionRef) => {
    const resolved = resolveActionVisual(action);
    if (!resolved) return;
    setActionCue({ ...resolved, nonce: ++nonceRef.current });
    const trace = traceForAction(resolved.key);
    if (trace) setTraces((prev) => addTrace(prev, trace));
  };

  const onAction = (action: ActionRef) => {
    cueFor(action);
    runner.handleAction(action);
  };

  if (session?.finished) {
    return (
      <DebriefScreen
        scenario={scenario}
        session={session}
        onRestart={() => {
          // Yeni oynanış = temiz hasta: izler + açık ara-sahne sıfırlanır.
          setTraces([]);
          setActionCue(null);
          runner.restart();
        }}
      />
    );
  }

  const stepIndex = currentStep
    ? scenario.steps.findIndex((s) => s.id === currentStep.id)
    : -1;

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-50 overflow-hidden">
      {/* Header */}
      <header className="border-b border-ink-700/50 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0 bg-ink-950/95 backdrop-blur-md">
        <Link
          to="/senaryolar"
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400 hover:text-ink-100 transition flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Çıkış
        </Link>
        <div className="flex-1 min-w-0">
          <div className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.2em] neon-teal neon-text truncate">
            MediSim TR · Görselli Vaka Akışı
          </div>
          <h1 className="font-display text-base leading-tight truncate text-ink-50">
            {scenario.title}
          </h1>
        </div>
        {/* Rol rozeti */}
        <span
          data-testid="case-role"
          className="px-2 py-0.5 rounded uppercase tracking-[0.12em] text-[10px] border font-mono neon-teal text-brand-light border-brand/40 bg-brand/10 shrink-0"
        >
          {ROLES[role]}
        </span>
        {session && (
          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            <span
              className={cn(
                "px-2 py-0.5 rounded uppercase tracking-[0.12em] text-[10px] border",
                playMode === "sinav"
                  ? "text-clinical-critical border-clinical-critical/40 bg-clinical-critical/10"
                  : playMode === "egitim"
                  ? "text-brand-light border-brand/40 bg-brand/10"
                  : "text-clinical-stable border-clinical-stable/40 bg-clinical-stable/10",
              )}
              title={pedagogy.description}
            >
              {pedagogy.label}
            </span>
            <span className="text-ink-400">
              Adım {stepIndex >= 0 ? stepIndex + 1 : "—"} / {scenario.steps.length}
            </span>
            <span className="flex items-center gap-1.5 text-ink-100 tabular-nums" data-testid="case-score">
              <ActivityIcon className="w-3.5 h-3.5 text-brand-light" />
              {session.total_score} puan
            </span>
            <button
              type="button"
              onClick={() => {
                if (confirm("Senaryoyu şimdi bitir ve debrief'i gör?")) runner.finishEarly();
              }}
              className="text-[11px] text-ink-500 hover:text-clinical-warning border border-ink-700 hover:border-clinical-warning/50 rounded px-2 py-0.5 transition"
            >
              Bitir
            </button>
          </div>
        )}
      </header>

      {/* Ana içerik — genişte yan yana (hasta sol ~yarı | panel sağ),
          dar ekran/mobilde alt alta (hasta üstte kutu, panel altta, sayfa kayar) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Sol/üst: hasta sahnesi — sabit oranlı 3:4 kutu, KIRPMASIZ (contain) */}
        <div className="relative shrink-0 h-[46vh] min-h-[300px] lg:h-auto lg:min-h-0 lg:w-1/2 border-b lg:border-b-0 lg:border-r border-ink-700/50">
          {/* Görsel kutusu — 3:4 portre tercih; sığmayan pencerede max-w kırpar,
              içerik yine contain ile güvende (hiçbir kırılımda kırpılmaz) */}
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 lg:p-5">
            <div className="relative h-full max-w-full aspect-[3/4] rounded-xl overflow-hidden border border-ink-800/60 bg-ink-950 shadow-2xl">
              <ErrorBoundary
                compact
                retryable
                title="Hasta görseli yüklenemedi"
                description="Görsel katman açılamadı — oyun sağ panelden devam eder."
              >
                {visual ? (
                  <CaseStage
                    visualState={visualState}
                    set={visual.set}
                    actionCue={actionCue}
                    traces={traces}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center px-8">
                    <div className="text-ink-500 text-sm max-w-sm">
                      Bu senaryonun görsel seti henüz üretilmedi
                      <span className="block font-mono text-[10px] mt-1 text-ink-600">
                        (arketip×ortam manifest'ine eklenecek — oyun panelden sürüyor)
                      </span>
                    </div>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>

          {/* Köşe monitör — kullanıcı tasarımı deseni (scale + sabit iç kutu);
              dar ekranda küçülür ki hasta kutusunu boğmasın */}
          <div className="absolute top-2 left-2 origin-top-left scale-[0.3] sm:scale-[0.48] lg:scale-[0.62]">
            <div className="w-[560px] h-[520px] rounded-lg overflow-hidden border border-ink-700/70 shadow-2xl ring-1 ring-black/50 neon-teal shadow-glow-sm">
              <VitalMonitorScreen
                vitals={patientVitalsToMonitor(
                  liveVitals,
                  runner.phaseSignal?.ekg ?? scenario.ekg_pattern,
                )}
                patientName={`${scenario.patient.age} yaş ${scenario.patient.sex === "M" ? "Erkek" : "Kadın"}`}
                bedLabel="Görselli Vaka · Pilot"
                showArt={false}
              />
            </div>
          </div>

          {/* Öğretici anlatım — faz-senkron narration (yalnız eğitim modu).
              Genişte görsel üstünde overlay; mobilde hastayı örtmesin diye
              aşağıda akış içinde (lg:hidden ikizi). */}
          {pedagogy.narration && runner.phaseSignal?.narration && (
            <div
              data-testid="case-narration"
              className="hidden lg:block absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[70%] px-4 py-2.5 rounded-lg bg-brand/15 border border-brand/40 backdrop-blur-md shadow-glow-sm neon-teal animate-fade-in"
            >
              <p className="text-[12px] leading-relaxed text-ink-100">
                {runner.phaseSignal.narration}
              </p>
            </div>
          )}
        </div>

        {/* Mobil anlatım — görselin altında, akış içinde */}
        {pedagogy.narration && runner.phaseSignal?.narration && (
          <div className="lg:hidden shrink-0 mx-3 mt-2 px-4 py-2.5 rounded-lg bg-brand/15 border border-brand/40 neon-teal">
            <p className="text-[12px] leading-relaxed text-ink-100">
              {runner.phaseSignal.narration}
            </p>
          </div>
        )}

        {/* Sağ/alt: adım + envanter */}
        <div className="w-full lg:w-auto lg:flex-1 flex flex-col bg-ink-950/50 min-h-0">
          {/* Mobilde doğal yükseklik (sayfa kayar); genişte panel kendi içinde kayar */}
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto p-3 space-y-3" data-testid="case-panel">
            {currentStep ? (
              <>
                <StepDisplay
                  step={currentStep}
                  mode={session?.mode ?? playMode}
                  actionsThisStep={runner.scoredActionsThisStep}
                  onDecisionSelect={(opt) => {
                    // Karar da görsel tetikleyebilir (örn. PCI transferi)
                    cueFor({ type: "decision", target_id: opt.id });
                    runner.handleDecision(opt);
                  }}
                  onDecisionMultiConfirm={runner.handleDecisionMulti}
                  onInfoContinue={runner.handleInfoContinue}
                  onActionStepContinue={runner.handleActionStepContinue}
                  canContinue={runner.canContinue}
                  decisionAnswered={runner.decisionAnswered}
                  decisionMultiAnswered={runner.decisionMultiAnswered}
                />
                {currentStep.kind === "action" && (
                  <div className="h-[420px]">
                    <InventoryPanel
                      availableMedications={scenario.available_medications}
                      availableEquipment={scenario.available_equipment}
                      onAction={onAction}
                      labPanels={scenario.lab_panels}
                      imagingResults={runner.imagingResults}
                      getLabStatus={runner.getLabStatus}
                      onOrderLab={(panelId) => {
                        cueFor({ type: "order_test", target_id: panelId });
                        runner.handleOrderLab(panelId);
                      }}
                      onViewLab={runner.setOpenLabPanelId}
                      onViewImaging={runner.setOpenImagingId}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="panel p-5 text-center text-sm text-ink-400">Senaryo yükleniyor…</div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay'ler — mevcut motor bağları aynen */}
      <FeedbackToast
        feedback={runner.feedback}
        mode={session?.mode ?? "egitim"}
        onClose={runner.clearFeedback}
      />

      <CriticalContraindicationModal
        info={runner.criticalInfo}
        hidden={false}
        showGuidance={session?.mode !== "sinav"}
        onResolved={() => runner.setCriticalInfo(null)}
        onExpired={runner.handleCriticalExpired}
        onDismiss={() => runner.setCriticalInfo(null)}
      />

      {runner.labCountdownInfo && (
        <LabOrderCountdownModal
          panelName={runner.labCountdownInfo.panelName}
          delaySec={runner.labCountdownInfo.delaySec}
          onClose={() => runner.setLabCountdownInfo(null)}
          onCountdownEnd={() => {
            runner.setOpenLabPanelId(runner.labCountdownInfo!.panelId);
            runner.setLabCountdownInfo(null);
          }}
        />
      )}

      {runner.openLabPanelId && session && (() => {
        const ready = runner.getReadyPanel(runner.openLabPanelId);
        if (!ready) return null;
        return (
          <LabResultsModal
            panel={ready.panel}
            history={ready.history}
            scenarioTimeMin={Math.floor((Date.now() - session.started_at) / 60000)}
            onClose={() => runner.setOpenLabPanelId(null)}
          />
        );
      })()}

      {runner.openImagingId && (() => {
        const img = runner.imagingResults.find((r) => r.id === runner.openImagingId);
        if (!img) return null;
        return <ImagingResultsModal result={img} onClose={() => runner.setOpenImagingId(null)} />;
      })()}
    </div>
  );
}
