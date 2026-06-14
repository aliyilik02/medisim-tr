// ============================================================
// ClinicalReviewPage — /klinik-review klinik onay dashboard'u (Faz ④)
// ============================================================
// CLAUDE.md "Klinik İçerik Disiplini": DRAFT → REVIEWED_PENDING_ACTIVATION →
// ACTIVE. ACTIVE'e geçişi SADECE Ali Bey yapar. Bu dashboard review SÜRECİNİ
// yönetir: otomatik bütünlük checklist'i + elle doğrulama (localStorage
// çalışma defteri) + hedef durum + kalıcılaştırma için TS snippet üretir.
// Kodu otomatik DEĞİŞTİRMEZ — Ali Bey snippet'i senaryo dosyasına yapıştırır.
// ============================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  CircleDashed,
  ClipboardCopy,
  ShieldCheck,
} from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import {
  getClinicalStatus,
  buildReviewChecklist,
  CLINICAL_STATUS_ORDER,
  CLINICAL_STATUS_LABEL,
  type ClinicalReviewStatus,
  type Scenario,
} from "@/engine";
import {
  getLocalReview,
  saveLocalReview,
  type LocalReview,
} from "@/storage/clinicalReview";
import { getSpecialtyTheme } from "@/hooks/useSpecialtyTheme";
import { cn } from "@/lib/cn";

const STATUS_STYLE: Record<ClinicalReviewStatus, string> = {
  DRAFT: "text-clinical-warning border-clinical-warning/40 bg-clinical-warning/10",
  REVIEWED_PENDING_ACTIVATION:
    "text-clinical-info border-clinical-info/40 bg-clinical-info/10",
  ACTIVE: "text-clinical-stable border-clinical-stable/40 bg-clinical-stable/10",
};

function StatusBadge({ status }: { status: ClinicalReviewStatus }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-[0.1em] border whitespace-nowrap",
        STATUS_STYLE[status]
      )}
    >
      {CLINICAL_STATUS_LABEL[status]}
    </span>
  );
}

