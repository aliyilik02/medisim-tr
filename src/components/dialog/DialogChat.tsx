import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, Cpu, Database } from "lucide-react";
import type { Scenario } from "@/engine";
import {
  generateMockResponse,
  getStudentPrompts,
  suggestNextStage,
  CALGARY_STAGE_LABEL,
  type DialogTurn,
  type CalgaryStage,
} from "./mockDialogResponder";
import { streamChat, pingBackend, type ChatMessage } from "./geminiBackend";
import { buildPatientPersona } from "./personaBuilder";

// ============================================================
// DialogChat — Sprint B.2 (Gemini bağlı)
// ============================================================
// Calgary-Cambridge 5 aşama process backbone + chat UI.
// Backend mode: ping başarılı ise Gemini 2.5 Flash, başarısız/error ise
// mockDialogResponder fallback. Header'da rozet ile gösterilir.
// ============================================================

interface Props {
  scenario: Scenario;
  onClose?: () => void;
  /** Sprint B.2 entegrasyon: hasta yanıt üretirken (thinking + son yanıtın
   *  ilk 3-4 saniyesi) true. 3D model ağız animasyonu için kullanılır. */
  onSpeakingChange?: (speaking: boolean) => void;
}

const STAGES: CalgaryStage[] = [
  "initiating",
  "gathering",
  "physical_exam",
  "explanation",
  "closing",
];

type BackendMode = "checking" | "gemini" | "mock";

