// ============================================================
// InstructorPage (Tier-2 inc-3) — eğitmen paneli
// ============================================================
// Eğitmen: sınıflarını listeler, yeni sınıf açar (join_code üretilir),
// sınıfa öğrenci hesabı tanımlar (handle + şifre, e-postasız — KVKK PII
// minimal), öğrenci ilerlemesini (deneme sayısı / en iyi % / son deneme)
// görür. Tüm veri backend'den (instructor rol-kapılı + sınıf sahipliği).
// react-hook-form/zod KURULU DEĞİL → hafif manuel state (konvansiyon).
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  Users,
  ArrowLeft,
  KeyRound,
  Copy,
  Check,
  Activity,
} from "lucide-react";
import {
  listClasses,
  createClass,
  getClass,
  createStudent,
  type ClassSummary,
  type ClassDetail,
  type CreatedStudent,
} from "@/api/classes";
import { EducationalDisclaimer } from "@/components/EducationalDisclaimer";

// ── Öğrenci ilerleme özeti (attempts → user bazında agregasyon) ──
interface StudentProgress {
  attempts: number;
  bestPercent: number | null;
  lastAt: number | null;
}

export function aggregateProgress(detail: ClassDetail): Record<string, StudentProgress> {
  const byUser: Record<string, StudentProgress> = {};
  for (const a of detail.attempts) {
    const cur = byUser[a.user_id] ?? { attempts: 0, bestPercent: null, lastAt: null };
    cur.attempts += 1;
    if (a.score != null && a.max_score != null && a.max_score > 0) {
      const pct = Math.round((a.score / a.max_score) * 100);
      cur.bestPercent = cur.bestPercent == null ? pct : Math.max(cur.bestPercent, pct);
    }
    if (a.started_at != null) {
      cur.lastAt = cur.lastAt == null ? a.started_at : Math.max(cur.lastAt, a.started_at);
    }
    byUser[a.user_id] = cur;
  }
  return byUser;
}

function fmtDate(unixSec: number | null): string {
  if (unixSec == null) return "—";
  return new Date(unixSec * 1000).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const cardClass = "bg-ink-900 border border-ink-700/60 rounded-lg p-5";
const inputClass =
  "w-full bg-ink-950/60 border border-ink-700/50 rounded px-3 py-2 text-sm text-ink-100 " +
  "placeholder:text-ink-600 focus:outline-none focus:border-brand/60 transition";
const labelClass = "font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500 mb-1 block";
const btnPrimary =
  "px-4 py-2 rounded font-mono text-[12px] uppercase tracking-[0.08em] bg-brand text-ink-950 " +
  "font-semibold hover:bg-brand-light transition disabled:opacity-40 disabled:cursor-not-allowed";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
      className="inline-flex items-center gap-1 font-mono text-[11px] text-brand-light hover:underline"
      aria-label={`${label} kopyala`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "kopyalandı" : "kopyala"}
    </button>
  );
}

