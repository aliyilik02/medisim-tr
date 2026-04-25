import { useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Info, ImageOff } from "lucide-react";
import type { ImagingResult } from "@/engine";
import { cn } from "@/lib/cn";

interface Props {
  result: ImagingResult;
  onClose: () => void;
}

const MODALITY_LABELS: Record<string, string> = {
  xray:  "Röntgen",
  ct:    "Bilgisayarlı Tomografi",
  mri:   "MRG",
  us:    "Ultrasonografi",
  echo:  "Ekokardiyografi",
  ekg:   "EKG",
  other: "Görüntüleme",
};

const MODALITY_ACCENT: Record<string, string> = {
  xray:  "text-slate-300",
  ct:    "text-blue-300",
  mri:   "text-purple-300",
  us:    "text-cyan-300",
  echo:  "text-green-300",
  ekg:   "text-amber-300",
  other: "text-ink-300",
};

export function ImagingResultsModal({ result, onClose }: Props) {
  const [imgError, setImgError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const modalityLabel = MODALITY_LABELS[result.modality] ?? "Görüntüleme";
  const accentColor = MODALITY_ACCENT[result.modality] ?? "text-ink-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[95vh] flex flex-col bg-ink-950 border border-ink-700 rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-700/60 bg-ink-900/60">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className={cn("font-mono text-[10px] uppercase tracking-[0.2em]", accentColor)}>
                {modalityLabel}
              </span>
              {result.view && (
                <span className="font-mono text-[10px] text-ink-500 border border-ink-700 px-1.5 py-0.5 rounded">
                  {result.view}
                </span>
              )}
            </div>
            <h2 className="font-display text-lg text-ink-50 mt-0.5">{result.name_tr}</h2>
          </div>

          {/* Araç çubuğu */}
          <div className="flex items-center gap-1 mr-3">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              title="Uzaklaştır"
              className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-ink-400 w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              title="Yaklaştır"
              className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title="Döndür"
              className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded transition"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowInfo((p) => !p)}
              title="Yorum"
              className={cn(
                "p-1.5 rounded transition",
                showInfo ? "text-brand bg-brand/10" : "text-ink-400 hover:text-ink-200 hover:bg-ink-800"
              )}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-200 hover:bg-ink-800 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* İçerik — görüntü + yorum */}
        <div className="flex-1 overflow-hidden flex">

          {/* Görüntü alanı */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-black/60 p-4 min-h-0">
            {result.image_url && !imgError ? (
              <img
                src={result.image_url}
                alt={result.name_tr}
                onError={() => setImgError(true)}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease",
                  maxWidth: "100%",
                  maxHeight: "calc(90vh - 160px)",
                  objectFit: "contain",
                }}
                className="rounded shadow-lg cursor-zoom-in select-none"
                draggable={false}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-ink-500">
                <ImageOff className="w-12 h-12" />
                <div className="text-center">
                  <p className="text-sm font-medium text-ink-400">Görüntü mevcut değil</p>
                  <p className="text-xs mt-1">Yoruma bakınız</p>
                </div>
                {result.attribution && (
                  <p className="text-[10px] text-ink-600 text-center max-w-xs">{result.attribution}</p>
                )}
              </div>
            )}
          </div>

          {/* Yorum paneli */}
          {showInfo && (
            <div className="w-72 border-l border-ink-700/60 bg-ink-900/80 flex flex-col overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-500 mb-2">Yorum / Bulgu</div>
                  <p className="text-sm text-ink-200 leading-relaxed">{result.interpretation}</p>
                </div>

                {result.findings && result.findings.length > 0 && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-500 mb-2">Spesifik Bulgular</div>
                    <ul className="space-y-1.5">
                      {result.findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-ink-300">
                          <span className="text-brand mt-0.5 flex-shrink-0">→</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.timestamp_min !== undefined && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-500 mb-1">Çekim Zamanı</div>
                    <p className="text-xs text-ink-400">Senaryo başından +{result.timestamp_min} dk</p>
                  </div>
                )}

                {result.attribution && result.image_url && !imgError && (
                  <div className="pt-3 border-t border-ink-800/40">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-600 mb-1">Görüntü Kaynağı</div>
                    <p className="text-[10px] text-ink-600 leading-relaxed">{result.attribution}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alt bar — hızlı yorum özeti */}
        {!showInfo && (
          <div
            className="px-5 py-2.5 border-t border-ink-800/40 bg-ink-900/40 cursor-pointer hover:bg-ink-800/40 transition"
            onClick={() => setShowInfo(true)}
          >
            <p className="text-xs text-ink-300 line-clamp-2">
              <span className="font-mono text-[10px] text-ink-500 uppercase tracking-wider mr-2">Yorum:</span>
              {result.interpretation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
