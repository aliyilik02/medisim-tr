// Specialty line art ikonları — 64×64 viewBox, stroke="currentColor", strokeWidth 1.5
// Renk CSS'ten gelir (currentColor), boyut className ile set edilir

import type { Specialty } from "@/engine/types";

interface IconProps {
  className?: string;
}

// ── Kardiyoloji — anatomik kalp, ventrikül ayrımı görünür ──────────────
export function KardiyolojiIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Kalp dış formu */}
      <path d="M32 53C32 53 10 38 10 23C10 15.3 16.3 9 24 9C27.6 9 30.9 10.6 33 13.2L32 14.8L31 13.2C29.1 10.6 25.8 9 22.4 9M32 53C32 53 54 38 54 23C54 15.3 47.7 9 40 9C36.4 9 33.1 10.6 31 13.2" />
      {/* Sağ-sol ayrımı */}
      <path d="M32 18L32 46" strokeDasharray="2 3" />
      {/* EKG darbesi — kalbin ortasında */}
      <polyline points="22,33 25,33 27,27 29,39 31,33 34,33 36,28 38,38 40,33 42,33" />
    </svg>
  );
}

// ── Acil Tıp — yıldız-of-life üzerinde EKG darbesi ───────────────────
export function AcilIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* 6-kollu yıldız (Star of Life benzeri) */}
      <path d="M32 8L37 20H49L40 28L44 40L32 33L20 40L24 28L15 20H27L32 8Z" />
      {/* Ortada + işareti */}
      <line x1="32" y1="24" x2="32" y2="36" />
      <line x1="26" y1="30" x2="38" y2="30" />
    </svg>
  );
}

// ── Pediatri — çocuk silueti (büyük baş, kompakt gövde) ───────────────
export function PediatriIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Baş */}
      <circle cx="32" cy="16" r="9" />
      {/* Gövde */}
      <path d="M22 30C22 26 26 24 32 24C38 24 42 26 42 30L42 42" />
      <path d="M22 30L22 42" />
      {/* Kollar */}
      <path d="M22 32L14 38" />
      <path d="M42 32L50 38" />
      {/* Bacaklar */}
      <path d="M26 42L23 56" />
      <path d="M38 42L41 56" />
      {/* Boyun bağlantısı */}
      <path d="M27 24C27 24 29 26 32 26C35 26 37 24 37 24" />
    </svg>
  );
}

// ── Dahiliye — stetoskop + analiz grafiği ─────────────────────────────
export function DahiliyeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Stetoskop baş kısmı */}
      <circle cx="38" cy="44" r="8" />
      <circle cx="38" cy="44" r="3" />
      {/* Esnek tüp */}
      <path d="M20 12C20 12 16 12 16 18L16 36C16 40 20 44 28 44L30 44" />
      {/* Kulak uçları */}
      <line x1="14" y1="12" x2="26" y2="12" />
      <circle cx="14" cy="11" r="2" />
      <circle cx="26" cy="11" r="2" />
      {/* Küçük trend grafiği */}
      <polyline points="34,28 38,22 42,26 46,18 50,22" />
    </svg>
  );
}

// ── Askeri / TCCC — kalkan + tıp haçı ────────────────────────────────
export function AskeriIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Kalkan */}
      <path d="M32 8L52 16L52 34C52 44 42 54 32 58C22 54 12 44 12 34L12 16L32 8Z" />
      {/* İçinde tıp haçı */}
      <rect x="27" y="24" width="10" height="18" rx="1.5" />
      <rect x="22" y="29" width="20" height="8" rx="1.5" />
    </svg>
  );
}

// ── Anestezi — solunum maskesi + tüp ─────────────────────────────────
export function AnesteziIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Maske gövdesi */}
      <path d="M16 22C16 22 16 16 24 14L40 14C48 16 48 22 48 22L46 38C46 42 42 46 32 46C22 46 18 42 18 38L16 22Z" />
      {/* Maske bantları */}
      <path d="M16 22L8 24" />
      <path d="M48 22L56 24" />
      {/* Solunum devresi tüpü */}
      <path d="M32 46L32 52C32 54 28 56 24 56L20 56" />
      {/* Solunum balonları */}
      <circle cx="16" cy="56" r="4" />
      {/* Klips */}
      <line x1="28" y1="14" x2="36" y2="14" />
      {/* Göz çizgisi */}
      <path d="M22 28C24 26 28 26 32 28C36 26 40 26 42 28" />
    </svg>
  );
}

// ── Cerrahi — bistüri + pens ──────────────────────────────────────────
export function CerrahiIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Bistüri */}
      <path d="M18 10L22 14L44 44L48 44L48 48L40 50L18 10Z" />
      <path d="M22 14L36 28" />
      <path d="M22 14C22 14 26 12 30 16" />
      {/* Pens */}
      <path d="M46 10L46 36L42 40" />
      <path d="M42 10L42 36L46 40" />
      <line x1="42" y1="22" x2="46" y2="22" />
    </svg>
  );
}

// ── Hemşirelik — stethoscope + kalp ──────────────────────────────────
export function HemsirelikIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Basit kalp */}
      <path d="M32 48C32 48 14 36 14 24C14 18 18 13 24 13C27.5 13 30.5 15 32 18C33.5 15 36.5 13 40 13C46 13 50 18 50 24C50 36 32 48 32 48Z" />
      {/* Ortada + işareti (hemşirelik bakım sembolu) */}
      <line x1="32" y1="22" x2="32" y2="32" />
      <line x1="27" y1="27" x2="37" y2="27" />
    </svg>
  );
}

// ── Kadın Doğum — uterus/doğurganlık ─────────────────────────────────
export function KadinDogumIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Dişi sembolü */}
      <circle cx="32" cy="26" r="14" />
      <line x1="32" y1="40" x2="32" y2="56" />
      <line x1="24" y1="50" x2="40" y2="50" />
      {/* İç çember */}
      <circle cx="32" cy="26" r="7" />
    </svg>
  );
}

// ── Genel dispatch ─────────────────────────────────────────────────────

export function SpecialtyIcon({
  specialty,
  className,
}: {
  specialty: Specialty;
  className?: string;
}) {
  switch (specialty) {
    case "kardiyoloji": return <KardiyolojiIcon className={className} />;
    case "acil":        return <AcilIcon className={className} />;
    case "pediatri":    return <PediatriIcon className={className} />;
    case "dahiliye":    return <DahiliyeIcon className={className} />;
    case "askeri_tccc": return <AskeriIcon className={className} />;
    case "anestezi":    return <AnesteziIcon className={className} />;
    case "cerrahi":     return <CerrahiIcon className={className} />;
    case "hemsirelik":  return <HemsirelikIcon className={className} />;
    case "kadin_dogum": return <KadinDogumIcon className={className} />;
    default:            return <DahiliyeIcon className={className} />;
  }
}
