// ============================================================
// AboutPage — Sprint B.5+ proje bilgisi + lisans atıfları
// ============================================================
// /hakkinda route. CC BY / CC BY-SA görünür atıf gereksinimi
// burada karşılanır (MediaAttributions UI'dan kaldırıldıktan sonra
// kalıcı sığınak). Disclaimer + stack + klinik standart referansları.
// ============================================================

import { Link } from "react-router-dom";
import {
  Activity,
  ChevronLeft,
  ExternalLink,
  ShieldAlert,
  BookOpen,
  Code2,
  Music,
  Box,
} from "lucide-react";

interface AttributionItem {
  kind: "3D" | "Ses" | "Yazılım" | "Font";
  title: string;
  author: string;
  authorUrl?: string;
  source: string;
  license: string;
  licenseUrl: string;
}

const ATTRIBUTIONS: AttributionItem[] = [
  // ─── 3D Modeller ─────────────────────────────────────────
  {
    kind: "3D",
    title: "Male full body anatomy (patient-v2.glb)",
    author: "chuma6oy",
    authorUrl: "https://sketchfab.com/chuma6oy",
    source:
      "https://sketchfab.com/3d-models/male-full-body-anatomy-1688cedcfb3b4f3ea7a03e3a3e34bdd8",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
  },
  {
    kind: "3D",
    title: "Male Torso (patient-v1.glb)",
    author: "MaceLogice",
    authorUrl: "https://sketchfab.com/MaceLogice",
    source:
      "https://sketchfab.com/3d-models/male-torso-985d5535b408409f987841da4eba32ad",
    license: "CC BY 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
  },
  {
    kind: "3D",
    title: "Splanchnology (anatomy-internal.glb)",
    author: "Z-Anatomy",
    authorUrl: "https://sketchfab.com/Z-Anatomy",
    source:
      "https://sketchfab.com/3d-models/splanchnology-5cfafb312f504815aa3fec55735607a6",
    license: "CC BY-SA 4.0",
    licenseUrl: "http://creativecommons.org/licenses/by-sa/4.0/",
  },

  // ─── Oskültasyon Sesleri ─────────────────────────────────
  {
    kind: "Ses",
    title: "Wheeze2O — lung_wheeze.ogg",
    author: "James Heilman, MD (Jmh649)",
    source: "https://commons.wikimedia.org/wiki/File:Wheeze2O.ogg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    kind: "Ses",
    title: "Crackles in pneumonia — lung_crackles.ogg",
    author: "James Heilman, MD (Jmh649)",
    source: "https://commons.wikimedia.org/wiki/File:Crackles_pneumoniaO.ogg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    kind: "Ses",
    title: "Heartbeat — heart_normal.ogg",
    author: "Wikimedia Commons",
    source: "https://commons.wikimedia.org/wiki/File:Heartbeat.ogg",
    license: "Creative Commons",
    licenseUrl: "https://commons.wikimedia.org/wiki/File:Heartbeat.ogg",
  },
  {
    kind: "Ses",
    title: "Human heart beating at 61 bpm — heart_61bpm.ogg",
    author: "Wikimedia Commons",
    source:
      "https://commons.wikimedia.org/wiki/File:Human_heart_beating_at_61_bpm_(Cc-by-3.0).ogg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },

  // ─── Fontlar ──────────────────────────────────────────────
  {
    kind: "Font",
    title: "Instrument Serif",
    author: "Instrument",
    source: "https://fonts.google.com/specimen/Instrument+Serif",
    license: "SIL Open Font License 1.1",
    licenseUrl: "https://openfontlicense.org/",
  },
  {
    kind: "Font",
    title: "Geist / Geist Mono",
    author: "Vercel",
    source: "https://vercel.com/font",
    license: "SIL Open Font License 1.1",
    licenseUrl: "https://openfontlicense.org/",
  },

  // ─── Yazılım Kütüphaneleri ───────────────────────────────
  {
    kind: "Yazılım",
    title: "React + Three.js + @react-three/fiber + drei",
    author: "Meta / mrdoob / Poimandres",
    source: "https://github.com/pmndrs/react-three-fiber",
    license: "MIT",
    licenseUrl: "https://opensource.org/license/mit",
  },
  {
    kind: "Yazılım",
    title: "Tailwind CSS",
    author: "Tailwind Labs",
    source: "https://tailwindcss.com/",
    license: "MIT",
    licenseUrl: "https://opensource.org/license/mit",
  },
  {
    kind: "Yazılım",
    title: "Lucide Icons",
    author: "Lucide Contributors",
    source: "https://lucide.dev/",
    license: "ISC",
    licenseUrl: "https://opensource.org/license/isc",
  },
];

const KIND_ICON: Record<AttributionItem["kind"], React.ReactNode> = {
  "3D": <Box className="w-3 h-3" />,
  Ses: <Music className="w-3 h-3" />,
  Yazılım: <Code2 className="w-3 h-3" />,
  Font: <BookOpen className="w-3 h-3" />,
};

const KIND_LABEL: Record<AttributionItem["kind"], string> = {
  "3D": "3D Model",
  Ses: "Oskültasyon Sesi",
  Yazılım: "Yazılım Kütüphanesi",
  Font: "Font",
};

const STANDARDS = [
  { name: "PALS 2015", scope: "Pediatrik vital normalleri + alarm eşikleri" },
  { name: "Calgary-Cambridge (Silverman/Kurtz/Draper 1998)", scope: "Anamnez + hekim-hasta görüşmesi 71 beceri" },
  { name: "TCCC Handbook v5", scope: "Tactical Combat Casualty Care + MARCH-PAWS" },
  { name: "TA2-2019 (FIPAT)", scope: "Anatomik terminoloji standardı (Latince + Türkçe)" },
  { name: "ICD-10 + SNOMED CT", scope: "Tanı kodlama" },
  { name: "ESC / AHA / TKD 2022-2024", scope: "Kardiyovasküler klinik kılavuzlar" },
  { name: "KVKK 6698 + ÜYZ Rehberi 2025", scope: "Kişisel veri koruma" },
  { name: "UÇEP-2020 (YÖK)", scope: "Türkiye acil tıp eğitim çekirdek programı" },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      {/* Header */}
      <header className="border-b border-ink-700/50 bg-ink-950/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400 hover:text-ink-100 flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Ana Sayfa
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            <span className="font-display text-lg">
              MediSim <span className="text-brand">TR</span>
            </span>
          </div>
          <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
            Hakkında
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
        {/* Misyon */}
        <section>
          <h1 className="font-display text-3xl text-ink-50 mb-3">
            Türkiye'ye özel sanal hasta simülasyon platformu
          </h1>
          <p className="font-mono text-[12px] text-ink-300 leading-relaxed max-w-3xl">
            MediSim TR; tıp ve hemşirelik öğrencileri ile sağlık profesyonellerine
            yönelik, Türk klinik kılavuzlarına (TKD, TÜRKMSD, TEPDAD) ve
            uluslararası standartlara (PALS, TCCC, Calgary-Cambridge) uygun
            klinik senaryoları 3D anatomik manken üzerinde sunan, açık kaynak
            ve eğitim amaçlı bir platformdur.
          </p>
        </section>

        {/* Disclaimer — vurgulu */}
        <section
          className="border-2 border-clinical-warning/50 bg-clinical-warning/10 rounded-xl p-5 flex gap-4"
          data-testid="about-disclaimer"
        >
          <ShieldAlert className="w-6 h-6 text-clinical-warning shrink-0" />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-clinical-warning mb-1">
              Önemli — Klinik Sorumluluk
            </div>
            <p className="text-ink-100 leading-relaxed text-sm">
              Bu platform <strong>eğitim amaçlıdır</strong>; gerçek hasta
              bakımında klinik karar destek aracı değildir. Üretilen vital
              parametreler, ilaç dozları, EKG patternleri ve tanı bulguları
              eğitim simülasyonu içindir. Gerçek hasta üzerinde kullanılan
              her tıbbi karar; ilgili klinik kılavuzlar, hasta bireysel durumu
              ve sorumlu hekim/hemşirenin profesyonel değerlendirmesi
              çerçevesinde verilmelidir.
            </p>
          </div>
        </section>

        {/* Standartlar */}
        <section>
          <h2 className="font-display text-xl text-ink-100 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand" />
            Uyduğumuz Klinik & Eğitim Standartları
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {STANDARDS.map((s) => (
              <li
                key={s.name}
                className="bg-ink-900/60 border border-ink-700/50 rounded p-2.5"
              >
                <div className="font-mono text-[11px] text-brand-light mb-0.5">
                  {s.name}
                </div>
                <div className="font-mono text-[10px] text-ink-400 leading-snug">
                  {s.scope}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Lisans Atıfları */}
        <section>
          <h2 className="font-display text-xl text-ink-100 mb-3 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-brand" />
            Açık Kaynak ve Lisans Atıfları
          </h2>
          <p className="font-mono text-[11px] text-ink-400 leading-relaxed mb-4 max-w-3xl">
            Aşağıdaki içerikler Creative Commons veya açık kaynak yazılım
            lisansları altında kullanılmıştır. Görünür atıf,
            CC BY / CC BY-SA gereği bu sayfada yer alır. Detaylı lisans
            metinleri proje deposunda{" "}
            <code className="text-ink-300 bg-ink-900 px-1 rounded">
              src/components/patient-3d/LICENSE-3D.md
            </code>{" "}
            ve{" "}
            <code className="text-ink-300 bg-ink-900 px-1 rounded">
              public/sounds/auscultation/SOUNDS-LICENSE.md
            </code>{" "}
            içindedir.
          </p>
          <ul className="flex flex-col gap-2">
            {ATTRIBUTIONS.map((item) => (
              <li
                key={item.title}
                className="bg-ink-900/50 border border-ink-700/50 rounded p-3"
                data-testid="attribution-item"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-500 flex items-center gap-1">
                    {KIND_ICON[item.kind]}
                    {KIND_LABEL[item.kind]}
                  </span>
                  <span className="font-medium text-ink-100 text-sm">
                    {item.title}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-ink-400 leading-snug">
                  Eser sahibi:{" "}
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
                    <span className="text-ink-300">{item.author}</span>
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
        </section>

        {/* Stack */}
        <section>
          <h2 className="font-display text-xl text-ink-100 mb-3 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-brand" />
            Teknoloji
          </h2>
          <div className="grid sm:grid-cols-3 gap-3 font-mono text-[11px]">
            <div className="bg-ink-900/60 border border-ink-700/50 rounded p-3">
              <div className="text-brand-light mb-1">Frontend</div>
              <ul className="text-ink-300 leading-relaxed">
                <li>React 18 + Vite</li>
                <li>R3F + Three.js r170</li>
                <li>Tailwind v3 + Lucide</li>
                <li>TypeScript 5</li>
              </ul>
            </div>
            <div className="bg-ink-900/60 border border-ink-700/50 rounded p-3">
              <div className="text-brand-light mb-1">Backend & AI</div>
              <ul className="text-ink-300 leading-relaxed">
                <li>Cloudflare Workers + DO</li>
                <li>Gemini 2.5 Flash</li>
                <li>Azure tr-TR Neural TTS</li>
                <li>SSE stream chat</li>
              </ul>
            </div>
            <div className="bg-ink-900/60 border border-ink-700/50 rounded p-3">
              <div className="text-brand-light mb-1">Test & Build</div>
              <ul className="text-ink-300 leading-relaxed">
                <li>Vitest 24 dosya / 430 test</li>
                <li>Playwright E2E (16+)</li>
                <li>Husky pre-commit hooks</li>
                <li>gltf-transform optimize</li>
              </ul>
            </div>
          </div>
        </section>

        {/* KVKK + iletişim */}
        <section className="border-t border-ink-700/50 pt-6">
          <h2 className="font-display text-xl text-ink-100 mb-2">
            Veri ve İletişim
          </h2>
          <p className="font-mono text-[11px] text-ink-400 leading-relaxed">
            Platform kullanıcı senaryo oturumlarını yerel tarayıcıda
            saklar; gerçek hasta verisi işlenmez. AI hasta diyaloğu için
            Gemini API'a gönderilen veriler senaryo persona'sı + öğrenci
            sorusudur — kişisel sağlık verisi içermez. KVKK 6698 +{" "}
            <a
              href="https://www.kvkk.gov.tr/Icerik/8547/Uretken-Yapay-Zeka-Hakkinda-Rehber"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-light hover:underline"
            >
              ÜYZ Rehberi 2025
            </a>{" "}
            esaslarına uygunluk hedeflenmiştir.
          </p>
        </section>
      </main>

      <footer className="border-t border-ink-700/50 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500 flex items-center justify-between">
          <span>MediSim TR · Eğitim amaçlıdır · Klinik karar yerine geçmez</span>
          <Link
            to="/"
            className="text-ink-400 hover:text-brand-light transition flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            Ana Sayfa
          </Link>
        </div>
      </footer>
    </div>
  );
}
