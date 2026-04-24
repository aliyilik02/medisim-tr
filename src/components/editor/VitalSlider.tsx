import { cn } from "@/lib/cn";

interface VitalSliderProps {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  normalMin?: number;
  normalMax?: number;
  criticalMin?: number;
  criticalMax?: number;
}

type VStatus = "stable" | "warning" | "critical";

function getStatus(
  v: number,
  nMin?: number,
  nMax?: number,
  cMin?: number,
  cMax?: number
): VStatus {
  if ((cMin !== undefined && v < cMin) || (cMax !== undefined && v > cMax)) return "critical";
  if ((nMin !== undefined && v < nMin) || (nMax !== undefined && v > nMax)) return "warning";
  return "stable";
}

const STATUS_TEXT: Record<VStatus, string> = {
  stable: "text-clinical-stable",
  warning: "text-clinical-warning",
  critical: "text-clinical-critical",
};

const ACCENT_COLOR: Record<VStatus, string> = {
  stable: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
};

export function VitalSlider({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 0,
  normalMin,
  normalMax,
  criticalMin,
  criticalMax,
}: VitalSliderProps) {
  const status = getStatus(value, normalMin, normalMax, criticalMin, criticalMax);

  return (
    <div className="panel-inset p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
          {label}
        </span>
        <span className="font-mono text-[9px] text-ink-500">{unit}</span>
      </div>
      <div className="mb-2">
        <span className={cn("vital-display text-2xl font-semibold tabular-nums", STATUS_TEXT[status])}>
          {value.toFixed(decimals)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-ink-700 cursor-pointer"
        style={{ accentColor: ACCENT_COLOR[status] }}
      />
      <div className="flex justify-between mt-1">
        <span className="font-mono text-[9px] text-ink-600">{min}</span>
        <span className="font-mono text-[9px] text-ink-600">{max}</span>
      </div>
    </div>
  );
}
