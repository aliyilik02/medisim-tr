// ============================================================
// AbcdeBar — birincil bakı çubuğu (A-B-C-D-E) + geçen süre
// ============================================================
// Harf seçilince bedende yalnız o basamağın noktaları görünür (kalabalık yok).
// Sıradaki eksik basamak hafifçe vurgulanır → öğrenci ABCDE sırasına yönlenir
// ama zorlanmaz (istediği harfe geçebilir). Süre sayacı zaman baskısını
// görünür kılar; hastanın kötüleşmesi zaten arka planda akıyor.
// ============================================================

import { Timer, Check } from "lucide-react";
import {
  ABCDE_LABEL,
  type AbcdeCategory,
  type ExamCoverageRow,
} from "@/engine";
import { cn } from "@/lib/cn";

export type ExamFilter = AbcdeCategory | "all";

interface Chip {
  id: string;
  label: string;
  done: boolean;
}

interface Props {
  coverage: ExamCoverageRow[];
  active: ExamFilter;
  onChange: (f: ExamFilter) => void;
  /** Sıradaki önerilen basamak (ABCDE sırasında ilk eksik). */
  suggested: AbcdeCategory | null;
  /** Senaryo başından beri geçen süre (sn). */
  elapsedSec: number;
  /** Verilirse aktif basamağın noktaları düğme olarak listelenir
      (bedende nokta gösterilemeyen 2B görünümde yedek yol). */
  chips?: Chip[];
  onChipSelect?: (id: string) => void;
  className?: string;
}

function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AbcdeBar({
  coverage,
  active,
  onChange,
  suggested,
  elapsedSec,
  chips,
  onChipSelect,
  className,
}: Props) {
  return (
    <div
      data-testid="abcde-bar"
      className={cn(
        "flex flex-col items-center gap-1.5 pointer-events-none",
        className,
      )}
    >
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 pointer-events-auto max-w-[520px]">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`exam-chip-${c.id}`}
              onClick={() => onChipSelect?.(c.id)}
              className={cn(
                "px-2 py-1 rounded border font-mono text-[10px] transition flex items-center gap-1",
                c.done
                  ? "bg-brand/20 border-brand/50 text-brand-light"
                  : "bg-ink-900/85 border-ink-600 text-ink-200 hover:border-brand/50",
              )}
            >
              {c.done && <Check className="w-3 h-3" />}
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-stretch gap-1 p-1 rounded-xl bg-ink-900/85 border border-ink-700/70 backdrop-blur-md shadow-xl pointer-events-auto">
        {coverage.map((row) => {
          const isActive = active === row.category;
          const complete = row.total > 0 && row.done >= row.total;
          const isSuggested = suggested === row.category && !isActive;
          return (
            <button
              key={row.category}
              type="button"
              data-testid={`abcde-${row.category}`}
              aria-pressed={isActive}
              onClick={() => onChange(row.category)}
              title={ABCDE_LABEL[row.category]}
              className={cn(
                "relative w-[68px] px-1 py-1.5 rounded-lg border transition flex flex-col items-center gap-0.5",
                isActive
                  ? "bg-brand/25 border-brand-light/70 text-ink-50"
                  : "border-transparent text-ink-100 hover:bg-ink-800",
                isSuggested && "border-brand/50",
              )}
            >
              <span className="font-display text-xl leading-none">{row.category}</span>
              <span className="text-[9px] leading-tight text-center text-ink-200">{ABCDE_LABEL[row.category]}</span>
              <span
                className={cn(
                  "font-mono text-[9px] tabular-nums flex items-center gap-0.5",
                  complete ? "text-brand-light" : "text-ink-300",
                )}
              >
                {complete && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                {row.done}/{row.total}
              </span>
              {isSuggested && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-light animate-pulse" />
              )}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="abcde-all"
          aria-pressed={active === "all"}
          onClick={() => onChange("all")}
          className={cn(
            "px-2 rounded-lg border text-[10px] font-mono uppercase tracking-[0.08em] transition",
            active === "all"
              ? "bg-brand/25 border-brand-light/70 text-ink-50"
              : "border-transparent text-ink-400 hover:bg-ink-800 hover:text-ink-100",
          )}
        >
          Tümü
        </button>
        <div
          className="flex flex-col items-center justify-center px-2.5 border-l border-ink-700/70 text-ink-200"
          data-testid="exam-elapsed"
          title="Senaryo başından beri geçen süre"
        >
          <Timer className="w-3.5 h-3.5 text-ink-400" />
          <span className="font-mono text-xs tabular-nums">{formatElapsed(elapsedSec)}</span>
        </div>
      </div>
    </div>
  );
}
