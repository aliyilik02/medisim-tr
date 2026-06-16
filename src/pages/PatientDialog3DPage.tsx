import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Waves,
  Droplet,
  Wand2,
  MessageCircle,
  ClipboardList,
  Activity as ActivityIcon,
} from "lucide-react";
import { PatientBody3D } from "@/components/patient-3d/PatientBody3D";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import { patientToVariant, patientToSkinTone } from "@/components/patient-3d/patientModels";
import { VitalMonitorScreen } from "@/components/monitor/VitalMonitorScreen";
import { patientVitalsToMonitor } from "@/components/monitor/adapter";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { buildScenarioRegions } from "@/components/patient-3d/scenarioRegions";
import { DialogChat } from "@/components/dialog/DialogChat";
import { StepDisplay } from "@/components/StepDisplay";
import { InventoryPanel } from "@/components/InventoryPanel";
import { DebriefScreen } from "@/components/DebriefScreen";
import { FeedbackToast } from "@/components/FeedbackToast";
import { CriticalContraindicationModal } from "@/components/CriticalContraindicationModal";
import { LabResultsModal } from "@/components/LabResultsModal";
import { LabOrderCountdownModal } from "@/components/LabOrderCountdownModal";
import { ImagingResultsModal } from "@/components/ImagingResultsModal";
import { SCENARIOS } from "@/data/scenarios";
import { vitalsToVisual } from "@/clinical/visual-mapping";
import { getVisibleOptions, type ActionRef } from "@/engine";
import { seededShuffle } from "@/lib/shuffle";
import { useScenarioRunner } from "@/hooks/useScenarioRunner";
import { cn } from "@/lib/cn";

// ============================================================
// PatientDialog3DPage — Faz 1: Oynanabilir Döngü
// ============================================================
// Sanal Hasta Planı v1 §4 — uçtan uca oynanabilir vaka:
// 3D hasta + AI diyalog + aksiyon paneli + gerçek zamanlı kötüleşme
// (SimplePhysiologyProvider) + tetkik + oskültasyon + debrief.
// Route: /dialog-3d-demo
//
// Layout:
//   [Sol üst]    Vital Monitor (CompactVitalsHUD) — canlı, kötüleşen
//   [Sağ üst]    Cilt tonu / solunum kontrolleri
//   [Sol alt]    Cilt kesim slider
//   [Sağ panel]  Sekmeli: Vaka Akışı (adım + envanter) | Diyalog
// ============================================================

const SKIN_TINT_OPTIONS: { value: SkinTint; label: string; emoji: string }[] = [
  { value: "normal",   label: "Normal",  emoji: "🟢" },
  { value: "cyanosis", label: "Siyanoz", emoji: "🔵" },
  { value: "jaundice", label: "İkter",   emoji: "🟡" },
  { value: "pallor",   label: "Solgun",  emoji: "⚪" },
];

type RightTab = "vaka" | "diyalog";

