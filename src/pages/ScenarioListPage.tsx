import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SCENARIOS } from "@/data/scenarios";
import {
  listLocalScenarios,
  deleteLocalScenario,
  getDraft,
  clearDraft,
  type StoredScenario,
} from "@/storage/scenarioStorage";
import { ArrowRight, Filter, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
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
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);
  const [localScenarios, setLocalScenarios] = useState<StoredScenario[]>(
    () => listLocalScenarios()
  );
  const hasDraft = !!getDraft() && !localScenarios.some((s) => s.id === getDraft()?.id);

  const specialties = Array.from(new Set(SCENARIOS.map((s) => s.specialty)));
  const filtered = filter
    ? SCENARIOS.filter((s) => s.specialty === filter)
    : SCENARIOS;

  const handleNewScenario = () => {
    clearDraft();
    navigate("/senaryo-editor");
  };

  const handleContinueDraft = () => {
    navigate("/senaryo-editor");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu senaryoyu silmek istediğinden emin misin?")) return;
    deleteLocalScenario(id);
    setLocalScenarios(listLocalScenarios());
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400 mb-3">
          / Senaryo Kütüphanesi
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl text-ink-50 mb-4">
              Klinik Senaryolar
            </h1>
            <p className="text-ink-300 max-w-2xl">
              Bir senaryo seç, eğitim veya sınav modunda oyna. Her senaryo
              gerçek klinik kılavuzlara dayanır.
            </p>
          </div>
          <button
            onClick={handleNewScenario}
            className="btn-primary shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni Senaryo Oluştur
          </button>
        </div>
      </header>

      {/* Tamamlanmamış taslak banner */}
      {hasDraft && (
        <div className="mb-6 flex items-center justify-between gap-4 px-5 py-3.5 rounded-md bg-clinical-warning/10 border border-clinical-warning/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-clinical-warning shrink-0" />
            <span className="text-sm text-clinical-warning">
              Tamamlanmamış bir senaryo taslağın var.
            </span>
          </div>
          <button
            onClick={handleContinueDraft}
            className="text-sm font-mono text-clinical-warning hover:text-ink-50 underline underline-offset-2 transition shrink-0"
          >
            Devam et →
          </button>
        </div>
      )}

      {/* ====================================================== */}
      {/* SENARYOLARıM (Yerel)                                    */}
      {/* ====================================================== */}
      {localScenarios.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">
              Senaryolarım
            </div>
            <span className="tag">{localScenarios.length}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {localScenarios.map((s) => (
              <div
                key={s.id}
                className="panel p-5 flex flex-col gap-3 animate-slide-up"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="tag tag-brand">
                        {SPECIALTY_LABELS[s.specialty] ?? s.specialty}
                      </span>
                      {s._draft && (
                        <span className="tag text-clinical-warning border-clinical-warning/40 bg-clinical-warning/10">
                          taslak
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-xl text-ink-50 truncate">
                      {s.title}
                    </h3>
                    {s.description && (
                      <p className="text-xs text-ink-400 mt-1 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/senaryo-editor/${s.id}`}
                      className="p-1.5 rounded text-ink-400 hover:text-brand-light hover:bg-ink-700 transition"
                      title="Düzenle"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded text-ink-400 hover:text-clinical-critical hover:bg-ink-700 transition"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] text-ink-500">
                    Güncellendi:{" "}
                    {new Date(s._updatedAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  {!s._draft && (
                    <Link
                      to={`/oyna/${s.id}`}
                      className="text-xs font-mono text-brand hover:text-brand-light transition flex items-center gap-1"
                    >
                      Oyna <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                  {s._draft && (
                    <Link
                      to={`/senaryo-editor/${s.id}`}
                      className="text-xs font-mono text-clinical-warning hover:text-ink-50 transition flex items-center gap-1"
                    >
                      Tamamla <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {localScenarios.length === 0 && (
        <section className="mb-12">
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-4">
            Senaryolarım
          </div>
          <div className="panel p-10 text-center">
            <p className="text-ink-500 text-sm mb-4">
              Henüz yerel senaryonuz yok.
            </p>
            <button onClick={handleNewScenario} className="btn-primary">
              <Plus className="w-4 h-4" />
              İlk senaryonu oluştur →
            </button>
          </div>
        </section>
      )}

      {/* ====================================================== */}
      {/* HAZIR SENARYOLAR (Kod içi)                              */}
      {/* ====================================================== */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">
            Hazır Senaryolar
          </div>
          <span className="tag">{SCENARIOS.length}</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-ink-400 mr-1" />
          <button
            onClick={() => setFilter(null)}
            className={cn("tag transition", filter === null && "tag-brand")}
          >
            Tümü ({SCENARIOS.length})
          </button>
          {specialties.map((sp) => (
            <button
              key={sp}
              onClick={() => setFilter(sp)}
              className={cn("tag transition", filter === sp && "tag-brand")}
            >
              {SPECIALTY_LABELS[sp] ?? sp}
            </button>
          ))}
        </div>

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
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="tag tag-brand">
                      {SPECIALTY_LABELS[s.specialty] ?? s.specialty}
                    </span>
                    <DifficultyBars level={s.difficulty} />
                    {(s.variants?.length ?? 0) > 0 && (
                      <span className="tag">
                        {s.variants!.length + 1} varyant
                      </span>
                    )}
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
                <span className="ml-auto">{s.tags.slice(0, 2).join(" · ")}</span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="panel p-12 text-center text-ink-400">
            Bu uzmanlık alanında henüz senaryo yok.
          </div>
        )}
      </section>
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
