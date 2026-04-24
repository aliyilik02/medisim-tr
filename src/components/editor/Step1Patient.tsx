import type { PatientVitals, Patient, Specialty, Difficulty } from "@/engine";
import type { StoredScenario } from "@/storage/scenarioStorage";
import { VitalSlider } from "./VitalSlider";
import { ChipInput } from "./ChipInput";
import { VitalsMonitor } from "@/components/VitalsMonitor";
import { cn } from "@/lib/cn";

// ---- Defaults -------------------------------------------------------

export const DEFAULT_VITALS: PatientVitals = {
  hr: 80,
  bp_systolic: 120,
  bp_diastolic: 80,
  spo2: 98,
  temp: 37.0,
  rr: 16,
  gcs: 15,
};

export const DEFAULT_PATIENT: Patient = {
  age: 50,
  sex: "M",
  weight_kg: 70,
  chief_complaint: "",
  history_items: [],
  allergies: [],
  current_medications: [],
  modifiers: {},
};

// ---- Static data ----------------------------------------------------

const SPECIALTY_OPTIONS: { value: Specialty; label: string }[] = [
  { value: "kardiyoloji", label: "Kardiyoloji" },
  { value: "dahiliye", label: "Dahiliye" },
  { value: "acil", label: "Acil Tıp" },
  { value: "pediatri", label: "Pediatri" },
  { value: "cerrahi", label: "Cerrahi" },
  { value: "anestezi", label: "Anestezi" },
  { value: "kadin_dogum", label: "Kadın Doğum" },
  { value: "hemsirelik", label: "Hemşirelik" },
  { value: "askeri_tccc", label: "Askeri / TCCC" },
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "S1 — Öğrenci",
  2: "S2 — İntern",
  3: "S3 — Pratisyen",
  4: "S4 — Asistan",
  5: "S5 — Uzman",
};

const ALL_DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];

const HISTORY_SUGGESTIONS = [
  "Hipertansiyon (HT)", "Tip 2 DM", "Tip 1 DM", "KOAH", "Astım",
  "Koroner arter hastalığı", "Kalp yetmezliği", "Atriyal fibrilasyon",
  "KBY", "Karaciğer yetmezliği", "Hipotiroidi", "Hipertiroidi",
  "Obezite (VKİ > 30)", "Sigara kullanımı", "Aktif kanama",
];

// ---- Types ----------------------------------------------------------

interface Step1Props {
  draft: Partial<StoredScenario>;
  onChange: (patch: Partial<StoredScenario>) => void;
}

// ---- Helpers --------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 mb-1">
        {children}
      </div>
      <div className="h-px bg-ink-700" />
    </div>
  );
}

function FormRow({ children, cols = 1 }: { children: React.ReactNode; cols?: 2 | 1 }) {
  return (
    <div className={cn("grid gap-4", cols === 2 && "sm:grid-cols-2")}>
      {children}
    </div>
  );
}

function FormField({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-1.5">
        {label}
        {optional && (
          <span className="ml-1.5 normal-case tracking-normal text-ink-600 text-[9px]">
            (opsiyonel)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={cn(
        "w-full panel-inset px-3 py-2 text-sm text-ink-100 bg-transparent",
        "outline-none focus:border-brand/50 transition placeholder:text-ink-600"
      )}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className={cn(
          "flex-1 panel-inset px-3 py-2 text-sm text-ink-100 bg-transparent",
          "outline-none focus:border-brand/50 transition"
        )}
      />
      {suffix && (
        <span className="font-mono text-xs text-ink-500 shrink-0">{suffix}</span>
      )}
    </div>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full panel-inset px-3 py-2 text-sm text-ink-100 bg-transparent resize-none",
        "outline-none focus:border-brand/50 transition placeholder:text-ink-600"
      )}
    />
  );
}

// ---- Main component -------------------------------------------------