export function PatientDialog3DPage() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [breathing, setBreathing] = useState(true);
  const [manualSkinTint, setManualSkinTint] = useState<SkinTint | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [autoTint, setAutoTint] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("vaka");

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  // Faz 1 — tüm döngü orkestrasyonu (aksiyon, karar, lab, fizyoloji, debrief)
  const runner = useScenarioRunner({ scenario, autoStartMode: "egitim" });
  const {
    session,
    resolvedScenario,
    currentStep,
    haltedPhaseIds,
  } = runner;
  const rs = resolvedScenario ?? scenario;
  // Senaryo hastasının yaş/cinsiyetinden 3D model varyantını türet (CC0 MPFB seti).
  const patientVariant = useMemo(() => patientToVariant(rs.patient), [rs.patient]);
  const patientSkinTone = useMemo(() => patientToSkinTone(rs.patient), [rs.patient]);

  // Canlı vital (session varsa) veya statik fallback
  const liveVitals = session?.vitals ?? scenario.initial_vitals;

  // Visual mapping: live vital → cilt tonu otomatik
  const autoVisualParams = useMemo(
    () => vitalsToVisual(liveVitals),
    [liveVitals],
  );

  const skinTint: SkinTint = autoTint
    ? autoVisualParams.skinTint
    : (manualSkinTint ?? "normal");

  // Senaryo değişince auto mode'a geri dön (manuel override sıfırla)
  useEffect(() => {
    setManualSkinTint(null);
    setAutoTint(true);
  }, [scenarioId]);

  // Oskültasyon: senaryo bölge→ses eşlemesi + faz durumuna göre resolved geçiş
  const regions = useMemo(
    () => buildScenarioRegions(DEFAULT_REGIONS, rs, haltedPhaseIds),
    [rs, haltedPhaseIds],
  );

  // 3D prosedür (stetoskop, oksijen maskesi…) → motor aksiyonu
  const handleProcedureComplete = (action: ActionRef) => {
    runner.handleAction(action);
  };

  // ----- Debrief: oturum bitti → tam ekran debrief (§4.5)
  if (session?.finished) {
    return (
      <DebriefScreen
        scenario={rs}
        session={session}
        onRestart={runner.restart}
      />
    );
  }

  const stepIndex = currentStep
    ? rs.steps.findIndex((s) => s.id === currentStep.id)
    : -1;

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-50 overflow-hidden">
      {/* Header — kompakt, sade */}
      <header className="border-b border-ink-700/50 px-6 py-3 flex items-center gap-3 shrink-0 bg-ink-950/95 backdrop-blur-md">
        <Link
          to="/"
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400 hover:text-ink-100 transition flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Çıkış
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            MediSim TR · 3D Klinik Simülasyon
          </div>
          <h1 className="font-display text-base leading-tight truncate text-ink-50">
            {scenario.title}
          </h1>
        </div>

        {/* Skor + ilerleme + erken bitirme */}
        {session && (
          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            <span className="text-ink-400">
              Adım {stepIndex >= 0 ? stepIndex + 1 : "—"} / {rs.steps.length}
            </span>
            <span
              className="flex items-center gap-1.5 text-ink-100 tabular-nums"
              data-testid="session-score"
            >
              <ActivityIcon className="w-3.5 h-3.5 text-brand-light" />
              {session.total_score} puan
            </span>
            <button
              type="button"
              onClick={() => {
                if (confirm("Senaryoyu şimdi bitir ve debrief'i gör?")) {
                  runner.finishEarly();
                }
              }}
              className="text-[11px] text-ink-500 hover:text-clinical-warning border border-ink-700 hover:border-clinical-warning/50 rounded px-2 py-0.5 transition"
              data-testid="finish-early"
            >
              Bitir
            </button>
          </div>
        )}

        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="bg-ink-900 border border-ink-700 rounded px-2 py-1.5 text-xs text-ink-100 hover:border-ink-500 focus:border-brand/50 focus:outline-none transition max-w-[220px]"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </header>

      {/* Ana içerik */}
      <div className="flex-1 flex min-h-0">
        {/* Sol: 3D Model — full alan */}
        <div className="flex-1 relative min-w-0 border-r border-ink-700/50 bg-gradient-to-b from-ink-950 to-ink-900/60">
          <PatientBody3D
            regions={regions}
            breathing={breathing}
            skinTint={skinTint}
            speaking={speaking}
            variant={patientVariant}
            skinTone={patientSkinTone}
            organVitals={{
              hr: liveVitals.hr,
              rr: liveVitals.rr,
            }}
            onProcedureComplete={handleProcedureComplete}
          />

          {/* SOL ÜST: Başucu monitörü — canlı session vital'leri.
              Tam tasarım boyutunda render edilir, CSS scale ile küçültülür → orantı korunur, net kalır. */}
          <div className="absolute top-3 left-3 origin-top-left" style={{ transform: "scale(0.45)" }}>
            <div className="w-[560px] h-[520px] rounded-lg overflow-hidden border border-ink-700/70 shadow-2xl ring-1 ring-black/50">
              <VitalMonitorScreen
                vitals={patientVitalsToMonitor(
                  liveVitals,
                  runner.phaseSignal?.ekg ?? scenario.ekg_pattern,
                )}
                patientName={`${scenario.patient.age} yaş ${scenario.patient.sex === "M" ? "Erkek" : "Kadın"}`}
                bedLabel="Yatak 1 · Acil Servis"
                showArt={false}
              />
            </div>
          </div>

          {/* SAĞ ÜST: Kontrol kümesi (cilt tonu + solunum + speaking) */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            {speaking && (
              <div
                className="px-3 py-1.5 rounded-full bg-brand/20 border border-brand/40 backdrop-blur-md flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-light shadow-lg"
                data-testid="speaking-indicator"
              >
                <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                Hasta konuşuyor
              </div>
            )}

            <div className="bg-ink-900/90 backdrop-blur-md border border-ink-700/60 rounded-lg p-2 flex flex-col gap-1.5 w-[200px] shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-500 flex items-center gap-1">
                    <Droplet className="w-2.5 h-2.5 text-brand" />
                    Cilt Tonu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoTint(!autoTint);
                      if (!autoTint) setManualSkinTint(null);
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[8px] uppercase transition ${
                      autoTint
                        ? "bg-clinical-stable/15 text-clinical-stable border border-clinical-stable/30"
                        : "bg-ink-800 text-ink-400 border border-ink-700 hover:text-ink-100"
                    }`}
                    title={autoTint ? "Vital'a göre otomatik" : "Manuel"}
                  >
                    <Wand2 className="w-2.5 h-2.5" />
                    {autoTint ? "Auto" : "Manuel"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {SKIN_TINT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setManualSkinTint(opt.value);
                        setAutoTint(false);
                      }}
                      disabled={autoTint && skinTint !== opt.value}
                      className={`px-2 py-1 rounded font-mono text-[10px] transition flex items-center gap-1 justify-center ${
                        skinTint === opt.value
                          ? "bg-brand/20 text-brand-light border border-brand/50"
                          : "bg-ink-800/60 text-ink-400 border border-ink-700 hover:text-ink-100 hover:border-ink-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      }`}
                    >
                      <span className="text-[10px]">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBreathing((b) => !b)}
                className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.1em] border transition flex items-center gap-2 ${
                  breathing
                    ? "bg-brand/15 border-brand/50 text-brand-light"
                    : "bg-ink-800/60 border-ink-700 text-ink-400 hover:text-ink-100"
                }`}
              >
                <Waves className="w-3 h-3" />
                Solunum {breathing ? "açık" : "kapalı"}
              </button>
            </div>
          </div>

          {/* SAĞ ALT: Ses atıfları (PLAN §8 risk 3 — lisans görünürlüğü) */}
          <div className="absolute bottom-4 right-4 font-mono text-[9px] text-ink-600">
            Oskültasyon sesleri: Wikimedia Commons (CC BY-SA) —{" "}
            <span title="public/sounds/auscultation/SOUNDS-LICENSE.md">
              atıf listesi repo'da
            </span>
          </div>
        </div>

        {/* Sağ panel: Vaka Akışı | Diyalog sekmeleri */}
        <div className="w-[460px] shrink-0 flex flex-col bg-ink-950/50 min-h-0">
          <div className="flex gap-1 p-2 border-b border-ink-700/50 shrink-0">
            <button
              type="button"
              onClick={() => setRightTab("vaka")}
              data-testid="tab-vaka"
              className={cn(
                "flex-1 px-3 py-2 rounded text-xs font-medium transition flex items-center justify-center gap-1.5",
                rightTab === "vaka"
                  ? "bg-brand/15 text-brand-light border border-brand/40"
                  : "text-ink-400 hover:text-ink-200 border border-transparent"
              )}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Vaka Akışı
            </button>
            <button
              type="button"
              onClick={() => setRightTab("diyalog")}
              data-testid="tab-diyalog"
              className={cn(
                "flex-1 px-3 py-2 rounded text-xs font-medium transition flex items-center justify-center gap-1.5",
                rightTab === "diyalog"
                  ? "bg-brand/15 text-brand-light border border-brand/40"
                  : "text-ink-400 hover:text-ink-200 border border-transparent"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Hasta ile Konuş
            </button>
          </div>

          {/* Vaka Akışı — adım + envanter. Diyalog gizlenir ama unmount edilmez
              (konuşma geçmişi kaybolmasın). */}
          <div
            className={cn(
              "flex-1 min-h-0 overflow-y-auto p-3 space-y-3",
              rightTab !== "vaka" && "hidden"
            )}
            data-testid="vaka-panel"
          >
            {currentStep ? (
              <>
                <StepDisplay
                  step={currentStep}
                  mode={session?.mode ?? "egitim"}
                  actionsThisStep={runner.scoredActionsThisStep}
                  onDecisionSelect={runner.handleDecision}
                  onDecisionMultiConfirm={runner.handleDecisionMulti}
                  onInfoContinue={runner.handleInfoContinue}
                  onActionStepContinue={runner.handleActionStepContinue}
                  canContinue={runner.canContinue}
                  decisionAnswered={runner.decisionAnswered}
                  decisionMultiAnswered={runner.decisionMultiAnswered}
                  visibleOptions={
                    currentStep.kind === "decision" && session
                      ? seededShuffle(
                          getVisibleOptions(
                            currentStep,
                            session.selected_difficulty
                          ),
                          `${rs.id}:${currentStep.id}:${session.started_at}`
                        )
                      : undefined
                  }
                />
                {currentStep.kind === "action" && (
                  <div className="h-[420px]">
                    <InventoryPanel
                      availableMedications={rs.available_medications}
                      availableEquipment={rs.available_equipment}
                      onAction={runner.handleAction}
                      labPanels={rs.lab_panels}
                      imagingResults={runner.imagingResults}
                      getLabStatus={runner.getLabStatus}
                      onOrderLab={runner.handleOrderLab}
                      onViewLab={runner.setOpenLabPanelId}
                      onViewImaging={runner.setOpenImagingId}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="panel p-5 text-center text-sm text-ink-400">
                Senaryo yükleniyor…
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex-1 min-h-0 flex flex-col",
              rightTab !== "diyalog" && "hidden"
            )}
          >
            <DialogChat
              key={scenarioId}
              scenario={scenario}
              onSpeakingChange={setSpeaking}
            />
          </div>
        </div>
      </div>

      {/* Overlay'ler */}
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
            scenarioTimeMin={Math.floor(
              (Date.now() - session.started_at) / 60000
            )}
            onClose={() => runner.setOpenLabPanelId(null)}
          />
        );
      })()}

      {runner.openImagingId && (() => {
        const img = runner.imagingResults.find(
          (r) => r.id === runner.openImagingId
        );
        if (!img) return null;
        return (
          <ImagingResultsModal
            result={img}
            onClose={() => runner.setOpenImagingId(null)}
          />
        );
      })()}
    </div>
  );
}
