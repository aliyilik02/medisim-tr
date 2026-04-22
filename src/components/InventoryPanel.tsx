import { useState } from "react";
import { MEDICATIONS } from "@/data/medications";
import { EQUIPMENT } from "@/data/equipment";
import { cn } from "@/lib/cn";
import { Pill, Wrench, Search } from "lucide-react";
import type { ActionRef } from "@/engine";

type Tab = "ilac" | "ekipman";

interface Props {
  availableMedications: string[];
  availableEquipment: string[];
  onAction: (action: ActionRef) => void;
  disabled?: boolean;
}

export function InventoryPanel({
  availableMedications,
  availableEquipment,
  onAction,
  disabled,
}: Props) {
  const [tab, setTab] = useState<Tab>("ekipman");
  const [search, setSearch] = useState("");

  const medsFiltered = availableMedications
    .map((id) => MEDICATIONS[id])
    .filter(Boolean)
    .filter(
      (m) =>
        search === "" ||
        m.name_tr.toLowerCase().includes(search.toLowerCase())
    );

  const eqFiltered = availableEquipment
    .map((id) => EQUIPMENT[id])
    .filter(Boolean)
    .filter(
      (e) =>
        search === "" ||
        e.name_tr.toLowerCase().includes(search.toLowerCase())
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
              "flex-1 px-3 py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1.5",
              tab === "ekipman"
                ? "bg-ink-700 text-ink-50"
                : "text-ink-400 hover:text-ink-200"
            )}
          >
            <Wrench className="w-3 h-3" />
            Ekipman
          </button>
          <button
            onClick={() => setTab("ilac")}
            className={cn(
              "flex-1 px-3 py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1.5",
              tab === "ilac"
                ? "bg-ink-700 text-ink-50"
                : "text-ink-400 hover:text-ink-200"
            )}
          >
            <Pill className="w-3 h-3" />
            İlaç
          </button>
        </div>

        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            placeholder={tab === "ilac" ? "İlaç ara..." : "Ekipman ara..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-ink-900 border border-ink-700 rounded text-sm focus:outline-none focus:border-brand/50 text-ink-100 placeholder:text-ink-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {tab === "ilac" &&
          medsFiltered.map((m) => (
            <button
              key={m.id}
              disabled={disabled}
              onClick={() =>
                onAction({
                  type: "give_medication",
                  target_id: m.id,
                  dose: m.default_dose,
                })
              }
              className="w-full text-left p-3 rounded-md bg-ink-900/50 hover:bg-ink-700 border border-ink-700/50 hover:border-brand/30 transition disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm text-ink-100 font-medium">
                    {m.name_tr}
                  </div>
                  {m.default_dose && (
                    <div className="text-xs font-mono text-ink-400 mt-0.5">
                      {m.default_dose}
                    </div>
                  )}
                </div>
                <span className="tag text-[9px]">{m.category}</span>
              </div>
            </button>
          ))}

        {tab === "ekipman" &&
          eqFiltered.map((e) => (
            <button
              key={e.id}
              disabled={disabled}
              onClick={() =>
                onAction({ type: "use_equipment", target_id: e.id })
              }
              className="w-full text-left p-3 rounded-md bg-ink-900/50 hover:bg-ink-700 border border-ink-700/50 hover:border-brand/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-ink-100 font-medium">
                  {e.name_tr}
                </div>
                <span className="tag text-[9px]">{e.category}</span>
              </div>
            </button>
          ))}

        {((tab === "ilac" && medsFiltered.length === 0) ||
          (tab === "ekipman" && eqFiltered.length === 0)) && (
          <div className="text-center text-sm text-ink-500 py-8">
            Eşleşen sonuç yok.
          </div>
        )}
      </div>
    </div>
  );
}
