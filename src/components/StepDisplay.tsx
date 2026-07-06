import { useState, useEffect } from "react";
import type { Step, DecisionOption } from "@/engine";
import { cn } from "@/lib/cn";
import { ChevronRight, AlertCircle, FileImage, CheckSquare } from "lucide-react";

interface Props {
  step: Step;
  mode: "egitim" | "klinik" | "sinav";
  actionsThisStep: number;
  onDecisionSelect?: (option: DecisionOption) => void;
  onDecisionMultiConfirm?: (optionIds: string[]) => void;
  onInfoContinue?: () => void;
  onActionStepContinue?: () => void;
  canContinue?: boolean;
  decisionAnswered?: { optionId: string; feedback: string } | null;
  decisionMultiAnswered?: { optionIds: string[]; feedback: string } | null;
  visibleOptions?: DecisionOption[];
}

export function StepDisplay({
  step,
  mode,
  actionsThisStep,
  onDecisionSelect,
  onDecisionMultiConfirm,
  onInfoContinue,
  onActionStepContinue,
  canContinue,
  decisionAnswered,
  decisionMultiAnswered,
  visibleOptions,
}: Props) {
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());

  // Adım değişince checkbox seçimini sıfırla
  useEffect(() => {
    setMultiSelected(new Set());
  }, [step.id]);

  const toggleMulti = (id: string) => {
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="panel p-6 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
          /{" "}
          {step.kind === "action"
            ? "Aksiyon Adımı"
            : step.kind === "decision"
            ? step.allow_multiple
              ? "Çoklu Karar"
              : "Karar Noktası"
            : "Bilgi"}
        </div>
        {step.time_limit_sec && (
          <div className="tag tag-critical">⏱ {step.time_limit_sec}s</div>
        )}
      </div>

      <h2 className="font-display text-2xl md:text-3xl text-ink-50 mb-2">
        {step.title}
      </h2>
      <p className="text-ink-200 leading-relaxed mb-6">{step.prompt}</p>

      {step.narrative && (
        <div className="panel-inset p-4 mb-6 italic text-ink-300 text-sm leading-relaxed">
          {step.narrative}
        </div>
      )}

      {/* Aksiyon adımı */}
      {step.kind === "action" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <AlertCircle className="w-4 h-4" />
            <span>
              Sağdaki envanterden aksiyon seç.{" "}
              {step.min_actions && (
                <>
                  En az{" "}
                  <b className="text-ink-100">{step.min_actions}</b> aksiyon
                  gerekli ·{" "}
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

      {/* Karar adımı — tekli */}
      {step.kind === "decision" && !step.allow_multiple && (
        <DecisionSingle
          options={visibleOptions ?? step.options}
          mode={mode}
          decisionAnswered={decisionAnswered ?? null}
          onSelect={onDecisionSelect}
        />
      )}

      {/* Karar adımı — çoklu */}
      {step.kind === "decision" && step.allow_multiple && (
        <DecisionMulti
          options={visibleOptions ?? step.options}
          mode={mode}
          multiSelected={multiSelected}
          onToggle={toggleMulti}
          onConfirm={() => onDecisionMultiConfirm?.([...multiSelected])}
          answered={decisionMultiAnswered ?? null}
        />
      )}

      {/* Karar sonrası manuel ilerleme — öğretici modda otomatik geçiş YOK
          (öğrenci kendi temposunda ilerler). canContinue yalnız egitim modda
          + cevap verilince true gelir (useScenarioRunner). */}
      {step.kind === "decision" &&
        canContinue &&
        (decisionAnswered || decisionMultiAnswered) && (
          <button
            onClick={onActionStepContinue}
            className="btn-primary w-full justify-center mt-4"
          >
            Sonraki Adıma Geç
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

      {/* Görsel ek */}
      {step.kind === "decision" && step.display && (
        <div className="panel-inset p-4 flex items-center gap-3 mt-4">
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

      {/* Bilgi adımı */}
      {step.kind === "info" && (
        <div className="space-y-4">
          <div className="panel-inset p-5 text-ink-100 leading-relaxed whitespace-pre-wrap">
            {step.content}
          </div>
          <button
            onClick={onInfoContinue}
            className="btn-primary w-full justify-center"
          >
            Devam
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tekli seçim ───────────────────────────────────────────────

function DecisionSingle({
  options,
  mode,
  decisionAnswered,
  onSelect,
}: {
  options: DecisionOption[];
  mode: string;
  decisionAnswered: { optionId: string; feedback: string } | null;
  onSelect?: (opt: DecisionOption) => void;
}) {
  const showResult = decisionAnswered !== null;

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const isAnswered = decisionAnswered?.optionId === opt.id;
        return (
          <button
            key={opt.id}
            data-testid={`decision-${opt.id}`}
            onClick={() => !showResult && onSelect?.(opt)}
            disabled={showResult}
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
                {isAnswered && opt.correct
                  ? "✓"
                  : isAnswered && !opt.correct
                  ? "✗"
                  : ""}
              </div>
              <div className="flex-1 text-ink-100">{opt.text}</div>
            </div>
            {mode !== "sinav" && showResult && isAnswered && (
              <div className="mt-3 pt-3 border-t border-ink-700/50 text-sm text-ink-300 leading-relaxed">
                {opt.feedback}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Çoklu seçim ───────────────────────────────────────────────

function DecisionMulti({
  options,
  mode,
  multiSelected,
  onToggle,
  onConfirm,
  answered,
}: {
  options: DecisionOption[];
  mode: string;
  multiSelected: Set<string>;
  onToggle: (id: string) => void;
  onConfirm: () => void;
  answered: { optionIds: string[]; feedback: string } | null;
}) {
  const isAnswered = answered !== null;
  const answeredIds = new Set(answered?.optionIds ?? []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-mono text-ink-400 mb-1">
        <CheckSquare className="w-3.5 h-3.5" />
        <span>Birden fazla seçenek işaretleyebilirsiniz</span>
      </div>

      {options.map((opt) => {
        const wasSelected = answeredIds.has(opt.id);
        const isChecked = isAnswered ? wasSelected : multiSelected.has(opt.id);

        const borderCls = isAnswered
          ? wasSelected && opt.correct
            ? "border-clinical-stable/40 bg-clinical-stable/10"
            : wasSelected && !opt.correct
            ? "border-clinical-critical/40 bg-clinical-critical/10"
            : !wasSelected && opt.correct
            ? "border-clinical-warning/30 bg-clinical-warning/5"
            : "border-ink-700 opacity-30"
          : isChecked
          ? "border-brand/50 bg-brand/5"
          : "border-ink-700 bg-ink-900/50 hover:border-ink-500";

        return (
          <label
            key={opt.id}
            data-testid={`decision-${opt.id}`}
            className={cn(
              "flex flex-col p-4 rounded-md border transition cursor-pointer",
              borderCls,
              isAnswered && "cursor-default"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isAnswered}
                onChange={() => !isAnswered && onToggle(opt.id)}
                className="mt-0.5 accent-[#0d9488] w-4 h-4 flex-shrink-0"
              />
              <div className="flex-1 text-ink-100 text-sm leading-snug">
                {opt.text}
              </div>
              {isAnswered && wasSelected && (
                <span className="font-mono text-xs flex-shrink-0">
                  {opt.correct ? (
                    <span className="text-clinical-stable">✓</span>
                  ) : (
                    <span className="text-clinical-critical">✗</span>
                  )}
                </span>
              )}
              {isAnswered && !wasSelected && opt.correct && (
                <span className="font-mono text-xs text-clinical-warning flex-shrink-0">
                  atlandı
                </span>
              )}
            </div>
            {mode !== "sinav" && isAnswered && wasSelected && (
              <div className="mt-3 pt-3 border-t border-ink-700/50 text-xs text-ink-300 leading-relaxed">
                {opt.feedback}
              </div>
            )}
          </label>
        );
      })}

      {!isAnswered && (
        <button
          data-testid="decision-confirm"
          onClick={onConfirm}
          disabled={multiSelected.size === 0}
          className="btn-primary w-full justify-center mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckSquare className="w-4 h-4" />
          Seçimi Onayla{multiSelected.size > 0 ? ` (${multiSelected.size})` : ""}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
