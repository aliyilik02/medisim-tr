// ============================================================
// MarkerDevPanel — Sprint B.5+ runtime marker X/Y/Z ayar UI
// ============================================================
// URL'de `?dev=1` varsa otomatik açık, Alt+D ile toggle. Bir marker
// seçilir, X/Y/Z slider'larla pozisyon ayarlanır. localStorage'a
// kaydedilir (useMarkerOverrides hook). "JSON Export" tüm regions'ı
// clipboard'a kopyalar — geliştirici kalıcı olarak regions.ts'e
// yapıştırabilir.
// ============================================================

import { useState, useEffect } from "react";
import { Settings, X, Clipboard, RotateCcw, Eraser } from "lucide-react";
import type { PatientRegion } from "@/components/patient-3d/regions";

interface Props {
  regions: PatientRegion[];
  overrides: Record<string, [number, number, number]>;
  onUpdate: (id: string, pos: [number, number, number]) => void;
  onResetMarker: (id: string) => void;
  onResetAll: () => void;
}

const Y_RANGE: [number, number] = [-0.25, 0.78];
const X_RANGE: [number, number] = [-0.25, 0.25];
const Z_RANGE: [number, number] = [0.0, 0.2];
const STEP = 0.005;

function fmt(n: number): string {
  return n.toFixed(3);
}

export function MarkerDevPanel({
  regions,
  overrides,
  onUpdate,
  onResetMarker,
  onResetAll,
}: Props) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("dev");
  });
  const [selectedId, setSelectedId] = useState<string>(regions[0]?.id ?? "");
  const [copyFlash, setCopyFlash] = useState(false);

  // Alt+D shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const selected = regions.find((r) => r.id === selectedId) ?? regions[0];

  if (!selected) return null;

  const isOverridden = selectedId in overrides;
  const [x, y, z] = selected.position;

  const update = (axis: 0 | 1 | 2, value: number) => {
    const newPos: [number, number, number] = [...selected.position];
    newPos[axis] = value;
    onUpdate(selected.id, newPos);
  };

  const exportJson = async () => {
    const json = regions
      .map((r) => {
        const [px, py, pz] = r.position;
        return `  // ${r.id}\n  position: [${fmt(px)}, ${fmt(py)}, ${fmt(pz)}],`;
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(json);
      setCopyFlash(true);
      window.setTimeout(() => setCopyFlash(false), 1500);
    } catch {
      // Clipboard izin yoksa — console fallback
      // eslint-disable-next-line no-console
      console.log("[MarkerDevPanel] JSON Export:\n" + json);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 bg-ink-900/90 backdrop-blur-md border border-clinical-warning/40 text-clinical-warning rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] flex items-center gap-1.5 shadow-lg hover:bg-ink-800 transition"
        data-testid="marker-dev-toggle"
        title="Alt+D — Marker dev panel"
      >
        <Settings className="w-3 h-3" />
        Dev
        {Object.keys(overrides).length > 0 && (
          <span className="bg-clinical-warning text-ink-950 px-1 rounded text-[8px] font-bold tabular-nums">
            {Object.keys(overrides).length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-ink-900/95 backdrop-blur-md border border-clinical-warning/50 rounded-lg p-3 w-[340px] shadow-2xl"
      data-testid="marker-dev-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <Settings className="w-3.5 h-3.5 text-clinical-warning" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clinical-warning">
          Marker Dev Panel
        </span>
        <span className="ml-auto font-mono text-[9px] text-ink-500">
          {Object.keys(overrides).length} override
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-400 hover:text-ink-100 transition"
          aria-label="Kapat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Region select */}
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 font-mono text-[10px] text-ink-100 mb-2.5"
        data-testid="marker-dev-select"
      >
        {regions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id} — {r.label}
            {r.id in overrides ? " *" : ""}
          </option>
        ))}
      </select>

      {/* XYZ sliders */}
      <div className="flex flex-col gap-2 mb-3">
        <AxisSlider
          axis="X"
          value={x}
          min={X_RANGE[0]}
          max={X_RANGE[1]}
          step={STEP}
          onChange={(v) => update(0, v)}
        />
        <AxisSlider
          axis="Y"
          value={y}
          min={Y_RANGE[0]}
          max={Y_RANGE[1]}
          step={STEP}
          onChange={(v) => update(1, v)}
        />
        <AxisSlider
          axis="Z"
          value={z}
          min={Z_RANGE[0]}
          max={Z_RANGE[1]}
          step={STEP}
          onChange={(v) => update(2, v)}
        />
      </div>

      {/* Action butonları */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => onResetMarker(selected.id)}
          disabled={!isOverridden}
          className="flex-1 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1"
          data-testid="marker-dev-reset-current"
        >
          <RotateCcw className="w-3 h-3" />
          Bu marker
        </button>
        <button
          type="button"
          onClick={onResetAll}
          disabled={Object.keys(overrides).length === 0}
          className="flex-1 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-ink-800 hover:bg-ink-700 border border-clinical-warning/40 text-clinical-warning disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1"
          data-testid="marker-dev-reset-all"
        >
          <Eraser className="w-3 h-3" />
          Tümünü sıfırla
        </button>
      </div>
      <button
        type="button"
        onClick={exportJson}
        className="w-full px-2 py-1.5 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-clinical-stable/15 hover:bg-clinical-stable/25 border border-clinical-stable/40 text-clinical-stable transition flex items-center justify-center gap-1.5"
        data-testid="marker-dev-export"
      >
        <Clipboard className="w-3 h-3" />
        {copyFlash ? "Kopyalandı!" : "JSON Export (clipboard)"}
      </button>
      <div className="mt-2 font-mono text-[9px] text-ink-500 italic">
        Alt+D ile aç/kapat · localStorage'a kaydedilir
      </div>
    </div>
  );
}

interface AxisSliderProps {
  axis: "X" | "Y" | "Z";
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function AxisSlider({ axis, value, min, max, step, onChange }: AxisSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-400">
          {axis}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-ink-100">
          {fmt(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-clinical-warning cursor-pointer"
        aria-label={`${axis} ekseni`}
        data-testid={`marker-dev-slider-${axis.toLowerCase()}`}
      />
    </div>
  );
}
