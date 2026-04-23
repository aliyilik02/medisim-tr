import type { Step, DecisionOption } from "@/engine";
import { cn } from "@/lib/cn";
import { ChevronRight, AlertCircle, FileImage } from "lucide-react";

interface Props {
  step: Step;
  mode: "egitim" | "sinav";
  actionsThisStep: number;
  onDecisionSelect?: (option: DecisionOption) => void;
  onInfoContinue?: () => void;
  onActionStepContinue?: () => void;
  canContinue?: boolean;
  decisionAnswered?: { optionId: string; feedback: string } | null;
  visibleOptions?: DecisionOption[]; // Zorluk filtresiyle filtrelenmiş; verilmezse tümü
}

export function StepDisplay({
  step,
  mode,
  actionsThisStep,
  onDecisionSelect,
  onInfoContinue,
  onActionStepContinue,
  canContinue,
  decisionAnswered,
  visibleOptions,
}: Props) {
  return (
    <div className="panel p-6 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
          / {step.kind === "action" ? "Aksiyon Adımı" : step.kind === "decision" ? "Karar Noktası" : "Bilgi"}
        </div>
        {step.time_limit_sec && (
          <div className="tag tag-critical">
            ⏱ {step.time_limit_sec}s
          </div>
        )}
      </div>

      {/* Title & prompt */}
      <h2 className="font-display text-2xl md:text-3xl text-ink-50 mb-2">
        {step.title}
      </h2>
      <p className="text-ink-200 leading-relaxed mb-6">{step.prompt}</p>

      {step.narrative && (
        <div className="panel-inset p-4 mb-6 italic text-ink-300 text-sm leading-relaxed">
          {step.narrative}
        </div>
      )}

      {/* Action step */}
      {step.kind === "action" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <AlertCircle className="w-4 h-4" />
            <span>
              Sağdaki envanterden aksiyon seç.{" "}
              {step.min_actions && (
                <>
                  En az <b className="text-ink-100">{step.min_actions}</b>{" "}
                  aksiyon gerekli ·{" "}
                  <b className="text-brand-light">{actionsThisStep}</b> yapıldı.
                </>
              )}
            </span>
          </div>
          {canContinue && (
            <button
              onClick={onActionStepContinue}
              className="btn-primary w-full justify-center"
            >
              Sonraki Adıma Geç
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Decision step */}
      {step.kind === "decision" && (
        <div className="space-y-3">
          {step.display && (
            <div className="panel-inset p-4 flex items-center gap-3 mb-4">
              <FileImage className="w-5 h-5 text-brand-light" />
              <div>
                <div className="text-sm text-ink-100">
                  {step.display.type.toUpperCase()} görüntüsü:
                </div>
                <div className="font-mono text-xs text-ink-400">
                  {step.display.asset}
                  {step.display.caption && ` · ${step.display.caption}`}
                </div>
                <div className="font-mono text-[10px] text-ink-500 mt-1">
                  (Gerçek görüntü entegrasyonu sonraki fazda)
                </div>
              </div>
            </div>
          )}

          {(visibleOptions ?? step.options).map((opt) => {
            const isAnswered = decisionAnswered?.optionId === opt.id;
            const showResult = decisionAnswered !== null && decisionAnswered !== undefined;
            return (
              <button
                key={opt.id}
                onClick={() => !showResult && onDecisionSelect?.(opt)}
                disabled={Boolean(showResult)}
                className={cn(
                  "w-full text-left p-4 rounded-md border transition",
                  !showResult &&
                    "bg-ink-900/50 hover:bg-ink-700 border-ink-700 hover:border-brand/40",
                  showResult &&
                    isAnswered &&
                    opt.correct &&
                    "bg-clinical-stable/10 border-clinical-stable/40",
                  showResult &&
                    isAnswered &&
                    !opt.correct &&
                    "bg-clinical-critical/10 border-clinical-critical/40",
                  showResult && !isAnswered && "opacity-40 border-ink-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex-shrink-0 w-6 h-6 rounded border flex items-center justify-center font-mono text-xs",
                      !showResult && "border-ink-600 text-ink-400",
                      showResult &&
                        isAnswered &&
                        opt.correct &&
                        "border-clinical-stable text-clinical-stable bg-clinical-stable/10",
                      showResult &&
                        isAnswered &&
                        !opt.correct &&
                        "border-clinical-critical text-clinical-critical bg-clinical-critical/10"
                    )}
                  >
                    {isAnswered && opt.correct ? "✓" : isAnswered && !opt.correct ? "✗" : ""}
                  </div>
                  <div className="flex-1 text-ink-100">{opt.text}</div>
                </div>

                {mode === "egitim" && showResult && isAnswered && (
                  <div className="mt-3 pt-3 border-t border-ink-700/50 text-sm text-ink-300 leading-relaxed">
                    {opt.feedback}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Info step */}
      {step.kind === "info" && (
        <div className="space-y-4">
          <div className="panel-inset p-5 text-ink-100 leading-relaxed whitespace-pre-wrap">
            {step.content}
          </div>
          <button onClick={onInfoContinue} className="btn-primary w-full justify-center">
            Devam
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
