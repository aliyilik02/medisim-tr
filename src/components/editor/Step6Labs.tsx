import { useState, useRef } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Upload, Link as LinkIcon, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { StoredScenario } from "@/storage/scenarioStorage";
import type { LabPanel, LabValue, LabFlag, ImagingResult, ImagingModality } from "@/engine";

type Draft = Partial<StoredScenario>;

interface Props {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}

const FLAG_OPTIONS: { value: LabFlag | ""; label: string }[] = [
  { value: "", label: "Normal" },
  { value: "H",  label: "Yüksek ↑" },
  { value: "L",  label: "Düşük ↓" },
  { value: "HH", label: "Kritik ↑↑" },
  { value: "LL", label: "Kritik ↓↓" },
  { value: "C",  label: "Anormal" },
];

const MODALITY_OPTIONS: { value: ImagingModality; label: string }[] = [
  { value: "xray",  label: "Röntgen (Direkt)" },
  { value: "ct",    label: "Bilgisayarlı Tomografi" },
  { value: "mri",   label: "Manyetik Rezonans" },
  { value: "us",    label: "Ultrasonografi" },
  { value: "echo",  label: "Ekokardiyografi" },
  { value: "ekg",   label: "EKG" },
  { value: "other", label: "Diğer" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyPanel(): LabPanel & { _id: string } {
  return {
    _id: genId(),
    id: genId(),
    name_tr: "",
    results: [],
  };
}

function emptyRow(): LabValue {
  return { parameter: "", value: "", unit: "", reference_range: "" };
}

function emptyImaging(): ImagingResult & { _id: string } {
  return {
    _id: genId(),
    id: genId(),
    name_tr: "",
    modality: "xray",
    interpretation: "",
    findings: [],
    image_url: "",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step6Labs({ draft, onChange }: Props) {
  const labPanels = draft.lab_panels ?? {};
  const resultDelays = draft.result_delay_seconds ?? {};
  const imagingRecord = draft.imaging_results ?? {};

  // Internal UI list with stable _id keys (not persisted)
  const [panelOrder, setPanelOrder] = useState<string[]>(() =>
    Object.keys(labPanels)
  );
  const [imagingOrder, setImagingOrder] = useState<string[]>(() =>
    Object.keys(imagingRecord)
  );
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());

  const setLabPanels = (updated: Record<string, LabPanel>) =>
    onChange({ lab_panels: updated });

  const setDelays = (updated: Record<string, number>) =>
    onChange({ result_delay_seconds: updated });

  const setImagingRecord = (updated: Record<string, ImagingResult>) =>
    onChange({ imaging_results: updated });

  // ─── Panel CRUD ───────────────────────────────────────────────

  const addPanel = () => {
    const p = emptyPanel();
    setPanelOrder((prev) => [...prev, p.id]);
    setExpandedPanels((prev) => new Set([...prev, p.id]));
    const { _id, ...panel } = p;
    setLabPanels({ ...labPanels, [p.id]: panel });
  };

  const removePanel = (id: string) => {
    setPanelOrder((prev) => prev.filter((x) => x !== id));
    const updated = { ...labPanels };
    delete updated[id];
    setLabPanels(updated);
    const updDelays = { ...resultDelays };
    delete updDelays[id];
    setDelays(updDelays);
  };

  const updatePanel = (id: string, patch: Partial<LabPanel>) => {
    const panel = labPanels[id];
    if (!panel) return;
    setLabPanels({ ...labPanels, [id]: { ...panel, ...patch } });
  };

  const toggleExpand = (id: string) =>
    setExpandedPanels((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // ─── Row CRUD (inside a panel) ────────────────────────────────

  const addRow = (panelId: string) => {
    const panel = labPanels[panelId];
    if (!panel) return;
    updatePanel(panelId, { results: [...panel.results, emptyRow()] });
  };

  const updateRow = (panelId: string, idx: number, patch: Partial<LabValue>) => {
    const panel = labPanels[panelId];
    if (!panel) return;
    const rows = [...panel.results];
    rows[idx] = { ...rows[idx], ...patch };
    updatePanel(panelId, { results: rows });
  };

  const removeRow = (panelId: string, idx: number) => {
    const panel = labPanels[panelId];
    if (!panel) return;
    updatePanel(panelId, {
      results: panel.results.filter((_, i) => i !== idx),
    });
  };

  // ─── Imaging CRUD ─────────────────────────────────────────────

  const addImaging = () => {
    const img = emptyImaging();
    const { _id, ...imaging } = img;
    setImagingOrder((prev) => [...prev, imaging.id]);
    setImagingRecord({ ...imagingRecord, [imaging.id]: imaging });
  };

  const removeImaging = (id: string) => {
    setImagingOrder((prev) => prev.filter((x) => x !== id));
    const updated = { ...imagingRecord };
    delete updated[id];
    setImagingRecord(updated);
  };

  const updateImaging = (id: string, patch: Partial<ImagingResult>) => {
    const img = imagingRecord[id];
    if (!img) return;
    setImagingRecord({ ...imagingRecord, [id]: { ...img, ...patch } });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Lab Panelleri ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-ink-200">Laboratuvar Panelleri</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Simülasyon sırasında öğrencilerin isteyebileceği lab tetkikleri.
            </p>
          </div>
          <button
            type="button"
            onClick={addPanel}
            className="btn-primary text-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Panel Ekle
          </button>
        </div>

        {panelOrder.length === 0 && (
          <div className="panel-inset p-6 text-center text-sm text-ink-500">
            Henüz panel eklenmedi.
          </div>
        )}

        <div className="space-y-3">
          {panelOrder
            .filter((id) => labPanels[id])
            .map((id) => {
              const panel = labPanels[id];
              const isExpanded = expandedPanels.has(id);
              const delay = resultDelays[id] ?? 5;

              return (
                <div key={id} className="panel border border-ink-700/60 rounded-lg overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-ink-900/60">
                    <button
                      type="button"
                      onClick={() => toggleExpand(id)}
                      className="text-ink-400 hover:text-ink-200 transition"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder="Panel adı (ör. Tam Kan Sayımı)"
                      value={panel.name_tr}
                      onChange={(e) =>
                        updatePanel(id, { name_tr: e.target.value })
                      }
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-ink-100 placeholder:text-ink-500"
                    />
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <span className="font-mono">Gecikme:</span>
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={delay}
                        onChange={(e) =>
                          setDelays({
                            ...resultDelays,
                            [id]: Number(e.target.value) || 5,
                          })
                        }
                        className="w-14 bg-ink-800 border border-ink-700 rounded px-2 py-0.5 text-xs font-mono text-ink-200 focus:outline-none focus:border-brand/50"
                      />
                      <span className="font-mono">sn</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePanel(id)}
                      className="text-ink-600 hover:text-clinical-critical transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Panel body */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {/* Results table */}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-ink-700/60">
                            <th className="text-left font-mono text-[9px] uppercase tracking-wider text-ink-500 pb-1.5 pr-2">Parametre</th>
                            <th className="text-left font-mono text-[9px] uppercase tracking-wider text-ink-500 pb-1.5 pr-2">Değer</th>
                            <th className="text-left font-mono text-[9px] uppercase tracking-wider text-ink-500 pb-1.5 pr-2">Birim</th>
                            <th className="text-left font-mono text-[9px] uppercase tracking-wider text-ink-500 pb-1.5 pr-2">Ref. Aralık</th>
                            <th className="text-left font-mono text-[9px] uppercase tracking-wider text-ink-500 pb-1.5 pr-2">Durum</th>
                            <th className="w-6" />
                          </tr>
                        </thead>
                        <tbody>
                          {panel.results.map((row, idx) => (
                            <ResultRowEditor
                              key={idx}
                              row={row}
                              onChange={(patch) => updateRow(id, idx, patch)}
                              onRemove={() => removeRow(id, idx)}
                            />
                          ))}
                        </tbody>
                      </table>

                      <button
                        type="button"
                        onClick={() => addRow(id)}
                        className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-brand-light transition"
                      >
                        <Plus className="w-3 h-3" />
                        Satır Ekle
                      </button>

                      {/* Comment */}
                      <div>
                        <label className="field-label">Lab Notu (opsiyonel)</label>
                        <input
                          type="text"
                          value={panel.comment ?? ""}
                          onChange={(e) =>
                            updatePanel(id, { comment: e.target.value || undefined })
                          }
                          placeholder="Genel yorum veya ek bilgi..."
                          className="input w-full text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Collapsed summary */}
                  {!isExpanded && panel.results.length > 0 && (
                    <div className="px-4 py-2 border-t border-ink-800/40 flex flex-wrap gap-2">
                      {panel.results.slice(0, 6).map((r, i) => (
                        <span
                          key={i}
                          className={cn(
                            "font-mono text-[10px] px-1.5 py-0.5 rounded",
                            r.flag === "HH" || r.flag === "LL"
                              ? "bg-red-950/60 text-red-400"
                              : r.flag
                              ? "bg-amber-950/40 text-amber-400"
                              : "bg-ink-800 text-ink-400"
                          )}
                        >
                          {r.parameter}
                          {r.flag ? ` (${r.flag})` : ""}
                        </span>
                      ))}
                      {panel.results.length > 6 && (
                        <span className="font-mono text-[10px] text-ink-600">
                          +{panel.results.length - 6} daha
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* ─── Görüntüleme Sonuçları ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-ink-200">Görüntüleme Sonuçları</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Röntgen, BT, USG, EKG vb. — URL veya dosya yükle.
            </p>
          </div>
          <button
            type="button"
            onClick={addImaging}
            className="btn-primary text-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Görüntü Ekle
          </button>
        </div>

        {imagingOrder.length === 0 && (
          <div className="panel-inset p-6 text-center text-sm text-ink-500">
            Henüz görüntüleme sonucu eklenmedi.
          </div>
        )}

        <div className="space-y-4">
          {imagingOrder
            .filter((id) => imagingRecord[id])
            .map((id) => (
              <ImagingEditor
                key={id}
                imaging={imagingRecord[id]}
                onChange={(patch) => updateImaging(id, patch)}
                onRemove={() => removeImaging(id)}
              />
            ))}
        </div>
      </section>
    </div>
  );
}

// ─── Row editor (one lab result row) ─────────────────────────────────────────

function ResultRowEditor({
  row,
  onChange,
  onRemove,
}: {
  row: LabValue;
  onChange: (patch: Partial<LabValue>) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-b border-ink-800/30">
      <td className="pr-2 py-1.5">
        <input
          type="text"
          value={row.parameter}
          onChange={(e) => onChange({ parameter: e.target.value })}
          placeholder="Parametre"
          className="input w-full text-xs"
        />
      </td>
      <td className="pr-2 py-1.5">
        <input
          type="text"
          value={String(row.value)}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ value: isNaN(Number(v)) || v === "" ? v : Number(v) });
          }}
          placeholder="Değer"
          className="input w-20 text-xs font-mono"
        />
      </td>
      <td className="pr-2 py-1.5">
        <input
          type="text"
          value={row.unit ?? ""}
          onChange={(e) => onChange({ unit: e.target.value || undefined })}
          placeholder="Birim"
          className="input w-16 text-xs"
        />
      </td>
      <td className="pr-2 py-1.5">
        <input
          type="text"
          value={row.reference_range ?? ""}
          onChange={(e) =>
            onChange({ reference_range: e.target.value || undefined })
          }
          placeholder="ör. 70-110"
          className="input w-24 text-xs font-mono"
        />
      </td>
      <td className="pr-2 py-1.5">
        <select
          value={row.flag ?? ""}
          onChange={(e) =>
            onChange({ flag: (e.target.value as LabFlag) || undefined })
          }
          className="input text-xs"
        >
          {FLAG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5">
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-600 hover:text-clinical-critical transition"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

// ─── Imaging editor ───────────────────────────────────────────────────────────

function ImagingEditor({
  imaging,
  onChange,
  onRemove,
}: {
  imaging: ImagingResult;
  onChange: (patch: Partial<ImagingResult>) => void;
  onRemove: () => void;
}) {
  const [urlMode, setUrlMode] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Dosya 2 MB'ı geçemez. Lütfen daha küçük bir görsel seçin.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange({ image_url: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel border border-ink-700/60 rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 bg-ink-900/60">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Görüntü Adı</label>
            <input
              type="text"
              value={imaging.name_tr}
              onChange={(e) => onChange({ name_tr: e.target.value })}
              placeholder="ör. Akciğer grafisi"
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="field-label">Modalite</label>
            <select
              value={imaging.modality}
              onChange={(e) =>
                onChange({ modality: e.target.value as ImagingModality })
              }
              className="input w-full text-sm"
            >
              {MODALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-600 hover:text-clinical-critical transition mt-5"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3 border-t border-ink-800/40">
        {/* Image source */}
        <div>
          <label className="field-label">Görsel</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setUrlMode("url")}
              className={cn(
                "flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition",
                urlMode === "url"
                  ? "border-brand/50 text-brand-light bg-brand/5"
                  : "border-ink-700 text-ink-400 hover:border-ink-500"
              )}
            >
              <LinkIcon className="w-3 h-3" />
              URL
            </button>
            <button
              type="button"
              onClick={() => setUrlMode("upload")}
              className={cn(
                "flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition",
                urlMode === "upload"
                  ? "border-brand/50 text-brand-light bg-brand/5"
                  : "border-ink-700 text-ink-400 hover:border-ink-500"
              )}
            >
              <Upload className="w-3 h-3" />
              Yükle
            </button>
          </div>

          {urlMode === "url" ? (
            <input
              type="url"
              value={imaging.image_url ?? ""}
              onChange={(e) => onChange({ image_url: e.target.value || undefined })}
              placeholder="https://upload.wikimedia.org/..."
              className="input w-full text-sm font-mono"
            />
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded border border-dashed border-ink-600 hover:border-brand/50 text-sm text-ink-400 hover:text-ink-200 transition w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                Dosya Seç (max 2 MB)
              </button>
              {imaging.image_url?.startsWith("data:") && (
                <p className="text-xs text-brand-light mt-1.5">
                  Görsel yüklendi.
                </p>
              )}
            </div>
          )}

          {imaging.image_url && !imaging.image_url.startsWith("data:") && (
            <div className="mt-2">
              <img
                src={imaging.image_url}
                alt="önizleme"
                className="max-h-32 rounded border border-ink-700 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        {/* Interpretation */}
        <div>
          <label className="field-label">Yorum / Bulgu Özeti</label>
          <textarea
            value={imaging.interpretation}
            onChange={(e) => onChange({ interpretation: e.target.value })}
            rows={2}
            placeholder="Radyolojik yorum..."
            className="input w-full text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* View */}
          <div>
            <label className="field-label">Görünüm / Pozisyon</label>
            <input
              type="text"
              value={imaging.view ?? ""}
              onChange={(e) => onChange({ view: e.target.value || undefined })}
              placeholder="ör. PA, Aksiyal"
              className="input w-full text-sm"
            />
          </div>
          {/* Attribution */}
          <div>
            <label className="field-label">Kaynak / Lisans</label>
            <input
              type="text"
              value={imaging.attribution ?? ""}
              onChange={(e) =>
                onChange({ attribution: e.target.value || undefined })
              }
              placeholder="ör. Wikimedia CC BY-SA"
              className="input w-full text-sm"
            />
          </div>
        </div>

        {/* Findings */}
        <FindingsEditor
          findings={imaging.findings ?? []}
          onChange={(findings) => onChange({ findings })}
        />
      </div>

      {/* Warning if no image and no interpretation */}
      {!imaging.image_url && !imaging.interpretation && (
        <div className="px-4 py-2 border-t border-ink-800/40 flex items-center gap-2 text-xs text-clinical-warning">
          <AlertCircle className="w-3 h-3" />
          Görsel veya yorum ekleyin.
        </div>
      )}
    </div>
  );
}

// ─── Findings list editor ─────────────────────────────────────────────────────

function FindingsEditor({
  findings,
  onChange,
}: {
  findings: string[];
  onChange: (findings: string[]) => void;
}) {
  return (
    <div>
      <label className="field-label">Spesifik Bulgular</label>
      <div className="space-y-1.5">
        {findings.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={f}
              onChange={(e) => {
                const updated = [...findings];
                updated[i] = e.target.value;
                onChange(updated);
              }}
              placeholder={`Bulgu ${i + 1}`}
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(findings.filter((_, j) => j !== i))}
              className="text-ink-600 hover:text-clinical-critical transition"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...findings, ""])}
          className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-brand-light transition"
        >
          <Plus className="w-3 h-3" />
          Bulgu Ekle
        </button>
      </div>
    </div>
  );
}
