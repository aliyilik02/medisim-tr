// ============================================================
// CurrentStepPanel — Sprint B.5+ senaryo motoru tam entegrasyon
// ============================================================
// /dialog-3d-demo'da mevcut step.kind'a göre UI render eder:
//   action   → kullanıcıya 3D bölgeden başlatma rehberi
//   decision → option listesi (single veya allow_multiple checkbox)
//   info     → content + "Devam Et"
//   null     → senaryo tamamlandı, final skor
//
// Engine entegrasyonu PatientDialog3DPage.handleDecisionSubmit'te
// (evaluateDecision + completeStep).
// ============================================================

import { useState, useMemo } from "react";
import { CheckCircle2, ChevronRight, Info, Stethoscope, Trophy } from "lucide-react";
import type { Scenario, SessionState, DecisionOption, Step } from "@/engine/types";
import { getCurrentStep, getVisibleOptions } from "@/engine";

interface Props {
  scenario: Scenario;
  session: SessionState | null;
  onDecisionSubmit: (
    step: Step,
    selectedOptionIds: string[],
  ) => void;
  onInfoContinue: (step: Step) => void;
  className?: string;
}

export function CurrentStepPanel({
  scenario,
  session,
  onDecisionSubmit,
  onInfoContinue,
  className,
}: Props) {
  const step = useMemo(() => {
    if (!session) return null;
    return getCurrentStep(scenario, session);
  }, [scenario, session]);

  if (!session) return null;

  // Senaryo tamamlandı
  if (!step || session.finished) {
    return (
      <div
        className={`bg-ink-900/95 backdrop-blur-md border border-clinical-stable/50 rounded-lg p-4 shadow-2xl ${className ?? ""}`}
        data-testid="current-step-panel"
        data-step-kind="finished"
      >
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-clinical-stable" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clinical-stable">
            Senaryo Tamamlandı
          </span>
        </div>
        <div className="font-mono text-[11px] text-ink-200">
          Toplam puan:{" "}
          <span className="text-clinical-stable font-semibold tabular-nums">
            {session.total_score ?? 0}
          </span>
          {" / "}
          <span className="text-ink-400 tabular-nums">
            {scenario.scoring?.max_points ?? "?"}
          </span>
        </div>
        <div className="font-mono text-[9px] text-ink-500 mt-1">
          {session.completed_step_ids.length} adım · {session.results.length}{" "}
          sonuç
        </div>
      </div>
    );
  }

  return (
    <StepRenderer
      session={session}
      step={step}
      onDecisionSubmit={onDecisionSubmit}
      onInfoContinue={onInfoContinue}
      className={className}
    />
  );
}

interface RendererProps {
  session: SessionState;
  step: Step;
  onDecisionSubmit: (step: Step, selectedOptionIds: string[]) => void;
  onInfoContinue: (step: Step) => void;
  className?: string;
}

function StepRenderer({
  session,
  step,
  onDecisionSubmit,
  onInfoContinue,
  className,
}: RendererProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // step değişince seçimi sıfırla
  useMemo(() => {
    setSelected(new Set());
    return null;
  }, [step.id]);

  const containerClass = `bg-ink-900/95 backdrop-blur-md border border-ink-700/60 rounded-lg p-3.5 shadow-2xl ${className ?? ""}`;

  if (step.kind === "info") {
    return (
      <div
        className={containerClass}
        data-testid="current-step-panel"
        data-step-kind="info"
      >
        <HeaderRow icon={<Info className="w-3.5 h-3.5 text-clinical-info" />} kind="Bilgi" title={step.title} />
        <p className="font-mono text-[10.5px] text-ink-200 leading-snug mt-2 normal-case tracking-normal">
          {step.content}
        </p>
        <button
          type="button"
          onClick={() => onInfoContinue(step)}
          className="mt-3 w-full px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.1em] bg-brand/20 hover:bg-brand/30 border border-brand/50 text-brand-light transition flex items-center justify-center gap-1.5"
          data-testid="info-continue"
        >
          Devam Et
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (step.kind === "decision") {
    const options = getVisibleOptions(step, session.selected_difficulty);
    const allowMultiple = step.allow_multiple === true;

    const handleOptionToggle = (optId: string) => {
      if (allowMultiple) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(optId)) next.delete(optId);
          else next.add(optId);
          return next;
        });
      } else {
        // Tek seçim → direkt submit
        onDecisionSubmit(step, [optId]);
      }
    };

    const handleSubmit = () => {
      if (selected.size === 0) return;
      onDecisionSubmit(step, [...selected]);
    };

    return (
      <div
        className={containerClass}
        data-testid="current-step-panel"
        data-step-kind="decision"
      >
        <HeaderRow
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-brand" />}
          kind={allowMultiple ? "Çoklu Seçim" : "Karar"}
          title={step.title}
        />
        <p className="font-mono text-[10.5px] text-ink-200 leading-snug mt-1.5 mb-2.5 normal-case tracking-normal">
          {step.prompt}
        </p>
        <ul className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
          {options.map((opt) => (
            <OptionButton
              key={opt.id}
              option={opt}
              selected={selected.has(opt.id)}
              allowMultiple={allowMultiple}
              onToggle={() => handleOptionToggle(opt.id)}
            />
          ))}
        </ul>
        {allowMultiple && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className="mt-2.5 w-full px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.1em] bg-brand/20 hover:bg-brand/30 disabled:opacity-40 disabled:cursor-not-allowed border border-brand/50 text-brand-light transition flex items-center justify-center gap-1.5"
            data-testid="decision-submit"
          >
            Onayla ({selected.size})
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // Action step
  return (
    <div
      className={containerClass}
      data-testid="current-step-panel"
      data-step-kind="action"
    >
      <HeaderRow
        icon={<Stethoscope className="w-3.5 h-3.5 text-brand" />}
        kind="Eylem"
        title={step.title}
      />
      <p className="font-mono text-[10.5px] text-ink-200 leading-snug mt-1.5 normal-case tracking-normal">
        {step.prompt}
      </p>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-500 italic">
        ↑ 3D modelde bir bölgeye tıkla, prosedür panelinden eylemi seç
      </div>
    </div>
  );
}

function HeaderRow({ icon, kind, title }: { icon: React.ReactNode; kind: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
        {kind}
      </span>
      <span className="font-display text-[12px] text-ink-100 truncate">{title}</span>
    </div>
  );
}

function OptionButton({
  option,
  selected,
  allowMultiple,
  onToggle,
}: {
  option: DecisionOption;
  selected: boolean;
  allowMultiple: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-left px-2 py-1.5 rounded border font-mono text-[10.5px] leading-snug transition normal-case tracking-normal ${
          selected
            ? "bg-brand/20 border-brand/50 text-brand-light"
            : "bg-ink-800/60 border-ink-700 text-ink-200 hover:border-ink-500 hover:text-ink-50"
        }`}
        data-testid="decision-option"
        data-option-id={option.id}
      >
        {allowMultiple && (
          <span
            className={`inline-block w-2.5 h-2.5 mr-2 rounded-sm border align-middle ${
              selected
                ? "bg-brand border-brand"
                : "border-ink-500"
            }`}
            aria-hidden
          />
        )}
        {option.text}
      </button>
    </li>
  );
}
