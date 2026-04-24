import { cn } from "@/lib/cn";
import type { Specialty } from "@/engine/types";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";

interface Props {
  specialties: Specialty[];
  active: Specialty | null;
  totalCount: number;
  counts: Partial<Record<Specialty, number>>;
  onChange: (sp: Specialty | null) => void;
}

export function FilterBar({ specialties, active, totalCount, counts, onChange }: Props) {
  return (
    <div
      className="sticky top-0 z-20 -mx-6 px-6 py-3 mb-8 flex items-center gap-2 flex-wrap"
      style={{
        background: "linear-gradient(to bottom, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.90) 100%)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Tümü chip */}
      <button
        onClick={() => onChange(null)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
          "font-mono text-[11px] uppercase tracking-[0.1em]",
          "border transition-all duration-150",
          active === null
            ? "bg-brand/15 border-brand/40 text-brand-light"
            : "bg-transparent border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200"
        )}
      >
        Tümü
        <span className="opacity-60">{totalCount}</span>
      </button>

      {/* Specialty chip'ler */}
      {specialties.map((sp) => {
        const theme = getSpecialtyTheme(sp);
        const isActive = active === sp;
        return (
          <button
            key={sp}
            onClick={() => onChange(isActive ? null : sp)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] uppercase tracking-[0.1em] border transition-all duration-150"
            style={
              isActive
                ? {
                    background: theme.accentBg,
                    borderColor: `${theme.accent}60`,
                    color: theme.accent,
                  }
                : {
                    background: "transparent",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.45)",
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = `${theme.accent}44`;
                (e.currentTarget as HTMLElement).style.color = theme.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
              }
            }}
          >
            {theme.label}
            <span className="opacity-60">{counts[sp] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
