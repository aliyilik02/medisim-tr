// ============================================================
// Toaster — Sprint B.5+ action submit feedback popup
// ============================================================
// useToast hook + Toaster overlay. Action submit edildiğinde
// 3 saniyelik görsel feedback (+puan yeşil, -puan turuncu, kritik
// kırmızı). Sağ üst köşede stack, otomatik dismiss.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, MinusCircle, X } from "lucide-react";

export type ToastKind = "success" | "warning" | "critical" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  points?: number;
  durationMs: number;
}

interface ToasterState {
  toasts: Toast[];
}

let nextId = 1;
const subscribers: Array<(state: ToasterState) => void> = [];
let currentState: ToasterState = { toasts: [] };

function publish() {
  for (const fn of subscribers) fn(currentState);
}

export function pushToast(
  toast: Omit<Toast, "id" | "durationMs"> & { durationMs?: number },
): number {
  const id = nextId++;
  const full: Toast = {
    id,
    durationMs: toast.durationMs ?? 3000,
    ...toast,
  };
  currentState = { toasts: [...currentState.toasts, full] };
  publish();
  return id;
}

export function dismissToast(id: number) {
  currentState = {
    toasts: currentState.toasts.filter((t) => t.id !== id),
  };
  publish();
}

export function useToasts(): Toast[] {
  const [state, setState] = useState<ToasterState>(currentState);
  useEffect(() => {
    subscribers.push(setState);
    return () => {
      const idx = subscribers.indexOf(setState);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  }, []);
  return state.toasts;
}

const KIND_STYLES: Record<
  ToastKind,
  { border: string; bg: string; text: string; icon: React.ReactNode }
> = {
  success: {
    border: "border-clinical-stable/50",
    bg: "bg-clinical-stable/15",
    text: "text-clinical-stable",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-clinical-stable" />,
  },
  warning: {
    border: "border-clinical-warning/50",
    bg: "bg-clinical-warning/15",
    text: "text-clinical-warning",
    icon: <MinusCircle className="w-3.5 h-3.5 text-clinical-warning" />,
  },
  critical: {
    border: "border-clinical-critical/60",
    bg: "bg-clinical-critical/20",
    text: "text-clinical-critical",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-clinical-critical" />,
  },
  info: {
    border: "border-clinical-info/40",
    bg: "bg-clinical-info/10",
    text: "text-clinical-info",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-clinical-info" />,
  },
};

export function Toaster({ className }: { className?: string }) {
  const toasts = useToasts();
  return (
    <div
      className={`pointer-events-none fixed top-20 right-4 z-40 flex flex-col gap-2 items-end ${className ?? ""}`}
      data-testid="toaster"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const style = KIND_STYLES[toast.kind];
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      dismissToast(toast.id);
    }, toast.durationMs);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.durationMs]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    dismissToast(toast.id);
  }, [toast.id]);

  return (
    <div
      role="alert"
      data-testid="toast-item"
      data-toast-kind={toast.kind}
      className={`pointer-events-auto w-[280px] bg-ink-900/95 backdrop-blur-md border ${style.border} ${style.bg} rounded-lg shadow-2xl p-3 animate-slide-up`}
    >
      <div className="flex items-start gap-2">
        {style.icon}
        <div className="flex-1 min-w-0">
          <div className={`font-mono text-[10px] uppercase tracking-[0.15em] ${style.text} flex items-center gap-1.5`}>
            <span className="truncate">{toast.title}</span>
            {typeof toast.points === "number" && (
              <span className="ml-auto tabular-nums">
                {toast.points > 0 ? "+" : ""}
                {toast.points}
              </span>
            )}
          </div>
          {toast.body && (
            <p className="font-mono text-[10px] text-ink-200 mt-1 leading-snug normal-case tracking-normal">
              {toast.body}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-ink-500 hover:text-ink-200 transition shrink-0"
          aria-label="Kapat"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
