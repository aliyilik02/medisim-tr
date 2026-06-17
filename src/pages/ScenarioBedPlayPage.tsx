import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ClipboardList, MessageCircle, Activity as ActivityIcon, Wind, X, AlertTriangle } from "lucide-react";
import { PatientRoomScene } from "@/components/patient-3d/PatientRoomScene";
import { patientToVariant, patientToSkinTone } from "@/components/patient-3d/patientModels";
import {
  ANIMATED_MODELS,
  type PatientClip,
} from "@/components/patient-3d/AnimatedPatientModel";
import type { EquipmentKind } from "@/components/patient-3d/equipmentMeshes";
import { VitalMonitorScreen } from "@/components/monitor/VitalMonitorScreen";
import { patientVitalsToMonitor } from "@/components/monitor/adapter";
import { VentilatorScreen } from "@/components/ventilator/VentilatorScreen";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { buildScenarioRegions } from "@/components/patient-3d/scenarioRegions";
import { AuscultationOverlay } from "@/components/patient-3d/AuscultationOverlay";
import {
  VENT_PRESETS,
  VENT_PARAM,
  type VentSettings,
  type VentMode,
  type VentPresetKey,
} from "@/components/ventilator/ventilator-engine";
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
import { mapVitalsToVisuals, applyPhaseVisual } from "@/clinical/clinicalVisualMapping";
import { vitalsToClip, resolveClipForVariant } from "@/clinical/clip-mapping";
import { getVisibleOptions, PEDAGOGY_ORDER, getPedagogy, pickTeachingAction, teachingNarration, phaseTransitionNarration } from "@/engine";
import { seededShuffle } from "@/lib/shuffle";
import { useScenarioRunner } from "@/hooks/useScenarioRunner";
import { cn } from "@/lib/cn";
import type { ActionRef, PlayMode } from "@/engine";

// ?mod= query → pedagojik mod (egitim=öğretici, klinik=uygulama, sinav=sınav).
// Geçersiz/yoksa varsayılan "klinik" (interaktif — e2e auto-start davranışı korunur,
// öğretici auto-play yalnız explicit ?mod=egitim ile devreye girer).
function parsePlayMode(raw: string | null): PlayMode {
  return raw && (PEDAGOGY_ORDER as string[]).includes(raw)
    ? (raw as PlayMode)
    : "klinik";
}

// ============================================================
// ScenarioBedPlayPage — TAM senaryo motoru + supine yatak hastası
// ============================================================
// PatientDialog3DPage'in (ayakta + diyalog) yatak versiyonu: aynı tam motor
// (useScenarioRunner — adım/aksiyon/lab/karar/skor/debrief) ama hasta acil
// servis yatağında supine + animasyonlu (PatientRoomScene). Vital → klip
// (vitalsToClip) + ten tonu (vitalsToVisual) otomatik. useVitalsTick zaman-bazlı
// deterioration sürer. Ekipman aksiyonları hastada görünür (kemik-bağlı).
// Route: /senaryo-yatak
// ============================================================

// Senaryo ekipman id'si → 3D ekipman türü (görsel). Eşleşmeyen ekipman gösterilmez.
const EQUIPMENT_ID_MAP: Record<string, EquipmentKind> = {
  oksijen_maske: "oxygen_mask",
  oksijen_maskesi: "oxygen_mask",
  nrb_maske: "oxygen_mask",
  rezervuarli_maske: "oxygen_mask",
  nazal_kanul: "nasal_cannula",
  pulse_oksimetre: "pulse_ox",
  pulseoksimetre: "pulse_ox",
  saturasyon_probu: "pulse_ox",
  iv_kanul: "iv_cannula",
  iv_kateter: "iv_cannula",
  damar_yolu: "iv_cannula",
  tansiyon_aleti: "nibp_cuff",
  nibp: "nibp_cuff",
  ekg: "ekg_electrodes",
  ekg_monitor: "ekg_electrodes",
  monitor: "ekg_electrodes",
};

type RightTab = "vaka" | "diyalog";

