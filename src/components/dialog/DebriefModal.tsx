// ============================================================
// DebriefModal — Sprint B.5+ senaryo sonu debrief
// ============================================================
// finalizeSession sonrası grade + skor + kritik hatalar +
// tamamlanan adım sayısı + süre. "Yeniden Başla" + "Çık".
// ============================================================

import { useMemo } from "react";
import { Trophy, AlertTriangle, Clock, CheckCircle2, X, RotateCcw } from "lucide-react";
import type { Scenario, SessionState } from "@/engine/types";

interface Props {
  open: boolean;
  scenario: Scenario;
  session: SessionState;
  onRestart: () => void;
  onClose: () => void;
}

const GRADE_STYLES: Record<
  "A" | "B" | "C" | "D" | "F",
  { color: string; bg: string; border: string; label: string }
> = {
  A: { color: "text-clinical-stable", bg: "bg-clinical-stable/15", border: "border-clinical-stable/50", label: "Mükemmel" },
  B: { color: "text-brand-light", bg: "bg-brand/15", border: "border-brand/50", label: "İyi" },
  C: { color: "text-clinical-warning", bg: "bg-clinical-warning/15", border: "border-clinical-warning/50", label: "Geçer" },
  D: { color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/50", label: "Zayıf" },
  F: { color: "text-clinical-critical", bg: "bg-clinical-critical/15", border: "border-clinical-critical/50", label: "Başarısız" },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
}

export function DebriefModal({ open, scenario, session, onRestart, onClose }: Props) {
  const grade = session.grade ?? "F";
  const style = GRADE_STYLES[grade];
  const displayScore = session.floored_score ?? session.total_score;
  const maxScore = scenario.scoring?.max_points ?? 0;
  const percent = maxScore > 0 ? Math.round((displayScore / maxScore) * 100) : 0;

  const durationSec = useMemo(() => {
    if (!session.started_at) return 0;
    const last = session.results.length > 0
      ? session.results[session.results.length - 1]
      : null;
    if (last?.time_spent_sec) return last.time_spent_sec;
    return Math.floor((Date.now() - session.started_at) / 1000);
  }, [session]);

  const criticalErrors = useMemo(
    () => session.results.filter((r) => r.critical_errors > 0),
    [session.results],
  );

  const totalSteps = scenario.steps.length;
  const completedCount = session.completed_step_ids.length;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-md"
      data-testid="debrief-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
    >
      <div className="bg-ink-900 border border-ink-700 rounded-xl shadow-2xl w-[520px] max-w-[92vw] max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-700 flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 ${style.border} ${style.bg} flex items-center justify-center`}
          >
            <span className={`font-display text-4xl leading-none ${style.color}`}>
              {grade}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand mb-0.5">
              Senaryo Sonu Debrief
            </div>
            <h2 id="debrief-title" className="font-display text-lg leading-tight text-ink-50 truncate">
              {scenario.title}
            </h2>
            <div className={`font-mono text-[10px] uppercase tracking-[0.15em] ${style.color} mt-1`}>
              {style.label} · {percent}%
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 transition"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Skor satırı */}
          <div className="grid grid-cols-3 gap-3">
            <Stat
              icon={<Trophy className="w-3.5 h-3.5 text-brand" />}
              label="Skor"
              value={
                <span>
                  <span className="text-ink-50 tabular-nums">{displayScore}</span>
                  <span className="text-ink-500"> / {maxScore}</span>
                </span>
              }
            />
            <Stat
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-clinical-stable" />}
              label="Adımlar"
              value={
                <span>
                  <span className="text-ink-50 tabular-nums">{completedCount}</span>
                  <span className="text-ink-500"> / {totalSteps}</span>
                </span>
              }
            />
            <Stat
              icon={<Clock className="w-3.5 h-3.5 text-ink-300" />}
              label="Süre"
              value={<span className="text-ink-50 tabular-nums">{formatDuration(durationSec)}</span>}
            />
          </div>

          {/* Kritik hatalar */}
          {criticalErrors.length > 0 && (
            <div className="bg-clinical-critical/10 border border-clinical-critical/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-clinical-critical" />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-clinical-critical">
                  Kritik Hata ({criticalErrors.length})
                </span>
              </div>
              <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-ink-200 normal-case tracking-normal leading-snug">
                {criticalErrors.slice(0, 5).map((r, i) => (
                  <li key={`${r.step_id}-${i}`} className="flex gap-2">
                    <span className="text-ink-500 shrink-0">{r.step_id}:</span>
                    <span>
                      {r.actions_taken
                        .map((a) => `${a.type} → ${a.target_id}`)
                        .join(", ") || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Geri bildirim — ilk 5 adım skoru */}
          {session.results.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500 mb-2">
                Adım Sonuçları
              </div>
              <ul className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                {session.results.map((r, i) => {
                  const isPos = r.points_earned > 0;
                  const isNeg = r.points_earned < 0;
                  return (
                    <li
                      key={`${r.step_id}-${i}`}
                      className={`px-2 py-1.5 rounded border font-mono text-[10px] flex items-center gap-2 ${
                        isPos
                          ? "border-clinical-stable/30 bg-clinical-stable/8"
                          : isNeg
                            ? "border-clinical-warning/30 bg-clinical-warning/8"
                            : "border-ink-700 bg-ink-800/40"
                      }`}
                    >
                      <span className="text-ink-400 truncate flex-1">{r.step_id}</span>
                      <span
                        className={`tabular-nums font-semibold shrink-0 ${
                          isPos
                            ? "text-clinical-stable"
                            : isNeg
                              ? "text-clinical-warning"
                              : "text-ink-300"
                        }`}
                      >
                        {r.points_earned > 0 ? "+" : ""}
                        {r.points_earned}
                      </span>
                      {r.critical_errors > 0 && (
                        <AlertTriangle className="w-3 h-3 text-clinical-critical shrink-0" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-700 flex items-center gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 px-3 py-2 rounded font-mono text-[10px] uppercase tracking-[0.1em] bg-brand/20 hover:bg-brand/30 border border-brand/50 text-brand-light transition flex items-center justify-center gap-2"
            data-testid="debrief-restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Yeniden Başla
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded font-mono text-[10px] uppercase tracking-[0.1em] bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 transition"
            data-testid="debrief-close"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-ink-800/40 border border-ink-700/60 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-500 mb-1">
        {icon}
        {label}
      </div>
      <div className="font-mono text-[12px] leading-tight">{value}</div>
    </div>
  );
}
