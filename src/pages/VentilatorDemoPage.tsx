/* =========================================================================
   VentilatorDemoPage.tsx — mekanik ventilatör canlı doğrulama sayfası.

   /ventilator-demo route'unda yüklenir (route App.tsx'te ayrıca eklenir).
   Sol/sağ panelde parametre slider'ları (FiO₂/PEEP/RR/Vt/I:E) + preset
   butonları; VentilatorScreen canlı dalga formu render eder. DOĞRULAMA amaçlı.

   `MonitorDemoPage.tsx` sayfa düzeni + Slider deseni örnek alındı.
   ========================================================================= */
import { useState } from "react";
import { VentilatorScreen } from "@/components/ventilator/VentilatorScreen";
import {
  VENT_PRESETS,
  VENT_PARAM,
  type VentSettings,
  type VentMode,
  type VentPresetKey,
} from "@/components/ventilator/ventilator-engine";

export function VentilatorDemoPage() {
  const [settings, setSettings] = useState<VentSettings>(VENT_PRESETS.normal.settings);
  // hangi preset son seçildi (vurgu için; manuel slider değişince null'a düşer)
  const [activePreset, setActivePreset] = useState<VentPresetKey | null>("normal");

  const patch = (p: Partial<VentSettings>) => {
    setActivePreset(null); // elle değişiklik → preset vurgusu kalkar
    setSettings((s) => ({ ...s, ...p }));
  };

  const pickPreset = (key: VentPresetKey) => {
    setSettings(VENT_PRESETS[key].settings);
    setActivePreset(key);
  };

  const changeMode = (mode: VentMode) => patch({ mode });

  return (
    <div className="h-screen w-screen flex flex-col bg-[#02100a]">
      {/* kontrol şeridi */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 px-4 py-2 border-b border-white/10 bg-[#03100a] text-white/80">
        <span className="text-[11px] uppercase tracking-wider text-white/40">Preset</span>
        <div className="flex items-center gap-1 flex-wrap">
          {(["normal", "ards", "copd"] as VentPresetKey[]).map((key) => {
            const p = VENT_PRESETS[key];
            return (
              <button
                key={key}
                onClick={() => pickPreset(key)}
                title={p.note}
                className={
                  "text-[11px] font-medium px-2.5 py-1 rounded border transition-colors " +
                  (activePreset === key
                    ? "text-black border-transparent bg-brand"
                    : "text-white/60 border-white/15 hover:border-white/35")
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-white/10" />

        <Slider
          label="FiO₂"
          min={VENT_PARAM.fio2.min}
          max={VENT_PARAM.fio2.max}
          step={VENT_PARAM.fio2.step}
          value={settings.fio2}
          onChange={(v) => patch({ fio2: v })}
          unit="%"
        />
        <Slider
          label="PEEP"
          min={VENT_PARAM.peep.min}
          max={VENT_PARAM.peep.max}
          step={VENT_PARAM.peep.step}
          value={settings.peep}
          onChange={(v) => patch({ peep: v })}
          unit="cmH₂O"
        />
        <Slider
          label="RR"
          min={VENT_PARAM.rr.min}
          max={VENT_PARAM.rr.max}
          step={VENT_PARAM.rr.step}
          value={settings.rr}
          onChange={(v) => patch({ rr: v })}
          unit="/dk"
        />
        <Slider
          label="Vt"
          min={VENT_PARAM.vt.min}
          max={VENT_PARAM.vt.max}
          step={VENT_PARAM.vt.step}
          value={settings.vt}
          onChange={(v) => patch({ vt: v })}
          unit="mL"
        />
        <Slider
          label="I:E (1:x)"
          min={VENT_PARAM.ie.min}
          max={VENT_PARAM.ie.max}
          step={VENT_PARAM.ie.step}
          value={settings.ie}
          onChange={(v) => patch({ ie: v })}
          unit=""
        />
      </div>

      {/* canlı ventilatör */}
      <div className="flex-1 min-h-0">
        <VentilatorScreen
          settings={settings}
          onChangeMode={changeMode}
          onPickPreset={pickPreset}
          activePreset={activePreset}
          patientName="A. Yılmaz"
          bedLabel="Yatak 1 · Yoğun Bakım"
        />
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-white/60">
      <span className="w-16 text-right">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 accent-brand"
        aria-label={label}
      />
      <span
        className="w-16 tabular-nums text-white/80"
        style={{ fontFamily: "'Geist Mono', monospace" }}
      >
        {value} {unit}
      </span>
    </label>
  );
}
