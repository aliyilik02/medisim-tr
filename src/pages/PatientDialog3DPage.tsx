import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, Waves, Droplet, Wand2 } from "lucide-react";
import { PatientBody3D, type CameraView } from "@/components/patient-3d/PatientBody3D";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import type { EquipmentState } from "@/components/patient-3d/PatientEquipment";
import { CompactVitalsHUD, type VitalHistoryEntry } from "@/components/patient-3d/CompactVitalsHUD";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { MarkerDevPanel } from "@/components/patient-3d/MarkerDevPanel";
import { useMarkerOverrides } from "@/hooks/useMarkerOverrides";
import { DialogChat } from "@/components/dialog/DialogChat";
import { SCENARIOS } from "@/data/scenarios";
import { vitalsToVisual } from "@/clinical/visual-mapping";
import {
  startSession,
  evaluateAction,
  evaluateDecision,
  evaluateDecisionMulti,
  applyVitalsChange,
  completeStep,
  pickNextStep,
  getCurrentStep,
  finalizeSession,
  type SessionState,
  type ActionRef,
  type Step,
} from "@/engine";
import { useVitalsTick } from "@/hooks/useVitalsTick";
import { ActionHistoryPanel, type ActionLogEntry } from "@/components/dialog/ActionHistoryPanel";
import { CurrentStepPanel } from "@/components/dialog/CurrentStepPanel";
import { DebriefModal } from "@/components/dialog/DebriefModal";
import { Toaster, pushToast, type ToastKind } from "@/components/dialog/Toaster";
import { saveSession } from "@/storage/sessionHistory";

// ============================================================
// PatientDialog3DPage — Sprint B.2 + B.3 + B.4 entegre demo
// ============================================================
// 3D anatomik model + AI hasta diyalog + Vital HUD + Cilt kesim.
// Route: /dialog-3d-demo
//
// Layout:
//   [Sol üst]    Vital Monitor (CompactVitalsHUD)
//   [Sağ üst]    Speaking indicator + Cilt tonu dropdown + Solunum toggle
//   [Sol alt]    Cilt kesim slider (anatomik atlas)
//   [Sağ panel]  DialogChat (420px)
// ============================================================

function pickToastKind(points: number, matched: boolean, critical: boolean): ToastKind {
  if (critical) return "critical";
  if (matched && points > 0) return "success";
  if (points < 0) return "warning";
  return "info";
}

function pickToastTitle(kind: ToastKind): string {
  switch (kind) {
    case "critical":
      return "Kritik Hata";
    case "success":
      return "Doğru Adım";
    case "warning":
      return "Hatalı Aksiyon";
    case "info":
      return "Bilgi";
  }
}

const SKIN_TINT_OPTIONS: { value: SkinTint; label: string; emoji: string }[] = [
  { value: "normal",   label: "Normal",  emoji: "🟢" },
  { value: "cyanosis", label: "Siyanoz", emoji: "🔵" },
  { value: "jaundice", label: "İkter",   emoji: "🟡" },
  { value: "pallor",   label: "Solgun",  emoji: "⚪" },
];

// Kamera açı butonları — klinik standart kısaltma (A/P/R/L/S/I).
const VIEW_OPTIONS: { value: CameraView; letter: string; label: string }[] = [
  { value: "anterior",  letter: "A", label: "Ön (Anterior)" },
  { value: "posterior", letter: "P", label: "Arka (Posterior)" },
  { value: "right",     letter: "R", label: "Sağ yan (Right lateral)" },
  { value: "left",      letter: "L", label: "Sol yan (Left lateral)" },
  { value: "superior",  letter: "S", label: "Üstten (Superior)" },
  { value: "inferior",  letter: "I", label: "Alttan (Inferior)" },
];

