// ============================================================
// CaseStage — görselli vaka sahnesi (durum + aksiyon ara-sahnesi)
// ============================================================
// Üç katman (D kararı, 13 Tem 2026):
//   1. DURUM karesi — VisualState'ten (severity skoru, çift-eşik + minHold;
//      Patient2DVisual ile aynı desen). 5 kare stack, crossfade.
//      Kalıcı izlere göre varyant: maske takılıysa maskeli kare
//      (resolveDurumAsset — varyant yoksa base'e zarif düşüş).
//   2. AKSİYON ara-sahnesi — aksiyon yapılınca ~4sn tam kare gösterilir,
//      sonra durum karesine dönülür. Son-kazanır (spam kuyruğu yok).
//      Kare manifest'te yoksa yalnız banner gösterilir (zarif düşüş).
//      ARREST İSTİSNASI: arrest karesi aksiyon karesiyle EZİLMEZ.
//   3. TAKILI EKİPMAN çip şeridi — kalıcı izlerin semantiği (maske dahil
//      tümü listelenir; görsel varyantı olmayan izler yalnız burada yaşar).
// Motion-hazır: MediaAsset.video varsa <video> döngüsü, yoksa <img>.

import { useEffect, useRef, useState } from "react";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import {
  resolveStage2D,
  STAGE_ORDER,
  type Patient2DStage,
} from "@/clinical/visual2d-mapper";
import type { MediaAsset, VisualSet } from "@/visuals/visual-manifest";
import type { ResolvedActionVisual } from "@/visuals/action-visuals";
import {
  resolveDurumAsset,
  TRACE_LABELS,
  type TraceKey,
} from "@/visuals/persistent-traces";
import { GlowIcon } from "@/components/ui/GlowIcon";
import type { LucideIcon } from "lucide-react";
import { Activity, Gauge, HeartPulse, Syringe, Wind } from "lucide-react";

const MIN_HOLD_MS = 2500; // durum eşik çırpınma siperi
const FADE_MS = 450; // crossfade
const ACTION_MS = 4000; // aksiyon ara-sahne süresi

const STAGE_LABELS: Record<Patient2DStage, string> = {
  baseline: "Bilinçli — semptomatik",
  sok: "Solgun, terli — şok tablosu",
  siyanoz: "Siyanoz — hipoksi",
  "derin-sok": "Derin şok — yanıtsız",
  arrest: "Arrest",
};

/** Aksiyon tetiği: nonce her tıklamada artar → aynı aksiyon üst üste de tetikler. */
export interface ActionCue extends ResolvedActionVisual {
  nonce: number;
}

/** Çip şeridi ikonları — TRACE_LABELS ile birebir anahtar. */
const TRACE_ICONS: Record<TraceKey, LucideIcon> = {
  maske: Wind,
  iv: Syringe,
  ekg: Activity,
  monitor: HeartPulse,
  tansiyon: Gauge,
};

interface CaseStageProps {
  visualState: VisualState;
  set: VisualSet;
  actionCue: ActionCue | null;
  /** Kalıcı izler — takılış sırasıyla (persistent-traces.addTrace). */
  traces?: readonly TraceKey[];
}

/** img/video seçici — motion turu geldiğinde video alanı otomatik devreye girer. */
function Media({ asset, visible }: { asset: MediaAsset; visible: boolean }) {
  // object-contain: görsel ASLA kırpılmaz (kol/gövde/saç her zaman görünür);
  // kutuya sığmayan kenarda letterbox — arka plan nötr koyu (bg-ink-950).
  // Farklı oranda üretilmiş kareler de güvenli (3:4 varsayımı kutuda, burada değil).
  const common = {
    className: "absolute inset-0 w-full h-full object-contain select-none",
    style: {
      opacity: visible ? 1 : 0,
      transition: `opacity ${FADE_MS}ms ease-in-out`,
    } as const,
  };
  if (asset.video) {
    return (
      <video
        src={asset.video}
        poster={asset.src}
        autoPlay
        loop
        muted
        playsInline
        {...common}
      />
    );
  }
  return <img src={asset.src} alt="" draggable={false} {...common} />;
}

