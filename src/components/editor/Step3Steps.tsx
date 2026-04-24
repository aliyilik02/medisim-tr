import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, AlertCircle, Sparkles } from "lucide-react";
import { AIStepAssist } from "@/components/editor/AIStepAssist";
import type {
  Step,
  ActionStep,
  DecisionStep,
  InfoStep,
  ActionOutcome,
  DecisionOption,
  ActionType,
  PatientVitals,
  Difficulty,
} from "@/engine";
import type { StoredScenario } from "@/storage/scenarioStorage";
import { MEDICATIONS } from "@/data/medications";
import { EQUIPMENT } from "@/data/equipment";
import { cn } from "@/lib/cn";

type Draft = Partial<StoredScenario>;

interface Props {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}

// ── Constants ──────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  action: "Aksiyon",
  decision: "Karar",
  info: "Bilgi",
};

const KIND_COLORS: Record<string, string> = {
  action: "text-clinical-stable border-clinical-stable/40 bg-clinical-stable/10",
  decision: "text-brand border-brand/40 bg-brand/10",
  info: "text-ink-300 border-ink-600 bg-ink-700/50",
};

const ACTION_TYPE_OPTIONS: { value: ActionType; label: string }[] = [
  { value: "give_medication", label: "İlaç Uygula" },
  { value: "use_equipment", label: "Ekipman Kullan" },
  { value: "examine", label: "Fizik Muayene" },
  { value: "order_test", label: "Tetkik İste" },
  { value: "consult", label: "Konsültasyon" },
  { value: "procedure", label: "Prosedür" },
  { value: "communicate", label: "İletişim" },
];

const DIFFICULTY_OPTIONS: Difficulty[] = [1, 2, 3, 4, 5];

const VITAL_KEYS: (keyof PatientVitals)[] = [
  "hr", "bp_systolic", "bp_diastolic", "spo2", "rr", "temp", "gcs",
];

const VITAL_LABELS: Partial<Record<keyof PatientVitals, string>> = {
  hr: "KH", bp_systolic: "SBP", bp_diastolic: "DBP",
  spo2: "SpO₂", rr: "SS", temp: "Temp", gcs: "GCS",
};

// ── Validation ─────────────────────────────────────────────────

export function validateSteps(draft: Draft): string[] {
  const errors: string[] = [];
  const steps = draft.steps ?? [];
  if (steps.length === 0) return ["En az bir adım eklenmeli."];
  if (!draft.start_step_id) errors.push("Başlangıç adımı seçilmeli.");
  else if (!steps.find((s) => s.id === draft.start_step_id))
    errors.push("Seçili başlangıç adımı listede yok.");
  steps.forEach((step) => {
    if (!step.title.trim())
      errors.push(`"${step.id}" adımında başlık boş.`);
    if (step.kind === "action" && (step as ActionStep).expected_outcomes.length === 0)
      errors.push(`"${step.title || step.id}": en az bir beklenen aksiyon eklenmeli.`);
    if (step.kind === "decision" && (step as DecisionStep).options.length === 0)
      errors.push(`"${step.title || step.id}": en az bir seçenek eklenmeli.`);
  });
  return errors;
}

// ── Helpers ────────────────────────────────────────────────────

function makeStep(kind: "action" | "decision" | "info"): Step {
  const id = `step-${Date.now()}`;
  if (kind === "action") {
    return { id, title: "", prompt: "", kind: "action", expected_outcomes: [] };
  }
  if (kind === "decision") {
    return { id, title: "", prompt: "", kind: "decision", options: [] };
  }
  return { id, title: "", prompt: "", kind: "info", content: "" };
}

// ── Main component ─────────────────────────────────────────────

