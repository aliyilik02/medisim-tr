// ============================================================
// VitalSparkline — Sprint B.5+ vital trend mini grafik
// ============================================================
// Son N sample'lık (HR/RR/SpO2/SBP) lineer trend SVG path.
// CompactVitalsHUD'da her vital cell altında 60×16 px sparkline.
// ============================================================

interface Props {
  /** Son N (en yenisi sonda) sayısal değer. min 2 yoksa render yok. */
  values: number[];
  /** Y ekseni clamp aralığı — clinical normal band dışını çizmek için. */
  range?: { min: number; max: number };
  width?: number;
  height?: number;
  strokeColor?: string;
  className?: string;
  "data-testid"?: string;
}

export function VitalSparkline({
  values,
  range,
  width = 60,
  height = 16,
  strokeColor = "currentColor",
  className,
  "data-testid": testId,
}: Props) {
  if (values.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        data-testid={testId}
        aria-hidden
      />
    );
  }

  let lo: number;
  let hi: number;
  if (range) {
    lo = range.min;
    hi = range.max;
  } else {
    lo = Math.min(...values);
    hi = Math.max(...values);
  }
  if (hi - lo < 1e-6) {
    hi = lo + 1;
  }

  const pad = 1; // 1px üst-alt clearance
  const innerH = height - pad * 2;

  // x: 0 → width, eşit aralık. y: hi=top, lo=bottom.
  const dx = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const clamped = Math.max(lo, Math.min(hi, v));
    const yRatio = (clamped - lo) / (hi - lo);
    const y = pad + innerH * (1 - yRatio);
    const x = i * dx;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      data-testid={testId}
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
