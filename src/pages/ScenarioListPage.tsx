import { Link } from "react-router-dom";
import { useState } from "react";
import { SCENARIOS } from "@/data/scenarios";
import { ArrowRight, Filter } from "lucide-react";
import { cn } from "@/lib/cn";

const SPECIALTY_LABELS: Record<string, string> = {
  kardiyoloji: "Kardiyoloji",
  dahiliye: "Dahiliye",
  acil: "Acil",
  pediatri: "Pediatri",
  cerrahi: "Cerrahi",
  anestezi: "Anestezi",
  kadin_dogum: "Kadın Doğum",
  hemsirelik: "Hemşirelik",
  askeri_tccc: "Askeri / TCCC",
};

export function ScenarioListPage() {
  const [filter, setFilter] = useState<string | null>(null);

  const specialties = Array.from(
    new Set(SCENARIOS.map((s) => s.specialty))
  );

  const filtered = filter
    ? SCENARIOS.filter((s) => s.specialty === filter)
    : SCENARIOS;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-12">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400 mb-3">
          / Senaryo Kütüphanesi
        </div>
        <h1 className="font-display text-5xl text-ink-50 mb-4">
          Klinik Senaryolar
        </h1>
        <p className="text-ink-300 max-w-2xl">
          Bir senaryo seç, eğitim veya sınav modunda oyna. Her senaryo
          gerçek klinik kılavuzlara dayanır ve kaynak referansıyla birlikte
          gelir.
        </p>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <Filter className="w-4 h-4 text-ink-400 mr-1" />
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "tag transition",
            filter === null && "tag-brand"
          )}
        >
          Tümü ({SCENARIOS.length})
        </button>
        {specialties.map((sp) => (
          <button
            key={sp}
            onClick={() => setFilter(sp)}
            className={cn(
              "tag transition",
              filter === sp && "tag-brand"
            )}
          >
            {SPECIALTY_LABELS[sp] ?? sp}
          </button>
        ))}
      </div>

      {/* Scenario grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((s, i) => (
          <Link
            key={s.id}
            to={`/oyna/${s.id}`}
            className="panel p-6 hover:border-brand/40 transition group animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="tag tag-brand">
                    {SPECIALTY_LABELS[s.specialty] ?? s.specialty}
                  </span>
                  <DifficultyBars level={s.difficulty} />
                </div>
                <h3 className="font-display text-2xl text-ink-50 group-hover:text-brand-light transition mb-2">
                  {s.title}
                </h3>
              </div>
              <ArrowRight className="w-5 h-5 text-ink-500 group-hover:text-brand-light group-hover:translate-x-1 transition flex-shrink-0" />
            </div>
            <p className="text-sm text-ink-300 leading-relaxed mb-5">
              {s.description}
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-ink-400 pt-4 border-t border-ink-700">
              <span>⏱ {s.estimated_minutes} dk</span>
              <span>◆ {s.steps.length} adım</span>
              <span>▲ {s.scoring.max_points} puan</span>
              <span className="ml-auto">
                {s.tags.slice(0, 2).join(" · ")}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="panel p-12 text-center text-ink-400">
          Bu uzmanlık alanında henüz senaryo yok.
        </div>
      )}
    </div>
  );
}

function DifficultyBars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={cn(
            "w-1 h-3 rounded-sm transition",
            n <= level ? "bg-brand" : "bg-ink-600"
          )}
        />
      ))}
    </div>
  );
}