export function InstructorPage() {
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refreshClasses = useCallback(async () => {
    setLoadError(null);
    try {
      setClasses(await listClasses());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Sınıflar yüklenemedi");
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    void refreshClasses();
  }, [refreshClasses]);

  return (
    <div className="min-h-screen p-4 md:p-8 grid-overlay">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-brand" strokeWidth={2.2} />
            <div>
              <h1 className="font-display text-xl">Eğitmen Paneli</h1>
              <p className="text-[12px] text-ink-500">Sınıflar, öğrenciler ve ilerleme</p>
            </div>
          </div>
          <Link
            to="/senaryolar"
            className="font-mono text-[11px] text-ink-400 hover:text-ink-200 inline-flex items-center gap-1"
          >
            <Activity className="w-3.5 h-3.5" /> Senaryolar
          </Link>
        </header>

        {loadError && (
          <div className="mb-4 text-[12px] text-clinical-warning bg-clinical-warning/10 border border-clinical-warning/30 rounded px-3 py-2">
            {loadError}
          </div>
        )}

        {selectedId ? (
          <ClassDetailView
            classId={selectedId}
            onBack={() => {
              setSelectedId(null);
              void refreshClasses();
            }}
          />
        ) : (
          <ClassListView
            classes={classes}
            onSelect={setSelectedId}
            onCreated={refreshClasses}
          />
        )}

        <div className="mt-8 text-center">
          <EducationalDisclaimer />
        </div>
      </div>
    </div>
  );
}

// ── Sınıf listesi + yeni sınıf ──
function ClassListView({
  classes,
  onSelect,
  onCreated,
}: {
  classes: ClassSummary[] | null;
  onSelect: (id: string) => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (name.trim().length < 2) {
      setErr("Sınıf adı en az 2 karakter.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await createClass(name.trim());
      setName("");
      await onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sınıf oluşturulamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className={cardClass}>
        <h2 className="font-display text-base mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand" /> Yeni Sınıf
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className={labelClass} htmlFor="className">Sınıf Adı</label>
            <input
              id="className"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Acil Tıp 2025 — A Grubu"
            />
          </div>
          <button type="button" className={btnPrimary} onClick={submit} disabled={busy}>
            {busy ? "Oluşturuluyor…" : "Oluştur"}
          </button>
        </div>
        {err && <div className="mt-2 text-[12px] text-clinical-critical">{err}</div>}
      </div>

      <div className={cardClass}>
        <h2 className="font-display text-base mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand" /> Sınıflarım
        </h2>
        {classes == null ? (
          <div className="text-[12px] text-ink-500 font-mono">yükleniyor…</div>
        ) : classes.length === 0 ? (
          <div className="text-[13px] text-ink-500">
            Henüz sınıf yok. Yukarıdan ilk sınıfını oluştur.
          </div>
        ) : (
          <ul className="divide-y divide-ink-700/40">
            {classes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="w-full text-left py-3 flex items-center justify-between hover:bg-ink-800/40 rounded px-2 -mx-2 transition"
                >
                  <div>
                    <div className="text-sm text-ink-100">{c.name}</div>
                    <div className="font-mono text-[11px] text-ink-500 flex items-center gap-2 mt-0.5">
                      <KeyRound className="w-3 h-3" /> {c.join_code}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-ink-400">
                    {c.student_count} öğrenci →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Sınıf detayı: roster + ilerleme + öğrenci ekleme ──
function ClassDetailView({ classId, onBack }: { classId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      setDetail(await getClass(classId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sınıf yüklenemedi");
    }
  }, [classId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (err) {
    return (
      <div className={cardClass}>
        <button onClick={onBack} className="font-mono text-[11px] text-ink-400 hover:text-ink-200 inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Geri
        </button>
        <div className="text-[13px] text-clinical-critical">{err}</div>
      </div>
    );
  }

  if (!detail) {
    return <div className="text-[12px] text-ink-500 font-mono">yükleniyor…</div>;
  }

  const progress = aggregateProgress(detail);

  return (
    <div className="space-y-5">
      <div className={cardClass}>
        <button onClick={onBack} className="font-mono text-[11px] text-ink-400 hover:text-ink-200 inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Sınıflara dön
        </button>
        <h2 className="font-display text-lg">{detail.class.name}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[12px] text-ink-400">
          <span className="inline-flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-brand" /> Katılım kodu:{" "}
            <strong className="text-ink-100">{detail.class.join_code}</strong>
            <CopyButton value={detail.class.join_code} label="Katılım kodu" />
          </span>
          {detail.institution_slug && (
            <span className="inline-flex items-center gap-1">
              Kurum kodu: <strong className="text-ink-100">{detail.institution_slug}</strong>
              <CopyButton value={detail.institution_slug} label="Kurum kodu" />
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink-500">
          Öğrenci girişi: kurum kodu + kullanıcı adı + şifre (e-posta gerekmez).
        </p>
      </div>

      <AddStudentForm classId={classId} institutionSlug={detail.institution_slug} onAdded={refresh} />

      <div className={cardClass}>
        <h3 className="font-display text-base mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand" /> Öğrenciler ({detail.roster.length})
        </h3>
        {detail.roster.length === 0 ? (
          <div className="text-[13px] text-ink-500">Henüz öğrenci yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-wider text-ink-500 border-b border-ink-700/40">
                  <th className="py-2 pr-4">Kullanıcı Adı</th>
                  <th className="py-2 pr-4 text-right">Deneme</th>
                  <th className="py-2 pr-4 text-right">En İyi %</th>
                  <th className="py-2 text-right">Son Deneme</th>
                </tr>
              </thead>
              <tbody>
                {detail.roster.map((s) => {
                  const p = progress[s.id] ?? { attempts: 0, bestPercent: null, lastAt: null };
                  return (
                    <tr key={s.id} className="border-b border-ink-800/40">
                      <td className="py-2 pr-4 text-ink-100">{s.handle}</td>
                      <td className="py-2 pr-4 text-right font-mono">{p.attempts}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {p.bestPercent == null ? "—" : `${p.bestPercent}%`}
                      </td>
                      <td className="py-2 text-right font-mono text-ink-400">{fmtDate(p.lastAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Öğrenci ekleme formu (kayıt sonrası giriş bilgisini gösterir) ──
function AddStudentForm({
  classId,
  institutionSlug,
  onAdded,
}: {
  classId: string;
  institutionSlug: string | null;
  onAdded: () => Promise<void>;
}) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedStudent | null>(null);
  const [lastPassword, setLastPassword] = useState("");

  const submit = async () => {
    if (busy) return;
    if (handle.trim().length < 2) {
      setErr("Kullanıcı adı en az 2 karakter.");
      return;
    }
    if (password.length < 6) {
      setErr("Şifre en az 6 karakter.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const student = await createStudent(classId, handle.trim(), password);
      setCreated(student);
      setLastPassword(password);
      setHandle("");
      setPassword("");
      await onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Öğrenci eklenemedi");
    } finally {
      setBusy(false);
    }
  };

  const slug = created?.institution_slug ?? institutionSlug;

  return (
    <div className={cardClass}>
      <h3 className="font-display text-base mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4 text-brand" /> Öğrenci Ekle
      </h3>
      <div className="grid sm:grid-cols-3 gap-3 sm:items-end">
        <div>
          <label className={labelClass} htmlFor="stuHandle">Kullanıcı Adı</label>
          <input
            id="stuHandle"
            className={inputClass}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="ogrenci_01"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="stuPass">Geçici Şifre</label>
          <input
            id="stuPass"
            type="text"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="en az 6 karakter"
          />
        </div>
        <button type="button" className={btnPrimary} onClick={submit} disabled={busy}>
          {busy ? "Ekleniyor…" : "Ekle"}
        </button>
      </div>
      {err && <div className="mt-2 text-[12px] text-clinical-critical">{err}</div>}

      {created && (
        <div className="mt-4 text-[12px] bg-clinical-stable/10 border border-clinical-stable/30 rounded px-3 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-clinical-stable mb-1">
            Öğrenci oluşturuldu — giriş bilgileri
          </div>
          <div className="text-ink-200 space-y-0.5">
            <div>Kurum kodu: <strong>{slug ?? "—"}</strong></div>
            <div>Kullanıcı adı: <strong>{created.handle}</strong></div>
            <div>Şifre: <strong>{lastPassword}</strong></div>
          </div>
          <p className="mt-1 text-[11px] text-ink-500">
            Bu bilgileri öğrenciye iletin. Şifre yalnızca şimdi görünür.
          </p>
        </div>
      )}
    </div>
  );
}