export function Step3Steps({ draft, onChange }: Props) {
  const steps = draft.steps ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(steps[0]?.id ?? null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const errors = validateSteps(draft);
  const selectedStep = steps.find((s) => s.id === selectedId) ?? null;

  const updateSteps = (next: Step[], extraPatch?: Partial<Draft>) =>
    onChange({ steps: next, ...extraPatch });

  const addStep = (kind: "action" | "decision" | "info") => {
    const step = makeStep(kind);
    const next = [...steps, step];
    const patch: Partial<Draft> = { steps: next };
    if (next.length === 1) patch.start_step_id = step.id;
    onChange(patch);
    setSelectedId(step.id);
    setShowAddMenu(false);
  };

  const deleteStep = (id: string) => {
    const next = steps.filter((s) => s.id !== id);
    const patch: Partial<Draft> = { steps: next };
    if (draft.start_step_id === id) patch.start_step_id = next[0]?.id ?? "";
    onChange(patch);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = steps.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= steps.length) return;
    const next = [...steps];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    updateSteps(next);
  };

  const updateStep = (updated: Step) =>
    updateSteps(steps.map((s) => (s.id === updated.id ? updated : s)));

  const handleAIAdd = (step: Step) => {
    const next = [...steps, step];
    const patch: Partial<Draft> = { steps: next };
    if (next.length === 1) patch.start_step_id = step.id;
    onChange(patch);
    setSelectedId(step.id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {showAI && (
        <AIStepAssist
          draft={draft}
          onClose={() => setShowAI(false)}
          onAddStep={handleAIAdd}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-1">Adım 3</div>
          <h2 className="font-display text-3xl text-ink-50">Vaka Akışı Editörü</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAI(true)}
          className="btn-ghost gap-2 text-sm shrink-0 mt-1 border-brand/40 text-brand-light hover:bg-brand/10"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Yardım
        </button>
      </div>

      {errors.length > 0 && (
        <div className="px-4 py-3 rounded-md bg-clinical-critical/10 border border-clinical-critical/30 space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 font-mono text-xs text-clinical-critical">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4" style={{ minHeight: "62vh" }}>
        {/* ── Left: step list ── */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          {steps.length > 0 && (
            <div className="panel p-3">
              <label className="field-label">Başlangıç Adımı</label>
              <select
                value={draft.start_step_id ?? ""}
                onChange={(e) => onChange({ start_step_id: e.target.value })}
                className="field-input text-xs py-1.5"
              >
                <option value="">— Seç —</option>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || `(${s.id})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
            {steps.map((s, i) => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "panel p-2.5 cursor-pointer flex items-start gap-2 transition",
                  selectedId === s.id
                    ? "border-brand/60 bg-brand/5"
                    : "hover:border-ink-600"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <span className={cn("tag text-[9px]", KIND_COLORS[s.kind])}>
                      {KIND_LABELS[s.kind]}
                    </span>
                    {draft.start_step_id === s.id && (
                      <span className="tag text-[9px] text-clinical-info border-clinical-info/40 bg-clinical-info/10">
                        başlangıç
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-200 font-medium truncate">
                    {s.title || <span className="text-ink-500 italic">isimsiz</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => moveStep(s.id, -1)}
                    disabled={i === 0}
                    className="p-0.5 text-ink-500 hover:text-ink-200 disabled:opacity-20"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(s.id, 1)}
                    disabled={i === steps.length - 1}
                    className="p-0.5 text-ink-500 hover:text-ink-200 disabled:opacity-20"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStep(s.id)}
                    className="p-0.5 text-ink-500 hover:text-clinical-critical"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {steps.length === 0 && (
              <div className="panel p-6 text-center text-ink-500 text-xs">
                Henüz adım yok.
              </div>
            )}
          </div>

          {/* Add step button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu((v) => !v)}
              className="btn-ghost w-full text-sm justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adım Ekle
            </button>
            {showAddMenu && (
              <div className="absolute bottom-full mb-1 left-0 right-0 panel p-1.5 z-10">
                {(["action", "decision", "info"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => addStep(k)}
                    className="w-full text-left px-3 py-2 rounded text-sm text-ink-200 hover:bg-ink-700 transition"
                  >
                    <span className={cn("tag text-[9px] mr-2", KIND_COLORS[k])}>
                      {KIND_LABELS[k]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: step editor ── */}
        <div className="flex-1 min-w-0">
          {selectedStep ? (
            <StepEditor
              step={selectedStep}
              allSteps={steps}
              draft={draft}
              onUpdate={updateStep}
            />
          ) : (
            <div className="panel h-full flex items-center justify-center text-ink-500 text-sm">
              Sol panelden bir adım seç veya yeni adım ekle.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StepEditor ─────────────────────────────────────────────────

interface StepEditorProps {
  step: Step;
  allSteps: Step[];
  draft: Draft;
  onUpdate: (step: Step) => void;
}

function StepEditor({ step, allSteps, draft, onUpdate }: StepEditorProps) {
  return (
    <div className="panel p-5 space-y-5 h-full overflow-y-auto">
      {/* Common fields */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={cn("tag", KIND_COLORS[step.kind])}>
            {KIND_LABELS[step.kind]}
          </span>
          <span className="font-mono text-xs text-ink-500">{step.id}</span>
        </div>

        <div>
          <label className="field-label">Başlık *</label>
          <input
            type="text"
            value={step.title}
            onChange={(e) => onUpdate({ ...step, title: e.target.value } as Step)}
            className="field-input"
            placeholder="Adım başlığı"
          />
        </div>

        <div>
          <label className="field-label">Soru / Prompt *</label>
          <textarea
            rows={2}
            value={step.prompt}
            onChange={(e) => onUpdate({ ...step, prompt: e.target.value } as Step)}
            className="field-input resize-none"
            placeholder="Öğrenciye sorulan..."
          />
        </div>

        <div>
          <label className="field-label">Anlatı (opsiyonel)</label>
          <textarea
            rows={2}
            value={step.narrative ?? ""}
            onChange={(e) =>
              onUpdate({ ...step, narrative: e.target.value || undefined } as Step)
            }
            className="field-input resize-none"
            placeholder="Sahne anlatımı..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Min Zorluk</label>
            <select
              value={step.min_difficulty ?? ""}
              onChange={(e) =>
                onUpdate({
                  ...step,
                  min_difficulty: e.target.value
                    ? (Number(e.target.value) as Difficulty)
                    : undefined,
                } as Step)
              }
              className="field-input"
            >
              <option value="">—</option>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>S{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Max Zorluk</label>
            <select
              value={step.max_difficulty ?? ""}
              onChange={(e) =>
                onUpdate({
                  ...step,
                  max_difficulty: e.target.value
                    ? (Number(e.target.value) as Difficulty)
                    : undefined,
                } as Step)
              }
              className="field-input"
            >
              <option value="">—</option>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>S{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <hr className="border-ink-700" />

      {/* Kind-specific editors */}
      {step.kind === "action" && (
        <ActionStepEditor
          step={step as ActionStep}
          allSteps={allSteps}
          draft={draft}
          onUpdate={(s) => onUpdate(s)}
        />
      )}
      {step.kind === "decision" && (
        <DecisionStepEditor
          step={step as DecisionStep}
          allSteps={allSteps}
          onUpdate={(s) => onUpdate(s)}
        />
      )}
      {step.kind === "info" && (
        <InfoStepEditor
          step={step as InfoStep}
          onUpdate={(s) => onUpdate(s)}
        />
      )}
    </div>
  );
}

// ── ActionStepEditor ───────────────────────────────────────────

function ActionStepEditor({
  step,
  allSteps,
  draft,
  onUpdate,
}: {
  step: ActionStep;
  allSteps: Step[];
  draft: Draft;
  onUpdate: (s: ActionStep) => void;
}) {
  const update = (patch: Partial<ActionStep>) => onUpdate({ ...step, ...patch });

  const addOutcome = () => {
    const newOutcome: ActionOutcome = {
      action: { type: "give_medication", target_id: "" },
      points: 10,
      feedback: "",
    };
    update({ expected_outcomes: [...step.expected_outcomes, newOutcome] });
  };

  const updateOutcome = (idx: number, patch: Partial<ActionOutcome>) =>
    update({
      expected_outcomes: step.expected_outcomes.map((o, i) =>
        i === idx ? { ...o, ...patch } : o
      ),
    });

  const deleteOutcome = (idx: number) =>
    update({ expected_outcomes: step.expected_outcomes.filter((_, i) => i !== idx) });

  const otherSteps = allSteps.filter((s) => s.id !== step.id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Varsayılan Hata Cezası (puan)</label>
          <input
            type="number"
            value={step.default_wrong_penalty ?? 0}
            onChange={(e) =>
              update({ default_wrong_penalty: Number(e.target.value) })
            }
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Varsayılan Hata Geribildirimi</label>
          <input
            type="text"
            value={step.default_wrong_feedback ?? ""}
            onChange={(e) =>
              update({ default_wrong_feedback: e.target.value || undefined })
            }
            className="field-input"
            placeholder="Yanlış aksiyon için..."
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-400">
            Beklenen Aksiyonlar
          </span>
          <button type="button" onClick={addOutcome} className="btn-ghost text-xs gap-1 px-2 py-1">
            <Plus className="w-3 h-3" /> Ekle
          </button>
        </div>

        <div className="space-y-3">
          {step.expected_outcomes.map((outcome, idx) => (
            <OutcomeEditor
              key={idx}
              outcome={outcome}
              index={idx}
              availableMeds={draft.available_medications ?? []}
              availableEq={draft.available_equipment ?? []}
              otherSteps={otherSteps}
              onUpdate={(patch) => updateOutcome(idx, patch)}
              onDelete={() => deleteOutcome(idx)}
            />
          ))}
          {step.expected_outcomes.length === 0 && (
            <div className="panel-inset p-4 text-center text-ink-500 text-xs">
              Henüz aksiyon eklenmedi. "Ekle" ile başla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── OutcomeEditor ─────────────────────────────────────────────

function OutcomeEditor({
  outcome,
  index,
  availableMeds,
  availableEq,
  otherSteps,
  onUpdate,
  onDelete,
}: {
  outcome: ActionOutcome;
  index: number;
  availableMeds: string[];
  availableEq: string[];
  otherSteps: Step[];
  onUpdate: (patch: Partial<ActionOutcome>) => void;
  onDelete: () => void;
}) {
  const actionType = outcome.action.type;

  const targetOptions =
    actionType === "give_medication"
      ? availableMeds.map((id) => ({ value: id, label: MEDICATIONS[id]?.name_tr ?? id }))
      : actionType === "use_equipment"
      ? availableEq.map((id) => ({ value: id, label: EQUIPMENT[id]?.name_tr ?? id }))
      : [];

  const handleVitalChange = (k: keyof PatientVitals, val: string) => {
    const prev = (outcome.vitals_change ?? {}) as Record<string, number | undefined>;
    if (val === "") {
      const next: Record<string, number | undefined> = {};
      for (const [vk, vv] of Object.entries(prev)) {
        if (vk !== k) next[vk] = vv;
      }
      onUpdate({ vitals_change: Object.keys(next).length ? (next as Partial<PatientVitals>) : undefined });
    } else {
      onUpdate({ vitals_change: { ...outcome.vitals_change, [k]: Number(val) } as Partial<PatientVitals> });
    }
  };

  return (
    <div className="panel-inset p-3 space-y-3">
      {/* Row 1: type, target, points, delete */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] text-ink-500 shrink-0">#{index + 1}</span>

        <select
          value={outcome.action.type}
          onChange={(e) =>
            onUpdate({
              action: { ...outcome.action, type: e.target.value as ActionType, target_id: "" },
            })
          }
          className="bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-brand/60"
        >
          {ACTION_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {targetOptions.length > 0 ? (
          <select
            value={outcome.action.target_id}
            onChange={(e) =>
              onUpdate({ action: { ...outcome.action, target_id: e.target.value } })
            }
            className="flex-1 min-w-0 bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-brand/60"
          >
            <option value="">— Hedef —</option>
            {targetOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={outcome.action.target_id}
            onChange={(e) =>
              onUpdate({ action: { ...outcome.action, target_id: e.target.value } })
            }
            placeholder="Hedef ID"
            className="flex-1 min-w-0 bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-brand/60"
          />
        )}

        <input
          type="number"
          value={outcome.points}
          onChange={(e) => onUpdate({ points: Number(e.target.value) })}
          className="w-16 bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-brand/60"
          placeholder="Puan"
        />

        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-ink-500 hover:text-clinical-critical transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dose (medication only) */}
      {actionType === "give_medication" && (
        <div>
          <label className="field-label">Doz</label>
          <input
            type="text"
            value={outcome.action.dose ?? ""}
            onChange={(e) =>
              onUpdate({ action: { ...outcome.action, dose: e.target.value || undefined } })
            }
            className="field-input text-xs"
            placeholder="300 mg IV bolus..."
          />
        </div>
      )}

      {/* Feedback */}
      <div>
        <label className="field-label">Geribildirim</label>
        <textarea
          rows={2}
          value={outcome.feedback}
          onChange={(e) => onUpdate({ feedback: e.target.value })}
          className="field-input resize-none text-xs"
          placeholder="Öğrenciye gösterilecek açıklama..."
        />
      </div>

      {/* Critical + difficulty */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!outcome.critical}
            onChange={(e) => onUpdate({ critical: e.target.checked || undefined })}
            className="accent-[#ef4444]"
          />
          <span className="text-xs text-clinical-critical font-mono">Kritik hata</span>
        </label>

        <div className="flex items-center gap-2">
          <select
            value={outcome.min_difficulty ?? ""}
            onChange={(e) =>
              onUpdate({ min_difficulty: e.target.value ? (Number(e.target.value) as Difficulty) : undefined })
            }
            className="bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-brand/60"
          >
            <option value="">Min zorluk —</option>
            {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>S{d}</option>)}
          </select>
          <select
            value={outcome.max_difficulty ?? ""}
            onChange={(e) =>
              onUpdate({ max_difficulty: e.target.value ? (Number(e.target.value) as Difficulty) : undefined })
            }
            className="bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-brand/60"
          >
            <option value="">Max zorluk —</option>
            {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>S{d}</option>)}
          </select>
        </div>
      </div>

      {/* Unlocks */}
      {otherSteps.length > 0 && (
        <div>
          <label className="field-label">Açılan Adımlar (unlocks)</label>
          <div className="flex flex-wrap gap-1.5">
            {otherSteps.map((s) => {
              const checked = (outcome.unlocks ?? []).includes(s.id);
              return (
                <label key={s.id} className={cn("tag cursor-pointer transition", checked && "tag-brand")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const current = outcome.unlocks ?? [];
                      onUpdate({
                        unlocks: e.target.checked
                          ? [...current, s.id]
                          : current.filter((x) => x !== s.id),
                      });
                    }}
                    className="sr-only"
                  />
                  {s.title || s.id}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Vitals change */}
      <details className="group">
        <summary className="font-mono text-[10px] uppercase tracking-wider text-ink-500 cursor-pointer group-open:text-ink-300">
          Vital Değişimi (opsiyonel) ▸
        </summary>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {VITAL_KEYS.map((k) => (
            <div key={k}>
              <label className="font-mono text-[9px] uppercase text-ink-500">
                {VITAL_LABELS[k] ?? k}
              </label>
              <input
                type="number"
                value={
                  outcome.vitals_change !== undefined &&
                  outcome.vitals_change[k] !== undefined
                    ? outcome.vitals_change[k]
                    : ""
                }
                onChange={(e) => handleVitalChange(k, e.target.value)}
                className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-brand/60"
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ── DecisionStepEditor ─────────────────────────────────────────

function DecisionStepEditor({
  step,
  allSteps: _allSteps,
  onUpdate,
}: {
  step: DecisionStep;
  allSteps: Step[];
  onUpdate: (s: DecisionStep) => void;
}) {
  const update = (patch: Partial<DecisionStep>) => onUpdate({ ...step, ...patch });

  const addOption = () => {
    const opt: DecisionOption = {
      id: `opt-${Date.now()}`,
      text: "",
      correct: false,
      points: 10,
      feedback: "",
    };
    update({ options: [...step.options, opt] });
  };

  const updateOption = (idx: number, patch: Partial<DecisionOption>) =>
    update({
      options: step.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    });

  const deleteOption = (idx: number) =>
    update({ options: step.options.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-ink-400">Seçenekler</span>
        <button type="button" onClick={addOption} className="btn-ghost text-xs gap-1 px-2 py-1">
          <Plus className="w-3 h-3" /> Seçenek Ekle
        </button>
      </div>

      <div className="space-y-2">
        {step.options.map((opt, idx) => (
          <div key={opt.id} className="panel-inset p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(idx, { text: e.target.value })}
                  placeholder="Seçenek metni"
                  className="field-input text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={opt.points}
                    onChange={(e) => updateOption(idx, { points: Number(e.target.value) })}
                    placeholder="Puan"
                    className="field-input text-xs"
                  />
                  <select
                    value={opt.min_difficulty ?? ""}
                    onChange={(e) =>
                      updateOption(idx, {
                        min_difficulty: e.target.value
                          ? (Number(e.target.value) as Difficulty)
                          : undefined,
                      })
                    }
                    className="field-input text-xs"
                  >
                    <option value="">Min zorluk —</option>
                    {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>S{d}</option>)}
                  </select>
                </div>
                <textarea
                  rows={1}
                  value={opt.feedback}
                  onChange={(e) => updateOption(idx, { feedback: e.target.value })}
                  placeholder="Geribildirim"
                  className="field-input text-xs resize-none"
                />
              </div>

              <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
                <label className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opt.correct}
                    onChange={(e) => updateOption(idx, { correct: e.target.checked })}
                    className="accent-[#7cb342]"
                  />
                  <span className="font-mono text-[9px] text-ink-400">Doğru</span>
                </label>
                <button
                  type="button"
                  onClick={() => deleteOption(idx)}
                  className="p-0.5 text-ink-500 hover:text-clinical-critical transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {step.options.length === 0 && (
          <div className="panel-inset p-4 text-center text-ink-500 text-xs">
            Henüz seçenek eklenmedi.
          </div>
        )}
      </div>
    </div>
  );
}

// ── InfoStepEditor ─────────────────────────────────────────────

function InfoStepEditor({
  step,
  onUpdate,
}: {
  step: InfoStep;
  onUpdate: (s: InfoStep) => void;
}) {
  return (
    <div>
      <label className="field-label">İçerik</label>
      <textarea
        rows={8}
        value={step.content}
        onChange={(e) => onUpdate({ ...step, content: e.target.value })}
        className="field-input resize-y"
        placeholder="Öğrenciye gösterilecek bilgi metni..."
      />
    </div>
  );
}
