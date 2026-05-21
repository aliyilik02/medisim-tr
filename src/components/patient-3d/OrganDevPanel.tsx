// ============================================================
// OrganDevPanel — Sprint B.5+ runtime organ scale/pozisyon ayar UI
// ============================================================
// URL'de `?dev=1` varsa otomatik açık, Alt+O ile toggle. Organ
// (heart/lungs/liver) seçilir, scale + X/Y/Z slider'larla ayarlanır.
// localStorage'a kaydedilir (useOrganOverrides). "JSON Export" tüm
// final konfigürasyonu clipboard'a kopyalar — geliştirici
// IndividualOrgans.tsx DEFAULT_ORGAN_CONFIGS'e yapıştırır.
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { Heart, X, Clipboard, RotateCcw, Eraser, Eye, EyeOff } from "lucide-react";
import {
  DEFAULT_ORGAN_CONFIGS,
  type OrganId,
  type OrganOverride,
  type OrganOverrideMap,
} from "./IndividualOrgans";

interface Props {
  overrides: OrganOverrideMap;
  onUpdate: (id: OrganId, patch: OrganOverride) => void;
  onReset: (id: OrganId) => void;
  onResetAll: () => void;
}

// Patient world bbox: y[-0.243, 0.778], x[-0.20, +0.20], z[-0.08, +0.09].
// Organlar gövde içinde olmalı; range biraz geniş tutuldu (z dış sınır = +0.15).
const X_RANGE: [number, number] = [-0.25, 0.25];
const Y_RANGE: [number, number] = [-0.25, 0.78];
const Z_RANGE: [number, number] = [-0.1, 0.15];
const POS_STEP = 0.005;

// Scale: Sketchfab birim belirsizliği için geniş aralık (0.001 — 0.6).
// Linear step; çok küçük değerlerde number input ile manuel girilebilir.
const SCALE_RANGE: [number, number] = [0.001, 0.6];
const SCALE_STEP = 0.001;

const ORGAN_ORDER: OrganId[] = ["heart", "lungs", "liver"];

function fmt(n: number, digits = 3): string {
  return n.toFixed(digits);
}

function effectiveConfig(id: OrganId, overrides: OrganOverrideMap) {
  const base = DEFAULT_ORGAN_CONFIGS[id];
  const ov = overrides[id] ?? {};
  return {
    scale: ov.scale ?? base.scale,
    position: ov.position ?? base.position,
    rotation: ov.rotation ?? base.rotation,
    secondaryRotation: ov.secondaryRotation ?? base.secondaryRotation,
    visible: ov.visible ?? base.visible,
    label: base.label,
  };
}

