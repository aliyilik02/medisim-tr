import { useState } from "react";
import { MEDICATIONS } from "@/data/medications";
import { EQUIPMENT } from "@/data/equipment";
import { cn } from "@/lib/cn";
import { Pill, Wrench, Search, FlaskConical, Loader2, CheckCircle2, Image } from "lucide-react";
import type { ActionRef, LabPanel, ImagingResult } from "@/engine";
import type { LabStatus } from "@/hooks/useLabResults";

type Tab = "ilac" | "ekipman" | "tetkik";

interface Props {
  availableMedications: string[];
  availableEquipment: string[];
  onAction: (action: ActionRef) => void;
  disabled?: boolean;
  labPanels?: Record<string, LabPanel>;
  imagingResults?: ImagingResult[];
  getLabStatus?: (panelId: string) => LabStatus;
  onOrderLab?: (panelId: string) => void;
  onViewLab?: (panelId: string) => void;
  onViewImaging?: (imagingId: string) => void;
}

const MODALITY_LABEL: Record<string, string> = {
  xray: "Röntgen", ct: "BT", mri: "MRG", us: "USG",
  echo: "EKO", ekg: "EKG", other: "Görüntü",
};

export function InventoryPanel({
  availableMedications,
  availableEquipment,
  onAction,
  disabled,
  labPanels,
  imagingResults = [],
  getLabStatus,
  onOrderLab,
  onViewLab,
  onViewImaging,
}: Props) {
  const hasTetkik = (labPanels && Object.keys(labPanels).length > 0) || imagingResults.length > 0;

  const [tab, setTab] = useState<Tab>("ekipman");
  const [search, setSearch] = useState("");

  const medsFiltered = availableMedications
    .map((id) => MEDICATIONS[id])
    .filter(Boolean)
    .filter(
      (m) => search === "" || m.name_tr.toLowerCase().includes(search.toLowerCase())
    );

  const eqFiltered = availableEquipment
    .map((id) => EQUIPMENT[id])
    .filter(Boolean)
    .filter(
      (e) => search === "" || e.name_tr.toLowerCase().includes(search.toLowerCase())
    );

  const labPanelEntries = labPanels
    ? Object.entries(labPanels).filter(
        ([id, p]) =>
          search === "" ||
          p.name_tr.toLowerCase().includes(search.toLowerCase()) ||
          id.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const imagingFiltered = imagingResults.filter(
    (r) =>
      search === "" ||
      r.name_tr.toLowerCase().includes(search.toLowerCase()) ||
      r.modality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel flex flex-col h-full">
      <div className="p-4 border-b border-ink-700">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Envanter
          </div>
          <div className="text-xs text-ink-400 font-mono">
            {availableMedications.length} ilaç · {availableEquipment.length} ekipman
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-ink-900 rounded-md">
          <button
            onClick={() => setTab("ekipman")}
            className={cn(
              "flex-1 px-2 py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1",
              tab === "ekipman" ? "bg-ink-700 text-ink-50" : "text-ink-400 hover:text-ink-200"
            )}
          >
            <Wrench className="w-3 h-3" />
            Ekipman
          </button>
          <button
            onClick={() => setTab("ilac")}
            className={cn(
              "flex-1 px-2 py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1",
              tab === "ilac" ? "bg-ink-700 text-ink-50" : "text-ink-400 hover:text-ink-200"
            )}
          >
            <Pill className="w-3 h-3" />
            İlaç
          </button>
          {hasTetkik && (
            <button
              onClick={() => setTab("tetkik")}
              className={cn(
                "flex-1 px-2 py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1",
                tab === "tetkik" ? "bg-ink-700 text-ink-50" : "text-ink-400 hover:text-ink-200"
              )}
            >
              <FlaskConical className="w-3 h-3" />
              Tetkik
            </button>
          )}
        </div>

        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            placeholder={
              tab === "ilac" ? "İlaç ara..." :
              tab === "tetkik" ? "Tetkik ara..." :
              "Ekipman ara..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-ink-900 border border-ink-700 rounded text-sm focus:outline-none focus:border-brand/50 text-ink-100 placeholder:text-ink-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* İlaç tab */}
        {tab === "ilac" &&
          medsFiltered.map((m) => (
            <button
              key={m.id}
              disabled={disabled}
              onClick={() =>
                onAction({ type: "give_medication", target_id: m.id, dose: m.default_dose })
              }
              className="w-full text-left p-3 rounded-md bg-ink-900/50 hover:bg-ink-700 border border-ink-700/50 hover:border-brand/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm text-ink-100 font-medium">{m.name_tr}</div>
                  {m.default_dose && (
                    <div className="text-xs font-mono text-ink-400 mt-0.5">{m.default_dose}</div>
                  )}
                </div>
                <span className="tag text-[9px]">{m.category}</span>
              </div>
            </button>
          ))}

        {/* Ekipman tab */}
        {tab === "ekipman" &&
          eqFiltered.map((e) => (
            <button
              key={e.id}
              disabled={disabled}
              onClick={() => onAction({ type: "use_equipment", target_id: e.id })}
              className="w-full text-left p-3 rounded-md bg-ink-900/50 hover:bg-ink-700 border border-ink-700/50 hover:border-brand/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-ink-100 font-medium">{e.name_tr}</div>
                <span className="tag text-[9px]">{e.category}</span>
              </div>
            </button>
          ))}

        {/* Tetkik tab */}
        {tab === "tetkik" && (
          <>
            {/* Lab panels */}
            {labPanelEntries.length > 0 && (
              <div className="mb-3">
                <div className="font-mono text-[9px] uppercase tracking-wider text-ink-500 px-1 mb-1.5">
                  Laboratuvar
                </div>
                {labPanelEntries.map(([id, panel]) => {
                  const status = getLabStatus ? getLabStatus(id) : "idle";
                  return (
                    <LabPanelRow
                      key={id}
                      panel={panel}
                      status={status}
                      disabled={disabled}
                      onOrder={() => onOrderLab?.(id)}
                      onView={() => onViewLab?.(id)}
                    />
                  );
                })}
              </div>
            )}

            {/* Imaging results */}
            {imagingFiltered.length > 0 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-ink-500 px-1 mb-1.5">
                  Görüntüleme
                </div>
                {imagingFiltered.map((r) => (
                  <button
                    key={r.id}
                    disabled={disabled}
                    onClick={() => onViewImaging?.(r.id)}
                    className="w-full text-left p-3 rounded-md bg-ink-900/50 hover:bg-ink-700 border border-ink-700/50 hover:border-cyan-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed mb-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Image className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <div className="text-sm text-ink-100 font-medium">{r.name_tr}</div>
                      </div>
                      <span className="tag text-[9px] text-cyan-400 border-cyan-700/40">
                        {MODALITY_LABEL[r.modality] ?? r.modality}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty states */}
        {tab === "ilac" && medsFiltered.length === 0 && (
          <div className="text-center text-sm text-ink-500 py-8">Eşleşen sonuç yok.</div>
        )}
        {tab === "ekipman" && eqFiltered.length === 0 && (
          <div className="text-center text-sm text-ink-500 py-8">Eşleşen sonuç yok.</div>
        )}
        {tab === "tetkik" && labPanelEntries.length === 0 && imagingFiltered.length === 0 && (
          <div className="text-center text-sm text-ink-500 py-8">Tetkik bulunamadı.</div>
        )}
      </div>
    </div>
  );
}

function LabPanelRow({
  panel,
  status,
  disabled,
  onOrder,
  onView,
}: {
  panel: LabPanel;
  status: LabStatus;
  disabled?: boolean;
  onOrder: () => void;
  onView: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 p-3 rounded-md border mb-1 transition",
        status === "ready"
          ? "bg-brand/5 border-brand/30"
          : "bg-ink-900/50 border-ink-700/50"
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FlaskConical
          className={cn(
            "w-3.5 h-3.5 flex-shrink-0",
            status === "ready" ? "text-brand-light" : "text-ink-400"
          )}
        />
        <span className={cn("text-sm font-medium truncate",
          status === "ready" ? "text-ink-50" : "text-ink-200"
        )}>
          {panel.name_tr}
        </span>
      </div>

      {status === "idle" && (
        <button
          disabled={disabled}
          onClick={onOrder}
          className="text-xs font-mono px-2.5 py-1 rounded border border-ink-600 text-ink-300 hover:border-brand/50 hover:text-brand-light transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          İste
        </button>
      )}

      {status === "pending" && (
        <span className="flex items-center gap-1 text-xs font-mono text-clinical-warning flex-shrink-0">
          <Loader2 className="w-3 h-3 animate-spin" />
          Bekleniyor
        </span>
      )}

      {status === "ready" && (
        <button
          disabled={disabled}
          onClick={onView}
          className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded border border-brand/40 text-brand-light hover:bg-brand/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <CheckCircle2 className="w-3 h-3" />
          Görüntüle
        </button>
      )}
    </div>
  );
}
