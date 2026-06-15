// ============================================================
// KVKK Rıza-Gate (Tier-2 inc-2) — ilk girişte zorunlu tam-ekran modal
// ============================================================
// consentGiven=false iken ProtectedRoute bunu render eder; onaylanmadan
// içeri girilemez. Metin src/legal/kvkk-metni.ts (hukukçu güncellesin).
// ============================================================

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  KVKK_INTRO,
  KVKK_SECTIONS,
  KVKK_FOOTER,
} from "@/legal/kvkk-metni";
import { ShieldCheck, LogOut } from "lucide-react";

export function ConsentGate() {
  const setConsent = useAuthStore((s) => s.setConsent);
  const logout = useAuthStore((s) => s.logout);
  // explicit (açık rıza) bölümleri için checkbox state'i
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explicitSections = KVKK_SECTIONS.filter((s) => s.kind === "explicit");
  const allExplicitChecked = explicitSections.every((s) => checked[s.id]);

  const handleConfirm = async () => {
    if (!allExplicitChecked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await setConsent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onay kaydedilemedi");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-ink-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-ink-900 border border-ink-700/60 rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Başlık */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-700/50">
          <ShieldCheck className="w-5 h-5 text-brand shrink-0" strokeWidth={2.5} />
          <div>
            <h2 className="font-display text-lg leading-none">
              KVKK Aydınlatma ve Açık Rıza
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 mt-1">
              Devam etmek için onay gerekli
            </p>
          </div>
        </div>

        {/* Gövde — kaydırılabilir */}
        <div className="px-6 py-4 overflow-y-auto space-y-4 text-sm text-ink-300 leading-relaxed">
          <p>{KVKK_INTRO}</p>

          {KVKK_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="rounded border border-ink-700/40 bg-ink-950/40 p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-medium text-ink-100">{section.title}</h3>
                {section.kind === "required" && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-clinical-warning border border-clinical-warning/30 rounded px-1.5 py-0.5">
                    Zorunlu
                  </span>
                )}
              </div>
              <p className="text-[13px] text-ink-400">{section.body}</p>

              {section.kind === "explicit" && (
                <label className="mt-2.5 flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checked[section.id] ?? false}
                    onChange={(e) =>
                      setChecked((prev) => ({
                        ...prev,
                        [section.id]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 accent-brand cursor-pointer"
                  />
                  <span className="text-[13px] text-ink-200">
                    Okudum, açık rıza veriyorum.
                  </span>
                </label>
              )}
            </div>
          ))}

          <p className="text-[11px] text-ink-500 italic">{KVKK_FOOTER}</p>
        </div>

        {/* Aksiyon */}
        <div className="px-6 py-4 border-t border-ink-700/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-400 hover:text-ink-200 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Reddet ve çık
          </button>

          <div className="flex flex-col items-end gap-1">
            {error && (
              <span className="text-[11px] text-clinical-critical">{error}</span>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!allExplicitChecked || submitting}
              className="px-4 py-2 rounded font-mono text-[11px] uppercase tracking-[0.08em] bg-brand text-ink-950 font-semibold hover:bg-brand-light transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Kaydediliyor…" : "Okudum, onaylıyorum"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
