// ============================================================
// ActionHistoryPanel — Sprint B.5+ engine entegrasyon
// ============================================================
// /dialog-3d-demo'da 3D prosedür tetiklendiğinde engine'in
// evaluateAction sonucu (puan + feedback + critical) burada
// listelenir. Son 10 action kronolojik (en yeni üstte).
//
// Renk kodları:
//   +puan (matched outcome)  → clinical-stable (yeşil)
//   -puan (yanlış)           → clinical-warning (sarı/turuncu)
//   critical                 → clinical-critical (kırmızı emphasis)
//   0 puan (non-action step) → ink-400 (notr)
// ============================================================

import { Activity, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import type { ActionRef } from "@/engine/types";

export interface ActionLogEntry {
  action: ActionRef;
  points: number;
  feedback: string;
  critical: boolean;
  matched: boolean;
  ts: number;
}

interface Props {
  entries: ActionLogEntry[];
  className?: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function entryStyle(entry: ActionLogEntry) {
  if (entry.critical) {
    return {
      border: "border-clinical-critical/50",
      bg: "bg-clinical-critical/10",
      icon: <AlertTriangle className="w-3 h-3 text-clinical-critical" />,
      label: "KRİTİK",
      labelColor: "text-clinical-critical",
    };
  }
  if (entry.matched && entry.points > 0) {
    return {
      border: "border-clinical-stable/40",
      bg: "bg-clinical-stable/8",
      icon: <CheckCircle2 className="w-3 h-3 text-clinical-stable" />,
      label: `+${entry.points}`,
      labelColor: "text-clinical-stable",
    };
  }
  if (entry.points < 0) {
    return {
      border: "border-clinical-warning/40",
      bg: "bg-clinical-warning/8",
      icon: <MinusCircle className="w-3 h-3 text-clinical-warning" />,
      label: `${entry.points}`,
      labelColor: "text-clinical-warning",
    };
  }
  return {
    border: "border-ink-700/50",
    bg: "bg-ink-900/60",
    icon: <Activity className="w-3 h-3 text-ink-400" />,
    label: "—",
    labelColor: "text-ink-400",
  };
}

export function ActionHistoryPanel({ entries, className }: Props) {
  if (entries.length === 0) {
    return (
      <div
        className={`bg-ink-900/85 backdrop-blur-md border border-ink-700/50 rounded-lg p-3 ${className ?? ""}`}
        data-testid="action-history-panel"
      >
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500 flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          Eylem Geçmişi
        </div>
        <div className="font-mono text-[10px] text-ink-500 mt-2 italic">
          Henüz eylem yok. Bir bölgeye tıklayıp stetoskop ile dinleyebilirsin.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-ink-900/85 backdrop-blur-md border border-ink-700/50 rounded-lg p-2.5 ${className ?? ""}`}
      data-testid="action-history-panel"
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand flex items-center gap-1.5 mb-2">
        <Activity className="w-3 h-3" />
        Eylem Geçmişi ({entries.length})
      </div>
      <ul className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
        {entries.map((entry, idx) => {
          const style = entryStyle(entry);
          return (
            <li
              key={`${entry.ts}-${idx}`}
              className={`px-2 py-1.5 rounded border ${style.border} ${style.bg} font-mono text-[10px] leading-snug`}
              data-testid="action-history-entry"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {style.icon}
                <span className={`font-semibold ${style.labelColor}`}>{style.label}</span>
                <span className="text-ink-500 ml-auto tabular-nums">
                  {formatTime(entry.ts)}
                </span>
              </div>
              <div className="text-ink-200">
                <span className="text-brand-light">{entry.action.type}</span>
                {" → "}
                <span className="text-ink-100">{entry.action.target_id}</span>
                {entry.action.site && (
                  <span className="text-ink-400"> @ {entry.action.site}</span>
                )}
              </div>
              {entry.feedback && (
                <div className="text-ink-400 mt-0.5 text-[9.5px] leading-snug normal-case tracking-normal">
                  {entry.feedback}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
