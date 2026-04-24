import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";

// ============================================================
// CriticalContraindicationModal
// ============================================================
// Kritik kontrendikasyon tetiklendiğinde ekranı kaplayan uyarı.
// - Kırmızı flash + pulsing
// - Düzeltme süresi geri sayımı (hidden=true olsa bile devam eder)
// - Önerilen antidot listesi
// - ESC veya "Anladım" ile kapatılır; timer arka planda çalışmaya devam eder
// ============================================================

export interface CriticalContraindicationInfo {
  title: string;
  effect: string;
  message: string;
  feedback: string;
  graceSec: number;
  expectedAntidotes?: string[];
}

export function CriticalContraindicationModal({
  info,
  hidden = false,
  onResolved: _onResolved,
  onExpired,
  onDismiss,
  showGuidance,
}: {
  info: CriticalContraindicationInfo | null;
  hidden?: boolean;      // Popup UI'ı gizle ama sayaç arka planda devam eder
  onResolved: () => void;
  onExpired: () => void;
  onDismiss?: () => void;
  showGuidance: boolean;
}) {
  const [remaining, setRemaining] = useState<number>(info?.graceSec ?? 0);
  const modalRef   = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<Element | null>(null);

  // Sayaç — hidden olsa bile çalışmaya devam eder
  useEffect(() => {
    if (!info) return;
    setRemaining(info.graceSec);
    if (info.graceSec <= 0) return;

    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          onExpired();
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [info, onExpired]);

  // Focus yönetimi — popup açılınca önceki odaklanılan elemanı sakla, kapanınca geri ver
  useEffect(() => {
    if (!info || hidden) return;
    prevFocusRef.current = document.activeElement;
    const firstBtn = modalRef.current?.querySelector("button");
    firstBtn?.focus();
    return () => {
      (prevFocusRef.current as HTMLElement)?.focus?.();
    };
  }, [info, hidden]);

  // ESC + Tab trap
  useEffect(() => {
    if (!info || hidden) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss?.();
        return;
      }
      if (e.key === "Tab") {
        const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
          "button, [tabindex]:not([tabindex='-1'])"
        );
        if (!focusables?.length) return;
        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [info, hidden, onDismiss]);

  if (!info) return null;
  if (hidden) return null;   // UI yok, sayaç yukarıdaki useEffect'te çalışıyor

  const progress = info.graceSec > 0 ? (remaining / info.graceSec) * 100 : 0;
  const timeoutLevel: "high" | "mid" | "low" =
    progress > 66 ? "high" : progress > 33 ? "mid" : "low";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-clinical-critical/20 backdrop-blur-sm animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-title"
    >
      {/* Kırmızı flash arka planı */}
      <div className="absolute inset-0 bg-clinical-critical/10 animate-pulse pointer-events-none" />

      <div
        ref={modalRef}
        className={cn(
          "relative panel max-w-lg w-full border-2 border-clinical-critical/60 bg-ink-900/95",
          "shadow-[0_0_40px_rgba(239,68,68,0.4)]"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-clinical-critical/30">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-clinical-critical/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-clinical-critical animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-clinical-critical mb-1">
              ⚠ Kritik Kontrendikasyon
            </div>
            <h2
              id="critical-title"
              className="font-display text-xl text-ink-50 leading-tight"
            >
              {info.title}
            </h2>
          </div>
          {/* X her zaman görünür */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-ink-400 hover:text-ink-100 transition-colors p-1 rounded"
              aria-label="Uyarıyı kapat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Gövde */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-100 leading-relaxed">{info.message}</p>

          {showGuidance && info.feedback && (
            <div className="panel-inset p-3 text-xs text-ink-300 leading-relaxed">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400 mb-1">
                Açıklama
              </div>
              {info.feedback}
            </div>
          )}

          {/* Sayaç */}
          {info.graceSec > 0 && (
            <div>
              <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                <span className="text-ink-400 uppercase tracking-wider">
                  Düzeltme süresi
                </span>
                <span
                  className={cn(
                    "font-bold text-lg",
                    timeoutLevel === "low" && "text-clinical-critical animate-pulse",
                    timeoutLevel === "mid" && "text-clinical-warning",
                    timeoutLevel === "high" && "text-ink-100"
                  )}
                >
                  {remaining}s
                </span>
              </div>
              <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000 ease-linear",
                    timeoutLevel === "low" && "bg-clinical-critical",
                    timeoutLevel === "mid" && "bg-clinical-warning",
                    timeoutLevel === "high" && "bg-clinical-stable"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Antidot önerileri */}
          {showGuidance &&
            info.expectedAntidotes &&
            info.expectedAntidotes.length > 0 && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400 mb-2">
                  Önerilen müdahale
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {info.expectedAntidotes.map((a) => (
                    <span
                      key={a}
                      className="px-2 py-1 text-xs font-mono rounded bg-clinical-info/10 text-clinical-info border border-clinical-info/30"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {!showGuidance && (
            <p className="text-xs text-ink-400 italic">
              Sınav modu — detaylı açıklama debrief'te.
            </p>
          )}
        </div>

        {/* Footer — Kapat butonları */}
        {onDismiss && (
          <div className="px-5 pb-5 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={onDismiss}
                className="flex-1 px-4 py-2 text-sm font-mono text-ink-400 hover:text-ink-200 border border-ink-700 hover:border-ink-500 rounded transition-colors"
              >
                Geç
              </button>
              <button
                onClick={onDismiss}
                className="flex-1 px-4 py-2 text-sm font-mono font-bold bg-clinical-critical/20 hover:bg-clinical-critical/30 text-clinical-critical border border-clinical-critical/40 rounded transition-colors"
                autoFocus
              >
                Anladım, devam et
              </button>
            </div>
            <p className="text-center text-[10px] font-mono text-ink-500">
              Uyarıyı kapatmak penaltıyı kaldırmaz
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function buildCriticalInfo(params: {
  medicationName: string;
  effect: string;
  message: string;
  feedback: string;
  graceSec: number;
  antidotes?: string[];
}): CriticalContraindicationInfo {
  return {
    title: `DİKKAT: ${params.medicationName}`,
    effect: params.effect,
    message: params.message,
    feedback: params.feedback,
    graceSec: params.graceSec,
    expectedAntidotes: params.antidotes,
  };
}
