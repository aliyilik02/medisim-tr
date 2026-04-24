import { useState } from "react";
import type { Scenario, SessionState } from "@/engine";
import { Award, BookOpen, AlertTriangle, RotateCcw, Home, FileText, TableProperties } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { AIDebriefPanel } from "@/components/AIDebriefPanel";

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

const GRADE_GLOW: Record<string, string> = {
  A: "drop-shadow-[0_0_24px_rgba(16,185,129,0.4)]",
  B: "drop-shadow-[0_0_24px_rgba(174,213,129,0.35)]",
  C: "drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]",
  D: "drop-shadow-[0_0_24px_rgba(251,146,60,0.3)]",
  F: "drop-shadow-[0_0_24px_rgba(239,68,68,0.35)]",
};

// ── Step Timeline ─────────────────────────────────────────────

function StepTimeline({ scenario, session }: { scenario: Scenario; session: SessionState }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (session.results.length === 0) return null;

  return (
    <div className="panel-inset p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-3">
        Vaka Akışı — Adım Bazlı Performans
      </div>
      <div className="flex gap-1.5 items-end flex-wrap">
        {session.results.map((r, idx) => {
          const step = scenario.steps.find((s) => s.id === r.step_id);
          const isCritical = r.critical_errors > 0;
          const isGood = !isCritical && r.points_earned > 0;
          const barColor = isCritical
            ? "bg-clinical-critical"
            : isGood
            ? "bg-clinical-stable"
            : "bg-clinical-warning";

          return (
            <div
              key={r.step_id}
              className="relative group cursor-help"
              onMouseEnter={() => setHovered(r.step_id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-[9px] text-ink-500">{r.points_earned >= 0 ? "+" : ""}{r.points_earned}</span>
                <div
                  className={cn(
                    "w-7 rounded-t transition-all duration-200",
                    barColor,
                    hovered === r.step_id ? "opacity-100 scale-105" : "opacity-70"
                  )}
                  style={{ height: `${Math.max(16, Math.min(48, Math.abs(r.points_earned) + 16))}px` }}
                />
                <span className="font-mono text-[9px] text-ink-600">{idx + 1}</span>
              </div>

              {hovered === r.step_id && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ink-700 border border-ink-600 rounded-lg p-3 text-xs whitespace-nowrap z-20 shadow-xl min-w-40">
                  <div className="font-medium text-ink-100 mb-1">{step?.title ?? r.step_id}</div>
                  <div className="space-y-0.5 text-ink-400">
                    <div>Puan: <span className={r.points_earned > 0 ? "text-clinical-stable" : "text-clinical-critical"}>{r.points_earned >= 0 ? "+" : ""}{r.points_earned}</span></div>
                    {r.critical_errors > 0 && (
                      <div className="text-clinical-critical">⚠ {r.critical_errors} kritik hata</div>
                    )}
                    <div>Süre: {r.time_spent_sec}s</div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-ink-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-3 pt-3 border-t border-ink-700/50">
        {[
          { color: "bg-clinical-stable", label: "Başarılı" },
          { color: "bg-clinical-warning", label: "Eksik" },
          { color: "bg-clinical-critical", label: "Kritik Hata" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-sm", color, "opacity-70")} />
            <span className="font-mono text-[10px] text-ink-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

// ── İndirme yardımcısı ──────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function DebriefScreen({ scenario, session, onRestart }: Props) {
  const percent = Math.round(
    (session.total_score / scenario.scoring.max_points) * 100
  );
  const grade = session.grade ?? "F";
  const totalTime = Math.floor((Date.now() - session.started_at) / 1000);
  const totalErrors = session.results.reduce((a, r) => a + r.critical_errors, 0);
  const passed = session.total_score >= scenario.scoring.passing_score;

  // ── Export handlers (lazy-loaded) ────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setExportError(null);
    try {
      const { exportToPdf, pdfFilename } = await import("@/utils/export/exportPdf");
      const blob = await exportToPdf(session, scenario);
      triggerDownload(blob, pdfFilename(session, scenario));
    } catch {
      setExportError("PDF oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadExcel() {
    setExcelLoading(true);
    setExportError(null);
    try {
      const { exportToExcel, excelFilename } = await import("@/utils/export/exportExcel");
      const blob = exportToExcel(session, scenario);
      triggerDownload(blob, excelFilename(session, scenario));
    } catch {
      setExportError("Excel oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setExcelLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
      <div className="space-y-4">

        {/* ── Hero card ── */}
        <div className="panel p-8 md:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-2">
                / Debrief
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-ink-50 mb-1">
                Senaryo Tamamlandı
              </h1>
              <div className="text-ink-400 text-sm truncate">{scenario.title}</div>

              <div className="flex items-center gap-2 mt-3">
                <span className={cn(
                  "font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border",
                  passed
                    ? "text-clinical-stable border-clinical-stable/40 bg-clinical-stable/10"
                    : "text-clinical-critical border-clinical-critical/40 bg-clinical-critical/10"
                )}>
                  {passed ? "Geçti" : "Kaldı"}
                </span>
                <span className="font-mono text-xs text-ink-500">
                  Zorluk S{session.selected_difficulty} · {scenario.specialty}
                </span>
              </div>
            </div>

            {/* Grade badge */}
            <div className="text-right shrink-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
                Not
              </div>
              <div className={cn(
                "font-display leading-none select-none",
                "text-7xl md:text-8xl",
                GRADE_COLORS[grade],
                GRADE_GLOW[grade]
              )}>
                {grade}
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-7 panel-inset p-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
                Toplam Puan
              </span>
              <span className="font-mono text-xs text-ink-400">
                {session.total_score} / {scenario.scoring.max_points}
              </span>
            </div>
            <div className="relative h-2.5 bg-ink-900 rounded-full overflow-hidden">
              {/* Passing threshold marker */}
              <div
                className="absolute top-0 bottom-0 w-px bg-ink-500 z-10"
                style={{
                  left: `${Math.round((scenario.scoring.passing_score / scenario.scoring.max_points) * 100)}%`,
                }}
              />
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
                  passed
                    ? "bg-gradient-to-r from-brand-dark to-brand-light"
                    : "bg-gradient-to-r from-clinical-critical/70 to-clinical-warning/70"
                )}
                style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display text-3xl text-ink-50">%{percent}</span>
              <span className="font-mono text-xs text-ink-500">
                Geçme sınırı: %{Math.round((scenario.scoring.passing_score / scenario.scoring.max_points) * 100)}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <StatBox label="Adım" value={session.completed_step_ids.length.toString()} />
            <StatBox
              label="Süre"
              value={`${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, "0")}`}
            />
            <StatBox
              label="Kritik Hata"
              value={totalErrors.toString()}
              danger={totalErrors > 0}
            />
          </div>
        </div>

        {/* ── Step timeline ── */}
        <StepTimeline scenario={scenario} session={session} />

        {/* ── AI Debrief ── */}
        <AIDebriefPanel scenario={scenario} session={session} />

        {/* ── Key learnings ── */}
        <div className="panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-brand-light" />
            <h2 className="font-display text-xl text-ink-50">Temel Öğrenim Noktaları</h2>
          </div>
          <ul className="space-y-2">
            {scenario.debrief.key_learnings.map((k, i) => (
              <li key={i} className="flex gap-3 p-3 panel-inset text-sm text-ink-100 leading-relaxed">
                <span className="font-mono text-brand-light shrink-0">{i + 1}.</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Red flags ── */}
        {scenario.debrief.red_flags && scenario.debrief.red_flags.length > 0 && (
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-clinical-warning" />
              <h2 className="font-display text-xl text-ink-50">Dikkat Edilmesi Gerekenler</h2>
            </div>
            <ul className="space-y-2">
              {scenario.debrief.red_flags.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-3 p-3 bg-clinical-warning/5 border border-clinical-warning/20 rounded-md text-sm text-ink-100"
                >
                  <span className="text-clinical-warning shrink-0">▲</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── References ── */}
        <div className="panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-ink-400" />
            <h2 className="font-display text-xl text-ink-50">Kaynaklar</h2>
          </div>
          <ul className="space-y-1.5">
            {scenario.debrief.references.map((r, i) => (
              <li key={i} className="text-sm font-mono text-ink-300 flex gap-2">
                <span className="text-ink-600">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Export hata bildirimi ── */}
        {exportError && (
          <div className="panel p-3 border border-clinical-critical/30 bg-clinical-critical/5">
            <p className="text-sm text-clinical-critical">{exportError}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-3">
          <button onClick={onRestart} className="btn-primary">
            <RotateCcw className="w-4 h-4" />
            Tekrar Oyna
          </button>
          <Link to="/senaryolar" className="btn-ghost">
            Senaryolara Dön
          </Link>

          {/* Export butonları */}
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className={cn(
              "btn-ghost flex items-center gap-2",
              pdfLoading && "opacity-60 cursor-not-allowed"
            )}
          >
            <FileText className="w-4 h-4 text-brand-light" />
            {pdfLoading ? "Hazırlanıyor…" : "PDF İndir"}
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={excelLoading}
            className={cn(
              "btn-ghost flex items-center gap-2",
              excelLoading && "opacity-60 cursor-not-allowed"
            )}
          >
            <TableProperties className="w-4 h-4 text-brand-light" />
            {excelLoading ? "Hazırlanıyor…" : "Excel İndir"}
          </button>

          <Link to="/" className="btn-ghost ml-auto">
            <Home className="w-4 h-4" />
            Ana Sayfa
          </Link>
        </div>

      </div>
    </div>
  );
}

// ── StatBox ───────────────────────────────────────────────────

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
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">{label}</div>
      <div className={cn("font-display text-2xl mt-1", danger ? "text-clinical-critical" : "text-ink-50")}>
        {value}
      </div>
    </div>
  );
}
