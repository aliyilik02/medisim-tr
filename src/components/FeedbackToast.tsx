import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

interface Feedback {
  id: number;
  text: string;
  points: number;
  type: "positive" | "negative" | "critical" | "neutral";
}

export function useFeedback() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const show = (f: Omit<Feedback, "id">) => {
    setFeedback({ ...f, id: Date.now() });
  };

  const clear = () => setFeedback(null);

  return { feedback, show, clear };
}

export function FeedbackToast({
  feedback,
  mode,
  onClose,
}: {
  feedback: Feedback | null;
  mode: "egitim" | "klinik" | "sinav";
  onClose: () => void;
}) {
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(onClose, mode === "sinav" ? 1500 : 5500);
    return () => clearTimeout(t);
  }, [feedback, mode, onClose]);

  if (!feedback) return null;

  // Sınav modunda içeriği gizle — sadece puan değişimini göster
  // Eğitim + Klinik modlarında tam feedback görünür
  const showFullFeedback = mode !== "sinav";

  return (
    <div
      key={feedback.id}
      className={cn(
        "fixed bottom-6 right-6 max-w-md z-50 animate-slide-up",
        "panel p-4 border-2",
        feedback.type === "positive" && "border-clinical-stable/40 bg-clinical-stable/5",
        feedback.type === "negative" && "border-clinical-warning/40 bg-clinical-warning/5",
        feedback.type === "critical" && "border-clinical-critical/40 bg-clinical-critical/10",
        feedback.type === "neutral" && "border-ink-600"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded flex items-center justify-center font-mono text-sm font-bold",
            feedback.type === "positive" && "bg-clinical-stable/20 text-clinical-stable",
            feedback.type === "negative" && "bg-clinical-warning/20 text-clinical-warning",
            feedback.type === "critical" && "bg-clinical-critical/20 text-clinical-critical",
            feedback.type === "neutral" && "bg-ink-700 text-ink-300"
          )}
        >
          {feedback.points > 0 ? `+${feedback.points}` : feedback.points}
        </div>
        <div className="flex-1 min-w-0">
          {feedback.type === "critical" && (
            <div className="font-mono text-[10px] uppercase tracking-wider text-clinical-critical mb-1">
              ⚠ Kritik Hata
            </div>
          )}
          {showFullFeedback ? (
            <p className="text-sm text-ink-100 leading-relaxed">{feedback.text}</p>
          ) : (
            <p className="text-sm text-ink-300 italic">
              (Sınav modu — debrief'te açıklanacak)
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-ink-500 hover:text-ink-200 text-xl leading-none"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
    </div>
  );
}
