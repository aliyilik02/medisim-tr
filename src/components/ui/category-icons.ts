// ============================================================
// Kategori → ikon + neon ton eşlemesi (envanter görsel kimliği)
// ============================================================
// UI TARAFI — engine'e lucide/React GİRMEZ (mimari kural #1); union
// tipleri engine/types.ts'ten okunur, harita burada yaşar.
// Grup renkleri (Ali Bey kararı): ekipman=cyan, ilaç=pink, tetkik=violet.
// Alt kategori İKONLA ayrışır, renk grup kimliğinde kalır — 21 ayrı renk
// değil 3 grup rengi: öğrenci "hangi sekmedeyim"i renkten okur.

import {
  Activity,
  Brain,
  Bug,
  Droplet,
  Droplets,
  FlaskConical,
  HeartPulse,
  LifeBuoy,
  Moon,
  Pill,
  Scan,
  Scissors,
  Shield,
  Sparkles,
  Syringe,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Equipment, Medication } from "@/engine";
import type { GlowTone } from "./GlowIcon";

/** Grup ton kimlikleri — sekme + satır ikonları aynı dili konuşur. */
export const GROUP_TONES = {
  ekipman: "cyan",
  ilac: "pink",
  tetkik: "violet",
} as const satisfies Record<string, GlowTone>;

export const MEDICATION_CATEGORY_ICONS: Record<Medication["category"], LucideIcon> = {
  kardiyak: HeartPulse,
  antibiyotik: Bug,
  antiviral: Shield,
  analjezik: Sparkles,
  sedatif: Moon,
  antikoagulan: Droplets,
  antiaritmik: Zap,
  sıvı: Droplet,
  endokrin: Syringe,
  antiepileptik: Brain,
  antidot: LifeBuoy,
  diğer: Pill,
};

export const EQUIPMENT_CATEGORY_ICONS: Record<Equipment["category"], LucideIcon> = {
  monitorizasyon: Activity,
  havayolu: Wind,
  damar_yolu: Syringe,
  defibrilasyon: Zap,
  cerrahi: Scissors,
  koruyucu: Shield,
  laboratuvar: FlaskConical,
  goruntuleme: Scan,
  diğer: Wrench,
};
