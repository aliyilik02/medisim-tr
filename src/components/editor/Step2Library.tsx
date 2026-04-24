import { useState, useMemo, useRef } from "react";
import type { Medication, Equipment } from "@/engine";
import type { StoredScenario } from "@/storage/scenarioStorage";
import { MEDICATIONS } from "@/data/medications";
import { EQUIPMENT } from "@/data/equipment";
import { cn } from "@/lib/cn";

type Draft = Partial<StoredScenario>;

interface Props {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}

const ALL_MEDS = Object.values(MEDICATIONS);
const ALL_EQ = Object.values(EQUIPMENT);
const MED_CATEGORIES = Array.from(new Set(ALL_MEDS.map((m) => m.category)));
const EQ_CATEGORIES = Array.from(new Set(ALL_EQ.map((e) => e.category)));

const MED_CATEGORY_LABELS: Record<string, string> = {
  kardiyak: "Kardiyak",
  antikoagulan: "Antikoagülan",
  antiaritmik: "Antiaritmik",
  analjezik: "Analjezik",
  sedatif: "Sedatif",
  antibiyotik: "Antibiyotik",
  sıvı: "Sıvı / Kristaloid",
  diğer: "Diğer",
};

const EQ_CATEGORY_LABELS: Record<string, string> = {
  monitorizasyon: "Monitorizasyon",
  havayolu: "Havayolu",
  damar_yolu: "Damar Yolu",
  defibrilasyon: "Defibrilasyon",
  cerrahi: "Cerrahi",
  koruyucu: "Koruyucu",
  diğer: "Diğer",
};

const EKG_PATTERNS = [
  { value: "normal", label: "Normal Sinüs" },
  { value: "stemi", label: "STEMI" },
  { value: "vt", label: "VT" },
  { value: "vf", label: "VF" },
  { value: "asistoli", label: "Asistoli" },
];

const SPECIALTY_PRESETS: Record<string, { meds: string[]; eq: string[] }> = {
  kardiyoloji: {
    meds: ["aspirin", "klopidogrel", "heparin", "nitrogliserin", "metoprolol", "amiodaron", "adrenalin", "atropin", "furosemid", "salin_09"],
    eq: ["ekg_12", "monitor", "defibrilator", "iv_kateter_18g", "oksijen_maske"],
  },
  acil: {
    meds: ["adrenalin", "amiodaron", "atropin", "salin_09", "ringer_laktat", "morfin", "midazolam", "naloksan"],
    eq: ["monitor", "defibrilator", "ambu", "entubasyon_seti", "iv_kateter_18g", "iv_kateter_20g"],
  },
  dahiliye: {
    meds: ["salin_09", "ringer_laktat", "insulin_regular", "kcl", "dekstroz_50", "seftriakson", "piperasilin_tazobaktam"],
    eq: ["monitor", "iv_kateter_18g", "glukometre", "ekg_12"],
  },
  pediatri: {
    meds: ["salin_09", "adrenalin", "amiodaron", "dekstroz_50", "midazolam"],
    eq: ["bvm_pediatrik", "pediatrik_oksijen_maske", "pediatrik_io_seti", "monitor", "pediatrik_def_padleri"],
  },
  askeri_tccc: {
    meds: ["salin_09", "morfin", "fentanil", "midazolam", "feniramin"],
    eq: ["turnike", "combat_gauze", "iglu_tip_toraks", "nazofaringeal", "io_seti"],
  },
  anestezi: {
    meds: ["propofol", "etomidate", "ketamin", "midazolam", "fentanil", "atropin", "adrenalin"],
    eq: ["entubasyon_seti", "laringoskop", "ambu", "monitor", "perfuzor", "ventilator_mekanik"],
  },
};