export function DialogChat({ scenario, onClose, onSpeakingChange }: Props) {
  const [turns, setTurns] = useState<DialogTurn[]>([]);
  const [currentStage, setCurrentStage] = useState<CalgaryStage>("initiating");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [backendMode, setBackendMode] = useState<BackendMode>("checking");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // İlk render'da backend health check
  useEffect(() => {
    let cancelled = false;
    pingBackend().then((ok) => {
      if (!cancelled) setBackendMode(ok ? "gemini" : "mock");
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  // Hasta konuşma süresi tahmini — kelime sayısı × 350 ms (Türkçe ortalama
  // okuma + konuşma hızı; gerçek TTS gelince audio duration'a bağlanır).
  const estimateSpeakingMs = (text: string): number => {
    const words = text.trim().split(/\s+/).length;
    return Math.max(800, Math.min(words * 350, 6000));
  };

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, thinking]);

  // Stage geçiş önerisi (turn sayısı arttıkça otomatik geç)
  useEffect(() => {
    const next = suggestNextStage(currentStage, turns.length);
    if (next && next !== currentStage) {
      setCurrentStage(next);
    }
  }, [turns.length, currentStage]);

  // Mock fallback — backend yokken veya hata sonrası
  const runMockResponse = (history: DialogTurn[], text: string) => {
    window.setTimeout(() => {
      const reply = generateMockResponse({ scenario, history, currentStage }, text);
      setTurns((prev) => [...prev, reply]);
      setThinking(false);
      onSpeakingChange?.(true);
      const speakMs = estimateSpeakingMs(reply.text);
      window.setTimeout(() => onSpeakingChange?.(false), speakMs);
    }, 600 + Math.random() * 600);
  };

  // Gemini stream — backend bağlı durumda
  const runGeminiResponse = async (history: DialogTurn[], _text: string) => {
    const persona = buildPatientPersona(scenario);
    const messages: ChatMessage[] = history.map((t) => ({
      role: t.role === "student" ? "user" : "assistant",
      content: t.text,
    }));

    // Placeholder patient turn — streaming sırasında bu turn güncellenir
    const placeholderTurn: DialogTurn = {
      role: "patient",
      text: "",
      at: Date.now(),
    };
    setTurns((prev) => [...prev, placeholderTurn]);

    let accumulatedText = "";
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    await streamChat(
      { scenario_id: scenario.id, patient_persona: persona, messages },
      {
        onText: (delta) => {
          accumulatedText += delta;
          setTurns((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...placeholderTurn, text: accumulatedText };
            return next;
          });
        },
        onDone: () => {
          setThinking(false);
          if (accumulatedText.length > 0) {
            onSpeakingChange?.(true);
            const speakMs = estimateSpeakingMs(accumulatedText);
            window.setTimeout(() => onSpeakingChange?.(false), speakMs);
          }
        },
        onError: (err, detail) => {
          // eslint-disable-next-line no-console
          console.warn("[gemini]", err, detail);
          // Placeholder turn'ü sil, mock fallback ile devam
          setTurns((prev) => prev.slice(0, -1));
          runMockResponse(history, _text);
          // Bu seans için mode'u mock'a düşür (tekrarlayan hata önlenir)
          setBackendMode("mock");
        },
      },
      abortRef.current.signal,
    );
  };

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || thinking || backendMode === "checking") return;

    const studentTurn: DialogTurn = {
      role: "student",
      text: t,
      at: Date.now(),
      stage: currentStage,
    };
    const newHistory = [...turns, studentTurn];
    setTurns(newHistory);
    setInput("");
    setThinking(true);

    if (backendMode === "gemini") {
      runGeminiResponse(newHistory, t);
    } else {
      runMockResponse(newHistory, t);
    }
  };

  const handleReset = () => {
    setTurns([]);
    setCurrentStage("initiating");
    setInput("");
  };

  const prompts = getStudentPrompts(currentStage, turns.length);

  return (
    <div className="flex flex-col h-full bg-ink-950 text-ink-50">
      {/* Header */}
      <header className="border-b border-ink-700/50 px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand flex items-center gap-2">
            Sprint B.2 · AI Hasta Diyaloğu
            <BackendBadge mode={backendMode} />
          </div>
          <h1 className="font-display text-lg leading-tight">
            {scenario.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] border bg-ink-900 border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-500 transition flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Sıfırla
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] border bg-ink-900 border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-500 transition"
          >
            Kapat
          </button>
        )}
      </header>

      {/* Calgary-Cambridge Stepper */}
      <div className="border-b border-ink-700/40 px-6 py-2 flex items-center gap-1 overflow-x-auto">
        {STAGES.map((stage, i) => {
          const isActive = stage === currentStage;
          const isPast = STAGES.indexOf(currentStage) > i;
          return (
            <div key={stage} className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentStage(stage)}
                className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                  isActive
                    ? "bg-brand/20 text-brand-light border border-brand/40"
                    : isPast
                      ? "text-ink-300 hover:text-ink-100"
                      : "text-ink-500 hover:text-ink-300"
                }`}
              >
                {CALGARY_STAGE_LABEL[stage]}
              </button>
              {i < STAGES.length - 1 && (
                <div
                  className={`w-4 h-px ${isPast ? "bg-brand/50" : "bg-ink-700"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
        {turns.length === 0 && (
          <div className="text-ink-400 text-sm font-mono italic">
            Hastaya selam vererek başlayın. Calgary-Cambridge 1. aşama: Karşılama.
          </div>
        )}
        {turns.map((turn, i) => (
          <MessageBubble key={i} turn={turn} />
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-ink-400 font-mono text-xs">
            <div className="w-2 h-2 bg-brand/50 rounded-full animate-pulse" />
            <span>Hasta düşünüyor…</span>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      {prompts.length > 0 && !thinking && (
        <div className="px-6 py-2 border-t border-ink-700/40 flex gap-2 flex-wrap">
          {prompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p)}
              className="px-2.5 py-1 rounded text-[11px] bg-ink-900 border border-ink-700 text-ink-300 hover:text-ink-100 hover:border-ink-500 transition"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t border-ink-700/50 px-6 py-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hastaya sorunuzu yazın…"
          disabled={thinking}
          className="flex-1 bg-ink-900 border border-ink-700 rounded px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-brand/50 focus:outline-none transition"
          data-testid="dialog-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          className="px-4 py-2 rounded bg-brand/15 border border-brand/40 text-brand-light hover:bg-brand/25 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em]"
          data-testid="dialog-send"
        >
          <Send className="w-3.5 h-3.5" />
          Gönder
        </button>
      </form>

      {/* Disclaimer */}
      <div className="border-t border-ink-700/30 px-6 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-600">
        Eğitim amaçlıdır · Klinik karar destek değildir · {backendMode === "gemini" ? "Gemini 2.5 Flash" : "Mock backend"}
      </div>
    </div>
  );
}

function BackendBadge({ mode }: { mode: BackendMode }) {
  if (mode === "checking") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-ink-800 text-ink-400 text-[9px] normal-case">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-500 animate-pulse" />
        bağlanıyor
      </span>
    );
  }
  if (mode === "gemini") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-clinical-stable/15 text-clinical-stable border border-clinical-stable/30 text-[9px] normal-case">
        <Cpu className="w-2.5 h-2.5" />
        Gemini
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-clinical-warning/15 text-clinical-warning border border-clinical-warning/30 text-[9px] normal-case">
      <Database className="w-2.5 h-2.5" />
      Mock
    </span>
  );
}

function MessageBubble({ turn }: { turn: DialogTurn }) {
  const isPatient = turn.role === "patient";
  return (
    <div className={`flex ${isPatient ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 ${
          isPatient
            ? "bg-ink-900 border border-ink-700 text-ink-100"
            : "bg-brand/15 border border-brand/30 text-ink-50"
        }`}
      >
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-60 mb-1">
          {isPatient ? "Hasta" : "Sen"}
        </div>
        <div className="text-sm leading-relaxed">{turn.text}</div>
      </div>
    </div>
  );
}
