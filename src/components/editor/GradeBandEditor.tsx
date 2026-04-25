import { cn } from "@/lib/cn";

interface GradeBands {
  A: number;
  B: number;
  C: number;
  D: number;
}

interface Props {
  max: number;
  bands: GradeBands;
  passingScore: number;
  onChange: (bands: GradeBands) => void;
}

export function GradeBandEditor({ max, bands, passingScore, onChange }: Props) {
  const valid =
    max > 0 &&
    bands.D < bands.C &&
    bands.C < bands.B &&
    bands.B < bands.A &&
    bands.A <= max;

  const update = (key: keyof GradeBands, val: number) =>
    onChange({ ...bands, [key]: val });

  const pct = (n: number) => (max > 0 ? (n / max) * 100 : 0);

  const bandWidth = {
    F: pct(bands.D),
    D: pct(Math.max(0, bands.C - bands.D)),
    C: pct(Math.max(0, bands.B - bands.C)),
    B: pct(Math.max(0, bands.A - bands.B)),
    A: Math.max(0, 100 - pct(bands.A)),
  };

  return (
    <div className="space-y-4">
      {/* Visual band bar */}
      {max > 0 && (
        <div className="relative h-7 rounded overflow-hidden flex text-white">
          <div
            className="bg-clinical-critical/80 flex items-center justify-center shrink-0"
            style={{ width: `${bandWidth.F}%` }}
            title={`F: 0 – ${bands.D}`}
          >
            {bandWidth.F > 8 && <span className="font-mono text-[9px]">F</span>}
          </div>
          <div
            className="bg-clinical-warning/80 flex items-center justify-center shrink-0"
            style={{ width: `${bandWidth.D}%` }}
            title={`D: ${bands.D} – ${bands.C}`}
          >
            {bandWidth.D > 6 && <span className="font-mono text-[9px]">D</span>}
          </div>
          <div
            className="bg-yellow-500/80 flex items-center justify-center shrink-0"
            style={{ width: `${bandWidth.C}%` }}
            title={`C: ${bands.C} – ${bands.B}`}
          >
            {bandWidth.C > 6 && <span className="font-mono text-[9px]">C</span>}
          </div>
          <div
            className="bg-clinical-stable/80 flex items-center justify-center shrink-0"
            style={{ width: `${bandWidth.B}%` }}
            title={`B: ${bands.B} – ${bands.A}`}
          >
            {bandWidth.B > 6 && <span className="font-mono text-[9px]">B</span>}
          </div>
          <div
            className="bg-emerald-400/80 flex items-center justify-center flex-1"
            title={`A: ${bands.A} – ${max}`}
          >
            {bandWidth.A > 6 && <span className="font-mono text-[9px]">A</span>}
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-4 gap-2">
        {(["A", "B", "C", "D"] as const).map((grade) => (
          <div key={grade}>
            <label className="field-label">{grade} ≥</label>
            <input
              type="number"
              value={bands[grade]}
              onChange={(e) => update(grade, Number(e.target.value))}
              min={0}
              max={max}
              className={cn("field-input", !valid && "border-clinical-critical/50")}
            />
          </div>
        ))}
      </div>

      {!valid && (
        <p className="font-mono text-[10px] text-clinical-critical">
          Sıralama hatalı: D &lt; C &lt; B &lt; A ≤ max ({max}) olmalı.
        </p>
      )}

      <p className="font-mono text-[10px] text-ink-500">
        Geçme notu {passingScore} puan · F: &lt;{bands.D} puan
      </p>
    </div>
  );
}
