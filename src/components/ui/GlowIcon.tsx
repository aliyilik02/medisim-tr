// ============================================================
// GlowIcon — kategori rengiyle parlayan ikon rozeti (neon UI seti)
// ============================================================
// StatusDot deseni: Record varyant haritaları + cn(). Renk .neon-<ton>
// class'ının set ettiği --neon/--glow değişkenlerinden akar (index.css).
// Glow tekniği: statik drop-shadow — yalnız seyrek render olan listelerde
// kullanılır (envanter/karar satırları). 8Hz tick'e yakın düğümlere
// (monitör kutuları) KOYMA — R4 perf dersi + IEC alarm çakışması.

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type GlowTone =
  | "teal"
  | "cyan"
  | "pink"
  | "violet"
  | "blue"
  | "critical"
  | "warning"
  | "stable";

const TONE_CLASS: Record<GlowTone, string> = {
  teal: "neon-teal",
  cyan: "neon-cyan",
  pink: "neon-pink",
  violet: "neon-violet",
  blue: "neon-blue",
  critical: "neon-critical",
  warning: "neon-warning",
  stable: "neon-stable",
};

const SIZES = {
  sm: { box: "w-6 h-6 rounded", icon: "w-3.5 h-3.5" },
  md: { box: "w-8 h-8 rounded-md", icon: "w-4 h-4" },
  lg: { box: "w-10 h-10 rounded-lg", icon: "w-5 h-5" },
} as const;

interface GlowIconProps {
  icon: LucideIcon;
  tone?: GlowTone;
  size?: keyof typeof SIZES;
  /** true → zeminli rozet (envanter satırı); false → çıplak parlayan ikon */
  badge?: boolean;
  /** true → ilk render'da yumuşak pop (liste stagger'ı ile) */
  pop?: boolean;
  className?: string;
}

export function GlowIcon({
  icon: Icon,
  tone = "teal",
  size = "md",
  badge = true,
  pop = false,
  className,
}: GlowIconProps) {
  const s = SIZES[size];
  if (!badge) {
    return (
      <Icon
        aria-hidden
        className={cn(s.icon, TONE_CLASS[tone], pop && "animate-icon-pop", className)}
        style={{
          color: "var(--neon)",
          filter: "drop-shadow(0 0 4px var(--glow))",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center shrink-0 border",
        s.box,
        TONE_CLASS[tone],
        pop && "animate-icon-pop",
        className,
      )}
      style={{
        color: "var(--neon)",
        borderColor: "color-mix(in srgb, var(--neon) 35%, transparent)",
        background: "color-mix(in srgb, var(--neon) 10%, transparent)",
        boxShadow: "0 0 10px -3px var(--glow), inset 0 0 8px -6px var(--glow)",
      }}
    >
      <Icon className={s.icon} style={{ filter: "drop-shadow(0 0 3px var(--glow))" }} />
    </span>
  );
}
