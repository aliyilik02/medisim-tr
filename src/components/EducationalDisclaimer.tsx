// ============================================================
// Eğitim amaçlı disclaimer (CLAUDE.md klinik disiplin — her sayfada zorunlu)
// ============================================================
// "Bu platform eğitim amaçlıdır, klinik karar destek sistemi değildir."
// İki varyant: inline (footer içi) + fixed (immersive sayfalarda köşe rozeti).
// ============================================================

import { cn } from "@/lib/cn";

const TEXT =
  "Bu platform eğitim amaçlıdır, klinik karar destek sistemi değildir.";

interface Props {
  /** fixed: immersive sayfalarda sağ-alt sabit küçük rozet. */
  variant?: "inline" | "fixed";
  className?: string;
}

export function EducationalDisclaimer({ variant = "inline", className }: Props) {
  if (variant === "fixed") {
    return (
      <div
        className={cn(
          "fixed bottom-2 right-2 z-30 pointer-events-none",
          "font-mono text-[9px] uppercase tracking-wider text-ink-500/70",
          "bg-ink-950/60 backdrop-blur-sm rounded px-2 py-1 border border-ink-700/30",
          className,
        )}
      >
        ⚕ Eğitim amaçlıdır · klinik karar değildir
      </div>
    );
  }

  return (
    <p
      className={cn(
        "font-mono text-[11px] uppercase tracking-wider text-ink-400",
        className,
      )}
    >
      {TEXT}
    </p>
  );
}
