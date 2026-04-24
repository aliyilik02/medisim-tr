import { useEffect, useState } from "react";
import { GradeBandEditor } from "./GradeBandEditor";
import { ListEditor } from "./ListEditor";
import { computeMax } from "./validation";
import { SCENARIOS } from "@/data/scenarios";
import type { StoredScenario } from "@/storage/scenarioStorage";

type Draft = Partial<StoredScenario>;

interface Props {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}

const DEFAULT_BANDS = { A: 90, B: 75, C: 60, D: 45 };

export function Step4Scoring({ draft, onChange }: Props) {
  const [overrideMax, setOverrideMax] = useState(false);

  useEffect(() => {
    const patch: Partial<Draft> = {};
    if (!draft.scoring) {
      patch.scoring = {
        max_points: 100,
        passing_score: 60,
        grade_bands: DEFAULT_BANDS,
      };
    }
    if (!draft.debrief) {
      patch.debrief = { key_learnings: [], references: [] };
    }
    if (Object.keys(patch).length > 0) onChange(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sc = draft.scoring ?? { max_points: 100, passing_score: 60, grade_bands: DEFAULT_BANDS };
  const db = draft.debrief ?? { key_learnings: [], references: [] };

  const computedMax = computeMax(draft);
  const effectiveMax = overrideMax ? sc.max_points : (computedMax > 0 ? computedMax : sc.max_points);

  const setScoring = (patch: Partial<typeof sc>) =>
    onChange({ scoring: { ...sc, ...patch } });

  const setDebrief = (patch: Partial<typeof db>) =>
    onChange({ debrief: { ...db, ...patch } });

  const otherScenarios = SCENARIOS.filter((s) => s.id !== draft.id).map((s) => s.title);

  return (
    <div className="grid grid-cols-2 gap-6 animate-fade-in">
      {/* ── Left: Puanlama ── */}
      <div className="space-y-6">
        <div className="panel p-5 space-y-5">
          <h3 className="font-display text-lg text-ink-200">Puanlama</h3>

          {/* Computed max info */}
          <div className="panel-inset p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="field-label mb-0">Hesaplanan maksimum</span>
              <span className="font-mono text-base text-brand-400">
                {computedMax > 0 ? computedMax : "—"} puan
              </span>
            </div>
            <p className="font-mono text-[10px] text-ink-500">
              Adımlardaki tüm pozitif puanların toplamı
            </p>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overrideMax}
                onChange={(e) => {
                  setOverrideMax(e.target.checked);
                  if (!e.target.checked && computedMax > 0) {
                    setScoring({ max_points: computedMax });
                  }
                }}
                className="accent-brand-400"
              />
              <span className="font-mono text-xs text-ink-400">Farklı tavan belirle</span>
            </label>
            {overrideMax && (
              <input
                type="number"
                value={sc.max_points}
                onChange={(e) => setScoring({ max_points: Number(e.target.value) })}
                min={1}
                className="field-input w-28"
              />
            )}
          </div>

          {/* Passing score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="field-label mb-0">Geçme notu</label>
              <span className="font-mono text-sm text-ink-300">
                {sc.passing_score} / {effectiveMax}{" "}
                {effectiveMax > 0 && (
                  <span className="text-ink-500">
                    (%{Math.round((sc.passing_score / effectiveMax) * 100)})
                  </span>
                )}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={effectiveMax > 0 ? effectiveMax - 1 : 99}
              value={sc.passing_score}
              onChange={(e) => setScoring({ passing_score: Number(e.target.value) })}
              className="w-full accent-brand-400"
            />
            <input
              type="number"
              value={sc.passing_score}
              onChange={(e) => setScoring({ passing_score: Number(e.target.value) })}
              min={1}
              max={effectiveMax > 0 ? effectiveMax - 1 : 9999}
              className="field-input w-28"
            />
          </div>

          {/* Grade bands */}
          <div className="space-y-2">
            <label className="field-label">Harf bantları</label>
            <GradeBandEditor
              max={effectiveMax}
              bands={sc.grade_bands ?? DEFAULT_BANDS}
              passingScore={sc.passing_score}
              onChange={(bands) => setScoring({ grade_bands: bands })}
            />
          </div>

          {/* Time bonus */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!sc.time_bonus}
                onChange={(e) => {
                  if (e.target.checked) {
                    setScoring({ time_bonus: { target_seconds: 600, bonus_points: 10 } });
                  } else {
                    const { time_bonus: _, ...rest } = sc as typeof sc & { time_bonus?: unknown };
                    onChange({ scoring: rest as typeof sc });
                  }
                }}
                className="accent-brand-400"
              />
              <span className="field-label mb-0">Zaman bonusu ekle</span>
            </label>
            {sc.time_bonus && (
              <div className="grid grid-cols-2 gap-3 panel-inset p-3">
                <div>
                  <label className="field-label">Hedef süre (sn)</label>
                  <input
                    type="number"
                    value={sc.time_bonus.target_seconds}
                    onChange={(e) =>
                      setScoring({ time_bonus: { ...sc.time_bonus!, target_seconds: Number(e.target.value) } })
                    }
                    min={30}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Bonus puan</label>
                  <input
                    type="number"
                    value={sc.time_bonus.bonus_points}
                    onChange={(e) =>
                      setScoring({ time_bonus: { ...sc.time_bonus!, bonus_points: Number(e.target.value) } })
                    }
                    min={1}
                    className="field-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Meta tamamlama */}
        <div className="panel p-5 space-y-4">
          <h3 className="font-display text-lg text-ink-200">Meta Bilgiler</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Yazar</label>
              <input
                type="text"
                value={draft.author ?? ""}
                onChange={(e) => onChange({ author: e.target.value })}
                placeholder="Dr. Adı Soyadı"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Gözden geçiren</label>
              <input
                type="text"
                value={draft.reviewed_by ?? ""}
                onChange={(e) => onChange({ reviewed_by: e.target.value })}
                placeholder="Uzman adı"
                className="field-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Versiyon</label>
              <input
                type="text"
                value={draft.version ?? "1.0.0"}
                onChange={(e) => onChange({ version: e.target.value })}
                placeholder="1.0.0"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Son güncelleme</label>
              <input
                type="text"
                value={draft.last_updated ?? new Date().toISOString().split("T")[0]}
                readOnly
                className="field-input opacity-50 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="field-label">Modlar</label>
            <div className="flex gap-3">
              {([
                { value: "quiz" as const, label: "Quiz (zorunlu)", disabled: true },
                { value: "interactive_3d" as const, label: "3D İnteraktif (yakında)", disabled: true },
              ]).map(({ value, label, disabled }) => (
                <label key={value} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(draft.modes ?? ["quiz"]).includes(value)}
                    disabled={disabled}
                    onChange={(e) => {
                      const current = draft.modes ?? ["quiz"];
                      const updated = e.target.checked
                        ? [...current, value]
                        : current.filter((m) => m !== value);
                      onChange({ modes: updated });
                    }}
                    className="accent-brand-400 disabled:opacity-40"
                  />
                  <span className={`font-mono text-xs ${value === "interactive_3d" ? "text-ink-600 line-through" : "text-ink-300"}`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Debrief ── */}
      <div className="space-y-6">
        <div className="panel p-5 space-y-5">
          <h3 className="font-display text-lg text-ink-200">Debrief</h3>

          <ListEditor
            label="Öğrenim noktaları"
            value={db.key_learnings ?? []}
            onChange={(v) => setDebrief({ key_learnings: v })}
            minItems={3}
            placeholder="Yeni öğrenim noktası…"
          />

          <ListEditor
            label="Kaynaklar"
            value={db.references ?? []}
            onChange={(v) => setDebrief({ references: v })}
            minItems={1}
            placeholder="Referans / kılavuz adı…"
          />

          <ListEditor
            label="Red flags"
            value={db.red_flags ?? []}
            onChange={(v) => setDebrief({ red_flags: v })}
            optional
            placeholder="Kritik uyarı işareti…"
          />

          <div className="space-y-2">
            <label className="field-label">Sıradaki senaryolar (öneri)</label>
            {otherScenarios.length === 0 ? (
              <p className="font-mono text-[10px] text-ink-600">Başka senaryo yok.</p>
            ) : (
              <div className="panel-inset p-3 space-y-1 max-h-36 overflow-y-auto">
                {otherScenarios.map((title) => (
                  <label key={title} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={(db.next_scenarios ?? []).includes(title)}
                      onChange={(e) => {
                        const cur = db.next_scenarios ?? [];
                        const updated = e.target.checked
                          ? [...cur, title]
                          : cur.filter((t) => t !== title);
                        setDebrief({ next_scenarios: updated });
                      }}
                      className="accent-brand-400"
                    />
                    <span className="font-mono text-xs text-ink-300">{title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
