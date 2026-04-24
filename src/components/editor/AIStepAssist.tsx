import { useState } from "react";
import {
  Sparkles,
  X,
  Plus,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
} from "lucide-react";
import type { Step, ActionStep, DecisionStep, InfoStep } from "@/engine";
import type { StoredScenario } from "@/storage/scenarioStorage";
import { callClaude, extractJSONArray, getApiKey, setApiKey } from "@/lib/claude";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────

interface SuggestedStep {
  kind: "action" | "decision" | "info";
  title: string;
  prompt: string;
  narrative?: string;
  hint: string;
}

type Draft = Partial<StoredScenario>;

interface Props {
  draft: Draft;
  onClose: () => void;
  onAddStep: (step: Step) => void;
}

// ── Prompt builders ───────────────────────────────────────────

const SYSTEM = `Sen MediSim TR tıp simülasyon platformu için senaryo adımı öneren bir klinik eğitim asistanısın. Türkiye sağlık sistemi bağlamında (112 protokolü, ATT/hemşire yetki sınırları, SUT ilaç listesi) çalışıyorsun. ESC/AHA/TKD kılavuzlarına sadık kal. Yalnızca istenen JSON formatında yanıt ver, başka metin ekleme.`;

function buildStepPrompt(draft: Draft, freeText: string): string {
  const patient = draft.patient;
  const specialty = draft.specialty ?? "belirtilmemiş";
  const existingSteps = (draft.steps ?? []).map((s) => `• ${s.title || s.id} (${s.kind})`).join("\n");

  const patientBlock = patient
    ? `Hasta: ${patient.age} yaş, ${patient.sex === "M" ? "Erkek" : "Kadın"}, Şikayet: "${patient.chief_complaint}"
Hikaye: ${(patient.history_items ?? []).join("; ")}
Alerjiler: ${(patient.allergies ?? []).join(", ") || "yok"}`
    : "Hasta bilgisi henüz girilmemiş.";

  return `Uzmanlık: ${specialty}
${patientBlock}

Mevcut adımlar (${(draft.steps ?? []).length} adet):
${existingSteps || "Henüz adım yok."}

Eğitmen notu: "${freeText}"

Bu vaka için 3-5 senaryo adımı öner. Her adım için:
- kind: "action" (öğrenci bir şey yapıyor), "decision" (çoktan seçmeli karar), "info" (sadece bilgi gösterimi)
- title: kısa başlık (maksimum 6 kelime)
- prompt: öğrenciye sorulacak soru/talimat
- narrative: opsiyonel sahne tanımı (hasta durumu)
- hint: bu adımda hangi aksiyonların/seçeneklerin bekleneceğine dair eğitmen notu (öğrenciye gösterilmez)

Sadece JSON dizisi döndür:
[
  {
    "kind": "action",
    "title": "...",
    "prompt": "...",
    "narrative": "...",
    "hint": "..."
  }
]`;
}

// ── Helpers ───────────────────────────────────────────────────

function kindLabel(kind: string) {
  return kind === "action" ? "Aksiyon" : kind === "decision" ? "Karar" : "Bilgi";
}

function kindColors(kind: string) {
  return kind === "action"
    ? "text-clinical-stable border-clinical-stable/30 bg-clinical-stable/10"
    : kind === "decision"
    ? "text-brand border-brand/30 bg-brand/10"
    : "text-ink-300 border-ink-600 bg-ink-700/40";
}

function makeStepFromSuggestion(s: SuggestedStep): Step {
  const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (s.kind === "action") {
    return { id, title: s.title, prompt: s.prompt, narrative: s.narrative, kind: "action", expected_outcomes: [] } satisfies ActionStep;
  }
  if (s.kind === "decision") {
    return { id, title: s.title, prompt: s.prompt, narrative: s.narrative, kind: "decision", options: [] } satisfies DecisionStep;
  }
  return { id, title: s.title, prompt: s.prompt, narrative: s.narrative, kind: "info", content: s.hint } satisfies InfoStep;
}

// ── Component ─────────────────────────────────────────────────

type PanelState = "idle" | "key_prompt" | "loading" | "done" | "error";