export function PatientDialog3DPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // URL'de ?scenario=id varsa o senaryo ile aç (ScenarioPlayPage'den
  // "3D Hasta" linki bunu kullanır). Bilinmeyen id ise ilk senaryoya fallback.
  const initialScenarioId = (() => {
    const fromUrl = searchParams.get("scenario");
    if (fromUrl && SCENARIOS.some((s) => s.id === fromUrl)) return fromUrl;
    return SCENARIOS[0].id;
  })();
  const [scenarioId, setScenarioIdState] = useState<string>(initialScenarioId);

  // Senaryo değişince URL query'sini de güncelle (paylaşılabilir link)
  const setScenarioId = useCallback(
    (next: string) => {
      setScenarioIdState(next);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("scenario", next);
        return params;
      });
    },
    [setSearchParams],
  );
  const [breathing, setBreathing] = useState(true);
  const [manualSkinTint, setManualSkinTint] = useState<SkinTint | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [autoTint, setAutoTint] = useState(true);
  const [cameraView, setCameraView] = useState<CameraView>("anterior");

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  // Sprint senaryo motor TAM entegrasyon — startSession + useVitalsTick
  // + evaluateAction (action submit) → vital değişimi canlı, step ilerler.
  const [session, setSession] = useState<SessionState | null>(null);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState<VitalHistoryEntry[]>([]);

  // B.6 — Ekipman giydirme durumu (prosedür tamamlandıkça kalıcı görünür).
  // Senaryo değişiminde sıfırlanır.
  const [equipmentState, setEquipmentState] = useState<EquipmentState>({});

  // Marker dev panel (URL ?dev=1 veya Alt+D ile aç) — localStorage override
  const {
    regions: effectiveRegions,
    overrides,
    updateMarker,
    resetMarker,
    resetAll: resetAllMarkers,
  } = useMarkerOverrides(DEFAULT_REGIONS);

  useEffect(() => {
    // Senaryo değişince yeni session başlat + action log + debrief + history + equipment temizle
    setSession(startSession(scenario, "egitim", scenario.difficulty));
    setActionLog([]);
    setDebriefOpen(false);
    setVitalsHistory([]);
    setEquipmentState({});
  }, [scenario]);

  // Senaryo finished olunca otomatik finalize + debrief modal aç +
  // localStorage'a kaydet (SessionHistoryPage + HomePage stats için)
  useEffect(() => {
    if (!session || !session.finished || session.grade) return;
    const finalized = finalizeSession(session, scenario, "completed");
    setSession(finalized);
    setDebriefOpen(true);
    try {
      saveSession(finalized, scenario);
    } catch (err) {
      // localStorage quota veya parsing hatası — sessizce log
      // eslint-disable-next-line no-console
      console.warn("[PatientDialog3DPage] saveSession failed:", err);
    }
  }, [session, scenario]);

  useVitalsTick({
    scenario,
    session,
    setSession,
  });

  // Canlı vital (session varsa) veya statik fallback
  const liveVitals = session?.vitals ?? scenario.initial_vitals;

  // organVitals memoize — sadece hr/rr değişince yeni obje (PatientBody3D
  // React.memo etkili olabilsin)
  const organVitalsMemo = useMemo(
    () => ({ hr: liveVitals.hr, rr: liveVitals.rr }),
    [liveVitals.hr, liveVitals.rr],
  );

  // Vital history — session.vitals değiştikçe sparkline için append (max 60 entry)
  useEffect(() => {
    setVitalsHistory((prev) => {
      const last = prev[prev.length - 1];
      // Aynı snapshot tekrar push edilmesin (deep compare yerine birkaç field check)
      if (
        last &&
        last.hr === liveVitals.hr &&
        last.rr === liveVitals.rr &&
        last.sbp === liveVitals.bp_systolic &&
        last.spo2 === liveVitals.spo2
      ) {
        return prev;
      }
      const entry: VitalHistoryEntry = {
        ts: Date.now(),
        hr: liveVitals.hr,
        rr: liveVitals.rr,
        sbp: liveVitals.bp_systolic,
        dbp: liveVitals.bp_diastolic,
        spo2: liveVitals.spo2,
        temp: liveVitals.temp,
        gcs: liveVitals.gcs,
      };
      const next = [...prev, entry];
      return next.length > 60 ? next.slice(-60) : next;
    });
  }, [liveVitals]);

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

  // Prosedür / ilaç action target_id → ekipman state mapping (B.6).
  // Action tamamlandıktan sonra equipment kalıcı görünür kalır (stetoskop
  // gibi temporary değil; mask/ekg/iv/cuff/oximetre takılı kalır).
  const applyEquipmentFromAction = useCallback((action: ActionRef) => {
    const id = action.target_id?.toLowerCase() ?? "";
    setEquipmentState((prev) => {
      // oxygen_mask, oxygen-mask, "Oksijen Maskesi" vs.
      if (/oxygen[_-]?mask|non[_-]?rebreather|nrb|maske/.test(id)) {
        return { ...prev, oxygenMask: true };
      }
      if (/nasal[_-]?cannula|nazal[_-]?kan|kanül/.test(id)) {
        return { ...prev, nasalCannula: true };
      }
      if (/ekg|ecg|monitor|elektrod|patch/.test(id)) {
        return { ...prev, ekgPatches: true };
      }
      if (/iv[_-]?(line|catheter|access)|damar[_-]?yolu/.test(id)) {
        return { ...prev, ivCatheter: true };
      }
      if (/bp[_-]?cuff|sphygmomanometer|tans|kan[_-]?bas/.test(id)) {
        return { ...prev, bpCuff: true };
      }
      if (/spo2|oksimet|pulse[_-]?ox/.test(id)) {
        return { ...prev, pulseOximeter: true };
      }
      return prev;
    });
  }, []);

  const handleProcedureComplete = useCallback((action: ActionRef) => {
    if (!session) return;
    const step = getCurrentStep(scenario, session);
    const ts = Date.now();

    // Ekipman action ise hastaya kalıcı görünür (mask, ekg patch, iv catheter, vs.)
    applyEquipmentFromAction(action);

    // Mevcut adım aksiyon kabul etmiyorsa (decision/info veya null) — bilgi log'u
    if (!step || step.kind !== "action") {
      setActionLog((prev) =>
        [
          {
            action,
            points: 0,
            feedback: step
              ? "Bu adımda doktor müdahalesi beklenmiyor (karar/bilgi adımı)."
              : "Senaryo tamamlandı — yeni eylem değerlendirilmez.",
            critical: false,
            matched: false,
            ts,
          },
          ...prev,
        ].slice(0, 10),
      );
      return;
    }

    const evaluation = evaluateAction(
      step,
      action,
      scenario,
      session.selected_difficulty,
    );

    setSession((prev) => {
      if (!prev) return prev;
      let s = prev;

      // Statik vital değişimi — baseline'a işle, görünür vitals da güncelle
      // (pharmacology tick farmakokinetiği baseline üstüne ekleyecek)
      if (evaluation.vitals_change) {
        s = {
          ...s,
          baseline_vitals: applyVitalsChange(
            s.baseline_vitals,
            evaluation.vitals_change,
          ),
          vitals: applyVitalsChange(s.vitals, evaluation.vitals_change),
        };
      }

      // Eşleşen outcome varsa adımı tamamla, sonraki adıma geç
      if (evaluation.matched_outcome) {
        const nextStepId = pickNextStep(
          scenario,
          step.id,
          evaluation.unlocks,
          s.selected_difficulty,
        );
        s = completeStep(
          s,
          step.id,
          evaluation.points,
          [action],
          evaluation.critical ? 1 : 0,
          nextStepId,
        );
      }

      return s;
    });

    const matched = evaluation.matched_outcome !== null;
    setActionLog((prev) =>
      [
        {
          action,
          points: evaluation.points,
          feedback: evaluation.feedback,
          critical: evaluation.critical,
          matched,
          ts,
        },
        ...prev,
      ].slice(0, 10),
    );

    const kind = pickToastKind(evaluation.points, matched, evaluation.critical);
    pushToast({
      kind,
      title: pickToastTitle(kind),
      body: evaluation.feedback.length > 90
        ? `${evaluation.feedback.slice(0, 90)}…`
        : evaluation.feedback,
      points: evaluation.points,
    });
  }, [session, scenario]);

  const handleDecisionSubmit = useCallback((step: Step, selectedOptionIds: string[]) => {
    if (!session || step.kind !== "decision") return;
    const ts = Date.now();
    const allowMultiple = step.allow_multiple === true;

    let totalPoints = 0;
    let feedback = "";
    let critical = false;
    let unlocks: string[] = [];

    if (allowMultiple) {
      const evalResult = evaluateDecisionMulti(
        step,
        selectedOptionIds,
        session.selected_difficulty,
        scenario,
      );
      if (!evalResult) return;
      totalPoints = evalResult.points;
      feedback = evalResult.feedback;
      critical = evalResult.selected_options.some((o) => o.critical === true);
      // Multi-choice'da unlock yok — linear akış
    } else {
      const optId = selectedOptionIds[0];
      if (!optId) return;
      const evalResult = evaluateDecision(
        step,
        optId,
        session.selected_difficulty,
        scenario,
      );
      if (!evalResult) return;
      totalPoints = evalResult.points;
      feedback = evalResult.feedback;
      critical = evalResult.option.critical === true;
    }

    // Decision step her zaman ilerler (geri dönüş yok)
    setSession((prev) => {
      if (!prev) return prev;
      const nextStepId = pickNextStep(
        scenario,
        step.id,
        unlocks,
        prev.selected_difficulty,
      );
      return completeStep(
        prev,
        step.id,
        totalPoints,
        [], // decision'da action ref yok
        critical ? 1 : 0,
        nextStepId,
      );
    });

    const decisionAction: ActionRef = {
      type: "decision",
      target_id: selectedOptionIds.join(","),
    };
    const matched = totalPoints > 0;
    setActionLog((prev) =>
      [
        {
          action: decisionAction,
          points: totalPoints,
          feedback,
          critical,
          matched,
          ts,
        },
        ...prev,
      ].slice(0, 10),
    );

    const kind = pickToastKind(totalPoints, matched, critical);
    pushToast({
      kind,
      title: pickToastTitle(kind),
      body: feedback.length > 90 ? `${feedback.slice(0, 90)}…` : feedback,
      points: totalPoints,
    });
  }, [session, scenario]);

  const handleInfoContinue = useCallback((step: Step) => {
    if (!session || step.kind !== "info") return;
    setSession((prev) => {
      if (!prev) return prev;
      const nextStepId = pickNextStep(
        scenario,
        step.id,
        [],
        prev.selected_difficulty,
      );
      return completeStep(prev, step.id, 0, [], 0, nextStepId);
    });
  }, [session, scenario]);

  const handleRestart = useCallback(() => {
    setSession(startSession(scenario, "egitim", scenario.difficulty));
    setActionLog([]);
    setDebriefOpen(false);
    setEquipmentState({});
  }, [scenario]);

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
        {/* Kamera açı seçici — 6 preset (A/P/R/L/S/I) + drag orbit aktif */}
        <div
          className="flex items-center gap-0.5 mr-2 border border-ink-700 rounded p-0.5 bg-ink-900"
          data-testid="view-angle-selector"
          title="Kamera açısı — fareyle sürükleyerek de döndürebilirsin"
        >
          {VIEW_OPTIONS.map((opt) => {
            const active = cameraView === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCameraView(opt.value)}
                title={opt.label}
                className={`w-6 h-6 rounded font-mono text-[10px] uppercase font-bold tracking-wide transition ${
                  active
                    ? "bg-brand text-ink-950"
                    : "text-ink-400 hover:text-ink-100 hover:bg-ink-800"
                }`}
                data-testid={`view-angle-${opt.value}`}
              >
                {opt.letter}
              </button>
            );
          })}
        </div>
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
            regions={effectiveRegions}
            breathing={breathing}
            skinTint={skinTint}
            speaking={speaking}
            skinClipLevel={1.0}
            organVitals={organVitalsMemo}
            equipmentState={equipmentState}
            vitals={liveVitals}
            cameraView={cameraView}
            onProcedureComplete={handleProcedureComplete}
          />

          {/* SOL ÜST: Vital Monitor — canlı session vital'leri + sparkline trend */}
          <div className="absolute top-4 left-4">
            <CompactVitalsHUD
              vitals={liveVitals}
              patientAge={scenario.patient.age}
              ecgPattern={scenario.ekg_pattern}
              history={vitalsHistory}
            />
          </div>

          {/* SAĞ ÜST: Speaking indicator + Solunum toggle */}
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
            <button
              type="button"
              onClick={() => setBreathing((b) => !b)}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.1em] border transition flex items-center gap-2 backdrop-blur-md shadow-lg ${
                breathing
                  ? "bg-brand/15 border-brand/50 text-brand-light"
                  : "bg-ink-900/85 border-ink-700 text-ink-400 hover:text-ink-100"
              }`}
            >
              <Waves className="w-3 h-3" />
              Solunum {breathing ? "açık" : "kapalı"}
            </button>
          </div>

          {/* SAĞ ALT: Cilt Tonu kontrol — Auto (vital'a göre) + manuel override */}
          <div
            className="absolute bottom-4 right-4 bg-ink-900/90 backdrop-blur-md border border-ink-700/60 rounded-lg p-2.5 w-[200px] shadow-xl"
            data-testid="skin-tint-control"
          >
            <div className="flex items-center justify-between mb-1.5">
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

          {/* SOL ORTA: Action History — 3D bölgeye tıklayıp prosedür
              tetiklendiğinde engine evaluateAction sonucu burada görünür */}
          <ActionHistoryPanel
            entries={actionLog}
            className="absolute bottom-[120px] left-4 w-[260px] shadow-xl"
          />

          {/* ALT ORTA: Mevcut step paneli — decision options / info continue
              / action hint / finished score */}
          <CurrentStepPanel
            scenario={scenario}
            session={session}
            onDecisionSubmit={handleDecisionSubmit}
            onInfoContinue={handleInfoContinue}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[360px] max-w-[calc(100%-2rem)]"
          />

          {/* Cilt kesim ve organ paneli kaldırıldı — anatomi ileri faz'da
              ayrı sayfaya taşınacak. Sahnede sadece hastane odası + hasta. */}

        </div>

        {/* Sağ panel: Dialog Chat */}
        <div className="w-[420px] shrink-0 flex flex-col bg-ink-950/50">
          <DialogChat
            key={scenarioId}
            scenario={scenario}
            onSpeakingChange={setSpeaking}
          />
        </div>
      </div>

      {/* Debrief — senaryo finished olunca otomatik açılır */}
      {session && (
        <DebriefModal
          open={debriefOpen}
          scenario={scenario}
          session={session}
          onRestart={handleRestart}
          onClose={() => setDebriefOpen(false)}
        />
      )}

      {/* Action feedback toast'ları — sağ üst overlay */}
      <Toaster />

      {/* Marker dev panel — geliştirici için runtime X/Y/Z ayar.
          URL ?dev=1 veya Alt+D ile açılır. localStorage'a kaydeder. */}
      <MarkerDevPanel
        regions={effectiveRegions}
        overrides={overrides}
        onUpdate={updateMarker}
        onResetMarker={resetMarker}
        onResetAll={resetAllMarkers}
      />
    </div>
  );
}
