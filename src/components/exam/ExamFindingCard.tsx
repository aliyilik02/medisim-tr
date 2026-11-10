// ============================================================
// ExamFindingCard — bedende dokunulan noktanın bulgusu
// ============================================================
// Metin + (varsa) ses durumu + (varsa) yakın görsel: göz bebeği ışık yanıtı
// ya da kapiller dolum sayacı. Öğrenci bulguyu OKUMAZ yalnız — dener:
// ışık tutar, tırnağa basar, sesi yeniden dinler.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { X, Volume2, VolumeX, Eye, Hand, Stethoscope, AlertTriangle, Flashlight } from "lucide-react";
import {
  ABCDE_LABEL,
  EXAM_TECHNIQUE_LABEL,
  type ExamTechnique,
  type ExamVisual,
  type ResolvedExamFinding,
} from "@/engine";
import { cn } from "@/lib/cn";

const TECHNIQUE_ICON: Record<ExamTechnique, typeof Eye> = {
  inspeksiyon: Eye,
  palpasyon: Hand,
  oskultasyon: Stethoscope,
};

interface Props {
  finding: ResolvedExamFinding;
  onClose: () => void;
  /** Sesi yeniden çal (yalnız soundFile bir dosyaysa gösterilir). */
  onReplaySound?: () => void;
  className?: string;
}

