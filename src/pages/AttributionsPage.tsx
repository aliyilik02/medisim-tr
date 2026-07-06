// ============================================================
// AttributionsPage — /atiflar — açık-kaynak varlık atıfları (CC-BY şartı)
// ============================================================
// CC-BY-4.0 (Sketchfab 3D modeller) ve CC BY / CC BY-SA (Wikimedia sesler)
// lisansları uygulamada GÖRÜNÜR atıf ister — bu sayfa o yükümlülüğü karşılar.
// 3D prop atıfları tek kaynaktan gelir: SketchfabProps.PROP_CREDITS
// (yeni prop eklenince oraya satır ekleyince burada otomatik görünür).
// Ses atıfları: public/sounds/auscultation/SOUNDS-LICENSE.md ile senkron.
// ============================================================

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PROP_CREDITS } from "@/components/patient-3d/props/SketchfabProps";

interface SoundCredit {
  title: string;
  author?: string;
  sourceUrl: string;
  license: string;
}

// public/sounds/auscultation/SOUNDS-LICENSE.md ile senkron tutulur.
const SOUND_CREDITS: SoundCredit[] = [
  {
    title: "Wheeze respirations (lung_wheeze.ogg)",
    author: "James Heilman, MD",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Wheeze2O.ogg",
    license: "CC BY-SA 3.0",
  },
  {
    title: "Crackles in pneumonia (lung_crackles.ogg)",
    author: "James Heilman, MD",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Crackles_pneumoniaO.ogg",
    license: "CC BY-SA 3.0",
  },
  {
    title: "Heartbeat (heart_normal.ogg)",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Heartbeat.ogg",
    license: "Creative Commons (Wikimedia Commons)",
  },
  {
    title: "Human heart beating at 61 bpm (heart_61bpm.ogg)",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Human_heart_beating_at_61_bpm_(Cc-by-3.0).ogg",
    license: "CC BY 3.0",
  },
];

export function AttributionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-ink-400 hover:text-ink-100 font-mono text-xs uppercase tracking-[0.1em] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Ana sayfa
      </Link>

      <h1 className="font-display text-3xl text-ink-50 mt-6">Açık Kaynak Atıfları</h1>
      <p className="text-ink-400 text-sm mt-2 leading-relaxed">
        MediSim TR, aşağıdaki açık lisanslı eserleri kullanır. CC-BY türü lisanslar
        eser sahibinin görünür şekilde anılmasını şart koşar — bu sayfa o atıfların
        tam listesidir. Hasta modelleri (MPFB2/MakeHuman, CC0) ve acil odası
        (prosedürel + ambientCG CC0 dokular) atıf gerektirmez; kayıt için not edilmiştir.
      </p>

      <h2 className="font-display text-xl text-ink-100 mt-10 mb-4">3D Modeller (Sketchfab, CC-BY-4.0)</h2>
      <ul className="space-y-3">
        {PROP_CREDITS.map((c) => (
          <li key={c.file} className="border border-ink-700/60 rounded-lg p-4 bg-ink-900/40">
            <div className="text-ink-100 text-sm">
              Bu çalışma{" "}
              <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-light hover:underline">
                “{c.title}”
              </a>{" "}
              (
              <a href={c.authorUrl} target="_blank" rel="noreferrer" className="text-brand-light hover:underline">
                {c.author}
              </a>
              ) eserine dayanır —{" "}
              <a
                href="http://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
                className="text-brand-light hover:underline"
              >
                CC-BY-4.0
              </a>{" "}
              lisanslı.
            </div>
            <div className="font-mono text-[10px] text-ink-500 mt-1">{c.file}</div>
          </li>
        ))}
      </ul>

      <h2 className="font-display text-xl text-ink-100 mt-10 mb-4">Oskültasyon Sesleri (Wikimedia Commons)</h2>
      <ul className="space-y-3">
        {SOUND_CREDITS.map((s) => (
          <li key={s.title} className="border border-ink-700/60 rounded-lg p-4 bg-ink-900/40">
            <div className="text-ink-100 text-sm">
              <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-light hover:underline">
                “{s.title}”
              </a>
              {s.author ? <> — {s.author}</> : null} · {s.license}
            </div>
          </li>
        ))}
      </ul>

      <h2 className="font-display text-xl text-ink-100 mt-10 mb-4">Atıf Gerektirmeyen Kaynaklar (kayıt)</h2>
      <ul className="text-sm text-ink-400 space-y-1.5 list-disc pl-5">
        <li>Hasta modelleri: MPFB2 / MakeHuman parametrik üretim — CC0 1.0</li>
        <li>Animasyon klipleri: Adobe Mixamo — royalty-free (baked GLB)</li>
        <li>Acil odası dokuları: ambientCG — CC0 1.0</li>
      </ul>

      <p className="font-mono text-[10px] text-ink-600 mt-10 uppercase tracking-[0.1em]">
        Tam kayıt: public/3d/3D-ASSETS-LICENSE.md · public/sounds/auscultation/SOUNDS-LICENSE.md
      </p>
    </div>
  );
}
