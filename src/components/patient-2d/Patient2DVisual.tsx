// ============================================================
// Patient2DVisual — 2D hasta görsel katmanı (3D pivot pilotu)
// ============================================================
// PatientRoomScene'in 2D karşılığı: motor state'i (VisualState) okur,
// visual2d-mapper ile ayrık duruma indirger, ilgili Higgsfield karesini
// gösterir. 5 kare stack halinde render edilir (hepsi önden yüklenir),
// aktif olan opacity 1 → durum geçişi crossfade (ani sıçrama yok).
//
// Histerezisin zaman ayağı burada: mapper çift-eşik verir (saf), bileşen
// minHold uygular — durum en az MIN_HOLD_MS ekranda kalır ki 8Hz vitals
// tick'i sınır değerde görseli çırpındırmasın. Arrest muaf (anında).
//
// Nefes: kare statik → gövde stack'ine çok hafif CSS scale animasyonu,
// süresi breathingRate'ten (60/RR sn). Arrest'te animasyon durur.
// Overlay'ler (IV/O2/EKG/CPR) bu pilotta YOK — sonraki tur.

import { useEffect, useRef, useState } from "react";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import {
  resolveStage2D,
  STAGE_ORDER,
  STEMI_2D_FRAMES,
  type Patient2DStage,
} from "@/clinical/visual2d-mapper";

/** Durum değişimleri arası asgari ekran süresi (ms) — eşik çırpınma siperi. */
const MIN_HOLD_MS = 2500;
/** Crossfade süresi (ms) — pivot değerlendirmesi §5.4: 300-500ms bandı. */
const FADE_MS = 450;

const STAGE_LABELS: Record<Patient2DStage, string> = {
  baseline: "Bilinçli — göğüs ağrısı",
  sok: "Solgun, terli — şok tablosu",
  siyanoz: "Siyanoz — hipoksi",
  "derin-sok": "Derin şok — yanıtsız",
  arrest: "Arrest",
};

export interface Patient2DVisualProps {
  visualState: VisualState;
  /** Durum → kare yolu. Verilmezse STEMI seti (pilot). */
  frames?: Record<Patient2DStage, string>;
}

export function Patient2DVisual({
  visualState,
  frames = STEMI_2D_FRAMES,
}: Patient2DVisualProps) {
  const [stage, setStage] = useState<Patient2DStage>(() =>
    resolveStage2D(visualState),
  );
  const lastChangeRef = useRef<number>(Date.now());

  useEffect(() => {
    const candidate = resolveStage2D(visualState, stage);
    if (candidate === stage) return;
    const now = Date.now();
    // Arrest anında geçer (breath_stopped kesin faz sinyali); gerisi minHold bekler.
    if (candidate !== "arrest" && now - lastChangeRef.current < MIN_HOLD_MS) return;
    lastChangeRef.current = now;
    setStage(candidate);
  }, [visualState, stage]);

  const rr = visualState.breathingRate;
  const breathing = rr > 0;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-ink-950"
      data-testid="patient-2d-visual"
      data-stage={stage}
      aria-label={`Hasta görünümü: ${STAGE_LABELS[stage]}`}
    >
      {/* Nefes keyframe'i — bileşene özel, tek kullanım (index.css'e taşımaya değmez). */}
      <style>{`@keyframes patient2d-breath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.008); } }`}</style>
      <div
        className="absolute inset-0"
        style={
          breathing
            ? { animation: `patient2d-breath ${60 / rr}s ease-in-out infinite` }
            : undefined
        }
      >
        {STAGE_ORDER.map((s) => (
          <img
            key={s}
            src={frames[s]}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none"
            // Portre kare, geniş konteyner → yüz üst-ortada kalsın diye kırpma odağı yukarıda.
            style={{
              objectPosition: "50% 22%",
              opacity: s === stage ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
            }}
          />
        ))}
      </div>
      {/* Hafif vinyet — kareyi klinik monitör estetiğine oturtur, kenar kırpma dikişini yumuşatır. */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-ink-950/60 via-transparent to-ink-950/30" />
    </div>
  );
}
