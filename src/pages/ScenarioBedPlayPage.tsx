import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ClipboardList, MessageCircle, Activity as ActivityIcon, Wind, X, AlertTriangle } from "lucide-react";
import { PatientRoomScene } from "@/components/patient-3d/PatientRoomScene";
import { Patient2DVisual } from "@/components/patient-2d/Patient2DVisual";
import { getVisualMode } from "@/components/patient-2d/visualMode";

// URL/env oturum boyunca değişmez → modül seviyesinde bir kez çözülür.
const VISUAL_MODE = getVisualMode();
import { patientToVariant, patientToSkinTone } from "@/components/patient-3d/patientModels";
import { ANIMATED_MODELS, NON_SUPINE_CLIPS } from "@/components/patient-3d/AnimatedPatientModel";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StepDisplay } from "@/components/StepDisplay";
import { InventoryPanel } from "@/components/InventoryPanel";
import { DebriefScreen } from "@/components/DebriefScreen";
import { ReasoningPromptModal } from "@/components/ReasoningPromptModal";
import { FeedbackToast } from "@/components/FeedbackToast";
import { CriticalContraindicationModal } from "@/components/CriticalContraindicationModal";
import { LabResultsModal } from "@/components/LabResultsModal";
import { LabOrderCountdownModal } from "@/components/LabOrderCountdownModal";
import { ImagingResultsModal } from "@/components/ImagingResultsModal";
import { SCENARIOS } from "@/data/scenarios";
import { vitalsToVisual } from "@/clinical/visual-mapping";
import { mapVitalsToVisuals, applyPhaseVisual } from "@/clinical/clinicalVisualMapping";
import { useAnimationDirector } from "@/hooks/useAnimationDirector";
import { useStableValue } from "@/hooks/useStableValue";
import { vitalsToAgitation } from "@/clinical/agitation-mapping";
import { medicationRouteGesture } from "@/engine/animation-director";
import { getExtendedMedication } from "@/data/medications-extended";
import { getVisibleOptions, PEDAGOGY_ORDER, getPedagogy, pickTeachingAction, teachingNarration, phaseTransitionNarration, matchReasoningPrompt, isReasoningCorrect } from "@/engine";
import { seededShuffle } from "@/lib/shuffle";
import { useScenarioRunner } from "@/hooks/useScenarioRunner";
import { cn } from "@/lib/cn";
import type { ActionRef, PlayMode, ReasoningPrompt } from "@/engine";

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
  // Seslendirilen hasta yanıtı metni — fonetik viseme lipsync (TTS senkron).
  // Konuşma bitince temizlenir ki aynı metin tekrar tetiklenebilsin.
  const [speechText, setSpeechText] = useState<string | null>(null);
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

  // ── Klinik muhakeme (egitim modu, CEZASIZ) ──
  // Kritik aksiyon/karardan sonra "neden?" sorusu. SADECE egitim; her prompt
  // bir kez; seçim puanı ETKİLEMEZ (yalnız reasoning_answers'a yazılır).
  const [reasoningQueue, setReasoningQueue] = useState<ReasoningPrompt[]>([]);
  const reasoningShownRef = useRef<Set<string>>(new Set());

  const triggerReasoning = (triggerId: string) => {
    // matchReasoningPrompt: SADECE egitim modunda eşleşir (klinik/sinav → null).
    const p = matchReasoningPrompt(rs.reasoning_prompts, triggerId, playMode);
    if (!p) return;
    if (reasoningShownRef.current.has(p.id)) return; // her prompt 1 kez
    reasoningShownRef.current.add(p.id);
    setReasoningQueue((q) => (q.some((x) => x.id === p.id) ? q : [...q, p]));
  };

  // Aksiyonu motora ilet + ekipmansa hastada göster + (egitim) muhakeme sor.
  // Oral/SL/nebul ilaçta hasta jesti (hap yutma/inhaler) animasyon
  // yönetmenine olay olarak düşer — bilinç kapalıysa motor bastırır.
  const onAction = (action: ActionRef) => {
    if (action.type === "use_equipment" || action.type === "procedure") {
      const kind = EQUIPMENT_ID_MAP[action.target_id];
      if (kind) setEquipment((e) => (e.includes(kind) ? e : [...e, kind]));
    }
    if (action.type === "give_medication") {
      const route = getExtendedMedication(action.target_id)?.dose_band.dose_route;
      const gesture = route ? medicationRouteGesture(route) : null;
      if (gesture) pushAnimEvent(gesture);
    }
    runner.handleAction(action);
    triggerReasoning(action.target_id); // aksiyon SONRASI (akışı bozmaz)
  };

  // Modal cevabı → CEZASIZ kayıt (functional setSession; skor/grade DEĞİŞMEZ)
  const handleReasoningAnswer = (selectedIndex: number) => {
    const p = reasoningQueue[0];
    if (!p) return;
    const correct = isReasoningCorrect(p, selectedIndex);
    runner.setSession((s) =>
      s
        ? {
            ...s,
            reasoning_answers: [
              ...(s.reasoning_answers ?? []),
              { prompt_id: p.id, selected_index: selectedIndex, correct, answered_at: Date.now() },
            ],
          }
        : s,
    );
    setReasoningQueue((q) => q.slice(1));
  };
  const handleReasoningSkip = () => setReasoningQueue((q) => q.slice(1));

  const onRestart = () => {
    setEquipment([]);
    teachingHandledRef.current = null; // öğretici sürücü baştan anlatsın
    reasoningShownRef.current = new Set(); // tekrar oynamada muhakeme yeniden çıksın
    setReasoningQueue([]);
    runner.restart();
  };

  // Senaryo değişince takılı ekipmanı + ventilatör panelini/ayarlarını sıfırla
  useEffect(() => {
    setEquipment([]);
    setVentOpen(false);
    setVentSettings(VENT_PRESETS.normal.settings);
    setVentPreset("normal");
    teachingHandledRef.current = null;
    reasoningShownRef.current = new Set(); // senaryo değişince muhakeme durumu temizlen
    setReasoningQueue([]);
  }, [scenarioId]);

  // ── Öğretici (teaching/egitim) otomatik sürücü ──
  // Yalnız pedagogy.autoPlay modunda: önce adım açıklamasını göster, sonra
  // doğru aksiyonu sistem uygular. Handler'lar ref'ten okunur (stale-closure
  // önleme); effect currentStep.id değişince yeniden çalışır.
  const teachingApi = useRef({ runner, onAction, rs, triggerReasoning });
  teachingApi.current = { runner, onAction, rs, triggerReasoning };
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
    // Zorluğu geç → S4+ outcome'lar seçilip motorda eşleşmeyip ceza yememeli.
    const plan = pickTeachingAction(step, session.selected_difficulty);

    const READ_MS = 2800; // öğrenci açıklamayı okusun
    const ACTION_GAP_MS = 1400; // aksiyonlar arası (her biri görünür)
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ÖĞRETİCİ AKIŞI: sistem doğru aksiyon(lar)ı GÖSTERİR ama adımı OTOMATİK
    // İLERLETMEZ — öğrenci "Sonraki Adıma Geç" ile kendi temposunda devam eder
    // (Ali Bey: çok hızlıydı). Puanlama: action adımında doğru olan TÜM
    // aksiyonlar sırayla uygulanır (eski tekil seçim puanın çoğunu kaybediyordu).
    if (plan.kind === "actions") {
      plan.actions.forEach((action, i) => {
        timers.push(
          setTimeout(() => teachingApi.current.onAction(action), READ_MS + i * ACTION_GAP_MS),
        );
      });
    } else if (plan.kind === "decision" && step.kind === "decision") {
      timers.push(
        setTimeout(() => {
          const opt = step.options.find((o) => o.id === plan.optionId);
          if (opt) {
            teachingApi.current.runner.handleDecision(opt);
            teachingApi.current.triggerReasoning(opt.id); // egitim autoPlay reperfüzyon
          }
        }, READ_MS),
      );
    } else if (plan.kind === "decision_multi" && step.kind === "decision") {
      timers.push(
        setTimeout(
          () => teachingApi.current.runner.handleDecisionMulti(plan.optionIds),
          READ_MS,
        ),
      );
    }
    // info / skip: sadece anlatım gösterilir; öğrenci "Devam" ile ilerletir.
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

  // Vital → animasyon kararı — yönetmen motoru (histerezis + minHold +
  // katman önceliği + arrest bastırması + iskemik ağrı overlay'i).
  // vitalsToClip'in anlık eşlemesinin yerine geçti; eşik titremesi yok.
  const { decision: animDecision, pushEvent: pushAnimEvent } = useAnimationDirector({
    vitals: liveVitals,
    phaseSignal: runner.phaseSignal,
    speaking,
    // Supine sahne: ayakta çekilmiş klipler (talk_* dahil) yönetmene
    // VERİLMEZ — konuşma lipsync ile, gövde laying_idle'da kalır.
    availableClips: (ANIMATED_MODELS[variant]?.clips ?? []).filter(
      (c) => !NON_SUPINE_CLIPS.includes(c),
    ),
  });
  const skinTint = vitalsToVisual(liveVitals).skinTint;
  // Sürekli klinik görsel (siyanoz/solgun/terleme/benekli) — deterioration
  // tick'i sonrası canlı vital'den. Ayrık skinTint'in üstüne biner.
  // Sürekli klinik görsel + faz-senkron dramatik katman (tek faz sinyali kaynağı).
  // useStableValue (R4): liveVitals her tick yeni obje → useMemo her tick yeni
  // kimlikli sonuç üretir, içerik çoğunlukla AYNI. Sığ-eşitlikte eski referans
  // korunur → memo'lu sahne tick başına re-render olmaz.
  const visualState = useStableValue(
    useMemo(
      () => applyPhaseVisual(mapVitalsToVisuals(liveVitals), runner.phaseSignal?.visual),
      [liveVitals, runner.phaseSignal],
    ),
  );
  // Prosedürel hareket katmanı — rigor titremesi (ateş/hipoksi) + ağrı
  // huzursuzluğu. Mixer pozunun üstüne additive; yeni klip gerektirmez.
  const agitation = useStableValue(
    useMemo(() => vitalsToAgitation(liveVitals), [liveVitals]),
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

  // R4: kararlı callback — inline arrow her render'da yeni kimlik üretip
  // memo'lu PatientRoomScene'i kırıyordu.
  const openVentilator = useCallback(() => setVentOpen(true), []);

  // Karar seçenekleri — render içinde seededShuffle her tick yeniden
  // karıştırıyordu (aynı seed = aynı sonuç ama yeni dizi kimliği + boşa iş).
  // Deps bilinçli İLKEL (session objesi değil): session her tick yeni kimlik
  // alır ama difficulty/started_at oturum boyunca sabittir — memo tick'te bozulmaz.
  const sessionDifficulty = session?.selected_difficulty;
  const sessionStartedAt = session?.started_at;
  const visibleDecisionOptions = useMemo(() => {
    if (!rs || !currentStep || currentStep.kind !== "decision" || sessionStartedAt === undefined || sessionDifficulty === undefined) return undefined;
    return seededShuffle(
      getVisibleOptions(currentStep, sessionDifficulty),
      `${rs.id}:${currentStep.id}:${sessionStartedAt}`,
    );
  }, [currentStep, sessionDifficulty, sessionStartedAt, rs]);

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
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] neon-teal neon-text">
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
          {/* Görsel katman siperi (R1): sahne (3D/2D) çökse bile oyun UI'ı
              (monitör, aksiyonlar, debrief) ayakta kalır — beyaz ekran yok. */}
          <ErrorBoundary
            compact
            retryable
            title="Görsel sahne yüklenemedi"
            description="Hasta sahnesi açılamadı. Yeniden deneyin — sorun sürerse oyun panelden devam eder."
          >
            {/* 2D pivot (12 Tem 2026): görsel katman bayrakla seçilir. 3D
                SİLİNMEDİ — dondurulmuş, ?visual=3d veya VITE_VISUAL_MODE=3d
                ile aynen döner (geri dönüş sigortası + satış demosu). */}
            {VISUAL_MODE === "3d" ? (
              <PatientRoomScene
                variant={variant}
                decision={animDecision}
                skinTint={skinTint}
                visualState={visualState}
                agitation={agitation}
                skinTone={skinTone}
                speaking={speaking}
                speechText={speechText}
                equipment={equipment}
                cameraPreset="onden"
                showVentilator={ventEligible}
                ventilatorActive
                onVentilatorActivate={openVentilator}
              />
            ) : (
              <Patient2DVisual visualState={visualState} />
            )}
          </ErrorBoundary>
          {/* Küçük başucu monitörü — sol üst köşe overlay (eski CompactVitalsHUD yerine).
              Tam tasarım boyutunda render edilir, CSS scale ile küçültülür → orantı korunur, net kalır. */}
          {/* Neon sahne çerçevesi — dekoratif, tıklama yutmaz (pointer-events-none).
              Monitör İÇİNE glow girmez (IEC alarm ringi — DESIGN-TOKENS.md sınır 2). */}
          <div className="absolute inset-0 pointer-events-none neon-teal neon-scene-frame" aria-hidden />
          <div className="absolute top-3 left-3 origin-top-left" style={{ transform: "scale(0.72)" }}>
            <div className="w-[560px] h-[520px] rounded-lg overflow-hidden border border-ink-700/70 shadow-2xl ring-1 ring-black/50 neon-teal shadow-glow-sm">
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
              className="absolute bottom-4 right-4 px-3 py-1.5 rounded-md bg-ink-900/80 border border-ink-600 hover:border-brand/50 hover:text-brand-light hover:shadow-glow-sm neon-teal backdrop-blur-md flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-200 shadow-lg transition-all duration-200"
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
              className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[78%] px-4 py-2.5 rounded-lg bg-brand/15 border border-brand/40 backdrop-blur-md shadow-glow-sm neon-teal animate-fade-in flex items-start gap-2.5"
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
                "flex-1 px-3 py-2 rounded text-xs font-medium transition flex items-center justify-center gap-1.5 neon-teal",
                rightTab === "vaka"
                  ? "bg-brand/15 text-brand-light border border-brand/40 shadow-glow-xs"
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
                "flex-1 px-3 py-2 rounded text-xs font-medium transition flex items-center justify-center gap-1.5 neon-teal",
                rightTab === "diyalog"
                  ? "bg-brand/15 text-brand-light border border-brand/40 shadow-glow-xs"
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
                  onDecisionSelect={(opt) => {
                    runner.handleDecision(opt);
                    triggerReasoning(opt.id); // egitim manuel reperfüzyon kararı
                  }}
                  onDecisionMultiConfirm={runner.handleDecisionMulti}
                  onInfoContinue={runner.handleInfoContinue}
                  onActionStepContinue={runner.handleActionStepContinue}
                  canContinue={runner.canContinue}
                  decisionAnswered={runner.decisionAnswered}
                  decisionMultiAnswered={runner.decisionMultiAnswered}
                  visibleOptions={visibleDecisionOptions}
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
            <DialogChat
              key={scenarioId}
              scenario={scenario}
              onSpeakingChange={(s) => {
                setSpeaking(s);
                if (!s) setSpeechText(null); // konuşma bitti — timeline sıfırla
              }}
              onSpeechStart={setSpeechText}
            />
          </div>
        </div>
      </div>

      {/* Overlay'ler */}
      {/* Klinik muhakeme (egitim, CEZASIZ) — kuyrukta prompt varsa ilkini göster */}
      {reasoningQueue.length > 0 && (
        <ReasoningPromptModal
          prompt={reasoningQueue[0]}
          onAnswer={handleReasoningAnswer}
          onSkip={handleReasoningSkip}
        />
      )}

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