export function CaseStage({ visualState, set, actionCue, traces = [] }: CaseStageProps) {
  // ── Durum katmanı (Patient2DVisual deseni: mapper saf, zaman ayağı burada)
  const [stage, setStage] = useState<Patient2DStage>(() =>
    resolveStage2D(visualState),
  );
  const lastChangeRef = useRef<number>(Date.now());

  useEffect(() => {
    const candidate = resolveStage2D(visualState, stage);
    if (candidate === stage) return;
    const now = Date.now();
    if (candidate !== "arrest" && now - lastChangeRef.current < MIN_HOLD_MS) return;
    lastChangeRef.current = now;
    setStage(candidate);
  }, [visualState, stage]);

  // ── Aksiyon ara-sahnesi (son-kazanır; arrest'te bastırılır)
  const [activeCue, setActiveCue] = useState<ActionCue | null>(null);
  useEffect(() => {
    if (!actionCue) return;
    if (stage === "arrest") return; // klinik ciddiyet: arrest karesi ezilmez
    setActiveCue(actionCue);
    const t = setTimeout(() => {
      // Yalnız hâlâ bu cue aktifse kapat (son-kazanır — yenisi geldiyse dokunma)
      setActiveCue((cur) => (cur?.nonce === actionCue.nonce ? null : cur));
    }, ACTION_MS);
    return () => clearTimeout(t);
  }, [actionCue, stage]);

  // Arrest'e girildiği an açık ara-sahne varsa düşür.
  useEffect(() => {
    if (stage === "arrest") setActiveCue(null);
  }, [stage]);

  const actionAsset = activeCue ? set.aksiyon[activeCue.key] : undefined;
  const rr = visualState.breathingRate;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-ink-950"
      data-testid="case-stage"
      data-stage={stage}
      data-action={activeCue?.key ?? ""}
      aria-label={`Hasta görünümü: ${STAGE_LABELS[stage]}`}
    >
      <style>{`@keyframes case-breath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.008); } }
@keyframes case-banner-bar { from { width: 100%; } to { width: 0%; } }`}</style>

      {/* Durum kareleri — hepsi önden yüklü, aktif olan görünür */}
      <div
        className="absolute inset-0"
        style={
          rr > 0
            ? { animation: `case-breath ${60 / rr}s ease-in-out infinite` }
            : undefined
        }
      >
        {STAGE_ORDER.map((s) => (
          <Media
            key={s}
            asset={resolveDurumAsset(set, s, traces)}
            visible={s === stage && !actionAsset}
          />
        ))}
        {/* Aksiyon karesi — durumun üstünde tam kare crossfade */}
        {actionAsset && <Media asset={actionAsset} visible />}
      </div>

      {/* Vinyet — klinik monitör estetiği */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-ink-950/60 via-transparent to-ink-950/30" />
      <div className="absolute inset-0 pointer-events-none neon-teal neon-scene-frame" aria-hidden />

      {/* Takılı ekipman çip şeridi — kalıcı izler (ekipman=cyan, tasarım dili) */}
      {traces.length > 0 && (
        <div
          data-testid="trace-chips"
          className="absolute top-3 right-3 flex flex-col items-end gap-1.5"
          aria-label="Takılı ekipman"
        >
          {traces.map((t) => (
            <span
              key={t}
              data-trace={t}
              className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-md bg-ink-900/80 border backdrop-blur-md neon-cyan neon-border animate-fade-in"
            >
              <GlowIcon icon={TRACE_ICONS[t]} tone="cyan" size="sm" />
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-100">
                {TRACE_LABELS[t]}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Aksiyon banner'ı — kare olsun olmasın müdahale hissi verir */}
      {activeCue && (
        <div
          data-testid="action-banner"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 min-w-[280px] max-w-[70%] rounded-lg bg-ink-900/85 border backdrop-blur-md neon-teal neon-border shadow-glow-sm overflow-hidden animate-fade-in"
        >
          <div className="flex items-center gap-3 px-4 py-2.5">
            <GlowIcon icon={Activity} tone="teal" size="sm" />
            <span className="text-[13px] text-ink-50 font-medium">{activeCue.label}</span>
          </div>
          {/* Ara-sahne süre çubuğu */}
          <div
            key={activeCue.nonce}
            className="h-0.5 bg-brand-light/80"
            style={{ animation: `case-banner-bar ${ACTION_MS}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}