export function AIStepAssist({ draft, onClose, onAddStep }: Props) {
  const [state, setState] = useState<PanelState>("idle");
  const [freeText, setFreeText] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedStep[]>([]);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const run = async () => {
    if (!freeText.trim()) return;
    setState("loading");
    setError("");
    setSuggestions([]);
    setAdded(new Set());
    try {
      const text = await callClaude({
        system: SYSTEM,
        userMessage: buildStepPrompt(draft, freeText),
        maxTokens: 1400,
      });
      setSuggestions(extractJSONArray<SuggestedStep>(text));
      setState("done");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setError(msg);
      setState(msg === "NO_KEY" ? "key_prompt" : "error");
    }
  };

  const handleStart = () => {
    if (!getApiKey()) {
      setState("key_prompt");
    } else {
      run();
    }
  };

  const handleSaveKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed.startsWith("sk-ant-")) return;
    setApiKey(trimmed);
    setApiKeyInput("");
    run();
  };

  const handleAdd = (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;
    onAddStep(makeStepFromSuggestion(s));
    setAdded((prev) => new Set([...prev, idx]));
  };

  return (
    /* Modal overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col panel overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-light" />
            <div>
              <div className="font-display text-lg text-ink-50">AI Adım Asistanı</div>
              <div className="font-mono text-[10px] text-ink-500 uppercase tracking-wider">
                Vaka akışı için adım önerileri
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-ink-500 hover:text-ink-200 hover:bg-ink-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Patient context pill */}
          {draft.patient && (
            <div className="panel-inset px-3 py-2 flex items-center gap-2 text-xs text-ink-400">
              <span className="font-mono text-ink-600">hasta</span>
              <ChevronRight className="w-3 h-3 text-ink-700" />
              <span>
                {draft.patient.age} yaş · {draft.patient.chief_complaint}
              </span>
              {(draft.steps ?? []).length > 0 && (
                <>
                  <span className="text-ink-700">·</span>
                  <span className="text-ink-600">{(draft.steps ?? []).length} mevcut adım</span>
                </>
              )}
            </div>
          )}

          {/* Free text input */}
          <div>
            <label className="field-label">Vaka akışını tanımlayın</label>
            <textarea
              rows={4}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              className="field-input resize-none"
              placeholder="Örn: Hasta acile STEMI şüphesiyle geliyor. Önce monitorizasyon, EKG, troponin. Aspirin + klopidogrel ver. Heparin başla. Kateter salonuna yönlendir."
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-ink-500">
                Ne kadar detay verirseniz o kadar iyi öneri alırsınız.
              </p>
              <span className="font-mono text-[10px] text-ink-600">{freeText.length} karakter</span>
            </div>
          </div>

          {/* Key prompt */}
          {state === "key_prompt" && (
            <div className="panel-inset p-4 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-brand-light" />
                <span className="font-mono text-xs uppercase tracking-wider text-ink-400">
                  Anthropic API Anahtarı Gerekli
                </span>
              </div>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                  className="field-input pr-10 font-mono text-sm"
                  placeholder="sk-ant-api03-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-200"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKeyInput.startsWith("sk-ant-")}
                className="btn-primary text-sm disabled:opacity-40"
              >
                Kaydet ve Devam Et
              </button>
            </div>
          )}

          {/* Loading */}
          {state === "loading" && (
            <div className="flex items-center gap-2 justify-center py-8 text-ink-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Adım önerileri üretiliyor…</span>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="panel-inset p-3 flex items-start gap-2">
              <span className="text-clinical-critical text-xs font-mono flex-1">{error}</span>
              <button onClick={run} className="btn-ghost text-xs gap-1 shrink-0">
                <RefreshCw className="w-3 h-3" /> Tekrar
              </button>
            </div>
          )}

          {/* Suggestions */}
          {state === "done" && suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
                  Önerilen Adımlar ({suggestions.length})
                </span>
                <button onClick={run} className="btn-ghost text-xs gap-1 px-2 py-1">
                  <RefreshCw className="w-3 h-3" /> Yeniden Üret
                </button>
              </div>

              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "panel-inset p-4 space-y-2 transition",
                    added.has(idx) && "opacity-40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn("tag text-[9px]", kindColors(s.kind))}>
                          {kindLabel(s.kind)}
                        </span>
                        <span className="font-medium text-sm text-ink-100">{s.title}</span>
                      </div>
                      <p className="text-xs text-ink-300 leading-relaxed">{s.prompt}</p>
                      {s.narrative && (
                        <p className="text-xs text-ink-500 italic mt-1">"{s.narrative}"</p>
                      )}
                      {s.hint && (
                        <div className="mt-2 px-2 py-1.5 rounded bg-ink-800 border border-ink-700">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-ink-600 mr-1.5">
                            ipucu
                          </span>
                          <span className="text-xs text-ink-400">{s.hint}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAdd(idx)}
                      disabled={added.has(idx)}
                      className={cn(
                        "shrink-0 btn-primary text-xs gap-1 px-2.5 py-1.5",
                        added.has(idx) && "bg-clinical-stable/20 text-clinical-stable border-clinical-stable/30 cursor-default"
                      )}
                    >
                      {added.has(idx) ? (
                        "Eklendi"
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Ekle
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              <p className="text-xs text-ink-600 text-center pt-1">
                Adımı ekledikten sonra editörde detaylandırın (aksiyonlar, puanlar, vitaller).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-700 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-ink-600">
            <Loader2 className="w-3 h-3" />
            <span>claude-haiku-4-5 · Klinik içeriği doğrulayın</span>
          </div>
          {(state === "idle" || state === "done" || state === "error") && (
            <button
              onClick={handleStart}
              disabled={!freeText.trim()}
              className="btn-primary text-sm gap-1.5 disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {state === "done" ? "Yeniden Üret" : "Adım Öner"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
