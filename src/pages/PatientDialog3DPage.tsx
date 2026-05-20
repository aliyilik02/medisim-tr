import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Waves, Droplet, Scissors, Wand2 } from "lucide-react";
import { PatientBody3D } from "@/components/patient-3d/PatientBody3D";
import type { SkinTint } from "@/components/patient-3d/AnatomicPatientModel";
import { CompactVitalsHUD } from "@/components/patient-3d/CompactVitalsHUD";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { DialogChat } from "@/components/dialog/DialogChat";
import { SCENARIOS } from "@/data/scenarios";
import { vitalsToVisual } from "@/clinical/visual-mapping";
import { startSession, type SessionState, type ActionRef } from "@/engine";
import { useVitalsTick } from "@/hooks/useVitalsTick";

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

const SKIN_TINT_OPTIONS: { value: SkinTint; label: string; emoji: string }[] = [
  { value: "normal",   label: "Normal",  emoji: "🟢" },
  { value: "cyanosis", label: "Siyanoz", emoji: "🔵" },
  { value: "jaundice", label: "İkter",   emoji: "🟡" },
  { value: "pallor",   label: "Solgun",  emoji: "⚪" },
];

export function PatientDialog3DPage() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [breathing, setBreathing] = useState(true);
  const [manualSkinTint, setManualSkinTint] = useState<SkinTint | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [skinClipLevel, setSkinClipLevel] = useState(1.0);
  const [autoTint, setAutoTint] = useState(true);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  // Sprint senaryo motor mini-entegrasyon — startSession + useVitalsTick
  // canlı vital değişimi (pharmacology engine farmakokinetik tick).
  // Şimdilik action UI yok → vital baseline'da kalır, ama altyapı hazır.
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    // Senaryo değişince yeni session başlat
    setSession(startSession(scenario, "egitim", scenario.difficulty));
  }, [scenario]);

  useVitalsTick({
    scenario,
    session,
    setSession,
  });

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleProcedureComplete = (_action: ActionRef) => {
    // İleride scenario engine'e iletilebilir
  };

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
            regions={DEFAULT_REGIONS}
            breathing={breathing}
            skinTint={skinTint}
            speaking={speaking}
            skinClipLevel={skinClipLevel}
            organVitals={{
              hr: liveVitals.hr,
              rr: liveVitals.rr,
            }}
            onProcedureComplete={handleProcedureComplete}
          />

          {/* SOL ÜST: Vital Monitor — canlı session vital'leri */}
          <div className="absolute top-4 left-4">
            <CompactVitalsHUD
              vitals={liveVitals}
              patientAge={scenario.patient.age}
              ecgPattern={scenario.ekg_pattern}
            />
          </div>

          {/* SAĞ ÜST: Kontrol kümesi (cilt tonu + solunum + speaking) */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            {/* Speaking indicator */}
            {speaking && (
              <div
                className="px-3 py-1.5 rounded-full bg-brand/20 border border-brand/40 backdrop-blur-md flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-light shadow-lg"
                data-testid="speaking-indicator"
              >
                <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                Hasta konuşuyor
              </div>
            )}

            {/* Kontrol bar */}
            <div className="bg-ink-900/90 backdrop-blur-md border border-ink-700/60 rounded-lg p-2 flex flex-col gap-1.5 w-[200px] shadow-xl">
              {/* Cilt tonu — Auto (vital'a göre) + manuel override */}
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

              {/* Solunum toggle */}
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

          {/* SOL ALT: Cilt Kesim slider */}
          <div
            className="absolute bottom-4 left-4 bg-ink-900/90 backdrop-blur-md border border-ink-700/60 rounded-lg p-3 w-[240px] shadow-xl"
            data-testid="skin-clip-control"
          >
            <div className="flex items-center gap-2 mb-2">
              <Scissors className="w-3.5 h-3.5 text-brand" />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand">
                Cilt Kesim
              </span>
              <span className="ml-auto font-mono text-[10px] text-ink-400 tabular-nums">
                {Math.round((1 - skinClipLevel) * 100)}% açık
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={skinClipLevel}
              onChange={(e) => setSkinClipLevel(parseFloat(e.target.value))}
              className="w-full accent-brand cursor-pointer"
              aria-label="Cilt kesim seviyesi"
            />
            <div className="flex justify-between font-mono text-[8px] text-ink-500 mt-1">
              <span>← Anatomik kesit</span>
              <span>Cilt kapalı →</span>
            </div>
          </div>
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
    </div>
  );
}
