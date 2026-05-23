// ============================================================
// RoomLayoutDevPanel — hastane odası mesh manual layout paneli
// ============================================================
// Mesh seçici dropdown + visible toggle + X/Y/Z slider+input + scale.
// Slider hareketleri localStorage'a anında yazılır (useRoomLayoutOverrides).
// Sayfa yenilense bile pozisyonlar korunur — "kaydet" butonu gerekmez.
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { Building2, X, RotateCcw, Eraser, Eye, EyeOff } from "lucide-react";
import { HOSPITAL_ROOM_LAYOUT, HIDDEN_MESH } from "./hospital-room-layout";
import type {
  RoomLayoutOverrideMap,
  RoomMeshOverride,
} from "@/hooks/useRoomLayoutOverrides";

interface Props {
  overrides: RoomLayoutOverrideMap;
  onUpdate: (name: string, patch: RoomMeshOverride) => void;
  onReset: (name: string) => void;
  onResetAll: () => void;
}

const POS_RANGE: [number, number] = [-3.5, 3.5];
const POS_STEP = 0.05;
const SCALE_RANGE: [number, number] = [0.05, 3.0];
const SCALE_STEP = 0.05;
// Rotation slider: derece UI (-180..180), radyan store
const ROT_DEG_RANGE: [number, number] = [-180, 180];
const ROT_DEG_STEP = 1;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Tüm mesh isimleri: layout dict + hidden set
const ALL_MESH_NAMES = [
  ...Object.keys(HOSPITAL_ROOM_LAYOUT),
  ...Array.from(HIDDEN_MESH),
].sort();

function effective(name: string, overrides: RoomLayoutOverrideMap) {
  const base = HOSPITAL_ROOM_LAYOUT[name];
  const ov = overrides[name] ?? {};
  const isHidden = HIDDEN_MESH.has(name);
  return {
    position: ov.position ?? base?.position ?? [0, 0, 0],
    rotation: ov.rotation ?? base?.rotation ?? [0, 0, 0],
    scale: ov.scale ?? base?.scale ?? 1,
    visible: ov.visible ?? !isHidden,
  };
}

function fmt(n: number, d = 2): string {
  return n.toFixed(d);
}

