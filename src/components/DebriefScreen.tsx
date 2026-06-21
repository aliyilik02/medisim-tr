import { useState, useEffect, useRef } from "react";
import type { Scenario, SessionState, ReasoningPrompt } from "@/engine";
import {
  BookOpen,
  AlertTriangle,
  RotateCcw,
  Home,
  FileText,
  TableProperties,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Save,
  Share2,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { AIDebriefPanel } from "@/components/AIDebriefPanel";
import { saveSession } from "@/storage/sessionHistory";
import { sessionToFhirBundle } from "@/clinical/fhir";
import { submitAttempt } from "@/api/attempts";
import { useAuthStore } from "@/stores/authStore";

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
  "—": "text-ink-500",
};

const MODE_LABELS: Record<string, string> = {
  egitim: "Eğitim",
  klinik: "Klinik",
  sinav: "Sınav",
};

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Protokol numarası — senaryo + zaman damgası tabanlı
function protocolId(session: SessionState): string {
  const d = new Date(session.started_at);
  const yy = d.getFullYear().toString().slice(2);
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  const hhmm = d.getHours().toString().padStart(2, "0") + d.getMinutes().toString().padStart(2, "0");
  return `MST-${yy}${mm}${dd}-${hhmm}`;
}

// ── Adım tablosu ──────────────────────────────────────────────

