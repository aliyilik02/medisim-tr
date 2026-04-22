import { Link } from "react-router-dom";
import { ArrowRight, Stethoscope, Shield, Brain, Target } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";

export function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
      {/* Hero */}
      <section className="max-w-3xl animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <span className="tag tag-brand">v0.1 · alpha</span>
          <span className="tag">Türkiye Odaklı</span>
        </div>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-ink-50 mb-6">
          Sanal hasta üzerinde
          <br />
          <span className="italic text-brand-light">gerçek klinik</span> kararlar.
        </h1>
        <p className="text-ink-200 text-lg max-w-2xl leading-relaxed mb-10">
          MediSim TR, tıp öğrencileri, hemşireler, acil tıp teknisyenleri ve saha
          sağlıkçıları için geliştirilmiş, Türkiye müfredatına özel senaryo
          tabanlı bir klinik simülasyon platformudur.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/senaryolar" className="btn-primary">
            Senaryoları Gör
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#ozellikler" className="btn-ghost">
            Nasıl çalışır?
          </a>
        </div>
      </section>

      {/* Stat cards */}
      <section className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Aktif Senaryo", value: SCENARIOS.length.toString() },
          { label: "Uzmanlık Alanı", value: "5+" },
          { label: "Oyun Modu", value: "2" },
          { label: "Klinik Referans", value: "ESC / AHA / TKD" },
        ].map((stat, i) => (
          <div
            key={i}
            className="panel p-5 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-2">
              {stat.label}
            </div>
            <div className="font-display text-3xl text-ink-50">{stat.value}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="ozellikler" className="mt-24">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="font-display text-3xl text-ink-50">Ne var içinde?</h2>
          <div className="font-mono text-xs text-ink-400 uppercase tracking-wider">
            / Özellikler
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FeatureCard
            icon={<Stethoscope className="w-5 h-5" />}
            title="Quiz Modu"
            body="Adım adım klinik karar verme. İlaç seç, tetkik iste, EKG yorumla, tanı koy. Her aksiyon puanlanır, yanlışlar anında açıklanır."
            status="aktif"
          />
          <FeatureCard
            icon={<Target className="w-5 h-5" />}
            title="3D İnteraktif Modül"
            body="Body Interact tarzı — hastaya ve ekipmanlara dokunarak müdahale et. Oskültasyon, damar yolu açma, turnike uygulama."
            status="yakında"
          />
          <FeatureCard
            icon={<Brain className="w-5 h-5" />}
            title="Eğitim + Sınav"
            body="Eğitim modunda anında feedback ve açıklama. Sınav modunda zamanlı, feedback yok, sonunda harf notu ve debrief."
            status="aktif"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Askeri / TCCC Modülü"
            body="Taktik saha tıbbı senaryoları. Turnike, penetran toraks travması, hemostatik gazlı bez — NATO TCCC standartları."
            status="yakında"
          />
        </div>
      </section>

      {/* Specialties preview */}
      <section className="mt-24">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="font-display text-3xl text-ink-50">Mevcut senaryolar</h2>
          <Link
            to="/senaryolar"
            className="font-mono text-xs text-brand-light hover:text-brand uppercase tracking-wider flex items-center gap-1"
          >
            Hepsi <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {SCENARIOS.slice(0, 4).map((s) => (
            <Link
              key={s.id}
              to={`/oyna/${s.id}`}
              className="panel p-5 hover:border-brand/40 transition group"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="tag tag-brand">{s.specialty}</span>
                    <span className="tag">Zorluk {s.difficulty}/5</span>
                  </div>
                  <h3 className="font-display text-xl text-ink-50 group-hover:text-brand-light transition">
                    {s.title}
                  </h3>
                </div>
                <ArrowRight className="w-5 h-5 text-ink-500 group-hover:text-brand-light group-hover:translate-x-1 transition" />
              </div>
              <p className="text-sm text-ink-300 leading-relaxed line-clamp-2">
                {s.description}
              </p>
              <div className="flex items-center gap-3 mt-4 text-xs font-mono text-ink-400">
                <span>{s.estimated_minutes} dk</span>
                <span>·</span>
                <span>{s.steps.length} adım</span>
                <span>·</span>
                <span>{s.scoring.max_points} puan</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  status: "aktif" | "yakında";
}) {
  return (
    <div className="panel p-6 group hover:border-ink-500 transition">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
          {icon}
        </div>
        <span
          className={
            status === "aktif"
              ? "tag tag-brand"
              : "tag"
          }
        >
          {status === "aktif" ? "• aktif" : "yakında"}
        </span>
      </div>
      <h3 className="font-display text-2xl text-ink-50 mb-2">{title}</h3>
      <p className="text-sm text-ink-300 leading-relaxed">{body}</p>
    </div>
  );
}
