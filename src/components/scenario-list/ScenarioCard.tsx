import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import type { Scenario } from "@/engine/types";
import { getClinicalStatus, CLINICAL_STATUS_LABEL } from "@/engine";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";
import { SpecialtyIcon } from "@/assets/specialty-icons";

const CLINICAL_BADGE: Record<string, string> = {
  DRAFT: "text-clinical-warning border-clinical-warning/40 bg-clinical-warning/10",
  REVIEWED_PENDING_ACTIVATION: "text-clinical-info border-clinical-info/40 bg-clinical-info/10",
  ACTIVE: "text-clinical-stable border-clinical-stable/40 bg-clinical-stable/10",
};

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
        "animate-slide-up"
      )}
      style={{
        animationDelay: `${delay}ms`,
        borderLeftColor: theme.accent,
        borderLeftWidth: "2px",
      } as React.CSSProperties}
    >
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${theme.accentBg}, transparent 70%)` }}
      />

      {/* İçerik */}
      <div className="relative flex flex-col h-full p-5 gap-4">
        {/* Üst satır — ikon + ID */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: theme.accentBg,
              color: theme.accent,
            }}
          >
            <SpecialtyIcon specialty={scenario.specialty} className="w-7 h-7" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {/* Klinik onay durumu — DRAFT/REVIEWED/ACTIVE */}
            {(() => {
              const st = getClinicalStatus(scenario);
              return (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded font-mono text-[8px] uppercase tracking-[0.1em] border whitespace-nowrap",
                    CLINICAL_BADGE[st]
                  )}
                >
                  {CLINICAL_STATUS_LABEL[st]}
                </span>
              );
            })()}
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500 text-right leading-tight">
              {scenario.id.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Başlık */}
        <div className="flex-1 min-h-0">
          <h3
            className="font-display text-lg leading-snug text-ink-50 line-clamp-2 group-hover:text-ink-50 transition-colors mb-1"
            style={{ color: undefined }}
          >
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
          {/* Zorluk */}
          <div style={{ color: theme.accent }}>
            <DifficultyPips level={scenario.difficulty} />
          </div>

          {/* Süre + adım + puan */}
          <div className="flex items-center gap-3 font-mono text-[10px] text-ink-500 tabular-nums">
            <span>~{scenario.estimated_minutes}dk</span>
            <span className="text-ink-700">·</span>
            <span>{scenario.steps.length} adım</span>
            <span className="text-ink-700">·</span>
            <span>{scenario.scoring.max_points}p</span>
          </div>
        </div>

        {/* İki katman aksiyon — ucuz 2D quiz / pahalı 3D sanal hasta */}
        <div className="relative flex items-center gap-2 pt-3">
          <Link
            to={`/oyna/${scenario.id}`}
            className="flex-1 text-center px-3 py-2 rounded-md font-mono text-[11px] uppercase tracking-[0.08em] text-ink-300 border border-ink-600 hover:bg-ink-700 hover:text-ink-100 transition"
          >
            2D Oyna
          </Link>
          <Link
            to={`/hasta/${scenario.id}`}
            className="flex-1 text-center px-3 py-2 rounded-md font-mono text-[11px] uppercase tracking-[0.08em] text-brand-light border border-brand/40 hover:bg-brand/10 transition"
            style={{ background: theme.accentBg }}
          >
            3D Hasta
          </Link>
        </div>
      </div>
    </div>
  );
}
