import { useEffect, useState } from "react";
import { X, FlaskConical, Clock } from "lucide-react";

interface Props {
  panelName: string;
  delaySec: number;
  onClose: () => void;
  onCountdownEnd: () => void;
}

export function LabOrderCountdownModal({ panelName, delaySec, onClose, onCountdownEnd }: Props) {
  const [remaining, setRemaining] = useState(delaySec);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0) onCountdownEnd();
  }, [remaining, onCountdownEnd]);

  const progress = ((delaySec - remaining) / delaySec) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-ink-950 border border-ink-700 rounded-xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/60">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-4 h-4 text-clinical-info" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
                Tetkik İsteniyor
              </div>
              <div className="text-base font-medium text-ink-100 mt-0.5">{panelName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-ink-500" />
            <span className="font-mono text-5xl tabular-nums text-ink-100 leading-none">
              {remaining}
            </span>
            <span className="font-mono text-sm text-ink-400">sn</span>
          </div>
          <p className="text-xs text-ink-500 mt-2">
            Sonuç hazır olduğunda otomatik gösterilecek
          </p>
        </div>

        <div className="h-1 bg-ink-800">
          <div
            className="h-full bg-clinical-info transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
