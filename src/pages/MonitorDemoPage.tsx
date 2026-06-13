/* =========================================================================
   MonitorDemoPage.tsx — dalga formu monitörü canlı doğrulama sayfası.

   /monitor-demo route'unda yüklenir. Kontrol panelinden ritim + HR/SpO₂/BP/RR
   ayarlanır, VitalMonitorScreen canlı render eder. DOĞRULAMA amaçlı.
   (Header/footer App.tsx'te bu route için gizlenir.)
   ========================================================================= */
import { useState } from "react";
import { VitalMonitorScreen } from "@/components/monitor/VitalMonitorScreen";
import type { Rhythm, VitalState } from "@/components/monitor/waveform-engine";

const RHYTHMS: { key: Rhythm; label: string }[] = [
  { key: "sinus", label: "Sinüs" },
  { key: "tachy", label: "Taşikardi" },
  { key: "brady", label: "Bradikardi" },
  { key: "afib", label: "AFib" },
  { key: "svt", label: "SVT" },
  { key: "vtach", label: "VT" },
  { key: "vfib", label: "VF" },
  { key: "asystole", label: "Asistoli" },
];

export function MonitorDemoPage() {
  const [rhythm, setRhythm] = useState<Rhythm>("sinus");
  const [hr, setHr] = useState(76);
  const [spo2, setSpo2] = useState(98);
  const [sbp, setSbp] = useState(124);
  const [dbp, setDbp] = useState(78);
  const [rr, setRr] = useState(14);

  // VF/asistoli → nabız ve basınç düşer; native VitalState'i tutarlı tut
  const vitals: VitalState = {
    hr,
    spo2,
    sbp,
    dbp,
    rr,
    etco2: 38,
    temp: 36.8,
    rhythm,
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#02100a]">
      {/* kontrol şeridi */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 px-4 py-2 border-b border-white/10 bg-[#03100a] text-white/80">
        <span className="text-[11px] uppercase tracking-wider text-white/40">Ritim</span>
        <div className="flex items-center gap-1 flex-wrap">
          {RHYTHMS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRhythm(r.key)}
              className={
                "text-[11px] font-medium px-2.5 py-1 rounded border transition-colors " +
                (rhythm === r.key
                  ? "text-black border-transparent bg-brand"
                  : "text-white/60 border-white/15 hover:border-white/35")
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        <Slider label="HR" min={0} max={220} value={hr} onChange={setHr} unit="bpm" />
        <Slider label="SpO₂" min={50} max={100} value={spo2} onChange={setSpo2} unit="%" />
        <Slider label="Sistolik" min={0} max={220} value={sbp} onChange={setSbp} unit="mmHg" />
        <Slider label="Diastolik" min={0} max={140} value={dbp} onChange={setDbp} unit="mmHg" />
        <Slider label="RR" min={0} max={40} value={rr} onChange={setRr} unit="/dk" />
      </div>

      {/* canlı monitör */}
      <div className="flex-1 min-h-0">
        <VitalMonitorScreen vitals={vitals} patientName="A. Yılmaz" bedLabel="Yatak 1 · Yoğun Bakım" />
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
  unit,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-white/60">
      <span className="w-14 text-right">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 accent-brand"
        aria-label={label}
      />
      <span className="w-16 tabular-nums text-white/80" style={{ fontFamily: "'Geist Mono', monospace" }}>
        {value} {unit}
      </span>
    </label>
  );
}
