import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw } from "lucide-react";
import type { Scenario } from "@/engine";
import {
  generateMockResponse,
  getStudentPrompts,
  suggestNextStage,
  CALGARY_STAGE_LABEL,
  type DialogTurn,
  type CalgaryStage,
} from "./mockDialogResponder";

// ============================================================
// DialogChat — Sprint B.2 erken iskelet
// ============================================================
// Calgary-Cambridge 5 aşama process backbone + chat UI.
// Backend mock (mockDialogResponder); Gemini 2.5 Flash entegrasyonu
// B.0 backend kurulumu sonrası eklenecek.
// ============================================================

interface Props {
  scenario: Scenario;
  onClose?: () => void;
}

const STAGES: CalgaryStage[] = [
  "initiating",
  "gathering",
  "physical_exam",
  "explanation",
  "closing",
];

export function DialogChat({ scenario, onClose }: Props) {
  const [turns, setTurns] = useState<DialogTurn[]>([]);
  const [currentStage, setCurrentStage] = useState<CalgaryStage>("initiating");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || thinking) return;

    const studentTurn: DialogTurn = {
      role: "student",
      text: t,
      at: Date.now(),
      stage: currentStage,
    };
    setTurns((prev) => [...prev, studentTurn]);
    setInput("");
    setThinking(true);

    // Mock latency simulation (Gemini'ye geçildiğinde gerçek)
    window.setTimeout(() => {
      const reply = generateMockResponse(
        { scenario, history: [...turns, studentTurn], currentStage },
        t,
      );
      setTurns((prev) => [...prev, reply]);
      setThinking(false);
    }, 600 + Math.random() * 600);
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
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            Sprint B.2 · AI Hasta Diyaloğu (mock)
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
        Eğitim amaçlıdır · Klinik karar destek değildir · Mock backend (Gemini entegrasyonu B.0 sonrası)
      </div>
    </div>
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
