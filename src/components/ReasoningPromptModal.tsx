// ============================================================
// ReasoningPromptModal — klinik muhakeme "neden?" sorusu (egitim modu)
// ============================================================
// Kritik aksiyon yapıldıktan SONRA çıkar (aksiyonu engellemez). CEZASIZ:
// seçim puanı etkilemez, anında doğru/yanlış göstermez — öğretici geri
// bildirim debrief'te. Yalnız egitim modunda render edilir (çağıran sayfa
// garanti eder).
//
// 21 Haz: "öğretici modda sonraki adıma geçmiyor" düzeltmesi — modal tam-ekran
// backdrop olduğundan arkadaki "Sonraki Adıma Geç" tıklanamıyordu; kullanıcı
// modal'ı nasıl kapatacağını bilemeyince takılı sanıyordu. Çözüm: backdrop'a
// tıkla = kapat (skip), Escape = kapat, belirgin "Kapat" butonu + ipucu metni.
// ============================================================

import { useEffect } from "react";
import type { ReasoningPrompt } from "@/engine";
import { Lightbulb, X } from "lucide-react";

interface Props {
  prompt: ReasoningPrompt;
  onAnswer: (selectedIndex: number) => void;
  onSkip: () => void;
}

export function ReasoningPromptModal({ prompt, onAnswer, onSkip }: Props) {
  // Escape ile kapat — modal blokajından kolay çıkış.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm p-4"
      data-testid="reasoning-prompt"
      // Backdrop'a tıkla = kapat (geç). İçeri tıklama yayılmasın (stopPropagation).
      onClick={onSkip}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-md w-full bg-ink-900 border border-brand/40 rounded-lg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Belirgin kapatma — modal'ı kapatıp adıma dönmek için */}
        <button
          type="button"
          data-testid="reasoning-close"
          onClick={onSkip}
          aria-label="Kapat (sonraki adıma geç)"
          className="absolute top-3 right-3 text-ink-500 hover:text-ink-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-brand-light mb-2">
          <Lightbulb className="w-3.5 h-3.5" />
          Klinik Muhakeme · öğretici (puana etkisi yok)
        </div>
        <h2 className="font-display text-base text-ink-50 mb-4 leading-snug pr-6">{prompt.question}</h2>
        <div className="space-y-2">
          {prompt.options.map((o, i) => (
            <button
              key={i}
              type="button"
              data-testid="reasoning-option"
              onClick={() => onAnswer(i)}
              className="w-full text-left text-[13px] text-ink-100 bg-ink-950/60 border border-ink-700/50 hover:border-brand/60 hover:bg-ink-800/60 rounded px-3 py-2.5 transition"
            >
              {o.text}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] text-ink-600">Bir gerekçe seç — ya da kapatıp devam et</span>
          <button
            type="button"
            data-testid="reasoning-skip"
            onClick={onSkip}
            className="font-mono text-[11px] text-ink-400 hover:text-ink-200 underline underline-offset-2"
          >
            Kapat, sonraki adıma geç →
          </button>
        </div>
      </div>
    </div>
  );
}
