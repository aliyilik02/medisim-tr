import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, Stethoscope, Timer, Sparkles, Wind } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import { getStats, listSessions } from "@/storage/sessionHistory";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";
import { SpecialtyIcon } from "@/assets/specialty-icons";
import { EkgBackdrop } from "@/components/ui/EkgBackdrop";
import { Reveal } from "@/components/ui/Reveal";
import { specialtyLabel } from "@/utils/export/helpers";
import type { Specialty } from "@/engine/types";

const GRADE_HEX: Record<string, string> = {
  A: "#22c55e", B: "#0d9488", C: "#eab308", D: "#f97316", F: "#ef4444",
};

/** Kart rengini neon-card hover ışımasına bağlar (--glow %35 alpha). */
const cardGlow = (color: string): CSSProperties =>
  ({ "--glow": `${color}59`, "--neon": color }) as CSSProperties;

// 3D Sanal Hasta demo route'ları (tam ekran R3F sahneleri).
const PATIENT_DEMOS = [
  {
    to: "/vaka/kardiyoloji-stemi-001?mod=egitim",
    Icon: Stethoscope,
    title: "Görselli Vaka Akışı",
    body: "Rol üstlen, vakayı tıklayarak yürüt: hasta görseli kötüleşmeyle değişir, her müdahale kendi sahnesini tetikler. STEMI pilotu.",
    tag: "PİLOT",
    color: "#f472b6",
  },
  {
    to: "/senaryo-yatak",
    Icon: Stethoscope,
    title: "Yatak Başı Senaryo",
    body: "Gerçek klinik vakayı yataktaki hastayla uçtan uca oyna: adım, aksiyon, ilaç, kötüleşme, debrief.",
    tag: "YENİ",
    color: "#0d9488",
  },
  {
    // Eski ayrı vitrinler (Klinik Sahne / Animasyon / Ventilatör / AI diyalog)
    // artık 3D hasta seansının (/hasta/:id) içinde — senaryo seçiminden açılır.
    // AI diyalog: yatak seansı sağ panel "Hasta ile Konuş" sekmesi.
    to: "/senaryolar",
    Icon: Wind,
    title: "3D Hasta Seansı",
    body: "Acil odası, yatakta sanal hasta, köşe monitör, oskültasyon, ventilatör, animasyon ve AI diyalog — hepsi tek sahnede. Senaryo seç, 3D oyna.",
    tag: "YENİ",
    color: "#06b6d4",
  },
];

const MODE_CARDS = [
  {
    id: "egitim",
    Icon: GraduationCap,
    title: "Eğitim Modu",
    body: "Her adımda anlık geri bildirim ve açıklama. Öğrenmek, kavramak, pekiştirmek için.",
    color: "#10b981",
  },
  {
    id: "klinik",
    Icon: Stethoscope,
    title: "Klinik Mod",
    body: "Zaman baskısı altında karar ver. Sınırlı feedback — gerçek klinik ortamı taklit eder.",
    color: "#0d9488",
  },
  {
    id: "sinav",
    Icon: Timer,
    title: "Sınav Modu",
    body: "Sınavda geri bildirim yok. Bitir, harf notunu al, debrief'te öğren.",
    color: "#3b82f6",
  },
];

