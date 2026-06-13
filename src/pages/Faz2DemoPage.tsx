import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import {
  PatientRoomScene,
  CAMERA_PRESET_LABELS,
  type CameraPreset,
} from "@/components/patient-3d/PatientRoomScene";
import { CompactVitalsHUD } from "@/components/patient-3d/CompactVitalsHUD";
import {
  ANIMATED_MODELS,
  ANIMATED_VARIANTS,
  CLIP_LABELS,
  NON_SUPINE_CLIPS,
  type PatientClip,
} from "@/components/patient-3d/AnimatedPatientModel";
import {
  patientToVariant,
  patientToSkinTone,
  DEFAULT_SKIN_TONE,
  type PatientVariant,
} from "@/components/patient-3d/patientModels";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import { EQUIPMENT_LABELS, type EquipmentKind } from "@/components/patient-3d/equipmentMeshes";
import type { PatientVitals } from "@/engine";
import { SCENARIOS } from "@/data/scenarios";
import { getMedication } from "@/data/medications";
import { vitalsToClip, resolveClipForVariant } from "@/clinical/clip-mapping";
import { vitalsToVisual } from "@/clinical/visual-mapping";
import { useScenarioVitals } from "@/hooks/useScenarioVitals";

const V: PatientVitals = { hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 98, temp: 36.8, rr: 14, pain: 0 };

// Klinik durum preset'leri — manuel modda vital→klip+ten tonu sürer.
const CLINICAL_PRESETS: { label: string; vitals: PatientVitals }[] = [
  { label: "Normal", vitals: V },
  { label: "Hipoksi", vitals: { ...V, spo2: 82, rr: 28 } },
  { label: "Solunum sıkıntısı", vitals: { ...V, rr: 32, spo2: 90 } },
  { label: "Şiddetli ağrı", vitals: { ...V, pain: 8, hr: 110 } },
  { label: "Şok", vitals: { ...V, bp_systolic: 78, hr: 124, spo2: 92 } },
];

// Deterioration eğrisi olan senaryolar (gerçek motor sürecek).
const DETERIORATION_SCENARIOS = SCENARIOS.filter((s) => (s.deterioration?.length ?? 0) > 0);