export function Step2Library({ draft, onChange }: Props) {
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [medCatFilter, setMedCatFilter] = useState<string | null>(null);
  const [eqCatFilter, setEqCatFilter] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMeds: string[] = draft.available_medications ?? [];
  const selectedEq: string[] = draft.available_equipment ?? [];
  const ekgPattern = draft.ekg_pattern ?? "normal";

  const handleSearchChange = (val: string) => {
    setRawSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 200);
  };

  const toggleMed = (id: string) =>
    onChange({
      available_medications: selectedMeds.includes(id)
        ? selectedMeds.filter((x) => x !== id)
        : [...selectedMeds, id],
    });

  const toggleEq = (id: string) =>
    onChange({
      available_equipment: selectedEq.includes(id)
        ? selectedEq.filter((x) => x !== id)
        : [...selectedEq, id],
    });

  const applyPreset = () => {
    const sp = draft.specialty;
    if (!sp || !SPECIALTY_PRESETS[sp]) return;
    const { meds, eq } = SPECIALTY_PRESETS[sp];
    onChange({ available_medications: meds, available_equipment: eq });
  };

  const filteredMeds = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_MEDS.filter(
      (m) =>
        (!q || m.name_tr.toLowerCase().includes(q)) &&
        (!medCatFilter || m.category === medCatFilter)
    );
  }, [search, medCatFilter]);

  const filteredEq = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_EQ.filter(
      (e) =>
        (!q || e.name_tr.toLowerCase().includes(q)) &&
        (!eqCatFilter || e.category === eqCatFilter)
    );
  }, [search, eqCatFilter]);

  const medsByCategory = useMemo(
    () =>
      MED_CATEGORIES.reduce<Record<string, Medication[]>>((acc, cat) => {
        const items = filteredMeds.filter((m) => m.category === cat);
        if (items.length) acc[cat] = items;
        return acc;
      }, {}),
    [filteredMeds]
  );

  const eqByCategory = useMemo(
    () =>
      EQ_CATEGORIES.reduce<Record<string, Equipment[]>>((acc, cat) => {
        const items = filteredEq.filter((e) => e.category === cat);
        if (items.length) acc[cat] = items;
        return acc;
      }, {}),
    [filteredEq]
  );

  const hasPreset = !!(draft.specialty && SPECIALTY_PRESETS[draft.specialty]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-1">Adım 2</div>
          <h2 className="font-display text-3xl text-ink-50">İlaç & Ekipman Kütüphanesi</h2>
          <p className="text-ink-400 text-sm mt-1">Senaryo için kullanılabilecek envanterleri seç.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {hasPreset && (
            <button type="button" onClick={applyPreset} className="btn-ghost text-sm">
              Preset yükle ({draft.specialty})
            </button>
          )}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={cn(selectedMeds.length >= 3 ? "text-clinical-stable" : "text-clinical-warning")}>
              {selectedMeds.length} ilaç
            </span>
            <span className="text-ink-600">·</span>
            <span className={cn(selectedEq.length >= 2 ? "text-clinical-stable" : "text-clinical-warning")}>
              {selectedEq.length} ekipman
            </span>
          </div>
        </div>
      </div>

      {/* Validation hint */}
      {(selectedMeds.length < 3 || selectedEq.length < 2) && (
        <div className="px-4 py-3 rounded-md bg-clinical-warning/10 border border-clinical-warning/30 font-mono text-xs text-clinical-warning">
          İleri geçmek için en az 3 ilaç ve 2 ekipman seç.
          ({selectedMeds.length}/3 ilaç · {selectedEq.length}/2 ekipman)
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="İlaç veya ekipman ara..."
        value={rawSearch}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full bg-ink-800 border border-ink-700 rounded-md px-4 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-brand/60 transition"
      />

      {/* EKG Pattern */}
      <div className="panel p-4">
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400 mb-3">EKG Başlangıç Ritmi</div>
        <div className="flex flex-wrap gap-2">
          {EKG_PATTERNS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ ekg_pattern: p.value })}
              className={cn("tag transition cursor-pointer", ekgPattern === p.value && "tag-brand")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medications */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">
            İlaçlar <span className="text-ink-600">({ALL_MEDS.length})</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setMedCatFilter(null)}
              className={cn("tag transition cursor-pointer", medCatFilter === null && "tag-brand")}
            >
              Tümü
            </button>
            {MED_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setMedCatFilter(medCatFilter === cat ? null : cat)}
                className={cn("tag transition cursor-pointer", medCatFilter === cat && "tag-brand")}
              >
                {MED_CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {Object.entries(medsByCategory).map(([cat, meds]) => (
          <div key={cat} className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-500 mb-2 px-1">
              {MED_CATEGORY_LABELS[cat] ?? cat}
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {meds.map((m) => {
                const checked = selectedMeds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer transition border",
                      checked
                        ? "bg-brand/10 border-brand/40 text-ink-100"
                        : "bg-ink-800/50 border-ink-700/50 text-ink-300 hover:border-ink-600"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMed(m.id)}
                      className="mt-0.5 accent-[#0d9488] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.name_tr}</div>
                      {m.default_dose && (
                        <div className="font-mono text-[10px] text-ink-500 truncate mt-0.5">
                          {m.default_dose}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {filteredMeds.length === 0 && (
          <div className="panel p-8 text-center text-ink-500 text-sm">Sonuç bulunamadı.</div>
        )}
      </section>

      {/* Equipment */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">
            Ekipman <span className="text-ink-600">({ALL_EQ.length})</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setEqCatFilter(null)}
              className={cn("tag transition cursor-pointer", eqCatFilter === null && "tag-brand")}
            >
              Tümü
            </button>
            {EQ_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setEqCatFilter(eqCatFilter === cat ? null : cat)}
                className={cn("tag transition cursor-pointer", eqCatFilter === cat && "tag-brand")}
              >
                {EQ_CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {Object.entries(eqByCategory).map(([cat, equips]) => (
          <div key={cat} className="mb-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-500 mb-2 px-1">
              {EQ_CATEGORY_LABELS[cat] ?? cat}
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {equips.map((e) => {
                const checked = selectedEq.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition border",
                      checked
                        ? "bg-brand/10 border-brand/40 text-ink-100"
                        : "bg-ink-800/50 border-ink-700/50 text-ink-300 hover:border-ink-600"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEq(e.id)}
                      className="accent-[#0d9488] shrink-0"
                    />
                    <div className="text-sm font-medium flex-1 min-w-0 truncate">{e.name_tr}</div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {filteredEq.length === 0 && (
          <div className="panel p-8 text-center text-ink-500 text-sm">Sonuç bulunamadı.</div>
        )}
      </section>
    </div>
  );
}
