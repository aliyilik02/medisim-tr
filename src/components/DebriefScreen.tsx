import type { Scenario, SessionState } from "@/engine";
import { Award, BookOpen, AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

interface Props {
  scenario: Scenario;
  session: SessionState;
  onRestart: () => void;
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-clinical-stable",
  B: "text-brand-light",
  C: "text-clinical-warning",
  D: "text-orange-400",
  F: "text-clinical-critical",
};

export function DebriefScreen({ scenario, session, onRestart }: Props) {
  const percent = Math.round(
    (session.total_score / scenario.scoring.max_points) * 100
  );
  const grade = session.grade ?? "F";
  const totalTime = Math.floor((Date.now() - session.started_at) / 1000);
  const totalErrors = session.results.reduce(
    (a, r) => a + r.critical_errors,
    0
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
      <div className="panel p-8 md:p-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 mb-2">
              / Debrief
            </div>
            <h1 className="font-display text-4xl text-ink-50">
              Senaryo Tamamlandı
            </h1>
            <div className="text-ink-400 mt-2">{scenario.title}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
              Not
            </div>
            <div
              className={cn(
                "font-display text-7xl leading-none",
                GRADE_COLORS[grade]
              )}
            >
              {grade}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="panel-inset p-5 mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
              Toplam Puan
            </div>
            <div className="font-mono text-xs text-ink-400">
              {session.total_score} / {scenario.scoring.max_points}
            </div>
          </div>
          <div className="relative h-3 bg-ink-900 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-dark to-brand-light rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-display text-3xl text-ink-50">
              %{percent}
            </span>
            <div className="font-mono text-xs text-ink-500">
              Geçme: %
              {Math.round(
                (scenario.scoring.passing_score / scenario.scoring.max_points) *
                  100
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          <StatBox label="Adım" value={session.completed_step_ids.length.toString()} />
          <StatBox label="Süre" value={`${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, "0")}`} />
          <StatBox
            label="Kritik Hata"
            value={totalErrors.toString()}
            danger={totalErrors > 0}
          />
        </div>

        {/* Key learnings */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-brand-light" />
            <h2 className="font-display text-xl text-ink-50">
              Temel Öğrenim Noktaları
            </h2>
          </div>
          <ul className="space-y-2">
            {scenario.debrief.key_learnings.map((k, i) => (
              <li
                key={i}
                className="flex gap-3 p-3 panel-inset text-sm text-ink-100 leading-relaxed"
              >
                <span className="font-mono text-brand-light">{i + 1}.</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Red flags */}
        {scenario.debrief.red_flags && scenario.debrief.red_flags.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-clinical-warning" />
              <h2 className="font-display text-xl text-ink-50">
                Dikkat Edilmesi Gerekenler
              </h2>
            </div>
            <ul className="space-y-2">
              {scenario.debrief.red_flags.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-3 p-3 bg-clinical-warning/5 border border-clinical-warning/20 rounded-md text-sm text-ink-100"
                >
                  <span className="text-clinical-warning">▲</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* References */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-ink-400" />
            <h2 className="font-display text-xl text-ink-50">Kaynaklar</h2>
          </div>
          <ul className="space-y-1">
            {scenario.debrief.references.map((r, i) => (
              <li
                key={i}
                className="text-sm font-mono text-ink-300 flex gap-2"
              >
                <span className="text-ink-500">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-6 border-t border-ink-700">
          <button onClick={onRestart} className="btn-primary">
            <RotateCcw className="w-4 h-4" />
            Tekrar Oyna
          </button>
          <Link to="/senaryolar" className="btn-ghost">
            Senaryolara Dön
          </Link>
          <Link to="/" className="btn-ghost ml-auto">
            <Home className="w-4 h-4" />
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="panel-inset p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
        {label}
      </div>
      <div
        className={cn(
          "font-display text-2xl mt-1",
          danger ? "text-clinical-critical" : "text-ink-50"
        )}
      >
        {value}
      </div>
    </div>
  );
}