export function RoomLayoutDevPanel({
  overrides,
  onUpdate,
  onReset,
  onResetAll,
}: Props) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("dev");
  });
  const [selectedName, setSelectedName] = useState<string>(ALL_MESH_NAMES[0]);

  // Alt+R shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const current = useMemo(
    () => effective(selectedName, overrides),
    [selectedName, overrides],
  );

  const [x, y, z] = current.position;
  const [rx, ry, rz] = current.rotation;
  const isOverridden = selectedName in overrides;

  const updatePos = (axis: 0 | 1 | 2, val: number) => {
    const next: [number, number, number] = [...current.position];
    next[axis] = val;
    onUpdate(selectedName, { position: next });
  };
  const updateRotDeg = (axis: 0 | 1 | 2, deg: number) => {
    const next: [number, number, number] = [...current.rotation];
    next[axis] = deg * DEG2RAD;
    onUpdate(selectedName, { rotation: next });
  };
  const updateScale = (val: number) => onUpdate(selectedName, { scale: val });
  const toggleVisible = () => onUpdate(selectedName, { visible: !current.visible });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-30 bg-ink-900/90 backdrop-blur-md border border-clinical-info/40 text-clinical-info rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] flex items-center gap-1.5 shadow-lg hover:bg-ink-800 transition"
        title="Alt+R — Hastane odası mesh layout"
      >
        <Building2 className="w-3 h-3" />
        Oda Layout
        {Object.keys(overrides).length > 0 && (
          <span className="bg-clinical-info text-ink-950 px-1 rounded text-[8px] font-bold tabular-nums">
            {Object.keys(overrides).length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-30 bg-ink-900/95 backdrop-blur-md border border-clinical-info/50 rounded-lg p-3 w-[340px] shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center gap-2 mb-2.5">
        <Building2 className="w-3.5 h-3.5 text-clinical-info" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clinical-info">
          Oda Mesh Layout
        </span>
        <span className="ml-auto font-mono text-[9px] text-ink-500">
          {Object.keys(overrides).length} kayıt
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-400 hover:text-ink-100 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <select
        value={selectedName}
        onChange={(e) => setSelectedName(e.target.value)}
        className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 font-mono text-[10px] text-ink-100 mb-2.5"
      >
        {ALL_MESH_NAMES.map((n) => (
          <option key={n} value={n}>
            {n}
            {n in overrides ? " *" : ""}
            {HIDDEN_MESH.has(n) ? " [hidden]" : ""}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={toggleVisible}
        className={`w-full px-2 py-1.5 mb-2.5 rounded font-mono text-[9px] uppercase tracking-[0.12em] border transition flex items-center justify-center gap-1.5 ${
          current.visible
            ? "bg-clinical-stable/15 border-clinical-stable/40 text-clinical-stable"
            : "bg-ink-800 border-ink-700 text-ink-500"
        }`}
      >
        {current.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        {current.visible ? "Görünür" : "Gizli"}
      </button>

      {/* Scale */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-400">Scale</span>
          <input
            type="number"
            value={Number(current.scale.toFixed(2))}
            min={0.01}
            max={10}
            step={SCALE_STEP}
            onChange={(e) => updateScale(parseFloat(e.target.value) || 0.01)}
            className="w-20 bg-ink-800 border border-ink-700 rounded px-1 py-0.5 font-mono text-[10px] tabular-nums text-ink-100 text-right focus:border-clinical-info/50 focus:outline-none"
          />
        </div>
        <input
          type="range"
          min={SCALE_RANGE[0]}
          max={SCALE_RANGE[1]}
          step={SCALE_STEP}
          value={Math.min(current.scale, SCALE_RANGE[1])}
          onChange={(e) => updateScale(parseFloat(e.target.value))}
          className="w-full accent-clinical-info cursor-pointer"
        />
      </div>

      {/* Position X / Y / Z */}
      <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-500 mb-1">
        Pozisyon
      </div>
      <div className="flex flex-col gap-2 mb-3">
        {(["X", "Y", "Z"] as const).map((axis, idx) => {
          const val = [x, y, z][idx];
          return (
            <div key={axis}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-400">{axis}</span>
                <input
                  type="number"
                  value={Number(val.toFixed(2))}
                  min={POS_RANGE[0]}
                  max={POS_RANGE[1]}
                  step={POS_STEP}
                  onChange={(e) => updatePos(idx as 0 | 1 | 2, parseFloat(e.target.value) || 0)}
                  className="w-20 bg-ink-800 border border-ink-700 rounded px-1 py-0.5 font-mono text-[10px] tabular-nums text-ink-100 text-right focus:border-clinical-info/50 focus:outline-none"
                />
              </div>
              <input
                type="range"
                min={POS_RANGE[0]}
                max={POS_RANGE[1]}
                step={POS_STEP}
                value={val}
                onChange={(e) => updatePos(idx as 0 | 1 | 2, parseFloat(e.target.value))}
                className="w-full accent-clinical-info cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* Rotation X / Y / Z — derece UI, radyan store */}
      <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-500 mb-1">
        Rotation (°)
      </div>
      <div className="flex flex-col gap-2 mb-3">
        {(["X", "Y", "Z"] as const).map((axis, idx) => {
          const rad = [rx, ry, rz][idx];
          const deg = rad * RAD2DEG;
          return (
            <div key={`rot-${axis}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-400">{axis}</span>
                <input
                  type="number"
                  value={Number(deg.toFixed(0))}
                  min={ROT_DEG_RANGE[0]}
                  max={ROT_DEG_RANGE[1]}
                  step={ROT_DEG_STEP}
                  onChange={(e) => updateRotDeg(idx as 0 | 1 | 2, parseFloat(e.target.value) || 0)}
                  className="w-20 bg-ink-800 border border-ink-700 rounded px-1 py-0.5 font-mono text-[10px] tabular-nums text-ink-100 text-right focus:border-clinical-info/50 focus:outline-none"
                />
              </div>
              <input
                type="range"
                min={ROT_DEG_RANGE[0]}
                max={ROT_DEG_RANGE[1]}
                step={ROT_DEG_STEP}
                value={deg}
                onChange={(e) => updateRotDeg(idx as 0 | 1 | 2, parseFloat(e.target.value))}
                className="w-full accent-clinical-info cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => onReset(selectedName)}
          disabled={!isOverridden}
          className="flex-1 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-300 disabled:opacity-40 transition flex items-center justify-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Bu mesh
        </button>
        <button
          type="button"
          onClick={onResetAll}
          disabled={Object.keys(overrides).length === 0}
          className="flex-1 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-[0.1em] bg-ink-800 hover:bg-ink-700 border border-clinical-warning/40 text-clinical-warning disabled:opacity-40 transition flex items-center justify-center gap-1"
        >
          <Eraser className="w-3 h-3" />
          Hepsi
        </button>
      </div>
      <div className="font-mono text-[9px] text-ink-500 italic">
        Alt+R aç/kapat · değişiklikler localStorage'a anında kaydedilir
      </div>
      <div className="font-mono text-[8px] text-ink-600 mt-1">
        Pos: {fmt(x)}, {fmt(y)}, {fmt(z)} · Rot°: {fmt(rx * RAD2DEG, 0)}, {fmt(ry * RAD2DEG, 0)}, {fmt(rz * RAD2DEG, 0)} · Scale: {fmt(current.scale)}
      </div>
    </div>
  );
}