export function ClinicalReviewPage() {
  const [selectedId, setSelectedId] = useState<string>(SCENARIOS[0]?.id ?? "");
  // localStorage çalışma defteri — kaydet → tick ile re-render
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const counts = useMemo(() => {
    const c: Record<ClinicalReviewStatus, number> = {
      DRAFT: 0,
      REVIEWED_PENDING_ACTIVATION: 0,
      ACTIVE: 0,
    };
    for (const s of SCENARIOS) c[getClinicalStatus(s)]++;
    return c;
  }, []);

  const selected = SCENARIOS.find((s) => s.id === selectedId);

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      {/* Üst bar */}
      <header className="sticky top-0 z-30 border-b border-ink-700/50 bg-ink-950/95 backdrop-blur-md px-5 py-3 flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Çıkış
        </Link>
        <div className="h-4 w-px bg-ink-700" />
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-light" />
          <h1 className="font-display text-lg">Klinik Review Hattı</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[11px]">
          {CLINICAL_STATUS_ORDER.map((st) => (
            <span key={st} className="flex items-center gap-1">
              <StatusBadge status={st} />
              <span className="text-ink-300 tabular-nums">{counts[st]}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-4 grid lg:grid-cols-[340px_1fr] gap-4">
        {/* Sol — senaryo listesi (durum gruplu) */}
        <aside className="space-y-4">
          {CLINICAL_STATUS_ORDER.map((status) => {
            const group = SCENARIOS.filter(
              (s) => getClinicalStatus(s) === status
            );
            if (group.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={status} />
                  <span className="font-mono text-[10px] text-ink-500">
                    {group.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.map((s) => {
                    const theme = getSpecialtyTheme(s.specialty);
                    const active = s.id === selectedId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedId(s.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md border transition flex items-center gap-2",
                          active
                            ? "border-brand/50 bg-brand/5"
                            : "border-ink-700 bg-ink-900/50 hover:border-ink-500"
                        )}
                        style={{ borderLeftColor: theme.accent, borderLeftWidth: 2 }}
                      >
                        <span className="flex-1 min-w-0 truncate text-sm text-ink-100">
                          {s.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Sağ — seçili senaryo review paneli */}
        <section>
          {selected ? (
            <ReviewPanel key={selected.id + tick} scenario={selected} onSaved={refresh} />
          ) : (
            <div className="panel p-8 text-center text-ink-400">
              Senaryo seçin.
            </div>
          )}
        </section>
      </div>

      {/* Disclaimer */}
      <div className="max-w-7xl mx-auto px-5 pb-8 font-mono text-[10px] text-ink-500 uppercase tracking-[0.1em]">
        Eğitim amaçlıdır, klinik karar destek değildir · ACTIVE'e geçişi yalnızca
        yetkili klinik gözden geçiren yapar
      </div>
    </div>
  );
}

function CheckIcon({ pass }: { pass: boolean | null }) {
  if (pass === true) return <CheckCircle2 className="w-4 h-4 text-clinical-stable shrink-0" />;
  if (pass === false) return <XCircle className="w-4 h-4 text-clinical-critical shrink-0" />;
  return <CircleDashed className="w-4 h-4 text-ink-500 shrink-0" />;
}

function ReviewPanel({
  scenario,
  onSaved,
}: {
  scenario: Scenario;
  onSaved: () => void;
}) {
  const status = getClinicalStatus(scenario);
  const checklist = useMemo(() => buildReviewChecklist(scenario), [scenario]);
  const local: LocalReview | null = getLocalReview(scenario.id);

  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>(
    local?.manual_checks ?? {}
  );
  const [intended, setIntended] = useState<ClinicalReviewStatus>(
    local?.intended_status ?? status
  );
  const [notes, setNotes] = useState<string>(local?.notes ?? "");
  const [copied, setCopied] = useState(false);

  const autoFail = checklist.filter((c) => c.pass === false);
  const manualItems = checklist.filter((c) => c.pass === null);
  const allManualChecked = manualItems.every((c) => manualChecks[c.key]);
  const readyForActive = autoFail.length === 0 && allManualChecked;

  const save = () => {
    saveLocalReview(scenario.id, {
      manual_checks: manualChecks,
      intended_status: intended,
      notes,
    });
    onSaved();
  };

  // Kalıcılaştırma snippet'i — senaryo dosyasına yapıştırılacak clinical_review
  const snippet = useMemo(() => {
    const draftAreas = scenario.clinical_review?.draft_areas;
    const lines = [
      "  clinical_review: {",
      `    status: "${intended}",`,
      `    reviewed_by: "Ali Bey",`,
      `    reviewed_at: "${new Date().toISOString().slice(0, 10)}",`,
    ];
    if (intended !== "ACTIVE" && draftAreas?.length) {
      lines.push(`    draft_areas: [${draftAreas.map((a) => `"${a}"`).join(", ")}],`);
    }
    if (notes.trim()) lines.push(`    notes: ${JSON.stringify(notes.trim())},`);
    lines.push("  },");
    return lines.join("\n");
  }, [intended, notes, scenario]);

  const theme = getSpecialtyTheme(scenario.specialty);

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: theme.accent }}>
              {theme.label} · {scenario.id}
            </div>
            <h2 className="font-display text-2xl text-ink-50">{scenario.title}</h2>
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-ink-300 leading-relaxed">{scenario.description}</p>
        <div className="flex flex-wrap gap-3 mt-3 font-mono text-[10px] text-ink-400">
          <span>{scenario.patient.age} yaş {scenario.patient.sex === "M" ? "E" : "K"}</span>
          <span>· {scenario.patient.weight_kg ?? "?"} kg</span>
          <span>· {scenario.steps.length} adım</span>
          <span>· ICD: {scenario.clinical_codes?.icd10 ?? "—"}</span>
        </div>
      </div>

      {/* Otomatik checklist */}
      <div className="panel p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-3">
          Otomatik Kontroller
        </div>
        <ul className="space-y-2">
          {checklist.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              {c.pass === null ? (
                <label className="flex items-start gap-2 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={!!manualChecks[c.key]}
                    onChange={(e) =>
                      setManualChecks((m) => ({ ...m, [c.key]: e.target.checked }))
                    }
                    className="mt-0.5 accent-brand"
                  />
                  <span className="flex-1">
                    <span className="text-ink-100">{c.label}</span>
                    <span className="block text-[11px] text-ink-500">{c.detail}</span>
                  </span>
                </label>
              ) : (
                <>
                  <CheckIcon pass={c.pass} />
                  <span className="flex-1">
                    <span className={c.pass ? "text-ink-200" : "text-clinical-critical"}>
                      {c.label}
                    </span>
                    <span className="block text-[11px] text-ink-500">{c.detail}</span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Karar + not */}
      <div className="panel p-5 space-y-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-2">
            Hedef Durum
          </div>
          <div className="flex flex-wrap gap-2">
            {CLINICAL_STATUS_ORDER.map((st) => {
              const disabled = st === "ACTIVE" && !readyForActive;
              return (
                <button
                  key={st}
                  disabled={disabled}
                  onClick={() => setIntended(st)}
                  title={disabled ? "ACTIVE için tüm kontroller geçmeli/işaretlenmeli" : undefined}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-xs transition",
                    intended === st
                      ? STATUS_STYLE[st]
                      : "border-ink-700 text-ink-300 hover:border-ink-500",
                    disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {CLINICAL_STATUS_LABEL[st]}
                </button>
              );
            })}
          </div>
          {intended === "ACTIVE" && (
            <p className="mt-2 text-[11px] text-clinical-warning">
              ACTIVE = yayında. Yalnızca tüm klinik kontroller doğrulandıysa seç.
            </p>
          )}
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-2">
            Review Notu
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Kılavuz teyidi, doz kontrolü, çekinceler…"
            className="w-full bg-ink-900 border border-ink-700 rounded-md px-3 py-2 text-sm text-ink-100 focus:border-brand/50 focus:outline-none resize-y"
          />
        </div>

        <button
          onClick={save}
          className="btn-primary text-sm"
          data-testid="review-save"
        >
          Çalışmayı Kaydet (yerel)
        </button>
      </div>

      {/* Kalıcılaştırma snippet'i */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400">
            Kalıcılaştır — senaryo dosyasına yapıştır
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(snippet);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-brand-light border border-brand/30 hover:bg-brand/10 transition"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
        <p className="text-[11px] text-ink-500 mb-2">
          <code className="text-ink-300">src/data/scenarios/*.ts</code> içinde Scenario
          objesine ekle. Otomatik yazılmaz — gözden geçirip sen commit'lersin.
        </p>
        <pre className="bg-ink-950 border border-ink-700 rounded-md p-3 overflow-x-auto text-[11px] text-ink-200 font-mono leading-relaxed">
{snippet}
        </pre>
      </div>
    </div>
  );
}
