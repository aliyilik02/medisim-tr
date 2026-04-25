import { useState } from "react";
import { X, TrendingUp, ChevronDown, ChevronUp, Printer, Clock } from "lucide-react";
import type { LabPanel, LabValue, LabFlag } from "@/engine";
import { cn } from "@/lib/cn";

interface Props {
  panel: LabPanel;
  history?: LabPanel[];
  scenarioTimeMin?: number;
  onClose: () => void;
}

const FLAG_CONFIG: Record<LabFlag, { label: string; classes: string; bgClasses: string }> = {
  LL: { label: "KRİTİK ↓↓", classes: "text-red-400 font-bold", bgClasses: "bg-red-950/60 border-red-800/50" },
  HH: { label: "KRİTİK ↑↑", classes: "text-red-400 font-bold", bgClasses: "bg-red-950/60 border-red-800/50" },
  L:  { label: "Düşük ↓",   classes: "text-amber-400",          bgClasses: "bg-amber-950/30 border-amber-800/30" },
  H:  { label: "Yüksek ↑",  classes: "text-amber-400",          bgClasses: "bg-amber-950/30 border-amber-800/30" },
  C:  { label: "Anormal",   classes: "text-orange-400",         bgClasses: "bg-orange-950/30 border-orange-800/30" },
};

function FlagBadge({ flag }: { flag?: LabFlag }) {
  if (!flag) return null;
  const cfg = FLAG_CONFIG[flag];
  return (
    <span className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded border", cfg.classes, cfg.bgClasses)}>
      {cfg.label}
    </span>
  );
}

