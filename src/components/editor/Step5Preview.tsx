import { AlertCircle, AlertTriangle, Download, CheckCircle } from "lucide-react";
import { validateScenario } from "./validation";
import { toTypeScript } from "./exporters/toTypeScript";
import { toJson } from "./exporters/toJson";
import { toMarkdown } from "./exporters/toMarkdown";
import type { StoredScenario } from "@/storage/scenarioStorage";

type Draft = Partial<StoredScenario>;

interface Props {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onJumpToStep: (step: number) => void;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STEP_LABELS: Record<number, string> = {
  1: "Hasta & Meta",
  2: "Envanter & EKG",
  3: "Adımlar",
  4: "Puanlama & Debrief",
};

const SPECIALTY_LABELS: Record<string, string> = {
  kardiyoloji: "Kardiyoloji", dahiliye: "Dahiliye", acil: "Acil Tıp",
  pediatri: "Pediatri", cerrahi: "Cerrahi", anestezi: "Anestezi",
  kadin_dogum: "Kadın Doğum", hemsirelik: "Hemşirelik", askeri_tccc: "Askeri / TCCC",
};

interface SummaryRowProps {
  label: string;
  value: string;
  step: number;
  onJump: (step: number) => void;
}

function SummaryRow({ label, value, step, onJump }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink-800 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500 shrink-0 pt-0.5 w-32">
        {label}
      </span>
      <span className="font-mono text-xs text-ink-300 flex-1">{value || "—"}</span>
      <button
        type="button"
        onClick={() => onJump(step)}
        className="font-mono text-[10px] text-brand-400 hover:text-brand-300 shrink-0"
      >
        düzenle →
      </button>
    </div>
  );
}