/** Organın secondary rotation desteği var mı? (DEFAULT'ta tanımlı mı) */
function hasSecondary(id: OrganId): boolean {
  return DEFAULT_ORGAN_CONFIGS[id].secondaryRotation !== undefined;
}

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export function OrganDevPanel({ overrides, onUpdate, onReset, onResetAll }: Props) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("dev");
  });
  const [selectedId, setSelectedId] = useState<OrganId>("heart");
  const [copyFlash, setCopyFlash] = useState(false);

  // Alt+O shortcut (Alt+D MarkerDevPanel'e atanmış, çakışmasın)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const current = useMemo(
    () => effectiveConfig(selectedId, overrides),
    [selectedId, overrides],
  );

  const isOverridden = selectedId in overrides;
  const [x, y, z] = current.position;
  const [rx, ry, rz] = current.rotation;
  const secondary = current.secondaryRotation ?? [0, 0, 0];
  const [srx, sry, srz] = secondary;
  const supportsSecondary = hasSecondary(selectedId);
  const scale = current.scale;

  const updatePos = (axis: 0 | 1 | 2, value: number) => {
    const next: [number, number, number] = [...current.position];
    next[axis] = value;
    onUpdate(selectedId, { position: next });
  };

  const updateRotDeg = (axis: 0 | 1 | 2, deg: number) => {
    const next: [number, number, number] = [...current.rotation];
    next[axis] = deg * DEG_TO_RAD;
    onUpdate(selectedId, { rotation: next });
  };

  const updateSecondaryRotDeg = (axis: 0 | 1 | 2, deg: number) => {
    const next: [number, number, number] = [...secondary];
    next[axis] = deg * DEG_TO_RAD;
    onUpdate(selectedId, { secondaryRotation: next });
  };

  const resetRotation = () => onUpdate(selectedId, { rotation: [0, 0, 0] });
  const resetSecondaryRotation = () =>
    onUpdate(selectedId, { secondaryRotation: [0, 0, 0] });

  const updateScale = (value: number) => onUpdate(selectedId, { scale: value });
  const toggleVisible = () => onUpdate(selectedId, { visible: !current.visible });

  const exportJson = async () => {
    const lines: string[] = [];
    for (const id of ORGAN_ORDER) {
      const cfg = effectiveConfig(id, overrides);
      const [px, py, pz] = cfg.position;
      const [rxRad, ryRad, rzRad] = cfg.rotation;
      let extra = "";
      if (cfg.secondaryRotation) {
        const [sxRad, syRad, szRad] = cfg.secondaryRotation;
        extra = `, secondaryRotation: [${fmt(sxRad)}, ${fmt(syRad)}, ${fmt(szRad)}]`;
      }
      lines.push(
        `  ${id}: { ...DEFAULT_ORGAN_CONFIGS.${id}, scale: ${fmt(cfg.scale)}, position: [${fmt(px)}, ${fmt(py)}, ${fmt(pz)}], rotation: [${fmt(rxRad)}, ${fmt(ryRad)}, ${fmt(rzRad)}]${extra}, visible: ${cfg.visible} },`,
      );
    }
    const json = lines.join("\n");
    try {
      await navigator.clipboard.writeText(json);
      setCopyFlash(true);
      window.setTimeout(() => setCopyFlash(false), 1500);
    } catch {
      // eslint-disable-next-line no-console
      console.log("[OrganDevPanel] JSON Export:\n" + json);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-30 bg-ink-900/90 backdrop-blur-md border border-clinical-info/40 text-clinical-info rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] flex items-center gap-1.5 shadow-lg hover:bg-ink-800 transition"
        data-testid="organ-dev-toggle"
        title="Alt+O — Organ dev panel"
      >
        <Heart className="w-3 h-3" />
        Organ
        {Object.keys(overrides).length > 0 && (
          <span className="bg-clinical-info text-ink-950 px-1 rounded text-[8px] font-bold tabular-nums">
            {Object.keys(overrides).length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed top-4 right-4 z-30 bg-ink-900/95 backdrop-blur-md border border-clinical-info/50 rounded-lg p-3 w-[340px] shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
      data-testid="organ-dev-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <Heart className="w-3.5 h-3.5 text-clinical-info" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clinical-info">
          Organ Dev Panel
        </span>
        <span className="ml-auto font-mono text-[9px] text-ink-500">
          {Object.keys(overrides).length} override
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-400 hover:text-ink-100 transition"
          aria-label="Kapat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Organ tab seçici */}
      <div className="flex gap-1 mb-2.5">
        {ORGAN_ORDER.map((id) => {
          const isActive = id === selectedId;
          const hasOv = id in overrides;
          const cfg = effectiveConfig(id, overrides);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={`flex-1 px-2 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.1em] border transition flex items-center justify-center gap-1 ${
                isActive
                  ? "bg-clinical-info/20 border-clinical-info/50 text-clinical-info"
                  : "bg-ink-800 border-ink-700 text-ink-400 hover:text-ink-100"
              }`}
              data-testid={`organ-dev-tab-${id}`}
            >
              {cfg.label}
              {hasOv && <span className="text-[8px]">*</span>}
            </button>
          );
        })}
      </div>

      {/* Visible toggle */}
      <button
        type="button"
        onClick={toggleVisible}
        className={`w-full px-2 py-1.5 mb-2.5 rounded font-mono text-[9px] uppercase tracking-[0.12em] border transition flex items-center justify-center gap-1.5 ${
          current.visible
            ? "bg-clinical-stable/15 border-clinical-stable/40 text-clinical-stable"
            : "bg-ink-800 border-ink-700 text-ink-500"
        }`}
        data-testid="organ-dev-visible"
      >
        {current.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        {current.visible ? "Görünür" : "Gizli"}
      </button>

      {/* Scale slider + number input */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-400">
            Scale
          </span>
          <input
            type="number"
            value={scale}
            min={0.0001}
            max={5}
            step={SCALE_STEP}
            onChange={(e) => updateScale(parseFloat(e.target.value) || 0.001)}
            className="w-20 bg-ink-800 border border-ink-700 rounded px-1 py-0.5 font-mono text-[10px] tabular-nums text-ink-100 text-right focus:border-clinical-info/50 focus:outline-none"
            data-testid="organ-dev-scale-input"
          />
        </div>
        <input
          type="range"
          min={SCALE_RANGE[0]}
          max={SCALE_RANGE[1]}
          step={SCALE_STEP}
          value={Math.min(scale, SCALE_RANGE[1])}
          onChange={(e) => updateScale(parseFloat(e.target.value))}
          className="w-full accent-clinical-info cursor-pointer"
          aria-label="Scale"
          data-testid="organ-dev-scale-slider"
        />
      </div>

      {/* X/Y/Z position sliders */}
      <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-500 mb-1">
        Pozisyon
      </div>
      <div className="flex flex-col gap-2 mb-3">
        <AxisSlider
          axis="X"
          value={x}
          min={X_RANGE[0]}
          max={X_RANGE[1]}
          step={POS_STEP}
          onChange={(v) => updatePos(0, v)}
        />
        <AxisSlider
          axis="Y"
          value={y}
          min={Y_RANGE[0]}
          max={Y_RANGE[1]}
          step={POS_STEP}
          onChange={(v) => updatePos(1, v)}
        />
        <AxisSlider
          axis="Z"
          value={z}
          min={Z_RANGE[0]}
          max={Z_RANGE[1]}
          step={POS_STEP}
          onChange={(v) => updatePos(2, v)}
        />
      </div>

      {/* Rotation X/Y/Z sliders (derece) */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-500">
          {supportsSecondary ? "Doku Rotasyonu (derece)" : "Rotasyon (derece)"}
        </span>
        <button
          type="button"
          onClick={resetRotation}
          className="font-mono text-[8px] uppercase text-ink-400 hover:text-clinical-info transition flex items-center gap-1"
          title="Rotasyonu sıfırla"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          0°
        </button>
      </div>
      <div className="flex flex-col gap-2 mb-3">
        <AxisSlider
          axis="rX"
          value={rx * RAD_TO_DEG}
          min={-180}
          max={180}
          step={1}
          digits={1}
          onChange={(v) => updateRotDeg(0, v)}
        />
        <AxisSlider
          axis="rY"
          value={ry * RAD_TO_DEG}
          min={-180}
          max={180}
          step={1}
          digits={1}
          onChange={(v) => updateRotDeg(1, v)}
        />
        <AxisSlider
          axis="rZ"
          value={rz * RAD_TO_DEG}
          min={-180}
          max={180}
          step={1}
          digits={1}
          onChange={(v) => updateRotDeg(2, v)}
        />
      </div>

      {/* Trakea / üst kısım rotasyonu — sadece secondaryRotation destekleyenler */}
      {supportsSecondary && (
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-clinical-warning">
              Trakea Rotasyonu (derece)
            </span>
            <button
              type="button"
              onClick={resetSecondaryRotation}
              className="font-mono text-[8px] uppercase text-ink-400 hover:text-clinical-warning transition flex items-center gap-1"
              title="Trakea rotasyonunu sıfırla"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              0°
            </button>
          </div>
          <div className="flex flex-col gap-2 mb-3">
            <AxisSlider
              axis="rX"
              value={srx * RAD_TO_DEG}
              min={-180}
              max={180}
              step={1}
              digits={1}
              onChange={(v) => updateSecondaryRotDeg(0, v)}
              testIdPrefix="organ-dev-sec"
            />
            <AxisSlider
              axis="rY"
              value={sry * RAD_TO_DEG}
              min={-180}
              max={180}
              step={1}
              digits={1}
              onChange={(v) => updateSecondaryRotDeg(1, v)}
              testIdPrefix="organ-dev-sec"
            />
            <AxisSlider
              axis="rZ"
              value={srz * RAD_TO_DEG}
              min={-180}
              max={180}
              step={1}
              digits={1}
              onChange={(v) => updateSecondaryRotDeg(2, v)}
              testIdPrefix="organ-dev-sec"
            />
          </div>
          <div className="font-mono text-[8px] text-ink-500 italic mb-2">
            Pivot: doku üst sınırı (alt %80 ile üst %20 ayrım noktası).
          </div>
        </>
      )}

      {/* Reset butonları */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => onReset(selectedId)}
          disabled={!isOverridden}
          className="flex-1 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-300 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1"
          data-testid="organ-dev-reset-current"
        >
          <RotateCcw className="w-3 h-3" />
          Bu organ
        </button>
        <button
          type="button"
          onClick={onResetAll}
          disabled={Object.keys(overrides).length === 0}
          className="flex-1 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-ink-800 hover:bg-ink-700 border border-clinical-warning/40 text-clinical-warning disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1"
          data-testid="organ-dev-reset-all"
        >
          <Eraser className="w-3 h-3" />
          Hepsini sıfırla
        </button>
      </div>

      {/* JSON Export */}
      <button
        type="button"
        onClick={exportJson}
        className="w-full px-2 py-1.5 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-clinical-stable/15 hover:bg-clinical-stable/25 border border-clinical-stable/40 text-clinical-stable transition flex items-center justify-center gap-1.5"
        data-testid="organ-dev-export"
      >
        <Clipboard className="w-3 h-3" />
        {copyFlash ? "Kopyalandı!" : "JSON Export (clipboard)"}
      </button>
      <div className="mt-2 font-mono text-[9px] text-ink-500 italic">
        Alt+O ile aç/kapat · localStorage'a kaydedilir · Export → IndividualOrgans.tsx
      </div>
    </div>
  );
}

interface AxisSliderProps {
  axis: "X" | "Y" | "Z" | "rX" | "rY" | "rZ";
  value: number;
  min: number;
  max: number;
  step: number;
  digits?: number;
  onChange: (v: number) => void;
  testIdPrefix?: string;
}

function AxisSlider({
  axis,
  value,
  min,
  max,
  step,
  digits = 3,
  onChange,
  testIdPrefix = "organ-dev",
}: AxisSliderProps) {
  const slug = axis.toLowerCase();
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-400">
          {axis}
        </span>
        <input
          type="number"
          value={Number(value.toFixed(digits))}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 bg-ink-800 border border-ink-700 rounded px-1 py-0.5 font-mono text-[10px] tabular-nums text-ink-100 text-right focus:border-clinical-info/50 focus:outline-none"
          data-testid={`${testIdPrefix}-${slug}-input`}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-clinical-info cursor-pointer"
        aria-label={`${axis} ekseni`}
        data-testid={`${testIdPrefix}-slider-${slug}`}
      />
    </div>
  );
}
