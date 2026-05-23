// ============================================================
// scenario-visual-state — senaryo bazlı 3D başlangıç visual state
// ============================================================
// Sprint B.11: senaryo dosyalarına dokunmadan (klinik pre-commit hook
// korumalı), scenarioId → initial equipment + bleeding + rash map'i.
//
// PatientDialog3DPage senaryo açıldığında bu dosyadan okur ve sahneye
// başlangıç durumunu uygular. Yalnızca 3D visual cue — klinik içerik
// değil. Senaryo .ts dosyalarındaki initial_vitals, steps, scoring
// vb. klinik alanlar bu dosyada YOK.
//
// İçerik klinik gerçekliği yansıtır:
//   - STEMI hasta acile gelir gelmez 12-lead EKG monitorize, IV yol açık
//   - DKA → Foley (saatlik UO), IV (sıvı + insülin)
//   - Bronşiyolit (8 ay) → nasal kanül + pediatrik BP
//   - TCCC patlama → masif kanama + ETT + IV
//   - Anaflaksi → infüzyon IV zaten açık
// ============================================================

import type { EquipmentState } from "@/components/patient-3d/PatientEquipment";
import type { BleedingSite } from "@/components/patient-3d/PatientBleed";
import type { RashSite } from "@/components/patient-3d/PatientRash";

export interface InitialVisualState {
  equipment?: Partial<EquipmentState>;
  bleeding?: BleedingSite[];
  rash?: RashSite[];
}

/**
 * scenarioId → InitialVisualState. PatientDialog3DPage'de scenario.id ile
 * lookup. ID match yoksa boş döner (default temiz sahne).
 */
export const SCENARIO_VISUAL_STATE: Record<string, InitialVisualState> = {
  // ─── Kardiyoloji ──────────────────────────────────────────────
  "kardiyoloji-stemi-001": {
    equipment: {
      ekgPatches: true,    // 12-lead EKG monitorize (acil triaj standart)
      ivCatheter: true,    // Aspirin/morfin/heparin IV yolu
      bpCuff: true,        // Sürekli BP izlem
      pulseOximeter: true,
    },
  },
  "kardiyoloji-kardiyojenik-sok-001": {
    equipment: {
      ekgPatches: true,
      ivCatheter: true,
      bpCuff: true,
      pulseOximeter: true,
      urinaryCatheter: true, // Saatlik UO (perfüzyon izlem)
      oxygenMask: true,      // Hipoperfüzyon → O2 ihtiyaç
    },
  },

  // ─── Acil ─────────────────────────────────────────────────────
  "acil-anaflaksi-001": {
    equipment: {
      ivCatheter: true,    // Sefalosporin infüzyonu zaten devam ediyor
      ekgPatches: true,
      pulseOximeter: true,
      bpCuff: true,
    },
  },
  "acil-apandisit-001": {
    equipment: {
      ivCatheter: true,    // Pre-op IV yolu
      bpCuff: true,
      pulseOximeter: true,
    },
  },
  "acil-pulmoner-emboli-001": {
    equipment: {
      ivCatheter: true,
      ekgPatches: true,
      bpCuff: true,
      pulseOximeter: true,
      oxygenMask: true,    // PE → hipoksi → O2
    },
  },
  "acil-iskemik-inme-001": {
    equipment: {
      ivCatheter: true,    // Tromboliz IV yolu
      ekgPatches: true,    // AF kontrolü
      bpCuff: true,
      pulseOximeter: true,
    },
  },
  "acil-rsi-entübasyon-001": {
    equipment: {
      ekgPatches: true,
      bpCuff: true,
      pulseOximeter: true,
      ivCatheter: true,    // İndüksiyon ilaçları IV
      // ETT henüz takılı DEĞİL — entübasyon adımında eklenir
    },
  },

  // ─── Dahiliye / Endokrin ──────────────────────────────────────
  "dahiliye-dka-001": {
    equipment: {
      ivCatheter: true,        // Sıvı + insülin
      ekgPatches: true,        // Hipokalemi/hiperkalemi izlemi
      bpCuff: true,            // Dehidratasyon hipotansiyon
      pulseOximeter: true,
      urinaryCatheter: true,   // Saatlik UO (hedef ≥0.5 mL/kg/saat)
    },
  },
  "dahiliye-hipoglisemi-001": {
    equipment: {
      ivCatheter: true,    // D50 vermek için zorunlu
      ekgPatches: true,    // Bilinç değişimi izlem
      pulseOximeter: true,
    },
  },

  // ─── Pediatri ─────────────────────────────────────────────────
  "pediatri-bronsiyolit-001": {
    equipment: {
      nasalCannula: true,    // Düşük akış O2 (HFNC öncesi)
      pulseOximeter: true,   // En kritik vital
      bpCuff: true,          // Pediatrik manşon
      // EKG patches pediatride genelde atlanır
    },
  },
  "pediatri-sepsis-001": {
    equipment: {
      ivCatheter: true,     // Sıvı + antibiyotik (1. saat içinde)
      nasalCannula: true,   // Düşük akış O2
      ekgPatches: true,     // Pediatrik monitör
      pulseOximeter: true,
      urinaryCatheter: true, // Şokta UO takibi
      nasogastricTube: true, // Gastrik dekompresyon (ileus profilaksi)
    },
  },

  // ─── Kadın Doğum ──────────────────────────────────────────────
  "kadin_dogum-preeklampsi-001": {
    equipment: {
      ivCatheter: true,    // MgSO4 + antihipertansif IV
      ekgPatches: true,    // MgSO4 toxicity izlem
      bpCuff: true,        // Sürekli (preeklampsi tanımı BP)
      pulseOximeter: true,
      urinaryCatheter: true, // Proteinüri + saatlik UO (MgSO4 atılım)
    },
  },

  // ─── Hemşirelik ───────────────────────────────────────────────
  "hemsirelik-sepsis-001": {
    equipment: {
      ivCatheter: true,
      nasalCannula: true,
      ekgPatches: true,
      bpCuff: true,
      pulseOximeter: true,
      urinaryCatheter: true, // NEWS2 yüksek → şok takibi
    },
  },

  // ─── Askeri / TCCC ────────────────────────────────────────────
  "askeri_tccc-patlama-001": {
    bleeding: [
      // Sağ aksilla şarapnel — arteriyel aksiller arter dalı
      { position: [0.10, 0.55, 0.07], severity: 0.85, type: "arterial", label: "Sağ aksilla şarapnel", radius: 0.030 },
      // Sol uyluk medial — femoral arter dalı
      { position: [-0.08, 0.18, 0.10], severity: 0.75, type: "arterial", label: "Sol uyluk medial", radius: 0.028 },
    ],
    equipment: {
      endotrachealTube: true, // TCCC A (airway) — ETT yerleştirilmiş
      ivCatheter: true,       // Masif transfüzyon yolu (büyük çaplı 14G)
      ekgPatches: true,
      pulseOximeter: true,
      bpCuff: true,
    },
  },
};

/**
 * scenarioId'ye göre initial visual state döndürür. Eşleşme yoksa boş obje.
 */
export function getInitialVisualState(scenarioId: string): InitialVisualState {
  return SCENARIO_VISUAL_STATE[scenarioId] ?? {};
}
