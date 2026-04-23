import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";

// ============================================================
// CriticalContraindicationModal
// ============================================================
// Kritik kontrendikasyon tetiklendiğinde ekranı kaplayan uyarı.
// - Kırmızı flash + pulsing
// - Düzeltme süresi geri sayımı
// - Önerilen antidot listesi (kullanıcı panelden seçebilir)
// - Sürenin dolması senaryo başarısızlığına yol açar (onExpire)
// ============================================================

export interface CriticalContraindicationInfo {
  title: string;           // "DİKKAT: KOAH + Morfin"
  effect: string;          // "solunum_depresyonu"
  message: string;         // Detaylı mesaj
  feedback: string;        // Debrief notu (eğitim modunda göster)
  graceSec: number;
  expectedAntidotes?: string[]; // Medication id listesi (UI eşleştirmesi için)
}

export function CriticalContraindicationModal({
  info,
  onResolved,
  onExpired,
  onDismiss,
  showGuidance,
}: {
  info: CriticalContraindicationInfo | null;
  onResolved: () => void; // Doğru antidot verildiğinde ScenarioPlayPage çağırır
  onExpired: () => void;  // Süre dolduğunda
  onDismiss?: () => void; // Sadece bilgilendirme; süre yoksa kapat
  showGuidance: boolean;  // Eğitim modu: antidot önerileri görünür
}) {
  const [remaining, setRemaining] = useState<number>(
    info?.graceSec ?? 0
  );

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

  if (!info) return null;

  const progress =
    info.graceSec > 0 ? (remaining / info.graceSec) * 100 : 0;
  const timeoutLevel: "high" | "mid" | "low" =
    progress > 66 ? "high" : progress > 33 ? "mid" : "low";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-clinical-critical/20 backdrop-blur-sm animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-title"
    >
      {/* Red flash pulse layer */}
      <div className="absolute inset-0 bg-clinical-critical/10 animate-pulse pointer-events-none" />

      <div
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
          {onDismiss && info.graceSec <= 0 && (
            <button
              onClick={onDismiss}
              className="text-ink-400 hover:text-ink-100"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
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

          {/* Countdown */}
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

          {/* Antidot önerileri — yalnızca eğitim modunda */}
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

        {/* Success indicator (opsiyonel, parent set eder) */}
      </div>
    </div>
  );
}

// Dışarıya bir helper export edelim — ScenarioPlayPage çözüldü diye çağırır
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
