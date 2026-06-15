// ============================================================
// Launch3DMenu — 3D hasta başlatma + pedagojik mod seçimi (split button)
// ============================================================
// Sol: "3D Hasta" doğrudan link (varsayılan klinik/uygulama modu — e2e ve
// hızlı başlatma için görünür <a href="/hasta/...">). Sağ: ▾ açılır menü →
// Öğretici / Uygulama / Sınav (?mod=egitim|klinik|sinav).
// Akış: senaryo seç → 2D/3D (burada) → mod → oyna.
// ============================================================

import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { PEDAGOGY, PEDAGOGY_ORDER } from "@/engine";

interface Props {
  scenarioId: string;
  /** Ana link sınıfı (kart temasıyla uyum). */
  linkClassName?: string;
  linkStyle?: CSSProperties;
}

export function Launch3DMenu({ scenarioId, linkClassName, linkStyle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1 flex">
      {/* Doğrudan başlat — varsayılan mod (klinik/uygulama) */}
      <Link
        to={`/hasta/${scenarioId}`}
        className={linkClassName}
        style={linkStyle}
        data-testid="launch-3d"
      >
        3D Hasta
      </Link>
      {/* Mod seç ▾ */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Pedagojik mod seç"
        aria-expanded={open}
        data-testid="launch-3d-mode"
        className="px-2 rounded-r-md border border-l-0 border-brand/40 text-brand-light hover:bg-brand/10 transition flex items-center"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          {/* Dışarı tıkla → kapat */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 left-0 top-full mt-1 z-20 bg-ink-900 border border-ink-700 rounded-md shadow-2xl p-1">
            <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-500">
              Mod seç
            </div>
            {PEDAGOGY_ORDER.map((m) => (
              <Link
                key={m}
                to={`/hasta/${scenarioId}?mod=${m}`}
                onClick={() => setOpen(false)}
                className="block px-2 py-1.5 rounded hover:bg-ink-700 transition text-left"
              >
                <span className="block text-[11px] text-ink-100">{PEDAGOGY[m].label}</span>
                <span className="block text-[9px] text-ink-500 leading-tight">
                  {PEDAGOGY[m].description}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
