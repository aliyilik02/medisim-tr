import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface ChipInputProps {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  optional?: boolean;
}

export function ChipInput({
  label,
  placeholder = "Yaz ve Enter bas...",
  value,
  onChange,
  suggestions,
  optional,
}: ChipInputProps) {
  const [inputVal, setInputVal] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputVal("");
    setShowSugg(false);
  };

  const remove = (chip: string) => onChange(value.filter((c) => c !== chip));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(inputVal);
    } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  const filtered = suggestions
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(inputVal.toLowerCase()) &&
          !value.includes(s)
      )
    : [];

  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-400 mb-1.5">
        {label}
        {optional && (
          <span className="ml-1.5 normal-case tracking-normal text-ink-600">
            (opsiyonel)
          </span>
        )}
      </label>
      <div
        className="panel-inset min-h-[42px] p-2 flex flex-wrap gap-1.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 tag text-ink-100 normal-case tracking-normal"
          >
            {chip}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(chip);
              }}
              className="text-ink-400 hover:text-clinical-critical transition ml-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setShowSugg(true);
            }}
            onKeyDown={handleKey}
            onFocus={() => inputVal && setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-600 py-0.5"
          />
          {showSugg && filtered.length > 0 && (
            <div className="absolute top-full left-0 z-20 mt-1 panel min-w-[200px] py-1 shadow-xl border-ink-600">
              {filtered.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(s);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-ink-200 hover:bg-ink-700 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
