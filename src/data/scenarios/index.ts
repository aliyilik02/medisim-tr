import type { Scenario } from "@/engine";
import { scenario_stemi } from "./stemi";
import { scenario_anaflaksi } from "./anaflaksi";
import { scenario_dka } from "./dka";
import { scenario_pediatrik_sepsis } from "./pediatrik-sepsis";
import { scenario_hipoglisemi } from "./hipoglisemi";
import { scenario_iskemik_inme } from "./iskemik-inme";
import { scenario_bronsiyolit } from "./bronsiyolit";
import { scenario_kardiyojenik_sok } from "./kardiyojenik-sok";
import { scenario_pulmoner_emboli } from "./pulmoner-emboli";
import { scenario_apandisit } from "./apandisit";
import { scenario_rsi_entübasyon } from "./rsi-entübasyon";
import { scenario_preeklampsi } from "./preeklampsi";
import { scenario_sepsis_hemsirelik } from "./sepsis-hemsirelik";
import { scenario_tccc_patlama } from "./tccc-patlama";
// Üretim hattı pilotu (DRAFT) — Blok 5
import { scenario_toksikoloji_opioid_overdoz } from "./toksikoloji-opioid-overdoz";

export const SCENARIOS: Scenario[] = [
  // Kardiyoloji
  scenario_stemi,
  scenario_kardiyojenik_sok,
  // Dahiliye
  scenario_dka,
  scenario_hipoglisemi,
  scenario_pulmoner_emboli,
  // Acil Tıp
  scenario_anaflaksi,
  scenario_iskemik_inme,
  // Pediatri
  scenario_pediatrik_sepsis,
  scenario_bronsiyolit,
  // Cerrahi
  scenario_apandisit,
  // Anestezi
  scenario_rsi_entübasyon,
  // Kadın Doğum
  scenario_preeklampsi,
  // Hemşirelik
  scenario_sepsis_hemsirelik,
  // Askeri / TCCC
  scenario_tccc_patlama,
  // Toksikoloji (üretim hattı pilotu — DRAFT)
  scenario_toksikoloji_opioid_overdoz,
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getScenariosBySpecialty(specialty: string): Scenario[] {
  return SCENARIOS.filter((s) => s.specialty === specialty);
}