export function Step5Preview({ draft, onJumpToStep }: Props) {
  const { errors, warnings } = validateScenario(draft);
  const hasErrors = errors.length > 0;

  const p = draft.patient;
  const v = draft.initial_vitals;
  const sc = draft.scoring;
  const db = draft.debrief;

  const safeName = (draft.title ?? "senaryo").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Panel 1: Özet ── */}
      <div className="panel p-5 space-y-1">
        <h3 className="font-display text-lg text-ink-200 mb-3">Senaryo Özeti</h3>

        <SummaryRow label="Başlık" value={draft.title ?? ""} step={1} onJump={onJumpToStep} />
        <SummaryRow
          label="Uzmanlık"
          value={SPECIALTY_LABELS[draft.specialty ?? ""] ?? draft.specialty ?? ""}
          step={1}
          onJump={onJumpToStep}
        />
        <SummaryRow
          label="Zorluk"
          value={draft.difficulty ? `${draft.difficulty}/5` : ""}
          step={1}
          onJump={onJumpToStep}
        />
        <SummaryRow
          label="Süre"
          value={draft.estimated_minutes ? `~${draft.estimated_minutes} dk` : ""}
          step={1}
          onJump={onJumpToStep}
        />
        {p && (
          <SummaryRow
            label="Hasta"
            value={`${p.age} yaş, ${p.sex === "M" ? "erkek" : "kadın"}, ${p.weight_kg} kg — ${p.chief_complaint ?? ""}`}
            step={1}
            onJump={onJumpToStep}
          />
        )}
        {v && (
          <SummaryRow
            label="Vitaller"
            value={`HR ${v.hr} • TA ${v.bp_systolic}/${v.bp_diastolic} • SpO₂ ${v.spo2}% • ${v.temp}°C`}
            step={1}
            onJump={onJumpToStep}
          />
        )}
        <SummaryRow
          label="İlaçlar"
          value={`${draft.available_medications?.length ?? 0} seçili`}
          step={2}
          onJump={onJumpToStep}
        />
        <SummaryRow
          label="Ekipman"
          value={`${draft.available_equipment?.length ?? 0} seçili`}
          step={2}
          onJump={onJumpToStep}
        />
        <SummaryRow
          label="EKG"
          value={draft.ekg_pattern ?? ""}
          step={2}
          onJump={onJumpToStep}
        />
        <SummaryRow
          label="Adımlar"
          value={`${draft.steps?.length ?? 0} adım`}
          step={3}
          onJump={onJumpToStep}
        />
        {sc && (
          <SummaryRow
            label="Puanlama"
            value={`Max ${sc.max_points} • Geçme ${sc.passing_score}`}
            step={4}
            onJump={onJumpToStep}
          />
        )}
        {db && (
          <SummaryRow
            label="Debrief"
            value={`${db.key_learnings?.length ?? 0} öğrenim • ${db.references?.length ?? 0} kaynak`}
            step={4}
            onJump={onJumpToStep}
          />
        )}
      </div>

      {/* ── Panel 2: Doğrulama ── */}
      <div className="panel p-5 space-y-4">
        <h3 className="font-display text-lg text-ink-200">Doğrulama</h3>

        {errors.length === 0 && warnings.length === 0 && (
          <div className="flex items-center gap-2 text-clinical-stable">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="font-mono text-xs">Tüm kontroller geçti. Senaryo dışa aktarıma hazır.</span>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-clinical-critical">
              {errors.length} Hata
            </p>
            {errors.map((e) => (
              <div
                key={e.code}
                className="flex items-start gap-2 p-2 rounded bg-clinical-critical/10 border border-clinical-critical/20"
              >
                <AlertCircle className="w-3.5 h-3.5 text-clinical-critical shrink-0 mt-0.5" />
                <span className="font-mono text-xs text-ink-300 flex-1">{e.message}</span>
                {e.jumpToStep && (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(e.jumpToStep!)}
                    className="font-mono text-[10px] text-clinical-critical hover:text-red-300 shrink-0"
                  >
                    {STEP_LABELS[e.jumpToStep]} →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-clinical-warning">
              {warnings.length} Uyarı
            </p>
            {warnings.map((w) => (
              <div
                key={w.code}
                className="flex items-start gap-2 p-2 rounded bg-clinical-warning/10 border border-clinical-warning/20"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-clinical-warning shrink-0 mt-0.5" />
                <span className="font-mono text-xs text-ink-300 flex-1">{w.message}</span>
                {w.jumpToStep && (
                  <button
                    type="button"
                    onClick={() => onJumpToStep(w.jumpToStep!)}
                    className="font-mono text-[10px] text-clinical-warning hover:text-yellow-300 shrink-0"
                  >
                    {STEP_LABELS[w.jumpToStep]} →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Panel 3: Dışa Aktar ── */}
      <div className="panel p-5 space-y-4">
        <h3 className="font-display text-lg text-ink-200">Dışa Aktar</h3>

        {hasErrors && (
          <div className="panel-inset p-3 font-mono text-xs text-clinical-warning">
            Dışa aktarmak için önce tüm hataları düzelt.
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            disabled={hasErrors}
            onClick={() => downloadFile(toTypeScript(draft), `${safeName}.ts`, "text/plain")}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            TypeScript
          </button>
          <button
            type="button"
            disabled={hasErrors}
            onClick={() => downloadFile(toJson(draft), `${safeName}.json`, "application/json")}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            type="button"
            disabled={hasErrors}
            onClick={() => downloadFile(toMarkdown(draft), `${safeName}.md`, "text/markdown")}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Markdown
          </button>
        </div>

        <div className="panel-inset p-3 space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">TypeScript entegrasyonu</p>
          <p className="font-mono text-[10px] text-ink-400">
            1. İndirilen .ts dosyasını <code className="text-ink-300">src/data/scenarios/</code> klasörüne koy
          </p>
          <p className="font-mono text-[10px] text-ink-400">
            2. <code className="text-ink-300">src/data/scenarios/index.ts</code> dosyasını aç ve import + SCENARIOS dizisine ekle
          </p>
        </div>
      </div>
    </div>
  );
}
