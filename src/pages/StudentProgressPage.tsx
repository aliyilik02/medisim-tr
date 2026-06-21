// ============================================================
// StudentProgressPage (Tier-2 inc-3+) — öğrenci kendi ilerlemesi
// ============================================================
// Backend'e kayıtlı (cihazdan bağımsız) kendi denemeleri: GET /api/attempts.
// /gecmis (localStorage, cihaza özel) DEĞİL — bu sunucu-otoritatif geçmiş.
// Öğrenci kendi skor/% geçmişini görür; eğitmen görünümü /egitmen'de.
// ============================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Activity, Trophy, ListChecks } from "lucide-react";
import { listMyAttempts, type AttemptRecord } from "@/api/attempts";
import { getScenario } from "@/data/scenarios";
import { EducationalDisclaimer } from "@/components/EducationalDisclaimer";

export interface AttemptView {
  id: string;
  title: string;
  percent: number | null;
  grade: string | null;
  startedAt: number;
}

export interface ProgressStats {
  total: number;
  avgPercent: number | null;
  bestPercent: number | null;
}

/** summary_json string'inden grade çıkar (bozuksa null). */
function parseGrade(summaryJson: string | null): string | null {
  if (!summaryJson) return null;
  try {
    const o = JSON.parse(summaryJson) as { grade?: unknown };
    return typeof o.grade === "string" ? o.grade : null;
  } catch {
    return null;
  }
}

function percentOf(a: AttemptRecord): number | null {
  if (a.score == null || a.max_score == null || a.max_score <= 0) return null;
  return Math.round((a.score / a.max_score) * 100);
}

/** Ham attempt kayıtlarını görünüm + istatistiğe çevir (saf — test edilebilir). */
export function summarizeAttempts(attempts: AttemptRecord[]): {
  views: AttemptView[];
  stats: ProgressStats;
} {
  const views: AttemptView[] = attempts.map((a) => ({
    id: a.id,
    title: getScenario(a.scenario_id)?.title ?? a.scenario_id,
    percent: percentOf(a),
    grade: parseGrade(a.summary_json),
    startedAt: a.started_at,
  }));
  const pcts = views.map((v) => v.percent).filter((p): p is number => p != null);
  const stats: ProgressStats = {
    total: views.length,
    avgPercent: pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null,
    bestPercent: pcts.length ? Math.max(...pcts) : null,
  };
  return { views, stats };
}

function fmtDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-clinical-stable",
  B: "text-brand-light",
  C: "text-clinical-info",
  D: "text-clinical-warning",
  F: "text-clinical-critical",
};

const cardClass = "bg-ink-900 border border-ink-700/60 rounded-lg p-5";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 text-ink-500 font-mono text-[10px] uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <div className="font-display text-2xl text-ink-50">{value}</div>
    </div>
  );
}

export function StudentProgressPage() {
  const [attempts, setAttempts] = useState<AttemptRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listMyAttempts()
      .then((a) => {
        if (alive) setAttempts(a);
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : "İlerleme yüklenemedi");
          setAttempts([]);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const { views, stats } = summarizeAttempts(attempts ?? []);

  return (
    <div className="min-h-screen p-4 md:p-8 grid-overlay">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-brand" strokeWidth={2.2} />
            <div>
              <h1 className="font-display text-xl">İlerlemem</h1>
              <p className="text-[12px] text-ink-500">Sunucuda kayıtlı seans geçmişin</p>
            </div>
          </div>
          <Link
            to="/senaryolar"
            className="font-mono text-[11px] text-ink-400 hover:text-ink-200 inline-flex items-center gap-1"
          >
            <Activity className="w-3.5 h-3.5" /> Senaryolar
          </Link>
        </header>

        {error && (
          <div className="mb-4 text-[12px] text-clinical-warning bg-clinical-warning/10 border border-clinical-warning/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        {attempts == null ? (
          <div className="text-[12px] text-ink-500 font-mono">yükleniyor…</div>
        ) : views.length === 0 ? (
          <div className={cardClass}>
            <div className="text-[13px] text-ink-400">
              Henüz kayıtlı seansın yok. Bir senaryo oynayıp bitirince burada görünür.
            </div>
            <Link
              to="/senaryolar"
              className="inline-block mt-3 font-mono text-[11px] text-brand-light hover:underline"
            >
              Senaryolara git →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatCard icon={<ListChecks className="w-3 h-3" />} label="Toplam Seans" value={String(stats.total)} />
              <StatCard
                icon={<TrendingUp className="w-3 h-3" />}
                label="Ortalama"
                value={stats.avgPercent == null ? "—" : `${stats.avgPercent}%`}
              />
              <StatCard
                icon={<Trophy className="w-3 h-3" />}
                label="En İyi"
                value={stats.bestPercent == null ? "—" : `${stats.bestPercent}%`}
              />
            </div>

            <div className={cardClass}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase tracking-wider text-ink-500 border-b border-ink-700/40">
                      <th className="py-2 pr-4">Senaryo</th>
                      <th className="py-2 pr-4 text-right">Sonuç</th>
                      <th className="py-2 pr-4 text-center">Not</th>
                      <th className="py-2 text-right">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {views.map((v) => (
                      <tr key={v.id} className="border-b border-ink-800/40">
                        <td className="py-2 pr-4 text-ink-100">{v.title}</td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {v.percent == null ? "—" : `${v.percent}%`}
                        </td>
                        <td className="py-2 pr-4 text-center font-mono">
                          {v.grade ? (
                            <span className={GRADE_COLORS[v.grade] ?? "text-ink-300"}>{v.grade}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 text-right font-mono text-ink-400">{fmtDate(v.startedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <EducationalDisclaimer />
        </div>
      </div>
    </div>
  );
}
