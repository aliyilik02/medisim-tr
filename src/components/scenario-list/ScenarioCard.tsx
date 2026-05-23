import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import type { Scenario } from "@/engine/types";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";
import { SpecialtyIcon } from "@/assets/specialty-icons";

// Zorluk üçgenleri — dolu/boş
function DifficultyPips({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Zorluk: ${level}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 8 8"
          className={cn("w-2.5 h-2.5", n <= level ? "text-inherit opacity-90" : "text-ink-600")}
          fill={n <= level ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1"
        >
          <polygon points="4,1 7,7 1,7" />
        </svg>
      ))}
    </span>
  );
}

interface Props {
  scenario: Scenario;
  delay?: number;
}

export function ScenarioCard({ scenario, delay = 0 }: Props) {
  const theme = getSpecialtyTheme(scenario.specialty);

  return (
    <div
      className={cn(
        "group relative flex flex-col",
        "bg-ink-900 border border-ink-700 rounded-lg overflow-hidden",
        "hover:-translate-y-0.5 hover:border-opacity-80",
        "transition-all duration-200 ease-out",
        "animate-slide-up",
      )}
      style={{
        animationDelay: `${delay}ms`,
        borderLeftColor: theme.accent,
        borderLeftWidth: "2px",
      }}
    >
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${theme.accentBg}, transparent 70%)` }}
      />

      {/* Ana tıklanabilir alan — /oyna/:id (klasik 2D) */}
      <Link
        to={`/oyna/${scenario.id}`}
        className="relative flex flex-col flex-1 p-5 gap-4 focus:outline-none focus:ring-2 focus:ring-inset"
        style={{
          ["--tw-ring-color" as string]: theme.accentGlow,
        } as React.CSSProperties}
        aria-label={`${scenario.title} senaryosunu klasik modda aç`}
      >
        {/* Üst satır — ikon + ID */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
            style={{ background: theme.accentBg, color: theme.accent }}
          >
            <SpecialtyIcon specialty={scenario.specialty} className="w-7 h-7" />
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500 text-right leading-tight mt-0.5">
            {scenario.id.toUpperCase()}
          </div>
        </div>

        {/* Başlık */}
        <div className="flex-1 min-h-0">
          <h3 className="font-display text-lg leading-snug text-ink-50 line-clamp-2 group-hover:text-ink-50 transition-colors mb-1">
            {scenario.title}
          </h3>
          {scenario.description && (
            <p className="text-xs text-ink-400 leading-relaxed line-clamp-2">
              {scenario.description}
            </p>
          )}
        </div>

        {/* Alt meta */}
        <div
          className="flex items-center justify-between pt-3 mt-auto"
          style={{ borderTopColor: `${theme.accent}22`, borderTopWidth: 1, borderTopStyle: "solid" }}
        >
          <div style={{ color: theme.accent }}>
            <DifficultyPips level={scenario.difficulty} />
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-ink-500 tabular-nums">
            <span>~{scenario.estimated_minutes}dk</span>
            <span className="text-ink-700">·</span>
            <span>{scenario.steps.length} adım</span>
            <span className="text-ink-700">·</span>
            <span>{scenario.scoring.max_points}p</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
