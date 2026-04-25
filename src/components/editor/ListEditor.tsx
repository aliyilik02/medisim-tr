import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  minItems?: number;
  placeholder?: string;
  optional?: boolean;
}

export function ListEditor({ label, value, onChange, minItems, placeholder, optional }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  const belowMin = minItems !== undefined && value.length < minItems;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="field-label mb-0">
          {label}
          {optional && (
            <span className="text-ink-600 ml-1 normal-case tracking-normal text-[9px]">
              (opsiyonel)
            </span>
          )}
        </label>
        {minItems !== undefined && (
          <span
            className={cn(
              "font-mono text-[9px]",
              belowMin ? "text-clinical-warning" : "text-clinical-stable"
            )}
          >
            {value.length}/{minItems}+
          </span>
        )}
      </div>

      <div className="space-y-1 mb-2">
        {value.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 panel-inset px-3 py-2">
            <span className="font-mono text-[9px] text-ink-600 shrink-0 mt-0.5">
              {idx + 1}.
            </span>
            <span className="flex-1 text-sm text-ink-200 min-w-0 break-words">{item}</span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="p-0.5 text-ink-600 hover:text-ink-300 disabled:opacity-20"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === value.length - 1}
                className="p-0.5 text-ink-600 hover:text-ink-300 disabled:opacity-20"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="p-0.5 text-ink-600 hover:text-clinical-critical"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {value.length === 0 && (
          <div className="panel-inset px-3 py-2 text-ink-600 text-xs italic">
            Henüz öğe eklenmedi.
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 field-input text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="btn-ghost px-3 py-2 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
