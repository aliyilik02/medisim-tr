import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Trash2, FileText, TableProperties,
  ChevronDown, ChevronUp, Search, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  listSessions, deleteSession, clearAllSessions, getStats,
  type SavedSession,
} from "@/storage/sessionHistory";
import { specialtyLabel } from "@/utils/export/helpers";

// ── Yardımcı ─────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: "text-clinical-stable", B: "text-brand-light",
  C: "text-clinical-warning", D: "text-orange-400", F: "text-clinical-critical",
};

const GRADE_BG: Record<string, string> = {
  A: "bg-clinical-stable/10 border-clinical-stable/30",
  B: "bg-brand/10 border-brand/30",
  C: "bg-clinical-warning/10 border-clinical-warning/30",
  D: "bg-orange-400/10 border-orange-400/30",
  F: "bg-clinical-critical/10 border-clinical-critical/30",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── İstatistik kartı ─────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 mb-1">{label}</div>
      <div className="font-display text-2xl text-ink-50">{value}</div>
      {sub && <div className="font-mono text-[10px] text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Oturum satırı ─────────────────────────────────────────────────

function SessionRow({
  saved,
  onDelete,
}: {
  saved: SavedSession;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [pdfLoading, setPdfLoad]  = useState(false);
  const [xlLoading, setXlLoad]    = useState(false);

  const pct = Math.round((saved.total_score / saved.max_points) * 100);

  async function downloadPdf() {
    setPdfLoad(true);
    try {
      const { generatePdfReport } = await import("@/utils/export/exportPdf");
      const blob = await generatePdfReport(saved);
      const d    = new Date(saved.played_at);
      const fmt  = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}-${d.getHours().toString().padStart(2,"0")}${d.getMinutes().toString().padStart(2,"0")}`;
      triggerDownload(blob, `medisim-${saved.scenario_id}-${fmt}.pdf`);
    } catch { /* ignore */ } finally { setPdfLoad(false); }
  }

  async function downloadExcel() {
    setXlLoad(true);
    try {
      const { exportToExcel } = await import("@/utils/export/exportExcel");
      // Slim snapshot'ları cast ediyoruz — Excel sadece results, scoring, steps kullanır
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = exportToExcel(saved.session_snapshot as any, saved.scenario_snapshot as any);
      const d    = new Date(saved.played_at);
      const fmt  = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
      triggerDownload(blob, `medisim-${saved.scenario_id}-${fmt}.xlsx`);
    } catch { /* ignore */ } finally { setXlLoad(false); }
  }

  return (
    <div className="border border-ink-700/50 rounded-md overflow-hidden">
      {/* Ana satır */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-ink-800/40 transition"
      >
        {/* Harf notu */}
        <div className={cn(
          "w-9 h-9 rounded border flex items-center justify-center font-display text-xl shrink-0",
          GRADE_BG[saved.grade], GRADE_COLORS[saved.grade]
        )}>
          {saved.grade}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-ink-100 font-medium leading-snug truncate">{saved.scenario_title}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="tag tag-brand text-[10px]">{specialtyLabel(saved.scenario_specialty)}</span>
            <span className="tag text-[10px]">S{saved.difficulty}</span>
            <span className="font-mono text-[10px] text-ink-500">{formatDate(saved.played_at)}</span>
          </div>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          <div className="font-mono text-sm tabular-nums text-ink-100">
            {saved.total_score}<span className="text-ink-500">/{saved.max_points}</span>
          </div>
          <div className="font-mono text-[10px] text-ink-500">%{pct} · {formatDur(saved.duration_seconds)}</div>
        </div>

        {saved.critical_errors > 0 && (
          <div className="font-mono text-[10px] text-clinical-critical shrink-0">
            {saved.critical_errors} kritik hata
          </div>
        )}

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-ink-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-500 shrink-0" />
        )}
      </button>

      {/* Detay paneli */}
      {expanded && (
        <div className="px-4 py-4 border-t border-ink-700/50 bg-ink-900/40 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className={cn("btn-ghost text-sm", pdfLoading && "opacity-60 cursor-not-allowed")}
            >
              <FileText className="w-4 h-4 text-brand-light" />
              {pdfLoading ? "Hazırlanıyor…" : "PDF İndir"}
            </button>
            <button
              onClick={downloadExcel}
              disabled={xlLoading}
              className={cn("btn-ghost text-sm", xlLoading && "opacity-60 cursor-not-allowed")}
            >
              <TableProperties className="w-4 h-4 text-brand-light" />
              {xlLoading ? "Hazırlanıyor…" : "Excel İndir"}
            </button>
            <button
              onClick={() => onDelete(saved.id)}
              className="btn-ghost text-sm text-clinical-critical/80 hover:text-clinical-critical border-clinical-critical/20 hover:border-clinical-critical/40"
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </button>
          </div>

          {/* Kısa adım özeti */}
          {saved.session_snapshot.results.length > 0 && (
            <div className="space-y-1">
              {saved.session_snapshot.results.map((r, i) => {
                const step = saved.scenario_snapshot.steps.find(s => s.id === r.step_id);
                return (
                  <div key={r.step_id} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-ink-600 w-5 text-right">{i + 1}.</span>
                    <span className="flex-1 text-ink-400 truncate">{step?.title ?? r.step_id}</span>
                    <span className={cn(
                      "tabular-nums",
                      r.points_earned > 0 ? "text-clinical-stable"
                      : r.critical_errors > 0 ? "text-clinical-critical"
                      : "text-clinical-warning"
                    )}>
                      {r.points_earned >= 0 ? "+" : ""}{r.points_earned}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────

export function SessionHistoryPage() {
  const [allSessions, setAllSessions] = useState<SavedSession[]>(() => listSessions());
  const stats = useMemo(() => getStats(), [allSessions]);

  // Filtreler
  const [specialty, setSpecialty] = useState("tumu");
  const [mode,      setMode]      = useState("tumu");
  const [dateRange, setDateRange] = useState("tumu");
  const [search,    setSearch]    = useState("");
  const [showClear, setShowClear] = useState(false);

  const filtered = useMemo(() => {
    let list = allSessions;

    if (specialty !== "tumu") list = list.filter(s => s.scenario_specialty === specialty);
    if (mode !== "tumu")      list = list.filter(s => s.mode === mode);
    if (dateRange !== "tumu") {
      const days = dateRange === "7g" ? 7 : dateRange === "30g" ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter(s => new Date(s.played_at).getTime() > cutoff);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.scenario_title.toLowerCase().includes(q));
    }

    return list;
  }, [allSessions, specialty, mode, dateRange, search]);

  function handleDelete(id: string) {
    deleteSession(id);
    setAllSessions(listSessions());
  }

  function handleClearAll() {
    clearAllSessions();
    setAllSessions([]);
    setShowClear(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1">
            / Geçmiş Oturumlar
          </div>
          <h1 className="font-display text-3xl text-ink-50">Oturum Geçmişi</h1>
        </div>
        {allSessions.length > 0 && (
          <div className="flex items-center gap-2">
            {showClear ? (
              <>
                <button onClick={handleClearAll} className="btn-ghost text-sm text-clinical-critical border-clinical-critical/30">
                  Evet, sil
                </button>
                <button onClick={() => setShowClear(false)} className="btn-ghost text-sm">
                  İptal
                </button>
              </>
            ) : (
              <button onClick={() => setShowClear(true)} className="btn-ghost text-sm text-ink-500">
                <Trash2 className="w-3.5 h-3.5" />
                Tümünü Sil
              </button>
            )}
          </div>
        )}
      </div>

      {/* İstatistik kartları */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Toplam Oturum"   value={stats.total_sessions.toString()} />
          <StatCard label="Ortalama Yüzde"  value={`%${stats.avg_score_pct}`} />
          <StatCard label="Son 7 Gün"       value={stats.sessions_last_7d.toString()} sub="oturum" />
          <StatCard label="En Çok Oynanan"  value={specialtyLabel(stats.favorite_specialty)} sub={`En iyi: ${stats.best_grade}`} />
        </div>
      )}

      {/* Filtreler */}
      {allSessions.length > 0 && (
        <div className="panel p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Senaryo ara…"
              className="w-full pl-8 pr-3 py-1.5 bg-ink-900 border border-ink-700 rounded text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-brand/50"
            />
          </div>

          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            className="py-1.5 px-2 bg-ink-900 border border-ink-700 rounded text-sm text-ink-200 focus:outline-none"
          >
            <option value="tumu">Tüm Uzmanlıklar</option>
            {["kardiyoloji","dahiliye","acil","pediatri","cerrahi","anestezi","kadin_dogum","hemsirelik","askeri_tccc"].map(s => (
              <option key={s} value={s}>{specialtyLabel(s)}</option>
            ))}
          </select>

          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            className="py-1.5 px-2 bg-ink-900 border border-ink-700 rounded text-sm text-ink-200 focus:outline-none"
          >
            <option value="tumu">Tüm Modlar</option>
            <option value="egitim">Eğitim</option>
            <option value="klinik">Klinik</option>
            <option value="sinav">Sınav</option>
          </select>

          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="py-1.5 px-2 bg-ink-900 border border-ink-700 rounded text-sm text-ink-200 focus:outline-none"
          >
            <option value="tumu">Tüm Zamanlar</option>
            <option value="7g">Son 7 Gün</option>
            <option value="30g">Son 30 Gün</option>
            <option value="90g">Son 90 Gün</option>
          </select>

          {filtered.length !== allSessions.length && (
            <span className="font-mono text-[10px] text-ink-500">
              {filtered.length} / {allSessions.length} oturum
            </span>
          )}
        </div>
      )}

      {/* Liste */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(s => (
            <SessionRow key={s.id} saved={s} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="panel p-10 text-center">
          <BarChart2 className="w-10 h-10 text-ink-700 mx-auto mb-4" />
          {allSessions.length === 0 ? (
            <>
              <p className="text-ink-300 mb-4">Henüz tamamlanmış oturum yok.</p>
              <Link to="/senaryolar" className="btn-primary">
                İlk Senaryoyu Oyna
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <p className="text-ink-300">Seçili filtreyle eşleşen oturum yok.</p>
          )}
        </div>
      )}
    </div>
  );
}