function StepTable({ scenario, session }: { scenario: Scenario; session: SessionState }) {
  if (session.results.length === 0) return null;

  return (
    <div className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-ink-700/50">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
          Adım Bazlı Değerlendirme
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-700/50">
              <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 w-10">#</th>
              <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500">Adım</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 w-20">Puan</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 w-16">Süre</th>
              <th className="px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 w-20">Durum</th>
            </tr>
          </thead>
          <tbody>
            {session.results.map((r, idx) => {
              const step = scenario.steps.find((s) => s.id === r.step_id);
              const isCritical = r.critical_errors > 0;
              const isGood = !isCritical && r.points_earned > 0;

              return (
                <tr
                  key={r.step_id}
                  className="border-b border-ink-800 hover:bg-ink-800/40 transition"
                >
                  <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-ink-500">
                    {(idx + 1).toString().padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink-100 leading-snug">
                      {step?.title ?? r.step_id}
                    </div>
                    {isCritical && (
                      <div className="font-mono text-[10px] text-clinical-critical mt-0.5">
                        {r.critical_errors} kritik hata
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        isGood
                          ? "text-clinical-stable"
                          : isCritical
                          ? "text-clinical-critical"
                          : "text-clinical-warning"
                      )}
                    >
                      {r.points_earned >= 0 ? "+" : ""}
                      {r.points_earned}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[11px] tabular-nums text-ink-500">
                    {r.time_spent_sec}s
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isCritical ? (
                      <XCircle className="w-4 h-4 text-clinical-critical mx-auto" />
                    ) : isGood ? (
                      <CheckCircle2 className="w-4 h-4 text-clinical-stable mx-auto" />
                    ) : (
                      <MinusCircle className="w-4 h-4 text-clinical-warning mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Puan çubuğu ───────────────────────────────────────────────

function ScoreBar({
  score,
  max,
  passing,
  passed,
}: {
  score: number;
  max: number;
  passing: number;
  passed: boolean;
}) {
  const percent = Math.round((score / max) * 100);
  const passingPct = Math.round((passing / max) * 100);

  return (
    <div className="space-y-2">
      <div className="relative h-2 bg-ink-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-px bg-ink-500 z-10"
          style={{ left: `${passingPct}%` }}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
            passed ? "bg-brand" : "bg-clinical-critical/70"
          )}
          style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xl tabular-nums text-ink-50">
          {score}
          <span className="text-ink-500 text-sm"> / {max}</span>
        </span>
        <span className="font-mono text-xs text-ink-500">
          geçme sınırı {passingPct}%
        </span>
      </div>
    </div>
  );
}

// ── Klinik Muhakeme bölümü (SADECE egitim modu, CEZASIZ öğretici) ──
// Egitim modunda cevaplanan "neden?" prompt'ları için öğretici geri bildirim.
// Yanlış seçimde suçlayıcı değil: "aksiyonun doğruydu, gerekçe şöyle olmalı".
export function ReasoningDebrief({ scenario, session }: { scenario: Scenario; session: SessionState }) {
  if (session.mode !== "egitim") return null;
  const answers = session.reasoning_answers ?? [];
  const prompts = scenario.reasoning_prompts ?? [];
  if (answers.length === 0 || prompts.length === 0) return null;

  const rows = answers
    .map((a) => ({ a, p: prompts.find((x) => x.id === a.prompt_id) }))
    .filter((r): r is { a: (typeof answers)[number]; p: ReasoningPrompt } => r.p != null);
  if (rows.length === 0) return null;

  return (
    <div className="panel p-6 border border-brand/30 bg-brand/[0.03]" data-testid="reasoning-debrief">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-brand-light" />
        <h2 className="font-display text-lg">Klinik Muhakeme</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
          öğretici · puana etkisi yok
        </span>
      </div>
      <div className="space-y-4">
        {rows.map(({ a, p }) => {
          const chosen = p.options[a.selected_index];
          const correctOpt = p.options.find((o) => o.correct);
          return (
            <div key={p.id} className="panel-inset p-4" data-testid="reasoning-debrief-row">
              <div className="text-sm font-medium text-ink-100 mb-2">{p.question}</div>
              <div
                className={cn(
                  "flex items-start gap-2 text-[13px] mb-2",
                  a.correct ? "text-clinical-stable" : "text-clinical-warning",
                )}
              >
                {a.correct ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>
                  <span className="text-ink-400">Senin gerekçen: </span>
                  {chosen?.text ?? "—"}
                </span>
              </div>
              {!a.correct && correctOpt && (
                <div className="text-[13px] text-ink-200 mb-2">
                  <span className="text-clinical-stable font-medium">Aksiyonun doğruydu</span>, ama
                  gerekçe şöyle olmalı:{" "}
                  <span className="text-ink-50">{correctOpt.text}</span>
                </div>
              )}
              <p className="text-[12px] text-ink-400 leading-relaxed">{p.explanation}</p>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-600">
                Kaynak: {p.source}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export function DebriefScreen({ scenario, session, onRestart }: Props) {
  // floored_score: finalizeSession tarafından hesaplanır; eski sessionlar için fallback
  const score = session.floored_score ?? Math.max(0, session.total_score);
  const rawScore = session.total_score;
  const floorApplied = rawScore < 0 && score >= 0;
  const max = scenario.scoring.max_points;
  const percent = max > 0 ? Math.round((score / max) * 100) : 0;
  const isPartial = session.completion_status === "partial";
  const isAbandoned = session.completion_status === "abandoned";
  const isIncomplete = isPartial || isAbandoned;
  const grade = isIncomplete ? "—" : (session.grade ?? "F");
  const passed = !isIncomplete && score >= scenario.scoring.passing_score;
  const totalTime = Math.floor((Date.now() - session.started_at) / 1000);
  const totalErrors = session.results.reduce((a, r) => a + r.critical_errors, 0);
  const protocol = protocolId(session);

  const startedDate = new Date(session.started_at);
  const dateStr = startedDate.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = startedDate.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const [pdfLoading, setPdfLoading]   = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [exportError, setExportError]  = useState<string | null>(null);
  const [saveStatus, setSaveStatus]    = useState<"idle" | "saved" | "error">("idle");
  const savedRef = useRef(false);
  const authStatus = useAuthStore((s) => s.status);

  // Tek seferlik otomatik kayıt (yerel geçmiş + giriş yapıldıysa backend attempt)
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    try {
      const result = saveSession(session, scenario);
      setSaveStatus(result ? "saved" : "idle");
    } catch {
      setSaveStatus("error");
    }

    // Backend persistence — best-effort: oturum varsa attempt kaydet.
    // Hata UI'ı bozmaz (yerel kayıt zaten yapıldı); sessizce yutulur.
    // E2E bypass'ta gerçek backend yok → istek atma (#8 — sahte oturum).
    const e2eBypass = import.meta.env.VITE_E2E === "1";
    if (!e2eBypass && authStatus === "authenticated" && session.finished) {
      submitAttempt({
        scenario_id: scenario.id,
        score,
        max_score: max,
        started_at: Math.floor(session.started_at / 1000),
        finished_at: Math.floor(Date.now() / 1000),
        summary_json: {
          grade: session.grade ?? null,
          mode: session.mode,
          difficulty: session.selected_difficulty,
          percent,
          critical_errors: totalErrors,
          completion_status: session.completion_status ?? "completed",
          duration_seconds: totalTime,
        },
      }).catch(() => {
        /* backend ulaşılamaz / config yok → yerel kayıt yeterli */
      });
    }

    // Toast 3 sn sonra kaybolur
    const t = setTimeout(() => setSaveStatus("idle"), 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setExportError(null);
    try {
      const { exportToPdf, pdfFilename } = await import("@/utils/export/exportPdf");
      const blob = await exportToPdf(session, scenario);
      triggerDownload(blob, pdfFilename(session, scenario));
    } catch (err) {
      console.error("[MediSim] PDF export error:", err);
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
      const blob = await exportToExcel(session, scenario);
      triggerDownload(blob, excelFilename(session, scenario));
    } catch (err) {
      console.error("[MediSim] Excel export error:", err);
      setExportError("Excel oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setExcelLoading(false);
    }
  }

  // FHIR R4 Bundle dışa aktarımı — birlikte çalışabilirlik (medplum tipleri).
  // Senkron + saf (async import gerekmez); JSON blob indirir.
  function handleDownloadFhir() {
    setExportError(null);
    try {
      const bundle = sessionToFhirBundle(scenario, session, {
        referenceYear: new Date().getFullYear(),
      });
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/fhir+json",
      });
      triggerDownload(blob, `medisim-fhir-${scenario.id}-${protocolId(session)}.json`);
    } catch (err) {
      console.error("[MediSim] FHIR export error:", err);
      setExportError("FHIR Bundle oluşturulamadı. Lütfen tekrar deneyin.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="space-y-4">

        {/* ── Tamamlanmama uyarısı ── */}
        {isPartial && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-clinical-warning/40 bg-clinical-warning/8 text-sm text-clinical-warning animate-fade-in">
            <span className="font-mono text-[10px] uppercase tracking-widest shrink-0">Yarım Tamamlandı</span>
            <span>Senaryo erken sonlandırıldı. Skor yalnızca tamamlanan adımları yansıtır. Harf notu hesaplanmadı.</span>
          </div>
        )}
        {isAbandoned && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-clinical-critical/40 bg-clinical-critical/8 text-sm text-clinical-critical animate-fade-in">
            <span className="font-mono text-[10px] uppercase tracking-widest shrink-0">Süre Doldu</span>
            <span>Kritik kontrendikasyon düzeltilmedi veya süre aşıldı. Harf notu hesaplanmadı.</span>
          </div>
        )}

        {/* ── Protokol başlığı ── */}
        <div className="panel overflow-hidden">
          {/* Üst bant — geçti/kaldı + protokol */}
          <div
            className={cn(
              "px-5 py-2 border-b flex items-center justify-between",
              passed
                ? "bg-clinical-stable/10 border-clinical-stable/20"
                : "bg-clinical-critical/10 border-clinical-critical/20"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  passed ? "bg-clinical-stable" : "bg-clinical-critical"
                )}
              />
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.2em]",
                  passed ? "text-clinical-stable" : "text-clinical-critical"
                )}
              >
                {passed ? "Başarılı" : "Başarısız"}
              </span>
            </div>
            <span className="font-mono text-[10px] text-ink-500 tracking-wider">
              {protocol}
            </span>
          </div>

          <div className="p-6">
            {/* Başlık satırı */}
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
                  / Klinik Performans Raporu
                </div>
                <h1 className="font-display text-2xl md:text-3xl text-ink-50 mb-1">
                  {scenario.title}
                </h1>
                <div className="font-mono text-xs text-ink-400">
                  {scenario.patient.age} yaş ·{" "}
                  {scenario.patient.sex === "M" ? "Erkek" : "Kadın"} · "{scenario.patient.chief_complaint}"
                </div>
                {session.variant_id && (() => {
                  const vLabel = scenario.variants?.find(v => v.id === session.variant_id)?.label;
                  return vLabel ? (
                    <div className="font-mono text-xs text-brand-light mt-0.5">
                      Varyant: {vLabel}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Not — büyük, sağ üst */}
              <div className="text-right shrink-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 mb-1">
                  Sonuç
                </div>
                <div
                  className={cn(
                    "font-display text-7xl leading-none tabular-nums select-none",
                    GRADE_COLORS[grade]
                  )}
                >
                  {grade}
                </div>
                <div className="font-mono text-[10px] text-ink-500 mt-1.5 tabular-nums">
                  %{percent}
                </div>
                {/* A–F bant göstergesi */}
                <GradeBandBar grade={grade} />
              </div>
            </div>

            {/* Meta bilgi satırı */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetaBox label="Tarih / Saat" value={`${dateStr} ${timeStr}`} mono />
              <MetaBox
                label="Mod · Zorluk"
                value={`${MODE_LABELS[session.mode] ?? session.mode} · S${session.selected_difficulty}`}
              />
              <MetaBox
                label="Süre"
                value={`${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, "0")}`}
                mono
              />
              <MetaBox
                label="Kritik Hata"
                value={totalErrors.toString()}
                danger={totalErrors > 0}
                mono
              />
            </div>

            {/* Skor çubuğu */}
            <ScoreBar
              score={score}
              max={max}
              passing={scenario.scoring.passing_score}
              passed={passed}
            />
            {floorApplied && (
              <div className="font-mono text-[10px] text-ink-500 mt-1">
                ham skor: {rawScore} (floor 0 uygulandı)
              </div>
            )}
          </div>
        </div>

        {/* ── Adım tablosu ── */}
        <StepTable scenario={scenario} session={session} />

        {/* ── Klinik Muhakeme (egitim modu, öğretici/cezasız) ── */}
        <ReasoningDebrief scenario={scenario} session={session} />

        {/* ── AI Debrief ── */}
        <AIDebriefPanel scenario={scenario} session={session} />

        {/* ── Temel öğrenim noktaları ── */}
        <div className="panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-brand-light" />
            <h2 className="font-display text-xl text-ink-50">Temel Öğrenim Noktaları</h2>
          </div>
          <ul className="space-y-2">
            {scenario.debrief.key_learnings.map((k, i) => (
              <li
                key={i}
                className="flex gap-3 p-3 panel-inset text-sm text-ink-100 leading-relaxed"
              >
                <span className="font-mono text-brand shrink-0 tabular-nums">{(i + 1).toString().padStart(2, "0")}.</span>
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
                  <span className="text-clinical-warning shrink-0 font-mono">▲</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Kaynaklar ── */}
        <div className="panel p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 mb-3">
            Klinik Referanslar
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

        {/* ── Kayıt toast ── */}
        {saveStatus === "saved" && (
          <div className="flex items-center gap-2 text-xs font-mono text-clinical-stable animate-fade-in">
            <Save className="w-3 h-3" />
            <span>Oturum kaydedildi · <Link to="/gecmis" className="underline hover:text-brand-light">Geçmişe git</Link></span>
          </div>
        )}

        {/* ── Export hata bildirimi ── */}
        {exportError && (
          <div className="panel p-3 border border-clinical-critical/30 bg-clinical-critical/5">
            <p className="text-sm text-clinical-critical">{exportError}</p>
          </div>
        )}

        {/* ── Aksiyonlar ── */}
        <div className="flex flex-wrap gap-3">
          <button onClick={onRestart} className="btn-primary">
            <RotateCcw className="w-4 h-4" />
            Tekrar Oyna
          </button>
          <Link to="/senaryolar" className="btn-ghost">
            Senaryolara Dön
          </Link>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className={cn("btn-ghost flex items-center gap-2", pdfLoading && "opacity-60 cursor-not-allowed")}
          >
            <FileText className="w-4 h-4 text-brand-light" />
            {pdfLoading ? "Hazırlanıyor…" : "PDF İndir"}
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={excelLoading}
            className={cn("btn-ghost flex items-center gap-2", excelLoading && "opacity-60 cursor-not-allowed")}
          >
            <TableProperties className="w-4 h-4 text-brand-light" />
            {excelLoading ? "Hazırlanıyor…" : "Excel İndir"}
          </button>
          <button
            onClick={handleDownloadFhir}
            data-testid="download-fhir"
            className="btn-ghost flex items-center gap-2"
            title="FHIR R4 Bundle (birlikte çalışabilirlik)"
          >
            <Share2 className="w-4 h-4 text-brand-light" />
            FHIR İndir
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

// ── GradeBandBar ──────────────────────────────────────────────

const GRADE_BAND_DATA = [
  { letter: "A", color: "#22c55e" },
  { letter: "B", color: "#0d9488" },
  { letter: "C", color: "#eab308" },
  { letter: "D", color: "#f97316" },
  { letter: "F", color: "#ef4444" },
];

function GradeBandBar({ grade }: { grade: string }) {
  return (
    <div className="flex items-center gap-0.5 mt-2 justify-end">
      {GRADE_BAND_DATA.map(({ letter, color }) => (
        <div
          key={letter}
          className="flex flex-col items-center gap-0.5"
        >
          <div
            className="w-4 h-1.5 rounded-sm transition-opacity"
            style={{
              background: color,
              opacity: grade === letter ? 1 : 0.15,
            }}
          />
          <span
            className="font-mono text-[8px]"
            style={{ color: grade === letter ? color : "rgba(255,255,255,0.2)" }}
          >
            {letter}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── MetaBox ───────────────────────────────────────────────────

function MetaBox({
  label,
  value,
  danger,
  mono,
}: {
  label: string;
  value: string;
  danger?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="panel-inset p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-sm tabular-nums leading-snug",
          mono ? "font-mono" : "font-sans",
          danger ? "text-clinical-critical" : "text-ink-100"
        )}
      >
        {value}
      </div>
    </div>
  );
}