function ResultRow({ val }: { val: LabValue }) {
  const [expanded, setExpanded] = useState(false);
  const flagCfg = val.flag ? FLAG_CONFIG[val.flag] : null;
  const isCritical = val.flag === "LL" || val.flag === "HH";

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors",
          isCritical
            ? "border-red-900/40 bg-red-950/20"
            : val.flag
            ? "border-amber-900/20 bg-amber-950/10"
            : "border-ink-800/50",
          val.interpretation ? "cursor-pointer hover:bg-ink-800/30" : ""
        )}
        onClick={() => val.interpretation && setExpanded((p) => !p)}
      >
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            {val.interpretation && (
              <span className="text-ink-500">
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            )}
            <span className={cn("font-mono text-xs", isCritical ? "text-red-300 font-semibold" : "text-ink-100")}>
              {val.parameter}
            </span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-right">
          <span className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            flagCfg ? flagCfg.classes : "text-green-400"
          )}>
            {typeof val.value === "number" ? val.value.toLocaleString("tr-TR") : val.value}
          </span>
        </td>
        <td className="py-2.5 px-3 text-center">
          <span className="font-mono text-[11px] text-ink-400">{val.unit || "—"}</span>
        </td>
        <td className="py-2.5 px-3 text-center">
          <span className="font-mono text-[11px] text-ink-500">{val.reference_range ?? "—"}</span>
        </td>
        <td className="py-2.5 px-3 text-right">
          <FlagBadge flag={val.flag} />
        </td>
      </tr>
      {expanded && val.interpretation && (
        <tr className="border-b border-ink-800/30 bg-ink-900/40">
          <td colSpan={5} className="px-3 py-2">
            <p className="text-xs text-ink-300 italic leading-relaxed pl-5">
              ↳ {val.interpretation}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function TrendView({ history, currentId }: { history: LabPanel[]; currentId: string }) {
  if (history.length < 2) {
    return <p className="text-xs text-ink-500 py-4 text-center">Trend için birden fazla ölçüm gerekli.</p>;
  }

  // Tüm parameter isimlerini topla
  const params = Array.from(
    new Set(history.flatMap((p) => p.results.map((r) => r.parameter)))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-ink-700">
            <th className="text-left font-mono text-[10px] uppercase tracking-wider text-ink-400 py-2 px-3">Parametre</th>
            {history.map((snap, i) => (
              <th key={i} className={cn(
                "font-mono text-[10px] py-2 px-3 text-center",
                snap.id === currentId ? "text-brand-light" : "text-ink-400"
              )}>
                {snap.collected_at_min !== undefined ? `+${snap.collected_at_min}dk` : `Ölçüm ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {params.map((param) => (
            <tr key={param} className="border-b border-ink-800/40">
              <td className="font-mono text-ink-300 py-2 px-3">{param}</td>
              {history.map((snap, i) => {
                const val = snap.results.find((r) => r.parameter === param);
                return (
                  <td key={i} className="text-center py-2 px-3">
                    {val ? (
                      <span className={cn(
                        "font-mono tabular-nums",
                        val.flag === "LL" || val.flag === "HH" ? "text-red-400 font-bold" :
                        val.flag ? "text-amber-400" : "text-green-400"
                      )}>
                        {val.value}
                      </span>
                    ) : (
                      <span className="text-ink-600">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LabResultsModal({ panel, history = [], scenarioTimeMin, onClose }: Props) {
  const [showTrend, setShowTrend] = useState(false);

  const criticalCount = panel.results.filter((r) => r.flag === "LL" || r.flag === "HH").length;
  const abnormalCount = panel.results.filter((r) => r.flag && r.flag !== "LL" && r.flag !== "HH").length;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-ink-950 border border-ink-700 rounded-xl shadow-2xl overflow-hidden">

        {/* Kritik uyarı bandı */}
        {criticalCount > 0 && (
          <div className="bg-red-900/80 border-b border-red-700 px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="font-mono text-xs text-red-200 uppercase tracking-wider">
              {criticalCount} KRİTİK DEĞER — Acil Klinisyen Değerlendirmesi Gerekli
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-ink-700/60">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-0.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                Laboratuvar Sonucu
              </div>
              {criticalCount > 0 && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-red-900/60 border border-red-700 text-red-300">
                  {criticalCount} KRİTİK
                </span>
              )}
              {abnormalCount > 0 && criticalCount === 0 && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-amber-300">
                  {abnormalCount} ANORMAL
                </span>
              )}
            </div>
            <h2 className="font-display text-xl text-ink-50">{panel.name_tr}</h2>
            <div className="flex items-center gap-3 mt-1">
              {panel.collected_at_min !== undefined && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-ink-400">
                  <Clock className="w-3 h-3" />
                  Alınma: +{panel.collected_at_min} dk
                </span>
              )}
              {scenarioTimeMin !== undefined && (
                <span className="font-mono text-[11px] text-ink-500">
                  Senaryo saati: {scenarioTimeMin} dk
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Yazdır"
              className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded transition"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-ink-800/60 bg-ink-900/40">
          <button
            onClick={() => setShowTrend(false)}
            className={cn(
              "px-5 py-2.5 text-xs font-medium font-mono uppercase tracking-wider transition border-b-2 -mb-px",
              !showTrend
                ? "border-brand text-brand-light"
                : "border-transparent text-ink-400 hover:text-ink-200"
            )}
          >
            Sonuçlar
          </button>
          {history.length > 0 && (
            <button
              onClick={() => setShowTrend(true)}
              className={cn(
                "px-5 py-2.5 text-xs font-medium font-mono uppercase tracking-wider transition border-b-2 -mb-px flex items-center gap-1.5",
                showTrend
                  ? "border-brand text-brand-light"
                  : "border-transparent text-ink-400 hover:text-ink-200"
              )}
            >
              <TrendingUp className="w-3 h-3" />
              Trend ({history.length} ölçüm)
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!showTrend ? (
            <>
              <table className="w-full">
                <thead className="sticky top-0 bg-ink-900/95 backdrop-blur-sm">
                  <tr className="border-b border-ink-700/60">
                    <th className="text-left font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 py-2 px-3">Parametre</th>
                    <th className="text-right font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 py-2 px-3">Sonuç</th>
                    <th className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 py-2 px-3">Birim</th>
                    <th className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 py-2 px-3">Ref. Aralık</th>
                    <th className="text-right font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 py-2 px-3">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.results.map((val, i) => (
                    <ResultRow key={i} val={val} />
                  ))}
                </tbody>
              </table>

              {panel.comment && (
                <div className="m-3 p-3 bg-ink-900/60 border border-ink-700/40 rounded-lg">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-ink-500 mb-1">Lab Notu</div>
                  <p className="text-xs text-ink-300">{panel.comment}</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-3">
              <TrendView history={history} currentId={panel.id} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-ink-800/40 bg-ink-900/40 flex items-center justify-between">
          <div className="font-mono text-[10px] text-ink-500">
            {panel.results.length} parametre · {panel.id}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 rounded text-xs font-medium text-ink-100 transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