export function ExamFindingCard({ finding, onClose, onReplaySound, className }: Props) {
  const { point } = finding;
  const TechIcon = TECHNIQUE_ICON[point.technique];
  return (
    <div
      data-testid="exam-finding-card"
      data-point={point.id}
      data-abnormal={finding.abnormal ? "1" : "0"}
      role="status"
      className={cn(
        "w-[300px] rounded-xl border bg-ink-900/95 backdrop-blur-md shadow-2xl animate-fade-in",
        finding.abnormal ? "border-clinical-warning/60" : "border-brand/40",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-ink-700/60">
        <span
          className="w-6 h-6 rounded-md bg-brand/20 border border-brand/40 flex items-center justify-center font-display text-sm text-brand-light"
          title={ABCDE_LABEL[point.category]}
        >
          {point.category}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink-50 truncate">{point.label}</div>
          <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-400">
            <TechIcon className="w-3 h-3" />
            {EXAM_TECHNIQUE_LABEL[point.technique]}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="exam-finding-close"
          aria-label="Bulguyu kapat"
          className="p-1 rounded text-ink-400 hover:text-ink-100 hover:bg-ink-700/60 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        {finding.visual && <FindingVisual key={`${point.id}:${finding.phaseId}`} visual={finding.visual} />}

        <p className="text-[13px] leading-relaxed text-ink-100" data-testid="exam-finding-text">
          {finding.abnormal && (
            <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-clinical-warning" />
          )}
          {finding.text}
        </p>

        {finding.soundFile !== undefined && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-ink-300">
            {finding.soundFile ? (
              <>
                <SoundBars />
                <button
                  type="button"
                  onClick={onReplaySound}
                  data-testid="exam-finding-replay"
                  className="flex items-center gap-1 px-2 py-1 rounded border border-ink-600 hover:border-brand/50 hover:text-brand-light transition"
                >
                  <Volume2 className="w-3 h-3" />
                  Yeniden dinle
                </button>
              </>
            ) : (
              <span className="flex items-center gap-1 text-clinical-warning">
                <VolumeX className="w-3 h-3" />
                Ses yok
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SoundBars() {
  return (
    <span className="flex items-end gap-[2px] h-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] bg-brand-light rounded-sm animate-pulse"
          style={{ height: `${5 + ((i * 5) % 8)}px`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

function FindingVisual({ visual }: { visual: ExamVisual }) {
  return visual.kind === "pupil" ? <PupilVisual visual={visual} /> : <CapRefillVisual visual={visual} />;
}

// ── Göz bebeği: ışık tut → canlı yanıtta hızla daralır, yavaşta ağır, yoksa sabit ──
function PupilVisual({ visual }: { visual: Extract<ExamVisual, { kind: "pupil" }> }) {
  const [lit, setLit] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const shine = () => {
    setLit(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLit(false), 1600);
  };

  // İris yarıçapı 15px ≈ 12 mm → 1 mm çap ≈ 1.25px yarıçap
  const baseR = visual.size_mm * 1.25;
  const constricts = visual.reactivity !== "yok";
  const r = lit && constricts ? Math.max(2, baseR * 0.55) : baseR;
  const speed = visual.reactivity === "yavas" ? "1.1s" : "0.25s";

  return (
    <div className="panel-inset p-2 flex items-center gap-3" data-testid="exam-visual-pupil">
      <svg viewBox="0 0 120 44" className="w-[150px] h-[55px]" role="img" aria-label="Göz bebekleri">
        {[30, 90].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy={22} rx={24} ry={15} fill={lit ? "#fdfdf6" : "#e9e6de"} />
            <circle cx={cx} cy={22} r={15} fill="#5b4632" />
            <circle cx={cx} cy={22} r={15} fill="none" stroke="#3b2c1e" strokeWidth={1.5} />
            <circle cx={cx} cy={22} r={r} fill="#0a0a0b" style={{ transition: `r ${speed} ease-out` }} />
            <circle cx={cx - 4} cy={17} r={lit ? 3 : 1.6} fill="#ffffff" opacity={0.85} />
          </g>
        ))}
      </svg>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={shine}
          data-testid="exam-pupil-light"
          className="flex items-center gap-1 px-2 py-1 rounded border border-ink-600 hover:border-brand/50 hover:text-brand-light text-[11px] text-ink-100 transition"
        >
          <Flashlight className="w-3.5 h-3.5" />
          Işık tut
        </button>
        <span className="font-mono text-[10px] text-ink-400">{visual.size_mm} mm</span>
      </div>
    </div>
  );
}

// ── Kapiller dolum: tırnağa bas → beyazlar → bırakınca renk dönüş süresi sayılır ──
type RefillStage = "idle" | "pressing" | "refilling" | "done";
const PRESS_MS = 700;
const NO_REFILL_WATCH_SEC = 6;

function CapRefillVisual({ visual }: { visual: Extract<ExamVisual, { kind: "cap_refill" }> }) {
  const [stage, setStage] = useState<RefillStage>("idle");
  const [elapsed, setElapsed] = useState(0);
  const raf = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);

  const cleanup = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    raf.current = null;
    pressTimer.current = null;
  };
  useEffect(() => cleanup, []);

  const target = visual.seconds;
  const press = () => {
    cleanup();
    setElapsed(0);
    setStage("pressing");
    pressTimer.current = window.setTimeout(() => {
      setStage("refilling");
      const t0 = performance.now();
      const limit = target ?? NO_REFILL_WATCH_SEC;
      const step = () => {
        const sec = (performance.now() - t0) / 1000;
        if (sec >= limit) {
          setElapsed(limit);
          setStage("done");
          raf.current = null;
          return;
        }
        setElapsed(sec);
        raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, PRESS_MS);
  };

  // Tırnak yatağı rengi: basılı = soluk; dolumda soluk → pembe.
  const progress =
    stage === "idle" ? 1
    : stage === "pressing" ? 0
    : target === null ? 0
    : Math.min(1, elapsed / target);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * progress);
  const nail = `rgb(${mix(243, 226)}, ${mix(232, 150)}, ${mix(224, 140)})`;

  const readout =
    stage === "idle" ? "Tırnağa bas, bırak, rengin dönmesini say"
    : stage === "pressing" ? "Basılıyor…"
    : stage === "refilling" ? `${elapsed.toFixed(1)} sn`
    : target === null ? `${NO_REFILL_WATCH_SEC} sn'de renk dönmedi`
    : `${target.toFixed(1)} sn'de döndü`;

  return (
    <div className="panel-inset p-2 flex items-center gap-3" data-testid="exam-visual-caprefill" data-stage={stage}>
      <svg viewBox="0 0 60 44" className="w-[75px] h-[55px]" role="img" aria-label="Parmak ucu">
        <path d="M6 44 V20 a24 18 0 0 1 48 0 V44 Z" fill="#d9a48f" />
        <rect x={15} y={8} width={30} height={26} rx={11} fill={nail} stroke="#b98572" strokeWidth={1} />
      </svg>
      <div className="flex flex-col gap-1 min-w-0">
        <button
          type="button"
          onClick={press}
          disabled={stage === "pressing" || stage === "refilling"}
          data-testid="exam-caprefill-press"
          className="flex items-center gap-1 px-2 py-1 rounded border border-ink-600 hover:border-brand/50 hover:text-brand-light text-[11px] text-ink-100 transition disabled:opacity-50 self-start"
        >
          <Hand className="w-3.5 h-3.5" />
          Bas ve bırak
        </button>
        <span className="font-mono text-[10px] text-ink-300 tabular-nums" data-testid="exam-caprefill-readout">
          {readout}
        </span>
      </div>
    </div>
  );
}