/** Sayı yumuşak yukarı sayar (easeOutCubic). Reduced-motion → anında hedef. */
function useCountUp(target: number, duration = 1100): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function HomePage() {
  const stats = useMemo(() => getStats(), []);
  const recentSessions = useMemo(() => listSessions().slice(0, 3), []);
  const specialtyCount = useMemo(
    () => new Set(SCENARIOS.map((s) => s.specialty)).size,
    []
  );

  return (
    <div className="max-w-7xl mx-auto px-6 pt-14 pb-24">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative mb-20 rounded-2xl overflow-hidden border border-ink-700/50 bg-ink-950 neon-teal neon-border shadow-glow-sm">
        {/* EKG ambient backdrop */}
        <div className="absolute bottom-0 left-0 right-0 h-20">
          <EkgBackdrop className="w-full h-full" />
        </div>

        {/* Subtle radial glow */}
        <div
          className="absolute top-0 left-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(13,148,136,0.09), transparent 60%)" }}
        />

        {/* Tarama çizgisi — klinik monitör atmosferi (dekoratif, tıklama yutmaz) */}
        <div
          aria-hidden
          className="absolute left-0 right-0 h-px pointer-events-none animate-scanline"
          style={{ background: "linear-gradient(90deg, transparent, rgba(45,212,191,0.35), transparent)" }}
        />

        <div className="relative px-8 md:px-16 py-16 md:py-20">
          {/* Eyebrow */}
          <div
            className="font-mono text-[10px] uppercase tracking-[0.25em] neon-teal neon-text mb-6 animate-stagger-in"
            style={{ animationDelay: "60ms" }}
          >
            / MediSim TR · Sanal Hasta Platformu
          </div>

          {/* Headline — satırlar kademeli girer */}
          <h1 className="font-display text-5xl md:text-7xl text-ink-50 leading-[0.95] mb-4">
            <span className="block animate-stagger-in" style={{ animationDelay: "140ms" }}>
              Sanal hasta.
            </span>
            <span className="block animate-stagger-in" style={{ animationDelay: "260ms" }}>
              <span className="italic neon-teal neon-text">Gerçek klinik</span>{" "}
              kararlar.
            </span>
          </h1>

          <p
            className="t-body text-ink-400 max-w-lg mt-4 mb-10 leading-relaxed animate-stagger-in"
            style={{ animationDelay: "380ms" }}
          >
            Türkiye müfredatına özel senaryo tabanlı klinik simülasyon.
            TKD · ESC · AHA uyumlu. Tıp eğitimi, hemşirelik, acil, ATT.
          </p>

          <div className="flex flex-wrap gap-3 animate-stagger-in" style={{ animationDelay: "480ms" }}>
            <Link to="/senaryolar" className="btn-primary neon-teal shadow-glow-sm hover:shadow-glow-md transition-shadow">
              Senaryolara Git
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/senaryolar" className="btn-ghost neon-teal hover:shadow-glow-xs hover:border-brand/40">
              <Sparkles className="w-4 h-4" />
              3D Sanal Hasta
            </Link>
            <Link to="/gecmis" className="btn-ghost">
              Oturum Geçmişi
            </Link>
          </div>

          {/* Mini stats — sayılar yukarı sayar */}
          <div
            className="flex flex-wrap gap-8 mt-10 pt-8 border-t border-ink-700/40 animate-stagger-in"
            style={{ animationDelay: "580ms" }}
          >
            <StatPill value={SCENARIOS.length} label="Klinik Senaryo" />
            <StatPill value={specialtyCount} label="Uzmanlık Alanı" />
            <StatPill value="ESC · AHA · TKD" label="Klinik Referans" />
            {stats && stats.total_sessions > 0 && (
              <StatPill value={stats.total_sessions} label="Toplam Oturum" />
            )}
          </div>
        </div>
      </section>

      {/* ── Sanal Hasta (3D) ─────────────────────────────────────── */}
      <Reveal as="section" className="mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="t-title text-ink-50">Sanal Hasta — 3D</h2>
          <div className="font-mono text-[10px] text-ink-600 uppercase tracking-[0.15em]">/ Etkileşimli Model</div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {PATIENT_DEMOS.map(({ to, Icon, title, body, tag, color }, i) => (
            <Reveal key={to} delay={i * 110}>
              <Link
                to={to}
                className="group relative flex flex-col h-full bg-ink-900 border border-ink-700 rounded-lg p-6 hover:border-ink-600 neon-card"
                style={{ ...cardGlow(color), borderLeftColor: color, borderLeftWidth: 2 }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, ${color}10, transparent 70%)` }}
                />
                {tag && (
                  <span
                    className="absolute top-4 right-4 font-mono text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded border"
                    style={{ color, borderColor: `${color}55`, background: `${color}15` }}
                  >
                    {tag}
                  </span>
                )}
                <div
                  className="relative w-10 h-10 rounded-md flex items-center justify-center mb-4 shrink-0"
                  style={{
                    background: `${color}15`,
                    color,
                    boxShadow: `0 0 12px -4px ${color}66, inset 0 0 8px -6px ${color}66`,
                    border: `1px solid ${color}40`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
                </div>
                <h3 className="relative font-display text-lg text-ink-50 mb-2">{title}</h3>
                <p className="relative t-caption text-ink-400 leading-relaxed flex-1">{body}</p>
                <div
                  className="relative mt-4 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] group-hover:gap-2 transition-all"
                  style={{ color }}
                >
                  Aç <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ── Mod kartları ─────────────────────────────────────────── */}
      <Reveal as="section" className="mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="t-title text-ink-50">Nasıl oynamak istersin?</h2>
          <div className="font-mono text-[10px] text-ink-600 uppercase tracking-[0.15em]">/ Modlar</div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {MODE_CARDS.map(({ id, Icon, title, body, color }, i) => (
            <Reveal key={id} delay={i * 110}>
              <Link
                to="/senaryolar"
                className="group relative flex flex-col h-full bg-ink-900 border border-ink-700 rounded-lg p-6 hover:border-ink-600 neon-card"
                style={{ ...cardGlow(color), borderLeftColor: color, borderLeftWidth: 2 }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, ${color}10, transparent 70%)` }}
                />
                <div
                  className="relative w-10 h-10 rounded-md flex items-center justify-center mb-4 shrink-0"
                  style={{
                    background: `${color}15`,
                    color,
                    boxShadow: `0 0 12px -4px ${color}66, inset 0 0 8px -6px ${color}66`,
                    border: `1px solid ${color}40`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
                </div>
                <h3 className="relative font-display text-lg text-ink-50 mb-2">{title}</h3>
                <p className="relative t-caption text-ink-400 leading-relaxed flex-1">{body}</p>
                <div
                  className="relative mt-4 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] group-hover:gap-2 transition-all"
                  style={{ color }}
                >
                  Başla <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ── Son oturumlar ─────────────────────────────────────────── */}
      {recentSessions.length > 0 && (
        <Reveal as="section" className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="t-title text-ink-50">Son Oturumlar</h2>
            <Link
              to="/gecmis"
              className="font-mono text-[10px] text-brand-light hover:text-brand uppercase tracking-[0.1em] flex items-center gap-1 transition"
            >
              Tümü <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentSessions.map((s, i) => {
              const theme = getSpecialtyTheme((s.scenario_specialty as Specialty) ?? "dahiliye");
              const pct = Math.round((s.total_score / s.max_points) * 100);
              const gradeColor = GRADE_HEX[s.grade] ?? theme.accent;
              return (
                <Reveal key={s.id} delay={i * 90}>
                  <div
                    className="flex items-center gap-4 px-4 py-3 bg-ink-900 border border-ink-700 rounded-lg neon-card"
                    style={{ ...cardGlow(theme.accent), borderLeftColor: theme.accent, borderLeftWidth: 2 }}
                  >
                    {/* Harf notu */}
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 font-display text-xl"
                      style={{
                        color: gradeColor,
                        background: `${gradeColor}15`,
                        boxShadow: `0 0 10px -4px ${gradeColor}77`,
                      }}
                    >
                      {s.grade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-ink-100 text-sm font-medium truncate">{s.scenario_title}</div>
                      <div className="font-mono text-[10px] text-ink-500 mt-0.5">
                        {specialtyLabel(s.scenario_specialty)} · %{pct} ·{" "}
                        {new Date(s.played_at).toLocaleDateString("tr-TR", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </div>
                    </div>
                    <Link
                      to="/gecmis"
                      className="font-mono text-[10px] text-ink-500 hover:text-ink-200 transition shrink-0"
                    >
                      Detay →
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Reveal>
      )}

      {/* ── Öne çıkan senaryolar ────────────────────────────────── */}
      <Reveal as="section">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="t-title text-ink-50">Öne Çıkan Senaryolar</h2>
          <Link
            to="/senaryolar"
            className="font-mono text-[10px] text-brand-light hover:text-brand uppercase tracking-[0.1em] flex items-center gap-1 transition"
          >
            Tümünü Gör <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {SCENARIOS.slice(0, 4).map((s, i) => {
            const theme = getSpecialtyTheme(s.specialty);
            return (
              <Reveal key={s.id} delay={i * 80}>
                <Link
                  to={`/oyna/${s.id}`}
                  className="group flex items-start gap-4 h-full p-4 bg-ink-900 border border-ink-700 rounded-lg neon-card"
                  style={{ ...cardGlow(theme.accent), borderLeftColor: theme.accent, borderLeftWidth: 2 }}
                >
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: theme.accentBg,
                      color: theme.accent,
                      boxShadow: `0 0 10px -4px ${theme.accent}66`,
                    }}
                  >
                    <SpecialtyIcon specialty={s.specialty} className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <span
                        className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
                        style={{ color: theme.accent, borderColor: `${theme.accent}44`, background: theme.accentBg }}
                      >
                        {theme.label}
                      </span>
                    </div>
                    <h3 className="font-display text-base text-ink-50 leading-snug line-clamp-1 group-hover:text-ink-100 transition">
                      {s.title}
                    </h3>
                    <div className="font-mono text-[10px] text-ink-500 mt-1">
                      ~{s.estimated_minutes}dk · {s.steps.length} adım · {s.scoring.max_points}p
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-600 group-hover:text-ink-300 shrink-0 mt-1 transition" />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}

function StatPill({ value, label }: { value: string | number; label: string }) {
  const isNumeric = typeof value === "number";
  return (
    <div>
      <div className="t-data-lg text-ink-50">
        {isNumeric ? <CountUpValue target={value} /> : value}
      </div>
      <div className="t-label text-ink-500 mt-0.5">{label}</div>
    </div>
  );
}

function CountUpValue({ target }: { target: number }) {
  const val = useCountUp(target);
  return <>{val}</>;
}
