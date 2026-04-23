import type { Difficulty } from "@/engine";
import { cn } from "@/lib/cn";

// ============================================================
// DifficultySelector
// ============================================================
// 5 zorluk seviyesi arasında seçim yaptırır.
// Senaryonun supported_difficulties listesine göre filtrelenir.
// ============================================================

const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; audience: string; color: string }
> = {
  1: {
    label: "Seviye 1",
    audience: "Öğrenci hemşire / 1-2. sınıf tıp",
    color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  },
  2: {
    label: "Seviye 2",
    audience: "Son sınıf tıp / intern",
    color: "from-teal-500/20 to-teal-500/5 border-teal-500/30",
  },
  3: {
    label: "Seviye 3",
    audience: "Pratisyen / ATT",
    color: "from-sky-500/20 to-sky-500/5 border-sky-500/30",
  },
  4: {
    label: "Seviye 4",
    audience: "Kardiyoloji asistanı / Acil uzmanı",
    color: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  },
  5: {
    label: "Seviye 5",
    audience: "Yan dal uzman / Uzman",
    color: "from-rose-500/20 to-rose-500/5 border-rose-500/30",
  },
};

export function DifficultySelector({
  supported,
  selected,
  onSelect,
}: {
  supported: Difficulty[];
  selected: Difficulty;
  onSelect: (d: Difficulty) => void;
}) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-4">
        Zorluk Seviyesi
      </div>
      <div className="grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as Difficulty[]).map((diff) => {
          const meta = DIFFICULTY_META[diff];
          const isSupported = supported.includes(diff);
          const isSelected = selected === diff;

          return (
            <button
              key={diff}
              onClick={() => isSupported && onSelect(diff)}
              disabled={!isSupported}
              className={cn(
                "relative flex flex-col items-center justify-center py-3 rounded border transition-all",
                "bg-gradient-to-b",
                isSupported
                  ? meta.color + " cursor-pointer hover:brightness-125"
                  : "from-ink-800/30 to-ink-800/10 border-ink-700/40 opacity-40 cursor-not-allowed",
                isSelected &&
                  "ring-2 ring-brand ring-offset-2 ring-offset-ink-950 brightness-125"
              )}
              title={isSupported ? meta.audience : "Bu senaryoda desteklenmiyor"}
            >
              <div className="font-display text-2xl text-ink-50 leading-none">
                {diff}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-ink-300 text-center min-h-[1.25rem]">
        {supported.includes(selected)
          ? DIFFICULTY_META[selected].audience
          : "Bir seviye seçin"}
      </div>
    </div>
  );
}
