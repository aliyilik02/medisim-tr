import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Save, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const STEPS = [
  { num: 1, label: "Hasta" },
  { num: 2, label: "Kütüphane" },
  { num: 3, label: "Adımlar" },
  { num: 4, label: "Puanlama" },
  { num: 5, label: "Önizleme" },
] as const;

interface EditorLayoutProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  canGoForward: boolean;
  onSave: () => void;
  isDraft?: boolean;
  children: ReactNode;
}

export function EditorLayout({
  currentStep,
  onStepChange,
  canGoForward,
  onSave,
  isDraft,
  children,
}: EditorLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-ink-950/95 backdrop-blur-md border-b border-ink-700/50">
        <div className="max-w-4xl mx-auto px-5 py-3">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/senaryolar"
              className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Senaryolar
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg text-ink-50">
                Senaryo Editörü
              </span>
              {isDraft && (
                <span className="tag text-clinical-warning border-clinical-warning/40 bg-clinical-warning/10">
                  taslak
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onSave}
                className="btn-ghost text-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Kaydet
              </button>
              <Link
                to="/senaryolar"
                className="p-1.5 rounded text-ink-400 hover:text-ink-100 hover:bg-ink-700 transition"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => s.num <= currentStep && onStepChange(s.num)}
                  disabled={s.num > currentStep}
                  className={cn(
                    "flex flex-col items-center gap-1 flex-shrink-0",
                    s.num <= currentStep ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition",
                      s.num === currentStep &&
                        "bg-brand text-ink-950 ring-2 ring-brand/30",
                      s.num < currentStep &&
                        "bg-brand/20 text-brand-light border border-brand/30",
                      s.num > currentStep && "bg-ink-800 text-ink-500 border border-ink-700"
                    )}
                  >
                    {s.num < currentStep ? "✓" : s.num}
                  </div>
                  <span
                    className={cn(
                      "hidden sm:block font-mono text-[9px] uppercase tracking-wider",
                      s.num === currentStep ? "text-brand-light" : "text-ink-600"
                    )}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1 mx-2",
                      s.num < currentStep ? "bg-brand/30" : "bg-ink-700"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-5 py-8">
        {children}
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-ink-950/95 backdrop-blur-md border-t border-ink-700/50">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onStepChange(currentStep - 1)}
            disabled={currentStep === 1}
            className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Önceki
          </button>
          <span className="font-mono text-xs text-ink-500">
            {currentStep} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={() => onStepChange(currentStep + 1)}
            disabled={!canGoForward || currentStep === STEPS.length}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            İleri
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