// Faz 2 — Klinik Sahne: supine animasyonlu hasta + manuel/senaryo modu.
export function Faz2DemoPage() {
  const [mode, setMode] = useState<"manual" | "scenario">("manual");

  // Manuel mod state
  const [variant, setVariant] = useState<PatientVariant>("female-adult");
  const [clip, setClip] = useState<PatientClip>("laying_idle");
  const [speaking, setSpeaking] = useState(false);
  const [skinTint, setSkinTint] = useState<SkinTint>("normal");
  const [presetLabel, setPresetLabel] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<EquipmentKind[]>([]);
  const [camera, setCamera] = useState<CameraPreset>("genel");
  const toggleEquip = (k: EquipmentKind) =>
    setEquipment((e) => (e.includes(k) ? e.filter((x) => x !== k) : [...e, k]));

  // Senaryo mod state
  const [scenarioId, setScenarioId] = useState(DETERIORATION_SCENARIOS[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const scenario = mode === "scenario" ? SCENARIOS.find((s) => s.id === scenarioId) ?? null : null;
  const oxygenSupport = equipment.includes("oxygen_mask") || equipment.includes("nasal_cannula");
  const { vitals, reset, intervene, given } = useScenarioVitals(scenario, running, { oxygenSupport });

  // ── Efektif (gösterilecek) varyant/klip/tint — moda göre türetilir ──
  const scenarioVariant = useMemo(
    () => (scenario ? patientToVariant(scenario.patient) : "female-adult"),
    [scenario],
  );
  const effVariant = mode === "scenario" ? scenarioVariant : variant;
  const effClips = (ANIMATED_MODELS[effVariant]?.clips ?? []).filter((c) => !NON_SUPINE_CLIPS.includes(c));

  const effClip =
    mode === "scenario" && vitals
      ? resolveClipForVariant(vitalsToClip(vitals, {}), ANIMATED_MODELS[effVariant]?.clips ?? [])
      : clip;
  const effTint: SkinTint =
    mode === "scenario" && vitals ? vitalsToVisual(vitals).skinTint : skinTint;
  const effSkinTone = scenario ? patientToSkinTone(scenario.patient) : DEFAULT_SKIN_TONE;

  // Stabilizasyon: vital normal bandında (müdahale sonrası iyileşme).
  const isStable =
    mode === "scenario" && !!vitals &&
    vitals.spo2 >= 94 && vitals.bp_systolic >= 100 && vitals.rr <= 22 && vitals.hr <= 110;

  // Manuel mod yardımcıları
  const onVariant = (v: PatientVariant) => {
    setVariant(v);
    const vc = (ANIMATED_MODELS[v]?.clips ?? []).filter((c) => !NON_SUPINE_CLIPS.includes(c));
    if (!vc.includes(clip)) setClip(vc[0] ?? "laying_idle");
  };
  const onPreset = (p: { label: string; vitals: PatientVitals }) => {
    setPresetLabel(p.label);
    const all = ANIMATED_MODELS[variant]?.clips ?? [];
    setClip(resolveClipForVariant(vitalsToClip(p.vitals, { speaking }), all));
    setSkinTint(vitalsToVisual(p.vitals).skinTint);
  };
  const onManualClip = (c: PatientClip) => {
    setClip(c);
    setPresetLabel(null);
  };

  return (
    <div className="fixed inset-0 bg-ink-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-ink-700/50 bg-ink-950/90">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-ink-400 hover:text-ink-100 transition" aria-label="Ana sayfa">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            Faz 2 — Klinik Sahne (Acil Servis)
          </span>
          {/* Mod toggle */}
          <div className="flex gap-0.5 ml-2 rounded bg-ink-900 border border-ink-700/60 p-0.5">
            {(["manual", "scenario"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-[0.1em] transition ${
                  mode === m ? "bg-brand/20 text-brand-light" : "text-ink-500 hover:text-ink-200"
                }`}
              >
                {m === "manual" ? "Manuel" : "Senaryo"}
              </button>
            ))}
          </div>
        </div>
        <span className="font-mono text-[9px] text-ink-500">
          Eğitim amaçlıdır, klinik karar destek değildir
        </span>
      </header>

      <div className="flex-1 min-h-0 relative">
        <PatientRoomScene
          variant={effVariant}
          clip={effClip}
          speaking={mode === "manual" && speaking}
          skinTint={effTint}
          skinTone={effSkinTone}
          equipment={equipment}
          cameraPreset={camera}
        />

        {/* Kamera presetleri (sağ alt) */}
        <div className="absolute bottom-3 right-3 flex gap-1 px-1.5 py-1 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
          {(Object.keys(CAMERA_PRESET_LABELS) as CameraPreset[]).map((c) => (
            <button
              key={c}
              onClick={() => setCamera(c)}
              className={`px-2 py-1 rounded font-mono text-[9px] uppercase tracking-[0.08em] transition ${
                camera === c ? "bg-brand/20 text-brand-light" : "text-ink-500 hover:text-ink-200 hover:bg-ink-800"
              }`}
            >
              {CAMERA_PRESET_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Senaryo modu: canlı vital HUD + müdahale paneli (sağ) */}
        {mode === "scenario" && scenario && vitals && (
          <div className="absolute top-3 right-3 w-64 flex flex-col gap-2">
            <CompactVitalsHUD vitals={vitals} patientAge={scenario.patient.age} />
            <div className="rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md p-2">
              <div className="font-mono text-[8px] text-ink-500 uppercase tracking-[0.15em] mb-1.5 px-0.5">Müdahale (İlaç ver)</div>
              <div className="flex flex-wrap gap-1">
                {scenario.available_medications.slice(0, 8).map((id) => {
                  const isGiven = given.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => intervene({ type: "give_medication", target_id: id })}
                      className={`px-2 py-1 rounded font-mono text-[9px] tracking-[0.03em] transition ${
                        isGiven
                          ? "bg-clinical-stable/20 text-clinical-stable border border-clinical-stable/40"
                          : "text-ink-300 hover:text-ink-100 hover:bg-ink-800 border border-ink-700/60"
                      }`}
                    >
                      {isGiven ? "✓ " : ""}
                      {getMedication(id)?.name_tr ?? id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Ekipman paneli (sol kenar) — kemik-bağlı, animasyonu takip eder */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 px-1.5 py-2 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
          <span className="font-mono text-[8px] text-ink-500 uppercase tracking-[0.15em] text-center pb-0.5">Ekipman</span>
          {(Object.keys(EQUIPMENT_LABELS) as EquipmentKind[]).map((k) => (
            <button
              key={k}
              onClick={() => toggleEquip(k)}
              className={`px-2 py-1 rounded font-mono text-[10px] tracking-[0.04em] transition text-left ${
                equipment.includes(k)
                  ? "bg-brand/20 text-brand-light border border-brand/40"
                  : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
              }`}
            >
              {EQUIPMENT_LABELS[k]}
            </button>
          ))}
        </div>

        {/* ── MANUEL MOD kontrolleri ── */}
        {mode === "manual" && (
          <>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="flex gap-1.5 px-2 py-1.5 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
                {ANIMATED_VARIANTS.map((v) => (
                  <button
                    key={v}
                    onClick={() => onVariant(v)}
                    className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                      variant === v
                        ? "bg-brand/20 text-brand-light border border-brand/40"
                        : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
                    }`}
                  >
                    {ANIMATED_MODELS[v]?.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center px-2 py-1.5 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md max-w-[92vw]">
                <span className="font-mono text-[9px] text-ink-500 self-center px-1">KLİNİK DURUM →</span>
                {CLINICAL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onPreset(p)}
                    className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-[0.06em] transition ${
                      presetLabel === p.label
                        ? "bg-clinical-warning/20 text-clinical-warning border border-clinical-warning/40"
                        : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-1.5 justify-center px-3 py-2 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md max-w-[92%]">
              {effClips.map((c) => (
                <button
                  key={c}
                  onClick={() => onManualClip(c)}
                  className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                    clip === c
                      ? "bg-brand/20 text-brand-light border border-brand/40"
                      : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
                  }`}
                >
                  {CLIP_LABELS[c]}
                </button>
              ))}
              <span className="w-px h-5 bg-ink-700/60 mx-1 self-center" />
              <button
                onClick={() => setSpeaking((s) => !s)}
                className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                  speaking
                    ? "bg-clinical-info/20 text-clinical-info border border-clinical-info/40"
                    : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
                }`}
              >
                {speaking ? "Konuşuyor ●" : "Konuş"}
              </button>
            </div>
          </>
        )}

        {/* ── SENARYO MOD kontrolleri ── */}
        {mode === "scenario" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            {scenario && vitals && (
              <div className="flex items-center gap-2">
                <div className="font-mono text-[10px] text-ink-300 px-3 py-1 rounded bg-ink-900/85 border border-ink-700/60">
                  {scenario.title} · canlı: {CLIP_LABELS[effClip]}
                  {effTint !== "normal" ? ` · ${effTint}` : ""}
                </div>
                {isStable && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded bg-clinical-stable/20 text-clinical-stable border border-clinical-stable/50">
                    ● Stabil
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
              <select
                value={scenarioId}
                onChange={(e) => {
                  setScenarioId(e.target.value);
                  setRunning(false);
                }}
                className="bg-ink-800 text-ink-100 font-mono text-[11px] rounded px-2 py-1 border border-ink-700 focus:outline-none focus:border-brand/50 max-w-[220px]"
              >
                {DETERIORATION_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setRunning((r) => !r)}
                className="flex items-center gap-1 px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] bg-brand/20 text-brand-light border border-brand/40 hover:bg-brand/30 transition"
              >
                {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {running ? "Duraklat" : "Başlat"}
              </button>
              <button
                onClick={() => {
                  setRunning(false);
                  reset();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent transition"
              >
                <RotateCcw className="w-3 h-3" />
                Sıfırla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