export function Step1Patient({ draft, onChange }: Step1Props) {
  const patient = draft.patient ?? DEFAULT_PATIENT;
  const vitals = draft.initial_vitals ?? DEFAULT_VITALS;
  const supportedDiffs = draft.supported_difficulties ?? [3];
  const defaultDiff = draft.difficulty ?? 3;
  const tags = draft.tags ?? [];

  const updatePatient = (patch: Partial<Patient>) =>
    onChange({ patient: { ...patient, ...patch } });

  const updateModifiers = (key: keyof NonNullable<Patient["modifiers"]>, val: boolean) =>
    onChange({ patient: { ...patient, modifiers: { ...patient.modifiers, [key]: val } } });

  const updateVitals = (patch: Partial<PatientVitals>) =>
    onChange({ initial_vitals: { ...vitals, ...patch } });

  const toggleDifficulty = (d: Difficulty) => {
    let next: Difficulty[];
    if (supportedDiffs.includes(d)) {
      next = supportedDiffs.filter((x) => x !== d);
      if (next.length === 0) next = [d]; // en az bir tane kalmalı
    } else {
      next = [...supportedDiffs, d].sort() as Difficulty[];
    }
    const newDefault = next.includes(defaultDiff) ? defaultDiff : next[0];
    onChange({ supported_difficulties: next, difficulty: newDefault });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ============================================================ */}
      {/* BÖLÜM A — META                                               */}
      {/* ============================================================ */}
      <div className="panel p-6 space-y-5">
        <SectionTitle>A — Senaryo Bilgileri</SectionTitle>

        <FormField label="Senaryo Başlığı">
          <TextInput
            value={draft.title ?? ""}
            onChange={(v) => onChange({ title: v })}
            placeholder="Örn: 62 Yaş Erkek — Göğüs Ağrısı (STEMI)"
            required
          />
          {!draft.title && (
            <p className="mt-1 font-mono text-[10px] text-clinical-warning">
              Başlık zorunludur
            </p>
          )}
        </FormField>

        <FormField label="Açıklama">
          <TextArea
            value={draft.description ?? ""}
            onChange={(v) => onChange({ description: v })}
            placeholder="Kısa senaryo özeti — senaryo listesinde görünür"
            rows={2}
          />
        </FormField>

        <FormRow cols={2}>
          <FormField label="Uzmanlık Alanı">
            <select
              value={draft.specialty ?? "dahiliye"}
              onChange={(e) => onChange({ specialty: e.target.value as Specialty })}
              className="w-full panel-inset px-3 py-2 text-sm text-ink-100 bg-ink-900 outline-none focus:border-brand/50 transition"
            >
              {SPECIALTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-ink-900">
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Tahmini Süre">
            <NumberInput
              value={draft.estimated_minutes}
              onChange={(v) => onChange({ estimated_minutes: Math.min(60, Math.max(5, v)) })}
              min={5}
              max={60}
              suffix="dakika"
            />
          </FormField>
        </FormRow>

        <FormField label="Etiketler">
          <ChipInput
            label=""
            value={tags}
            onChange={(v) => onChange({ tags: v })}
            placeholder="Örn: stemi, kardiyoloji, acil — Enter ile ekle"
            suggestions={["stemi", "akut koroner", "sepsis", "dka", "anafilaksi", "pediatri", "airway", "sıvı", "şok"]}
          />
        </FormField>

        {/* Zorluk seviyeleri */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-3">
            Desteklenen Zorluk Seviyeleri
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDifficulty(d)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-mono border transition",
                  supportedDiffs.includes(d)
                    ? "bg-brand/20 text-brand-light border-brand/40"
                    : "bg-ink-800 text-ink-500 border-ink-700 hover:border-ink-500"
                )}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-2">
              Varsayılan Zorluk
            </label>
            <div className="flex flex-wrap gap-2">
              {supportedDiffs.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ difficulty: d })}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono border transition",
                    defaultDiff === d
                      ? "bg-brand text-ink-950 border-brand"
                      : "bg-ink-800 text-ink-400 border-ink-700 hover:border-ink-500"
                  )}
                >
                  S{d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BÖLÜM B — HASTA                                              */}
      {/* ============================================================ */}
      <div className="panel p-6 space-y-5">
        <SectionTitle>B — Hasta Profili</SectionTitle>

        <FormRow cols={2}>
          <FormField label="Yaş">
            <NumberInput
              value={patient.age}
              onChange={(v) => updatePatient({ age: Math.min(120, Math.max(0, v)) })}
              min={0}
              max={120}
              suffix="yaş"
            />
          </FormField>

          <FormField label="Cinsiyet">
            <div className="flex gap-3 mt-1">
              {(["M", "F"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updatePatient({ sex: s })}
                  className={cn(
                    "flex-1 py-2 rounded text-sm font-mono border transition",
                    patient.sex === s
                      ? "bg-brand/20 text-brand-light border-brand/40"
                      : "bg-ink-800 text-ink-400 border-ink-700 hover:border-ink-500"
                  )}
                >
                  {s === "M" ? "Erkek" : "Kadın"}
                </button>
              ))}
            </div>
          </FormField>
        </FormRow>

        <FormRow cols={2}>
          <FormField label="Kilo">
            <NumberInput
              value={patient.weight_kg}
              onChange={(v) => updatePatient({ weight_kg: Math.max(1, v) })}
              min={1}
              max={300}
              suffix="kg"
            />
          </FormField>
          <FormField label="Boy" optional>
            <NumberInput
              value={patient.height_cm}
              onChange={(v) => updatePatient({ height_cm: v || undefined })}
              min={30}
              max={250}
              suffix="cm"
            />
          </FormField>
        </FormRow>

        <FormField label="Ana Şikayet">
          <TextArea
            value={patient.chief_complaint}
            onChange={(v) => updatePatient({ chief_complaint: v })}
            placeholder="Hastanın başvuru şikayeti ve kısa kliniği"
            rows={2}
          />
        </FormField>

        <ChipInput
          label="Özgeçmiş"
          value={patient.history_items}
          onChange={(v) => updatePatient({ history_items: v })}
          placeholder="Örn: HT (10 yıl) — Enter ile ekle"
          suggestions={HISTORY_SUGGESTIONS}
          optional
        />

        <ChipInput
          label="Alerjiler"
          value={patient.allergies}
          onChange={(v) => updatePatient({ allergies: v })}
          placeholder="Örn: penisilin, aspirin — Enter ile ekle"
          optional
        />

        <ChipInput
          label="Kullandığı İlaçlar"
          value={patient.current_medications ?? []}
          onChange={(v) => updatePatient({ current_medications: v })}
          placeholder="Örn: metoprolol 50 mg/gün — Enter ile ekle"
          optional
        />

        {/* Modifier checkboxes */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-2">
            Klinik Modifier'lar
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: "beta_blocker" as const, label: "Beta-bloker altında" },
                { key: "karaciger_yetm" as const, label: "Karaciğer yetmezliği" },
                { key: "bobrek_yetm" as const, label: "Böbrek yetmezliği" },
                { key: "gebelik" as const, label: "Gebelik" },
              ] as const
            ).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 panel-inset px-3 py-2 cursor-pointer hover:border-ink-500 transition"
              >
                <input
                  type="checkbox"
                  checked={!!(patient.modifiers?.[key])}
                  onChange={(e) => updateModifiers(key, e.target.checked)}
                  className="accent-brand w-3.5 h-3.5"
                />
                <span className="text-sm text-ink-200">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BÖLÜM C — BAŞLANGIÇ VİTALLERİ + ÖNIZLEME                    */}
      {/* ============================================================ */}
      <div className="panel p-6">
        <SectionTitle>C — Başlangıç Vitalleri</SectionTitle>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Sliders */}
          <div className="grid sm:grid-cols-2 gap-3">
            <VitalSlider
              label="Nabız" unit="/dk"
              value={vitals.hr} onChange={(v) => updateVitals({ hr: v })}
              min={30} max={200}
              normalMin={60} normalMax={100}
              criticalMin={40} criticalMax={140}
            />
            <VitalSlider
              label="TA Sistolik" unit="mmHg"
              value={vitals.bp_systolic} onChange={(v) => updateVitals({ bp_systolic: v })}
              min={60} max={220}
              normalMin={100} normalMax={160}
              criticalMin={80} criticalMax={180}
            />
            <VitalSlider
              label="TA Diastolik" unit="mmHg"
              value={vitals.bp_diastolic} onChange={(v) => updateVitals({ bp_diastolic: v })}
              min={30} max={130}
              normalMin={60} normalMax={90}
              criticalMin={40} criticalMax={110}
            />
            <VitalSlider
              label="SpO₂" unit="%"
              value={vitals.spo2} onChange={(v) => updateVitals({ spo2: v })}
              min={70} max={100}
              normalMin={95} normalMax={100}
              criticalMin={88}
            />
            <VitalSlider
              label="Solunum" unit="/dk"
              value={vitals.rr} onChange={(v) => updateVitals({ rr: v })}
              min={8} max={50}
              normalMin={12} normalMax={20}
              criticalMin={8} criticalMax={30}
            />
            <VitalSlider
              label="Ateş" unit="°C"
              value={vitals.temp} onChange={(v) => updateVitals({ temp: v })}
              min={34.0} max={42.0}
              step={0.1} decimals={1}
              normalMin={36.0} normalMax={38.0}
              criticalMin={35.0} criticalMax={39.5}
            />
            <VitalSlider
              label="GKS" unit=""
              value={vitals.gcs ?? 15} onChange={(v) => updateVitals({ gcs: v })}
              min={3} max={15}
              normalMin={14} normalMax={15}
              criticalMin={8}
            />
            <VitalSlider
              label="Glukoz" unit="mg/dL"
              value={vitals.glucose ?? 100} onChange={(v) => updateVitals({ glucose: v })}
              min={40} max={600}
              normalMin={70} normalMax={180}
              criticalMin={50} criticalMax={400}
            />
            <VitalSlider
              label="Ağrı VAS" unit="/10"
              value={vitals.pain ?? 0} onChange={(v) => updateVitals({ pain: v })}
              min={0} max={10}
              normalMin={0} normalMax={3}
              criticalMin={undefined} criticalMax={7}
            />
          </div>

          {/* Canlı önizleme */}
          <div className="lg:sticky lg:top-36 lg:self-start">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500 mb-2 text-center">
              Canlı Önizleme
            </div>
            <div
              className="overflow-hidden rounded-lg"
              style={{ transform: "scale(0.88)", transformOrigin: "top center" }}
            >
              <VitalsMonitor vitals={vitals} baseline={vitals} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
