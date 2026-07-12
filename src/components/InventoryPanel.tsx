import { useState } from "react";
import { MEDICATIONS } from "@/data/medications";
import { EQUIPMENT } from "@/data/equipment";
import { cn } from "@/lib/cn";
import { Pill, Wrench, Search, FlaskConical, Loader2, CheckCircle2, Image } from "lucide-react";
import type { ActionRef, LabPanel, ImagingResult } from "@/engine";
import type { LabStatus } from "@/hooks/useLabResults";
import { GlowIcon } from "@/components/ui/GlowIcon";
import {
  EQUIPMENT_CATEGORY_ICONS,
  GROUP_TONES,
  MEDICATION_CATEGORY_ICONS,
} from "@/components/ui/category-icons";

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

/* Neon grup kimliği: sekme + satır ikonu + rozet aynı tonu konuşur
   (ekipman=cyan, ilaç=pink, tetkik=violet — docs/DESIGN-TOKENS.md). */
const TAB_TONE_CLASS: Record<Tab, string> = {
  ekipman: "neon-cyan",
  ilac: "neon-pink",
  tetkik: "neon-violet",
};

/** Liste girişi kademeli parlar; uzun listede gecikme 240ms'de kapanır. */
const staggerStyle = (i: number) => ({ animationDelay: `${Math.min(i * 28, 240)}ms` });