export function ScenarioBedPlayPage() {
  // /hasta/:id → gerçek senaryo seansı (param). /senaryo-yatak (paramsız) →
  // dev dropdown ile senaryo gezme. routeId varsa dropdown gizlenir.
  const { id: routeId } = useParams<{ id: string }>();
  const [scenarioId, setScenarioId] = useState<string>(
    routeId ?? SCENARIOS[0].id
  );

  // routeId değişirse (aynı sayfada /hasta/:id → başka :id navigasyonu) takip et
  useEffect(() => {
    if (routeId) setScenarioId(routeId);
  }, [routeId]);
  const [rightTab, setRightTab] = useState<RightTab>("vaka");
  const [speaking, setSpeaking] = useState(false);
  // Hastaya takılı ekipman — verilen ekipman aksiyonlarından lokal izlenir
  const [equipment, setEquipment] = useState<EquipmentKind[]>([]);

  // ── Yatak başı 3D ventilatör cihazı + paneli (Faz B.2) ──────────────
  const [ventOpen, setVentOpen] = useState(false);
  const [ventSettings, setVentSettings] = useState<VentSettings>(
    VENT_PRESETS.normal.settings
  );
  const [ventPreset, setVentPreset] = useState<VentPresetKey | null>("normal");
  const ventPatchSettings = (p: Partial<VentSettings>) => {
    setVentPreset(null);
    setVentSettings((s) => ({ ...s, ...p }));
  };
  const ventPickPreset = (key: VentPresetKey) => {
    setVentSettings(VENT_PRESETS[key].settings);
    setVentPreset(key);
  };

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  // Pedagojik mod — ?mod= query'den (senaryo listesinde seçilir). Default klinik.
  const [searchParams] = useSearchParams();
  const playMode = parsePlayMode(searchParams.get("mod"));
  const pedagogy = getPedagogy(playMode);

  // Tam döngü orkestrasyonu (aksiyon/karar/lab/fizyoloji/debrief + dahili
  // useVitalsTick ile zaman-bazlı deterioration)
  const runner = useScenarioRunner({ scenario, autoStartMode: playMode });
  const { session, resolvedScenario, currentStep } = runner;
  const rs = resolvedScenario ?? scenario;

  // Öğretici (teaching/egitim) mod state'i — otomatik sürücü + narration paneli.
  const [narration, setNarration] = useState<string | null>(null);
  const teachingHandledRef = useRef<string | null>(null);
  // Faz geçişi narration — son gösterilen faz sinyali anahtarı (phaseId:ekg).
  const prevPhaseKeyRef = useRef<string | null>(null);

  // Aksiyonu motora ilet + ekipmansa hastada göster
  const onAction = (action: ActionRef) => {
    if (action.type === "use_equipment" || action.type === "procedure") {
      const kind = EQUIPMENT_ID_MAP[action.target_id];
      if (kind) setEquipment((e) => (e.includes(kind) ? e : [...e, kind]));
    }
    runner.handleAction(action);
  };

  const onRestart = () => {
    setEquipment([]);
    teachingHandledRef.current = null; // öğretici sürücü baştan anlatsın
    runner.restart();
  };

  // Senaryo değişince takılı ekipmanı + ventilatör panelini/ayarlarını sıfırla
  useEffect(() => {
    setEquipment([]);
    setVentOpen(false);
    setVentSettings(VENT_PRESETS.normal.settings);
    setVentPreset("normal");
    teachingHandledRef.current = null;
  }, [scenarioId]);

  // ── Öğretici (teaching/egitim) otomatik sürücü ──
  // Yalnız pedagogy.autoPlay modunda: önce adım açıklamasını göster, sonra
  // doğru aksiyonu sistem uygular. Handler'lar ref'ten okunur (stale-closure
  // önleme); effect currentStep.id değişince yeniden çalışır.
  const teachingApi = useRef({ runner, onAction, rs });
  teachingApi.current = { runner, onAction, rs };
  useEffect(() => {
    if (!pedagogy.autoPlay) {
      setNarration(null);
      return;
    }
    if (!session || session.finished || !currentStep) return;
    if (teachingHandledRef.current === currentStep.id) return;
    teachingHandledRef.current = currentStep.id;

    const step = currentStep;
    const api = teachingApi.current;
    const override = api.rs.teaching_narration?.[step.id];
    setNarration(teachingNarration(step, override));
    const plan = pickTeachingAction(step);

    const READ_MS = 3200; // öğrenci açıklamayı okusun
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        const a = teachingApi.current;
        if (plan.kind === "info") {
          a.runner.handleInfoContinue();
        } else if (plan.kind === "action") {
          a.onAction(plan.action);
          // unlocks yoksa runner kendiliğinden ilerletmez → elle devam
          if (plan.advanceManually) {
            timers.push(setTimeout(() => a.runner.handleActionStepContinue(), 1600));
          }
        } else if (plan.kind === "decision" && step.kind === "decision") {
          const opt = step.options.find((o) => o.id === plan.optionId);
          if (opt) a.runner.handleDecision(opt);
        }
        // skip: net doğru aksiyon yok — kullanıcı ilerletir (öğreticide nadir)
      }, READ_MS)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedagogy.autoPlay, session?.finished, currentStep?.id]);

  // ── Faz geçişi narration (öğretici mod) ──
  // Deterioration fazı değişince (ya da VF→asistoli faz-içi evrim) öğretici
  // modda "hasta kötüleşiyor → EKG'de VES başladı" gibi metin gösterir. İlk
  // atama (mount) hariç — adım anlatımını ezmesin. Anahtar phaseId:ekg.
  const phaseSignal = runner.phaseSignal;
  useEffect(() => {
    const key = phaseSignal ? `${phaseSignal.phaseId}:${phaseSignal.ekg}` : null;
    const prev = prevPhaseKeyRef.current;
    if (key !== prev) {
      if (prev !== null && phaseSignal && pedagogy.narration) {
        const text = phaseTransitionNarration(phaseSignal);
        if (text) setNarration(text);
      }
      prevPhaseKeyRef.current = key;
    }
  }, [phaseSignal, pedagogy.narration]);

  // Ventilatör uygunluğu: erişkin preset/parametreleri pediatrik hastada
  // klinik olarak GÜVENSİZ (ör. 9 kg infant'a Vt 200-500 mL = ölümcül).
  // Pediatrik ventilatör presetleri klinik yazım bekliyor (DRAFT) → o zamana
  // kadar düşük kilolu/pediatrik senaryolarda cihaz gizli.
  const ventEligible = (rs.patient.weight_kg ?? 70) >= 40;

  const variant = useMemo(() => patientToVariant(rs.patient), [rs.patient]);
  const skinTone = useMemo(() => patientToSkinTone(rs.patient), [rs.patient]);
  const liveVitals = session?.vitals ?? scenario.initial_vitals;

  // Vital → klip + ten tonu (varyant fallback ile)
  const clip: PatientClip = useMemo(() => {
    const ideal = vitalsToClip(liveVitals, { speaking });
    return resolveClipForVariant(ideal, ANIMATED_MODELS[variant]?.clips ?? []);
  }, [liveVitals, speaking, variant]);
  const skinTint = vitalsToVisual(liveVitals).skinTint;
  // Sürekli klinik görsel (siyanoz/solgun/terleme/benekli) — deterioration
  // tick'i sonrası canlı vital'den. Ayrık skinTint'in üstüne biner.
  // Sürekli klinik görsel + faz-senkron dramatik katman (tek faz sinyali kaynağı).
  const visualState = useMemo(
    () => applyPhaseVisual(mapVitalsToVisuals(liveVitals), runner.phaseSignal?.visual),
    [liveVitals, runner.phaseSignal],
  );

  // Oskültasyon — faz-senkron kalp/akciğer sesi yatak-başına taşındı (Yol-3'ten).
  // buildScenarioRegions dominant fazın kalp sesini kardiyak noktalara yazar
  // (silent fazda undefined = ses yok). Senaryo authored override öncelikli.
  // STEMI gerçeklik paketinin ses ayağı (commit 37bcbe5) — klinik mantık değişmez.
  const auscultationRegions = useMemo(
    () =>
      buildScenarioRegions(
        DEFAULT_REGIONS,
        rs,
        runner.haltedPhaseIds,
        runner.phaseSignal,
      ),
    [rs, runner.haltedPhaseIds, runner.phaseSignal],
  );

  // Debrief
  if (session?.finished) {
    return <DebriefScreen scenario={rs} session={session} onRestart={onRestart} />;
  }

  const stepIndex = currentStep ? rs.steps.findIndex((s) => s.id === currentStep.id) : -1;

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-50 overflow-hidden">
      {/* Header */}
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
            MediSim TR · Yatak Başı Klinik Simülasyon
          </div>
          <h1 className="font-display text-base leading-tight truncate text-ink-50">{scenario.title}</h1>
        </div>

        {session && (
          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            {/* Pedagojik mod rozeti (egitim/klinik/sinav) */}
            <span
              data-testid="pedagogy-mode"
              title={pedagogy.description}
              className={cn(
                "px-2 py-0.5 rounded uppercase tracking-[0.12em] text-[10px] border",
                playMode === "sinav"
                  ? "text-clinical-critical border-clinical-critical/40 bg-clinical-critical/10"
                  : playMode === "egitim"
                  ? "text-brand-light border-brand/40 bg-brand/10"
                  : "text-clinical-stable border-clinical-stable/40 bg-clinical-stable/10"
              )}
            >
              {pedagogy.label}
            </span>
            <span className="text-ink-400">
              Adım {stepIndex >= 0 ? stepIndex + 1 : "—"} / {rs.steps.length}
            </span>
            <span className="flex items-center gap-1.5 text-ink-100 tabular-nums" data-testid="session-score">
              <ActivityIcon className="w-3.5 h-3.5 text-brand-light" />
              {session.total_score} puan
            </span>
            <button
              type="button"
              onClick={() => {
                if (confirm("Senaryoyu şimdi bitir ve debrief'i gör?")) runner.finishEarly();
              }}
              className="text-[11px] text-ink-500 hover:text-clinical-warning border border-ink-700 hover:border-clinical-warning/50 rounded px-2 py-0.5 transition"
              data-testid="finish-early"
            >
              Bitir
            </button>
          </div>
        )}

        {/* Senaryo seçici — sadece dev gezinti modunda (/senaryo-yatak, paramsız).
            Gerçek seansta (/hasta/:id) senaryo route'tan sabit. */}
        {!routeId && (
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
        )}
      </header>

      {/* Ana içerik */}
      <div className="flex-1 flex min-h-0">
        {/* Sol: 3D yatak sahnesi + sol üst köşede küçük başucu monitörü (kullanıcı tasarımı) */}
        <div className="flex-1 relative min-w-0 border-r border-ink-700/50">
          <PatientRoomScene
            variant={variant}
            clip={clip}
            skinTint={skinTint}
            visualState={visualState}
            skinTone={skinTone}
            speaking={speaking}
            equipment={equipment}
            cameraPreset="onden"
            showVentilator={ventEligible}
            ventilatorActive
            onVentilatorActivate={() => setVentOpen(true)}
          />
          {/* Küçük başucu monitörü — sol üst köşe overlay (eski CompactVitalsHUD yerine).
              Tam tasarım boyutunda render edilir, CSS scale ile küçültülür → orantı korunur, net kalır. */}
          <div className="absolute top-3 left-3 origin-top-left" style={{ transform: "scale(0.72)" }}>
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
          {speaking && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-brand/20 border border-brand/40 backdrop-blur-md flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-light shadow-lg">
              <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              Hasta konuşuyor
            </div>
          )}
          {/* Oskültasyon noktaları — faz-senkron kalp/akciğer sesi (Yol-3'ten
              taşındı). Sol kenar, başucu monitörünün altı. */}
          <AuscultationOverlay
            regions={auscultationRegions}
            className="absolute top-1/2 -translate-y-1/2 left-3"
          />
          {/* Ventilatör erişim butonu — 3D cihaz tıklamasının DOM eşdeğeri
              (erişilebilirlik + e2e). Pediatrik senaryoda gizli (ventEligible). */}
          {ventEligible && (
            <button
              type="button"
              onClick={() => setVentOpen(true)}
              data-testid="ventilator-open"
              className="absolute bottom-4 right-4 px-3 py-1.5 rounded-md bg-ink-900/80 border border-ink-600 hover:border-brand/50 hover:text-brand-light backdrop-blur-md flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-200 shadow-lg transition"
            >
              <Wind className="w-3.5 h-3.5" />
              Ventilatör
            </button>
          )}

          {/* Öğretici (teaching) narration paneli — sistem doğru adımı uygularken
              açıklar. Yalnız egitim modunda (pedagogy.narration). TTS'e hazır yapı. */}
          {pedagogy.narration && narration && (
            <div
              data-testid="teaching-narration"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[78%] px-4 py-2.5 rounded-lg bg-brand/15 border border-brand/40 backdrop-blur-md shadow-xl flex items-start gap-2.5"
            >
              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-brand/30 flex items-center justify-center font-mono text-[10px] text-brand-light">
                ⊕
              </span>
              <p className="text-[12px] leading-relaxed text-ink-100">{narration}</p>
            </div>
          )}
        </div>

        {/* Sağ panel: Vaka Akışı | Diyalog */}
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
                  : "text-ink-400 hover:text-ink-200 border border-transparent",
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
                  : "text-ink-400 hover:text-ink-200 border border-transparent",
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Hasta ile Konuş
            </button>
          </div>

          <div
            className={cn("flex-1 min-h-0 overflow-y-auto p-3 space-y-3", rightTab !== "vaka" && "hidden")}
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
                          getVisibleOptions(currentStep, session.selected_difficulty),
                          `${rs.id}:${currentStep.id}:${session.started_at}`,
                        )
                      : undefined
                  }
                />
                {currentStep.kind === "action" && (
                  <div className="h-[420px]">
                    <InventoryPanel
                      availableMedications={rs.available_medications}
                      availableEquipment={rs.available_equipment}
                      onAction={onAction}
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
              <div className="panel p-5 text-center text-sm text-ink-400">Senaryo yükleniyor…</div>
            )}
          </div>

          <div className={cn("flex-1 min-h-0 flex flex-col", rightTab !== "diyalog" && "hidden")}>
            <DialogChat key={scenarioId} scenario={scenario} onSpeakingChange={setSpeaking} />
          </div>
        </div>
      </div>

      {/* Overlay'ler */}
      <FeedbackToast feedback={runner.feedback} mode={session?.mode ?? "egitim"} onClose={runner.clearFeedback} />

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

      {/* Ventilatör paneli — 3D cihaz (veya DOM butonu) ile açılır */}
      {ventOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setVentOpen(false)}
          data-testid="ventilator-panel"
        >
          <div
            className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kontrol şeridi — preset + parametre slider'ları */}
            <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2 border-b border-white/10 bg-[#03100a] text-white/80">
              <span className="text-[11px] uppercase tracking-wider text-white/40">
                Preset
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {(["normal", "ards", "copd"] as VentPresetKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => ventPickPreset(key)}
                    title={VENT_PRESETS[key].note}
                    className={
                      "text-[11px] font-medium px-2.5 py-1 rounded border transition-colors " +
                      (ventPreset === key
                        ? "text-black border-transparent bg-brand"
                        : "text-white/60 border-white/15 hover:border-white/35")
                    }
                  >
                    {VENT_PRESETS[key].label}
                  </button>
                ))}
              </div>
              <div className="h-6 w-px bg-white/10" />
              <VentSlider label="FiO₂" p={VENT_PARAM.fio2} value={ventSettings.fio2} onChange={(v) => ventPatchSettings({ fio2: v })} unit="%" />
              <VentSlider label="PEEP" p={VENT_PARAM.peep} value={ventSettings.peep} onChange={(v) => ventPatchSettings({ peep: v })} unit="cmH₂O" />
              <VentSlider label="RR" p={VENT_PARAM.rr} value={ventSettings.rr} onChange={(v) => ventPatchSettings({ rr: v })} unit="/dk" />
              <VentSlider label="Vt" p={VENT_PARAM.vt} value={ventSettings.vt} onChange={(v) => ventPatchSettings({ vt: v })} unit="mL" />
              <VentSlider label="I:E (1:x)" p={VENT_PARAM.ie} value={ventSettings.ie} onChange={(v) => ventPatchSettings({ ie: v })} unit="" />
              <button
                type="button"
                onClick={() => setVentOpen(false)}
                data-testid="ventilator-close"
                className="ml-auto p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Klinik/kapsam uyarısı — panel bağımsız eğitim simülasyonu;
                ayarlar hastanın vitallerine ETKİ ETMEZ (sorun #4) + cihaz
                tıbbi cihaz değildir (sorun #5, dar ekranda da görünür). */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-1 bg-amber-950/40 border-b border-amber-500/20 text-amber-300/80 font-mono text-[9px] uppercase tracking-[0.1em]">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>
                Eğitim simülasyonu · tıbbi cihaz değildir · ayarlar hasta
                vitallerini etkilemez
              </span>
            </div>
            {/* Canlı ventilatör ekranı */}
            <div className="flex-1 min-h-0">
              <VentilatorScreen
                settings={ventSettings}
                onChangeMode={(mode: VentMode) => ventPatchSettings({ mode })}
                onPickPreset={ventPickPreset}
                activePreset={ventPreset}
                patientName={`${scenario.patient.age} yaş ${scenario.patient.sex === "M" ? "Erkek" : "Kadın"}`}
                bedLabel="Yatak 1 · Acil Servis"
                patientWeightKg={rs.patient.weight_kg}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ventilatör paneli için kompakt parametre slider'ı
function VentSlider({
  label,
  p,
  value,
  onChange,
  unit,
}: {
  label: string;
  p: { min: number; max: number; step: number };
  value: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-white/60">
      <span className="text-right">{label}</span>
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 accent-brand"
        aria-label={label}
      />
      <span
        className="w-14 tabular-nums text-white/80"
        style={{ fontFamily: "'Geist Mono', monospace" }}
      >
        {value} {unit}
      </span>
    </label>
  );
}
