import type { Scenario, Specialty } from "@/engine/types";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";
import { SpecialtyIcon } from "@/assets/specialty-icons";
import { ScenarioCard } from "./ScenarioCard";

interface Props {
  specialty: Specialty;
  scenarios: Scenario[];
  startIndex?: number;
}

export function SpecialtySection({ specialty, scenarios, startIndex = 0 }: Props) {
  if (scenarios.length === 0) return null;
  const theme = getSpecialtyTheme(specialty);

  return (
    <section className="mb-12">
      {/* Specialty başlık */}
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* İkon + isim */}
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: theme.accentBg, color: theme.accent }}
          >
            <SpecialtyIcon specialty={specialty} className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2
                className="font-display text-xl text-ink-50 leading-none"
                style={{ color: "inherit" }}
              >
                {theme.label}
              </h2>
              {/* Vurgu çizgisi */}
              <div
                className="h-px w-16 mt-0.5"
                style={{ background: theme.accent }}
              />
            </div>
            <p className="text-xs text-ink-500 mt-1 font-mono">
              {theme.description}
            </p>
          </div>
        </div>

        {/* Senaryo sayısı */}
        <span
          className="font-mono text-[11px] tabular-nums px-2 py-0.5 rounded border"
          style={{
            color: theme.accent,
            borderColor: `${theme.accent}44`,
            background: theme.accentBg,
          }}
        >
          {scenarios.length} senaryo
        </span>
      </div>

      {/* Kart grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((s, i) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            delay={(startIndex + i) * 50}
          />
        ))}
      </div>
    </section>
  );
}
