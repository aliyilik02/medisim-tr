import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { Step1Patient, DEFAULT_VITALS, DEFAULT_PATIENT } from "@/components/editor/Step1Patient";
import { Step2Library } from "@/components/editor/Step2Library";
import { Step3Steps, validateSteps } from "@/components/editor/Step3Steps";
import { Step4Scoring } from "@/components/editor/Step4Scoring";
import { Step5Preview } from "@/components/editor/Step5Preview";
import { useEditorDraft } from "@/hooks/useEditorDraft";
import {
  saveLocalScenario,
  getLocalScenario,
  type StoredScenario,
} from "@/storage/scenarioStorage";

// Default scoring for draft saves (incomplete scenarios)
const DEFAULT_SCORING: StoredScenario["scoring"] = {
  max_points: 100,
  passing_score: 70,
  grade_bands: { A: 90, B: 80, C: 70, D: 60 },
};

const DEFAULT_DEBRIEF: StoredScenario["debrief"] = {
  key_learnings: [],
  references: [],
};

export function ScenarioEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // Editing mode: load existing local scenario as initial draft
  const existingScenario = id ? getLocalScenario(id) : undefined;
  const [draft, updateDraft] = useEditorDraft(existingScenario ?? undefined);

  const [currentStep, setCurrentStep] = useState(1);

  // If new scenario (no id), set a provisional id so drafts don't collide
  useEffect(() => {
    if (!id && !draft.id) {
      updateDraft({ id: `local-${Date.now()}` });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    const now = new Date().toISOString();
    const scenarioId = draft.id ?? `local-${Date.now()}`;

    const toSave: StoredScenario = {
      id: scenarioId,
      version: "0.1.0",
      title: draft.title?.trim() || "Adsız Senaryo",
      description: draft.description ?? "",
      specialty: draft.specialty ?? "dahiliye",
      tags: draft.tags ?? [],
      difficulty: draft.difficulty ?? 3,
      supported_difficulties: draft.supported_difficulties ?? [3],
      estimated_minutes: draft.estimated_minutes ?? 15,
      modes: draft.modes ?? ["quiz"],
      language: "tr",
      author: draft.author,
      last_updated: now.split("T")[0],

      patient: draft.patient ?? DEFAULT_PATIENT,
      initial_vitals: draft.initial_vitals ?? DEFAULT_VITALS,

      available_medications: draft.available_medications ?? [],
      available_equipment: draft.available_equipment ?? [],
      steps: draft.steps ?? [],
      start_step_id: draft.start_step_id ?? "",

      scoring: draft.scoring ?? DEFAULT_SCORING,
      debrief: draft.debrief ?? DEFAULT_DEBRIEF,

      _local: true,
      _createdAt: draft._createdAt ?? now,
      _updatedAt: now,
      _draft: true,
    };

    saveLocalScenario(toSave);
    updateDraft(toSave);
  };

  const handleSaveAndExit = () => {
    handleSave();
    navigate("/senaryolar");
  };

  const canGoForward = (() => {
    if (currentStep === 1) return !!(draft.title?.trim());
    if (currentStep === 2)
      return (draft.available_medications?.length ?? 0) >= 3 &&
             (draft.available_equipment?.length ?? 0) >= 2;
    if (currentStep === 3) return validateSteps(draft).length === 0;
    return true;
  })();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Patient draft={draft} onChange={updateDraft} />;
      case 2:
        return <Step2Library draft={draft} onChange={updateDraft} />;
      case 3:
        return <Step3Steps draft={draft} onChange={updateDraft} />;
      case 4:
        return <Step4Scoring />;
      case 5:
        return <Step5Preview />;
      default:
        return null;
    }
  };

  return (
    <EditorLayout
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      canGoForward={canGoForward}
      onSave={handleSave}
      isDraft={draft._draft !== false}
    >
      {/* Step 1 title hint */}
      {currentStep === 1 && !draft.title?.trim() && (
        <div className="mb-6 px-4 py-3 rounded-md bg-clinical-warning/10 border border-clinical-warning/30 font-mono text-xs text-clinical-warning">
          Başlık doldurmadan ileri geçemezsin.
        </div>
      )}

      {renderStep()}

      {/* Save & exit shortcut at bottom of step 1 */}
      {currentStep === 1 && draft.title?.trim() && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleSaveAndExit}
            className="text-sm text-ink-400 hover:text-ink-100 underline underline-offset-2 transition"
          >
            Kaydet ve senaryolara dön
          </button>
        </div>
      )}
    </EditorLayout>
  );
}
