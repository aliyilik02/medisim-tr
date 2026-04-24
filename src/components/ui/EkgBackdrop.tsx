import { cn } from "@/lib/cn";

// Ambient EKG trace — dekoratif, pointer-events yok
export function EkgBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none select-none overflow-hidden", className)} aria-hidden>
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="w-full h-full"
        fill="none"
      >
        <path
          d={PATH}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand"
          opacity="0.28"
        />
      </svg>
    </div>
  );
}

// Sabit EKG izleri — 4 tekrar (baseline + P dalgası + QRS kompleksi + T dalgası)
const PATH =
  "M0,30 L60,30 L64,27 L68,30 " +           // P dalgası
  "L95,30 L98,36 L101,4 L104,48 L107,30 " + // QRS kompleksi
  "L112,30 L118,22 L128,22 L133,30 " +       // T dalgası
  "L300,30 " +                               // uzun baseline

  "L360,30 L364,27 L368,30 " +
  "L395,30 L398,36 L401,4 L404,48 L407,30 " +
  "L412,30 L418,22 L428,22 L433,30 " +
  "L600,30 " +

  "M600,30 L660,30 L664,27 L668,30 " +
  "L695,30 L698,36 L701,4 L704,48 L707,30 " +
  "L712,30 L718,22 L728,22 L733,30 " +
  "L900,30 " +

  "L960,30 L964,27 L968,30 " +
  "L995,30 L998,36 L1001,4 L1004,48 L1007,30 " +
  "L1012,30 L1018,22 L1028,22 L1033,30 " +
  "L1200,30";
