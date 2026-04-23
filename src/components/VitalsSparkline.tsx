const STATUS_STROKE: Record<string, string> = {
  stable: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
};

interface VitalsSparklineProps {
  data: number[];
  status: "stable" | "warning" | "critical";
  width?: number;
  height?: number;
}

export function VitalsSparkline({
  data,
  status,
  width = 80,
  height = 20,
}: VitalsSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pathD = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      // Invert: high value = top of chart (low y)
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible shrink-0"
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke={STATUS_STROKE[status]}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
      />
    </svg>
  );
}
