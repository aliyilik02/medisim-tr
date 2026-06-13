import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, Stethoscope, Timer, Bed, MessageSquare, Film, Sparkles } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import { getStats, listSessions } from "@/storage/sessionHistory";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";
import { SpecialtyIcon } from "@/assets/specialty-icons";
import { EkgBackdrop } from "@/components/ui/EkgBackdrop";
import { specialtyLabel } from "@/utils/export/helpers";
import type { Specialty } from "@/engine/types";

const GRADE_HEX: Record<string, string> = {
  A: "#22c55e", B: "#0d9488", C: "#eab308", D: "#f97316", F: "#ef4444",
};

// 3D Sanal Hasta demo route'ları (tam ekran R3F sahneleri).
const PATIENT_DEMOS = [
  {
    to: "/faz2-demo",
    Icon: Bed,
    title: "Klinik Sahne",
    body: "Acil servis odası, yatakta sanal hasta. Sakin/öksürük/ağrı/konuşma animasyonları + canlı mimik.",
    tag: "YENİ",
    color: "#0d9488",
  },
  {
    to: "/dialog-3d-demo",
    Icon: MessageSquare,
    title: "3D + AI Diyalog",
    body: "Hastayla konuş — yapay zekâ yanıtlar, 3D model dudak senkronu ve mimikle eşlik eder.",
    color: "#3b82f6",
  },
  {
    to: "/animasyon-demo",
    Icon: Film,
    title: "Animasyon Stüdyo",
    body: "İskelet hareket + 52 ARKit yüz mimiği. Klipleri ve lipsync'i tek tek dene.",
    color: "#a855f7",
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
      <section className="relative mb-20 rounded-2xl overflow-hidden border border-ink-700/50 bg-ink-950">
        {/* EKG ambient backdrop */}
        <div className="absolute bottom-0 left-0 right-0 h-20">
          <EkgBackdrop className="w-full h-full" />
        </div>

        {/* Subtle radial glow */}
        <div
          className="absolute top-0 left-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(13,148,136,0.07), transparent 60%)" }}
        />

        <div className="relative px-8 md:px-16 py-16 md:py-20">
          {/* Eyebrow */}
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-500 mb-6">
            / MediSim TR · Sanal Hasta Platformu
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl md:text-7xl text-ink-50 leading-[0.95] mb-4">
            Sanal hasta.
            <br />
            <span className="italic text-brand-light">Gerçek klinik</span>{" "}
            kararlar.
          </h1>

          <p className="t-body text-ink-400 max-w-lg mt-4 mb-10 leading-relaxed">
            Türkiye müfredatına özel senaryo tabanlı klinik simülasyon.
            TKD · ESC · AHA uyumlu. Tıp eğitimi, hemşirelik, acil, ATT.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/senaryolar" className="btn-primary">
              Senaryolara Git
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/faz2-demo" className="btn-ghost">
              <Sparkles className="w-4 h-4" />
              3D Sanal Hasta
            </Link>
            <Link to="/gecmis" className="btn-ghost">
              Oturum Geçmişi
            </Link>
          </div>

          {/* Mini stats */}
          <div className="flex flex-wrap gap-8 mt-10 pt-8 border-t border-ink-700/40">
            <StatPill value={SCENARIOS.length.toString()} label="Aktif Senaryo" />
            <StatPill value={`${specialtyCount}`} label="Uzmanlık Alanı" />
            <StatPill value="ESC · AHA · TKD" label="Klinik Referans" />
            {stats && stats.total_sessions > 0 && (
              <StatPill value={stats.total_sessions.toString()} label="Toplam Oturum" />
            )}
          </div>
        </div>
      </section>

      {/* ── Sanal Hasta (3D) ─────────────────────────────────────── */}
      <section className="mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="t-title text-ink-50">Sanal Hasta — 3D</h2>
          <div className="font-mono text-[10px] text-ink-600 uppercase tracking-[0.15em]">/ Etkileşimli Model</div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {PATIENT_DEMOS.map(({ to, Icon, title, body, tag, color }, i) => (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-col bg-ink-900 border border-ink-700 rounded-lg p-6 hover:border-ink-600 transition-all duration-200 animate-slide-up"
              style={{
                animationDelay: `${i * 80}ms`,
                borderLeftColor: color,
                borderLeftWidth: 2,
              }}
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
                style={{ background: `${color}15`, color }}
              >
                <Icon className="w-5 h-5" />
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
          ))}
        </div>
      </section>

      {/* ── Mod kartları ─────────────────────────────────────────── */}
      <section className="mb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="t-title text-ink-50">Nasıl oynamak istersin?</h2>
          <div className="font-mono text-[10px] text-ink-600 uppercase tracking-[0.15em]">/ Modlar</div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {MODE_CARDS.map(({ id, Icon, title, body, color }, i) => (
            <Link
              key={id}
              to="/senaryolar"
              className="group relative flex flex-col bg-ink-900 border border-ink-700 rounded-lg p-6 hover:border-ink-600 transition-all duration-200 animate-slide-up"
              style={{
                animationDelay: `${i * 80}ms`,
                borderLeftColor: color,
                borderLeftWidth: 2,
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg"
                style={{ background: `radial-gradient(ellipse at 0% 50%, ${color}10, transparent 70%)` }}
              />
              <div
                className="relative w-10 h-10 rounded-md flex items-center justify-center mb-4 shrink-0"
                style={{ background: `${color}15`, color }}
              >
                <Icon className="w-5 h-5" />
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
          ))}
        </div>
      </section>

      {/* ── Son oturumlar ─────────────────────────────────────────── */}
      {recentSessions.length > 0 && (
        <section className="mb-16">
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
            {recentSessions.map((s) => {
              const theme = getSpecialtyTheme((s.scenario_specialty as Specialty) ?? "dahiliye");
              const pct = Math.round((s.total_score / s.max_points) * 100);
              const gradeColor = GRADE_HEX[s.grade] ?? theme.accent;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-4 py-3 bg-ink-900 border border-ink-700 rounded-lg"
                  style={{ borderLeftColor: theme.accent, borderLeftWidth: 2 }}
                >
                  {/* Harf notu */}
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 font-display text-xl"
                    style={{ color: gradeColor, background: `${gradeColor}15` }}
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
              );
            })}
          </div>
        </section>
      )}

      {/* ── Öne çıkan senaryolar ────────────────────────────────── */}
      <section>
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
              <Link
                key={s.id}
                to={`/oyna/${s.id}`}
                className="group flex items-start gap-4 p-4 bg-ink-900 border border-ink-700 rounded-lg hover:-translate-y-0.5 transition-all duration-200 animate-slide-up"
                style={{
                  animationDelay: `${i * 60}ms`,
                  borderLeftColor: theme.accent,
                  borderLeftWidth: 2,
                }}
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: theme.accentBg, color: theme.accent }}
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
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="t-data-lg text-ink-50">{value}</div>
      <div className="t-label text-ink-500 mt-0.5">{label}</div>
    </div>
  );
}
