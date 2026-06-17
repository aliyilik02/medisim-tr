// ============================================================
// AuscultationOverlay — Yatak-başı oskültasyon noktaları (faz-senkron ses)
// ============================================================
// PatientDialog3DPage (Yol-3, ayakta) PatientBody3D'nin 3D RegionMarker +
// stetoskop prosedürü ile oskültasyon yapıyordu. Supine yatak sahnesinde
// (PatientRoomScene) 3D marker koordinatları hasta pozuna göre kaymakta;
// bunun yerine oskültasyon noktaları sahne üstü 2D panel olarak sunulur.
//
// Faz-senkron mantık DEĞİŞMEZ — sadece TETİK yüzeyi değişir:
//   region.auscultationSoundId, buildScenarioRegions(...) tarafından
//   dominant fazın kalp sesine (heart_normal/heart_61bpm/…) yazılır; arrest
//   fazında undefined = ses yok (nabız/kalp sesi yok). Bu STEMI gerçeklik
//   paketinin ses ayağıdır (commit 37bcbe5) — Yol-3'ten Yol-2'ye taşındı.
// ============================================================

import { useEffect } from "react";
import { Stethoscope } from "lucide-react";
import type { PatientRegion } from "./regions";
import { playAuscultation, stopAuscultation } from "./auscultationAudio";
import { cn } from "@/lib/cn";

// Dinleme süresi — PatientBody3D stetoskop prosedürü ile aynı (5 sn).
const AUSC_DURATION_MS = 5000;

interface Props {
  regions: PatientRegion[];
  /** Dinleme süresi (ms). Default 5000. */
  durationMs?: number;
  className?: string;
}

export function AuscultationOverlay({
  regions,
  durationMs = AUSC_DURATION_MS,
  className,
}: Props) {
  // Yalnız stetoskopla dinlenen noktalar (kalp/akciğer oskültasyon).
  const points = regions.filter((r) =>
    r.availableProcedures?.includes("stethoscope"),
  );

  // Unmount → çalan sesi durdur (leak önle). PatientBody3D ile aynı disiplin.
  useEffect(() => () => stopAuscultation(), []);

  if (points.length === 0) return null;

  const listen = (region: PatientRegion) => {
    if (region.auscultationSoundId) {
      playAuscultation(region.auscultationSoundId, durationMs);
    } else {
      // silent (arrest) — kalp sesi/nabız yok. Önceki çalan sesi durdur.
      stopAuscultation();
    }
  };

  return (
    <div
      data-testid="auscultation-panel"
      className={cn(
        "bg-ink-900/85 backdrop-blur-md border border-ink-700/60 rounded-lg p-2 flex flex-col gap-1 w-[180px] shadow-xl",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
        <Stethoscope className="w-3 h-3 text-brand" />
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-500">
          Oskültasyon
        </span>
      </div>
      {points.map((region) => {
        const silent = !region.auscultationSoundId;
        return (
          <button
            key={region.id}
            type="button"
            data-testid={`auscultation-point-${region.id}`}
            onClick={() => listen(region)}
            title={region.placeholderNote}
            className={cn(
              "px-2 py-1 rounded font-mono text-[10px] text-left transition border",
              silent
                ? "bg-ink-800/40 text-ink-500 border-ink-700/50 hover:text-ink-300"
                : "bg-ink-800/60 text-ink-300 border-ink-700 hover:text-brand-light hover:border-brand/40",
            )}
          >
            {region.label}
            {silent && (
              <span className="text-ink-600"> · sessiz</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
