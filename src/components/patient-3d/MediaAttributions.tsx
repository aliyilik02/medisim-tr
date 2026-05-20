// ============================================================
// Medya Atıfları — Sprint B.5
// ============================================================
// CC BY / CC BY-SA gereksinimi: 3D modeller ve oskültasyon sesleri
// için görünür kaynak/yazar/lisans atıf metni.
// Detay: src/components/patient-3d/LICENSE-3D.md
//       public/sounds/auscultation/SOUNDS-LICENSE.md
// ============================================================

import { useState } from "react";
import { Info, ChevronDown } from "lucide-react";

interface AttributionItem {
  kind: "3D Model" | "Ses";
  title: string;
  author: string;
  authorUrl?: string;
  source: string;
  license: string;
  licenseUrl: string;
}

const ATTRIBUTIONS: AttributionItem[] = [
  {
    kind: "3D Model",
    title: "Male full body anatomy",
    author: "chuma6oy",
    authorUrl: "https://sketchfab.com/chuma6oy",
    source:
      "https://sketchfab.com/3d-models/male-full-body-anatomy-1688cedcfb3b4f3ea7a03e3a3e34bdd8",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
  },
  {
    kind: "Ses",
    title: "Wheeze2O (lung_wheeze)",
    author: "James Heilman, MD",
    source: "https://commons.wikimedia.org/wiki/File:Wheeze2O.ogg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    kind: "Ses",
    title: "Crackles pneumoniaO (lung_crackles)",
    author: "James Heilman, MD",
    source: "https://commons.wikimedia.org/wiki/File:Crackles_pneumoniaO.ogg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    kind: "Ses",
    title: "Heartbeat (heart_normal)",
    author: "Wikimedia Commons",
    source: "https://commons.wikimedia.org/wiki/File:Heartbeat.ogg",
    license: "Creative Commons",
    licenseUrl: "https://commons.wikimedia.org/wiki/File:Heartbeat.ogg",
  },
  {
    kind: "Ses",
    title: "Human heart beating at 61 bpm (heart_61bpm)",
    author: "Wikimedia Commons",
    source:
      "https://commons.wikimedia.org/wiki/File:Human_heart_beating_at_61_bpm_(Cc-by-3.0).ogg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
];

export function MediaAttributions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 hover:text-ink-100 flex items-center gap-1.5 transition"
        aria-expanded={open}
        aria-controls="media-attributions-panel"
      >
        <Info className="w-3 h-3" />
        Krediler & lisanslar
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id="media-attributions-panel"
          role="region"
          aria-label="Medya kaynak atıfları"
          className="absolute bottom-full right-0 mb-2 w-[420px] max-w-[90vw] bg-ink-900/95 border border-ink-700/60 rounded-lg p-4 backdrop-blur-md shadow-2xl z-20"
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand mb-3">
            Kaynak Atıfları (CC BY / CC BY-SA)
          </div>
          <ul className="flex flex-col gap-3 text-[11px] text-ink-200 normal-case tracking-normal">
            {ATTRIBUTIONS.map((item) => (
              <li key={item.title} className="leading-snug">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-ink-500">
                    {item.kind}
                  </span>
                  <span className="font-medium text-ink-100">{item.title}</span>
                </div>
                <div className="text-ink-400 mt-0.5">
                  {item.authorUrl ? (
                    <a
                      href={item.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-light hover:underline"
                    >
                      {item.author}
                    </a>
                  ) : (
                    <span>{item.author}</span>
                  )}
                  {" · "}
                  <a
                    href={item.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Kaynak
                  </a>
                  {" · "}
                  <a
                    href={item.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.license}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-ink-700/50 font-mono text-[9px] text-ink-500 tracking-normal normal-case">
            Eğitim amaçlıdır. Detaylı atıf metinleri:{" "}
            <code className="text-ink-400">LICENSE-3D.md</code> ve{" "}
            <code className="text-ink-400">SOUNDS-LICENSE.md</code>.
          </div>
        </div>
      )}
    </div>
  );
}
