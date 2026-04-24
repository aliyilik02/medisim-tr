import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Plus, AlertTriangle, Pencil, Trash2, ArrowRight } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import {
  listLocalScenarios,
  deleteLocalScenario,
  getDraft,
  clearDraft,
  type StoredScenario,
} from "@/storage/scenarioStorage";
import type { Specialty } from "@/engine/types";
import { FilterBar } from "@/components/scenario-list/FilterBar";
import { SpecialtySection } from "@/components/scenario-list/SpecialtySection";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";

// ── Yerel senaryo mini-kartı (mevcut davranış korunuyor) ──────────────

function LocalScenarioRow({ scenario, onDelete }: { scenario: StoredScenario; onDelete: () => void }) {
  const theme = getSpecialtyTheme(scenario.specialty as Specialty ?? "dahiliye");
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 bg-ink-900 border border-ink-700 rounded-lg"
      style={{ borderLeftColor: theme.accent, borderLeftWidth: 2 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border"
            style={{ color: theme.accent, borderColor: `${theme.accent}44`, background: theme.accentBg }}
          >
            {theme.label}
          </span>
          {scenario._draft && (
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-clinical-warning/40 text-clinical-warning bg-clinical-warning/10">
              Taslak
            </span>
          )}
        </div>
        <h3 className="font-display text-base text-ink-100 truncate">{scenario.title}</h3>
        <div className="font-mono text-[10px] text-ink-500 mt-0.5">
          Güncellendi:{" "}
          {new Date(scenario._updatedAt).toLocaleDateString("tr-TR", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          to={`/senaryo-editor/${scenario.id}`}
          className="p-1.5 rounded text-ink-500 hover:text-brand-light hover:bg-ink-700 transition"
          title="Düzenle"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={onDelete}
          className="p-1.5 rounded text-ink-500 hover:text-clinical-critical hover:bg-ink-700 transition"
          title="Sil"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {!scenario._draft && (
          <Link
            to={`/oyna/${scenario.id}`}
            className="ml-1 px-3 py-1.5 rounded font-mono text-[11px] text-brand-light border border-brand/30 hover:bg-brand/10 transition"
          >
            Oyna
          </Link>
        )}
        {scenario._draft && (
          <Link
            to={`/senaryo-editor/${scenario.id}`}
            className="ml-1 px-3 py-1.5 rounded font-mono text-[11px] text-clinical-warning border border-clinical-warning/30 hover:bg-clinical-warning/10 transition flex items-center gap-1"
          >
            Tamamla <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Boş durum ─────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Stetoskop line art */}
      <svg
        viewBox="0 0 80 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-20 h-20 text-ink-600 mb-6"
      >
        <rect x="24" y="18" width="32" height="22" rx="6" />
        <path d="M36 40L36 52C36 58 42 62 48 58L52 56" />
        <circle cx="56" cy="54" r="6" />
        <circle cx="30" cy="18" r="3" />
        <circle cx="50" cy="18" r="3" />
      </svg>
      <p className="t-heading text-ink-400 mb-2">Bu filtrelerle senaryo bulunamadı</p>
      <p className="t-caption text-ink-600 mb-6">Başka bir uzmanlık alanı seçin veya filtreleri temizleyin</p>
      <button
        onClick={onClear}
        className="btn-ghost text-sm"
      >
        Filtreleri Temizle
      </button>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────

export function ScenarioListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Specialty | null>(null);
  const [localScenarios, setLocalScenarios] = useState<StoredScenario[]>(
    () => listLocalScenarios()
  );
  const hasDraft = !!getDraft() && !localScenarios.some((s) => s.id === getDraft()?.id);

  // Uzmanlık grupları ve sayıları
  const specialties = useMemo(
    () => Array.from(new Set(SCENARIOS.map((s) => s.specialty))) as Specialty[],
    []
  );
  const counts = useMemo(
    () => Object.fromEntries(
      specialties.map((sp) => [sp, SCENARIOS.filter((s) => s.specialty === sp).length])
    ) as Partial<Record<Specialty, number>>,
    [specialties]
  );

  // Filtrelenmiş senaryo grupları
  const visibleSpecialties = filter ? [filter] : specialties;
  const filteredCount = filter ? (counts[filter] ?? 0) : SCENARIOS.length;

  const handleNewScenario = () => { clearDraft(); navigate("/senaryo-editor"); };
  const handleContinueDraft = () => navigate("/senaryo-editor");
  const handleDelete = (id: string) => {
    if (!confirm("Bu senaryoyu silmek istediğinden emin misin?")) return;
    deleteLocalScenario(id);
    setLocalScenarios(listLocalScenarios());
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* ── Hero başlık ──────────────────────────────────────────── */}
      <header className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-4">
          / Senaryo Kütüphanesi
        </div>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="t-display text-ink-50 mb-2">
              Klinik Senaryolar
            </h1>
            <p className="t-body text-ink-400 max-w-xl">
              <span className="font-mono tabular-nums text-ink-200">{SCENARIOS.length}</span> senaryo
              {" · "}
              <span className="font-mono tabular-nums text-ink-200">{specialties.length}</span> uzmanlık
              {" · "}
              ESC · AHA · TKD uyumlu
            </p>
          </div>
          <button
            onClick={handleNewScenario}
            className="btn-primary shrink-0"
          >
            <Plus className="w-4 h-4" />
            Yeni Senaryo
          </button>
        </div>
      </header>

      {/* ── Taslak banner ─────────────────────────────────────────── */}
      {hasDraft && (
        <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-md bg-clinical-warning/8 border border-clinical-warning/25">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-clinical-warning shrink-0" />
            <span className="t-caption text-clinical-warning">
              Tamamlanmamış bir senaryo taslağın var.
            </span>
          </div>
          <button
            onClick={handleContinueDraft}
            className="font-mono text-xs text-clinical-warning hover:text-ink-50 underline underline-offset-2 transition shrink-0"
          >
            Devam et →
          </button>
        </div>
      )}

      {/* ── Yerel senaryolarım ─────────────────────────────────────── */}
      {localScenarios.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="t-label text-ink-500">Senaryolarım</span>
            <span className="font-mono text-[10px] text-ink-600">({localScenarios.length})</span>
          </div>
          <div className="grid md:grid-cols-2 gap-2.5">
            {localScenarios.map((s) => (
              <LocalScenarioRow
                key={s.id}
                scenario={s}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
          <div
            className="mt-6 mb-2 h-px"
            style={{ background: "linear-gradient(to right, rgba(255,255,255,0.05), transparent)" }}
          />
        </section>
      )}

      {/* ── Filter bar ────────────────────────────────────────────── */}
      <FilterBar
        specialties={specialties}
        active={filter}
        totalCount={SCENARIOS.length}
        counts={counts}
        onChange={setFilter}
      />

      {/* ── Specialty bölümleri ───────────────────────────────────── */}
      {filteredCount === 0 ? (
        <EmptyState onClear={() => setFilter(null)} />
      ) : (
        <div>
          {visibleSpecialties.map((sp) => {
            const group = SCENARIOS.filter((s) => s.specialty === sp);
            if (group.length === 0) return null;
            const startIdx = visibleSpecialties.slice(0, visibleSpecialties.indexOf(sp))
              .reduce((sum, s2) => sum + (counts[s2] ?? 0), 0);
            return (
              <SpecialtySection
                key={sp}
                specialty={sp}
                scenarios={group}
                startIndex={startIdx}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