function TabButton({
  tone,
  active,
  onClick,
  icon: Icon,
  children,
}: {
  tone: string;
  active: boolean;
  onClick: () => void;
  icon: typeof Wrench;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all duration-200",
        "flex items-center justify-center gap-1.5",
        tone,
        active
          ? "bg-ink-700/80 shadow-glow-xs"
          : "text-ink-400 hover:text-ink-200",
      )}
      style={active ? { color: "var(--neon)" } : undefined}
    >
      <Icon
        className="w-3 h-3"
        style={active ? { filter: "drop-shadow(0 0 3px var(--glow))" } : undefined}
      />
      {children}
    </button>
  );
}

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
    )
    .sort((a, b) => a.name_tr.localeCompare(b.name_tr, "tr"));

  const eqFiltered = availableEquipment
    .map((id) => EQUIPMENT[id])
    .filter(Boolean)
    .filter(
      (e) => search === "" || e.name_tr.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name_tr.localeCompare(b.name_tr, "tr"));

  const labPanelEntries = labPanels
    ? Object.entries(labPanels)
        .filter(
          ([id, p]) =>
            search === "" ||
            p.name_tr.toLowerCase().includes(search.toLowerCase()) ||
            id.toLowerCase().includes(search.toLowerCase())
        )
        .sort(([, a], [, b]) => a.name_tr.localeCompare(b.name_tr, "tr"))
    : [];

  const imagingFiltered = imagingResults
    .filter(
      (r) =>
        search === "" ||
        r.name_tr.toLowerCase().includes(search.toLowerCase()) ||
        r.modality.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name_tr.localeCompare(b.name_tr, "tr"));

  return (
    <div className="panel flex flex-col h-full">
      <div className="p-4 border-b border-ink-700">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Envanter
          </div>
          <div className="text-xs text-ink-400 font-mono">
            <span className="neon-pink" style={{ color: "var(--neon)" }}>
              {availableMedications.length} ilaç
            </span>
            {" · "}
            <span className="neon-cyan" style={{ color: "var(--neon)" }}>
              {availableEquipment.length} ekipman
            </span>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-ink-900 rounded-md">
          <TabButton
            tone={TAB_TONE_CLASS.ekipman}
            active={tab === "ekipman"}
            onClick={() => setTab("ekipman")}
            icon={Wrench}
          >
            Ekipman
          </TabButton>
          <TabButton
            tone={TAB_TONE_CLASS.ilac}
            active={tab === "ilac"}
            onClick={() => setTab("ilac")}
            icon={Pill}
          >
            İlaç
          </TabButton>
          {hasTetkik && (
            <TabButton
              tone={TAB_TONE_CLASS.tetkik}
              active={tab === "tetkik"}
              onClick={() => setTab("tetkik")}
              icon={FlaskConical}
            >
              Tetkik
            </TabButton>
          )}
        </div>

        <div className={cn("mt-3 relative transition-all duration-200", TAB_TONE_CLASS[tab])}>
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
            className="w-full pl-8 pr-3 py-1.5 bg-ink-900 border border-ink-700 rounded text-sm
                       focus:outline-none focus:border-[color:var(--neon)] focus:shadow-glow-xs
                       text-ink-100 placeholder:text-ink-500 transition-all duration-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* İlaç tab */}
        {tab === "ilac" &&
          medsFiltered.map((m, i) => (
            <button
              key={m.id}
              disabled={disabled}
              onClick={() =>
                onAction({ type: "give_medication", target_id: m.id, dose: m.default_dose })
              }
              className={cn(
                "w-full text-left p-2.5 rounded-md bg-ink-900/50 hover:bg-ink-800",
                "neon-row animate-stagger-in disabled:opacity-40 disabled:cursor-not-allowed",
                TAB_TONE_CLASS.ilac,
              )}
              style={staggerStyle(i)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <GlowIcon icon={MEDICATION_CATEGORY_ICONS[m.category]} tone={GROUP_TONES.ilac} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink-100 font-medium truncate">{m.name_tr}</div>
                    {m.default_dose && (
                      <div className="text-xs font-mono text-ink-400 mt-0.5">{m.default_dose}</div>
                    )}
                  </div>
                </div>
                <span
                  className="tag text-[9px] bg-transparent"
                  style={{
                    color: "var(--neon)",
                    borderColor: "color-mix(in srgb, var(--neon) 35%, transparent)",
                  }}
                >
                  {m.category}
                </span>
              </div>
            </button>
          ))}

        {/* Ekipman tab */}
        {tab === "ekipman" &&
          eqFiltered.map((e, i) => (
            <button
              key={e.id}
              disabled={disabled}
              onClick={() => onAction({ type: "use_equipment", target_id: e.id })}
              className={cn(
                "w-full text-left p-2.5 rounded-md bg-ink-900/50 hover:bg-ink-800",
                "neon-row animate-stagger-in disabled:opacity-40 disabled:cursor-not-allowed",
                TAB_TONE_CLASS.ekipman,
              )}
              style={staggerStyle(i)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <GlowIcon icon={EQUIPMENT_CATEGORY_ICONS[e.category]} tone={GROUP_TONES.ekipman} size="sm" />
                  <div className="text-sm text-ink-100 font-medium truncate">{e.name_tr}</div>
                </div>
                <span
                  className="tag text-[9px] bg-transparent"
                  style={{
                    color: "var(--neon)",
                    borderColor: "color-mix(in srgb, var(--neon) 35%, transparent)",
                  }}
                >
                  {e.category}
                </span>
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
                {labPanelEntries.map(([id, panel], i) => {
                  const status = getLabStatus ? getLabStatus(id) : "idle";
                  return (
                    <LabPanelRow
                      key={id}
                      panel={panel}
                      status={status}
                      disabled={disabled}
                      onOrder={() => onOrderLab?.(id)}
                      onView={() => onViewLab?.(id)}
                      index={i}
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
                {imagingFiltered.map((r, i) => (
                  <button
                    key={r.id}
                    disabled={disabled}
                    onClick={() => onViewImaging?.(r.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-md bg-ink-900/50 hover:bg-ink-800 mb-1",
                      "neon-row animate-stagger-in disabled:opacity-40 disabled:cursor-not-allowed",
                      TAB_TONE_CLASS.tetkik,
                    )}
                    style={staggerStyle(labPanelEntries.length + i)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <GlowIcon icon={Image} tone={GROUP_TONES.tetkik} size="sm" />
                        <div className="text-sm text-ink-100 font-medium">{r.name_tr}</div>
                      </div>
                      <span
                        className="tag text-[9px] bg-transparent"
                        style={{
                          color: "var(--neon)",
                          borderColor: "color-mix(in srgb, var(--neon) 35%, transparent)",
                        }}
                      >
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
  index = 0,
}: {
  panel: LabPanel;
  status: LabStatus;
  disabled?: boolean;
  onOrder: () => void;
  onView: () => void;
  index?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 p-2.5 rounded-md border mb-1",
        "neon-violet animate-stagger-in transition-all duration-200",
        status === "ready"
          ? "bg-ink-900/60 neon-border shadow-glow-xs"
          : "bg-ink-900/50 border-ink-700/50"
      )}
      style={staggerStyle(index)}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <GlowIcon
          icon={FlaskConical}
          tone="violet"
          size="sm"
          className={cn(status !== "ready" && status !== "pending" && "opacity-60")}
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
          className="text-xs font-mono px-2.5 py-1 rounded border border-ink-600 text-ink-300
                     hover:border-[color:var(--neon)] hover:text-[color:var(--neon)] hover:shadow-glow-xs
                     transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          İste
        </button>
      )}

      {status === "pending" && (
        <span className="flex items-center gap-2 text-xs font-mono text-clinical-warning flex-shrink-0">
          <Loader2 className="w-3 h-3 animate-spin" />
          Bekleniyor
          {/* Kayan ışık şeridi — sonuç yolda hissi */}
          <span className="skeleton-shimmer h-1 w-12 rounded-full" aria-hidden />
        </span>
      )}

      {status === "ready" && (
        <button
          disabled={disabled}
          onClick={onView}
          className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded border
                     border-[color:var(--neon)] text-[color:var(--neon)] shadow-glow-xs
                     hover:bg-ink-800 animate-glow-breathe
                     transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <CheckCircle2 className="w-3 h-3" />
          Görüntüle
        </button>
      )}
    </div>
  );
}
