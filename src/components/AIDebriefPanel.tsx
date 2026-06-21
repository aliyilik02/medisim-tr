import { useState, useCallback } from "react";
import {
  Sparkles,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import type { Scenario, SessionState } from "@/engine";
import { callClaude, extractJSON, getApiKey, setApiKey } from "@/lib/claude";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────

interface AIFeedback {
  guclu_yonler: string[];
  gelistirilmesi_gereken: string[];
  klinik_ipuclari: string[];
  ozet: string;
}

// ── Prompt builders ───────────────────────────────────────────

const SYSTEM = `Sen MediSim TR tıp simülasyon platformunun klinik eğitim asistanısın. Tıp öğrencilerine ve sağlık profesyonellerine senaryo sonrası yapıcı, klinik olarak doğru geri bildirim veriyorsun. Türkçe, kısa ve profesyonel yaz. ESC/AHA/TKD kılavuzlarına sadık kal. Yalnızca istenen JSON formatında yanıt ver, başka metin ekleme.`;

function buildPrompt(scenario: Scenario, session: SessionState): string {
  // Zorluk-duyarlı ulaşılabilir tavan (sabit max_points difficulty-kör).
  const maxPts = session.effective_max_points ?? scenario.scoring.max_points;
  const percent = maxPts > 0
    ? Math.min(100, Math.round((session.total_score / maxPts) * 100))
    : 0;
  const totalTime = Math.floor((Date.now() - session.started_at) / 1000);
  const totalErrors = session.results.reduce((a, r) => a + r.critical_errors, 0);

  const stepLines = session.results
    .map((r) => {
      const step = scenario.steps.find((s) => s.id === r.step_id);
      const actions = r.actions_taken
        .map((a) =>
          [a.type, a.target_id, a.dose].filter(Boolean).join(":")
        )
        .join(", ");
      return `• ${step?.title ?? r.step_id}: ${r.points_earned >= 0 ? "+" : ""}${r.points_earned} puan, ${r.critical_errors} kritik hata — [${actions || "aksiyon yok"}]`;
    })
    .join("\n");

  return `Senaryo: "${scenario.title}" (${scenario.specialty}, Zorluk S${session.selected_difficulty})
Hasta: ${scenario.patient.age} yaş, ${scenario.patient.sex === "M" ? "Erkek" : "Kadın"}, "${scenario.patient.chief_complaint}"

ADIM SONUÇLARI:
${stepLines || "Adım verisi yok."}

SONUÇ: ${session.total_score}/${maxPts} (%${percent}), Not: ${session.grade ?? "F"}
Kritik hatalar: ${totalErrors} | Süre: ${Math.floor(totalTime / 60)} dk ${totalTime % 60} sn

Yalnızca JSON üret:
{
  "guclu_yonler": ["2-3 madde — iyi yapılan şeyler, puan kazanılan davranışlar"],
  "gelistirilmesi_gereken": ["2-3 madde — eksikler, atlanan adımlar, hatalı aksiyonlar"],
  "klinik_ipuclari": ["2-3 madde — bu vakaya özgü pratik klinik bilgi, kılavuz notu"],
  "ozet": "1-2 cümle genel performans değerlendirmesi"
}`;
}

// ── Sub-components ────────────────────────────────────────────

function FeedbackCard({
  icon,
  title,
  items,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className={cn("rounded-lg border-l-2 bg-ink-800/60 p-4", accent)}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
          {title}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-ink-100 leading-relaxed">
            <span className="text-ink-500 font-mono shrink-0 mt-0.5">—</span>
            <span>{item}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-ink-500 italic">Veri yok</li>
        )}
      </ul>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-6 justify-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-brand animate-pulse-slow"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
      <span className="ml-2 font-mono text-xs text-ink-400">Analiz üretiliyor…</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

type PanelState = "idle" | "key_prompt" | "loading" | "done" | "error";

export function AIDebriefPanel({
  scenario,
  session,
}: {
  scenario: Scenario;
  session: SessionState;
}) {
  const [state, setState] = useState<PanelState>("idle");
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [error, setError] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const run = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const text = await callClaude({
        system: SYSTEM,
        userMessage: buildPrompt(scenario, session),
        maxTokens: 900,
      });
      setFeedback(extractJSON<AIFeedback>(text));
      setState("done");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setError(msg);
      setState(msg === "NO_KEY" ? "key_prompt" : "error");
    }
  }, [scenario, session]);

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

  // ── Idle ──
  if (state === "idle") {
    return (
      <div className="rounded-xl border border-dashed border-ink-600 p-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-light" />
          <span className="font-display text-lg text-ink-100">AI Performans Analizi</span>
        </div>
        <p className="text-sm text-ink-400 max-w-md mx-auto">
          Senaryo sonuçlarını analiz ederek güçlü yönlerinizi, geliştirilmesi gereken
          alanları ve klinik ipuçları üretir.
        </p>
        <button
          onClick={handleStart}
          className="btn-primary mx-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Analiz Üret
        </button>
      </div>
    );
  }

  // ── Key prompt ──
  if (state === "key_prompt") {
    return (
      <div className="rounded-xl border border-ink-600 bg-ink-800/40 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand-light" />
          <span className="font-display text-lg text-ink-100">Anthropic API Anahtarı</span>
        </div>
        <p className="text-sm text-ink-400">
          AI analizi için Anthropic API anahtarınızı girin. Tarayıcınızda yerel olarak saklanır,
          sunucuya gönderilmez.
        </p>
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
        <div className="flex gap-2">
          <button
            onClick={handleSaveKey}
            disabled={!apiKeyInput.startsWith("sk-ant-")}
            className="btn-primary disabled:opacity-40"
          >
            Kaydet ve Analiz Et
          </button>
          <button onClick={() => setState("idle")} className="btn-ghost">
            İptal
          </button>
        </div>
        <p className="text-xs text-ink-500">
          Anahtar al:{" "}
          <span className="font-mono text-ink-400">console.anthropic.com</span>
        </p>
      </div>
    );
  }

  // ── Loading ──
  if (state === "loading") {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-800/30 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-ink-700">
          <Sparkles className="w-4 h-4 text-brand-light animate-pulse-slow" />
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">
            AI Analiz
          </span>
        </div>
        <LoadingDots />
      </div>
    );
  }

  // ── Error ──
  if (state === "error") {
    return (
      <div className="rounded-xl border border-clinical-critical/30 bg-clinical-critical/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-clinical-critical" />
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">AI Analiz Hatası</span>
        </div>
        <p className="text-sm text-clinical-critical font-mono">{error}</p>
        <div className="flex gap-2">
          <button onClick={run} className="btn-ghost text-sm gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
          </button>
          <button onClick={() => { setState("key_prompt"); setApiKeyInput(""); }} className="btn-ghost text-sm gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> API Anahtarını Değiştir
          </button>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (state === "done" && feedback) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-800/30 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700 bg-ink-800/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-light" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">
              AI Analiz
            </span>
          </div>
          <button
            onClick={run}
            className="p-1.5 rounded text-ink-500 hover:text-ink-200 hover:bg-ink-700 transition"
            title="Yeniden üret"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary */}
          <p className="font-display text-lg text-ink-100 italic leading-snug border-l-2 border-brand/50 pl-4">
            "{feedback.ozet}"
          </p>

          {/* Three cards */}
          <div className="grid md:grid-cols-3 gap-3">
            <FeedbackCard
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-clinical-stable" />}
              title="Güçlü Yönler"
              items={feedback.guclu_yonler}
              accent="border-clinical-stable/50"
            />
            <FeedbackCard
              icon={<TrendingUp className="w-3.5 h-3.5 text-clinical-warning" />}
              title="Geliştirilmesi Gerekenler"
              items={feedback.gelistirilmesi_gereken}
              accent="border-clinical-warning/50"
            />
            <FeedbackCard
              icon={<BookOpen className="w-3.5 h-3.5 text-clinical-info" />}
              title="Klinik İpuçları"
              items={feedback.klinik_ipuclari}
              accent="border-clinical-info/50"
            />
          </div>

          {/* Loader icon hint */}
          <div className="flex items-center gap-1.5 text-xs text-ink-600">
            <Loader2 className="w-3 h-3" />
            <span>claude-haiku-4-5 · Klinik içerik doğrulama yapınız</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
