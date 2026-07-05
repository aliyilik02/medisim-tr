// ============================================================
// MediSim TR — Fizyoloji Sağlayıcısı (Faz 1)
// ============================================================
// Sanal Hasta Planı v1 §4.2 — gerçek zamanlı kötüleşme.
//
// PhysiologyProvider arayüzü Faz 3 Pulse Engine swap'i için sabit:
// UI ve senaryolar bu arayüze yazılır, sağlayıcı değişebilir.
//
// SimplePhysiologyProvider: senaryonun `deterioration` fazlarını
// saniye bazlı trend olarak BASELINE vitallere uygular. Farmakoloji
// motorunun tick delta'sı baseline'ın ÜSTÜNE eklenir (useVitalsTick).
//
// Saf motor kuralı: React import YOK. Durum closure içinde tutulur,
// her oturum için createSimplePhysiologyProvider ile yeni instance.
// ============================================================

import type {
  Scenario,
  PatientVitals,
  ActionRef,
  ActionMatcher,
  VitalTrend,
  DeteriorationPhase,
  PhaseSignal,
} from "./types";

export interface PhysiologyProviderState {
  /** Aktifleşmiş faz id'leri (adım tetiklemeli fazlar dahil) */
  activated: string[];
  /** Müdahale (intervention) ile durdurulmuş faz id'leri — recovery_trends çalışır. */
  halted: string[];
  /** Eskalasyon (halt_self) ile durdurulmuş faz id'leri — TAM durur, recovery YOK.
      'halted' (reperfüzyon→iyileşme) ile ayrıdır: faz devri (handoff) bunu kullanır. */
  stopped: string[];
}

export interface PhysiologyProvider {
  /** Bir tick'lik trend uygula. dtSec = simüle edilen saniye. Yeni vitals döner. */
  tick(vitals: PatientVitals, dtSec: number): PatientVitals;
  /** Öğrenci aksiyonunu bildir — eşleşen fazları durdurur. Yeni vitals döner
      (SimpleProvider vitalleri değiştirmez; anlık etki ActionOutcome.vitals_change
      ve farmakoloji motorundan gelir). */
  applyIntervention(vitals: PatientVitals, action: ActionRef): PatientVitals;
  /** Adım değişimini bildir — active_from_step_id'li fazları aktifleştirir. */
  notifyStepChange(stepId: string | null): void;
  /** Bu faz müdahale ile durduruldu mu? (oskültasyon resolved_sound geçişi için) */
  isPhaseHalted(phaseId: string): boolean;
  /** Aktif dominant fazın faz-senkron sinyali (EKG paterni + kalp sesi + görsel).
      Sinyal tanımlı (signal alanı dolu) aktif faz yoksa null → eski senaryolar
      etkilenmez. Faz içi evrim (VF→asistoli, ekg_late_after_sec) ve reperfüzyon
      (recovering kolu) burada çözülür. TEK faz sinyali kaynağı; EKG, ses ve görsel
      bunu dinler (opsiyonel: Pulse provider implement etmez → null). */
  getActivePhaseSignal?(vitals: PatientVitals): PhaseSignal | null;
  /** Test/debug görünürlüğü */
  getState(): PhysiologyProviderState;
}

// ------------------------------------------------------------
// Saf yardımcılar
// ------------------------------------------------------------

export function matchesAction(matcher: ActionMatcher, action: ActionRef): boolean {
  if (matcher.type !== action.type) return false;
  if (matcher.target_id !== action.target_id) return false;
  // matcher.site verilmişse eşleşmeli; verilmemişse her site kabul
  if (matcher.site && matcher.site !== action.site) return false;
  return true;
}

/** Trendleri vitallere uygula — floor/ceiling clamp'li. Saf fonksiyon. */
export function applyTrends(
  vitals: PatientVitals,
  trends: VitalTrend[],
  dtSec: number
): PatientVitals {
  if (trends.length === 0 || dtSec <= 0) return vitals;

  const next: PatientVitals = { ...vitals };
  for (const t of trends) {
    const current = next[t.vital];
    if (typeof current !== "number") continue; // opsiyonel vital tanımsızsa atla

    let value = current + t.delta_per_sec * dtSec;
    // Yönlü clamp: sınır yalnız o yöndeki HAREKETİ durdurur. Vital zaten
    // sınırın ötesindeyse (örn. vitals_change mutlak yazdı) sınıra
    // zıplatılmaz — mevcut değerde kalır (trend o yönde ilerleyemez).
    if (t.floor !== undefined && value < t.floor) {
      value = current < t.floor ? current : t.floor;
    }
    if (t.ceiling !== undefined && value > t.ceiling) {
      value = current > t.ceiling ? current : t.ceiling;
    }
    // Bilinçli: ara değerler kesirli tutulur (0.067/sn birikimi kaybolmasın).
    // Gösterim yuvarlaması computeLiveVitals'ta yapılır.
    next[t.vital] = value;
  }
  return next;
}

// ------------------------------------------------------------
// SimplePhysiologyProvider
// ------------------------------------------------------------

/** Vital eşik koşulu sağlanıyor mu (saf). */
export function matchesVitalCondition(
  vitals: PatientVitals,
  cond: import("./types").VitalCondition
): boolean {
  const v = vitals[cond.vital];
  if (v == null) return false;
  switch (cond.op) {
    case "lt": return v < cond.value;
    case "lte": return v <= cond.value;
    case "gt": return v > cond.value;
    case "gte": return v >= cond.value;
  }
}

export function createSimplePhysiologyProvider(
  scenario: Scenario
): PhysiologyProvider {
  const phases: DeteriorationPhase[] = scenario.deterioration ?? [];

  // Eskalasyon hedefi olan fazlar başta inaktif — escalation/step ile tetiklenir.
  const escalationTargets = new Set<string>();
  for (const p of phases) for (const e of p.escalations ?? []) escalationTargets.add(e.to_phase_id);

  // Başlangıçta aktif: adım tetikleyicisi YOK + eskalasyon hedefi DEĞİL
  const activated = new Set<string>(
    phases
      .filter((p) => !p.active_from_step_id && !escalationTargets.has(p.id))
      .map((p) => p.id)
  );
  const halted = new Set<string>();
  // Eskalasyon (halt_self) ile durdurulan fazlar — TAM durur (trend YOK,
  // recovery YOK). 'halted'tan ayrı: handoff'ta önceki faz buraya girer,
  // recovery_trends'li olsa bile iyileşmez (escalation≠reperfüzyon).
  const stopped = new Set<string>();
  // Eskalasyon durumu: faz yaşı (aktiften beri sn) + vital-koşul tutulma süresi
  const phaseAge = new Map<string, number>();
  const heldSec = new Map<string, number>(); // key: `${phaseId}#${escIdx}`
  for (const id of activated) phaseAge.set(id, 0);

  return {
    tick(vitals, dtSec) {
      let next = vitals;
      // Faz yaşı: aktif & durdurulmamış tüm fazlar için tek yerden ilerlet
      // (escalation zamanlaması + faz içi evrim VF→asistoli için). Halted faz
      // da yaşlanır (zararsız — escalation halted'ı atlar, recovery yaşı kullanmaz).
      for (const phase of phases) {
        if (activated.has(phase.id) && !stopped.has(phase.id)) {
          phaseAge.set(phase.id, (phaseAge.get(phase.id) ?? 0) + dtSec);
        }
      }
      for (const phase of phases) {
        if (!activated.has(phase.id)) continue;
        // Eskalasyonla durdurulmuş faz: hiçbir trend uygulanmaz (devredildi).
        if (stopped.has(phase.id)) continue;

        if (halted.has(phase.id)) {
          // Müdahale edildi — iyileşme trendi (varsa) hedefe doğru
          if (phase.recovery_trends?.length) {
            next = applyTrends(next, phase.recovery_trends, dtSec);
          }
        } else {
          // Tedavisiz seyir
          next = applyTrends(next, phase.trends, dtSec);
        }
      }

      // Eskalasyon değerlendirmesi — aktif + durdurulmamış fazlar
      for (const phase of phases) {
        if (!activated.has(phase.id) || halted.has(phase.id) || stopped.has(phase.id) || !phase.escalations?.length) continue;
        const age = phaseAge.get(phase.id) ?? 0;
        phase.escalations.forEach((esc, i) => {
          let trigger = false;
          if (esc.after_sec != null && age >= esc.after_sec) trigger = true;
          if (esc.when_vital) {
            const key = `${phase.id}#${i}`;
            if (matchesVitalCondition(next, esc.when_vital)) {
              const held = (heldSec.get(key) ?? 0) + dtSec;
              heldSec.set(key, held);
              if (held >= (esc.when_vital.for_sec ?? 0)) trigger = true;
            } else {
              heldSec.set(key, 0);
            }
          }
          if (trigger) {
            if (!activated.has(esc.to_phase_id)) {
              activated.add(esc.to_phase_id);
              phaseAge.set(esc.to_phase_id, 0);
            }
            // halt_self: önceki fazı DURDUR (handoff) — 'stopped'a koy, 'halted'a
            // DEĞİL: recovery_trends'li faz escalation'da yanlışlıkla iyileşmesin.
            // Hedef faz (örn. adımla) ZATEN aktif olsa bile devir gerçekleşir;
            // aksi halde kaynak+hedef trendleri süperpoze olur. Hedefin yaşı
            // korunur — koşan faz sıfırlanmaz.
            if (esc.halt_self) stopped.add(phase.id);
          }
        });
      }
      return next;
    },

    applyIntervention(vitals, action) {
      for (const phase of phases) {
        // stopped (devredilmiş/terminal) faz müdahaleyle 'halted'a giremez —
        // isPhaseHalted yanlış true dönerdi (oskültasyon resolved_sound
        // terminal fazda yanlış tetiklenirdi). Recovery zaten çalışmıyordu.
        if (halted.has(phase.id) || stopped.has(phase.id)) continue;
        if (phase.halted_by.some((m) => matchesAction(m, action))) {
          halted.add(phase.id);
        }
      }
      // Henüz aktifleşmemiş faz da durdurulabilir (erken doğru müdahale):
      // halted set'i aktivasyondan bağımsız — faz sonradan aktifleşse bile
      // doğrudan recovery koluna girer.
      return vitals;
    },

    notifyStepChange(stepId) {
      if (!stepId) return;
      for (const phase of phases) {
        if (phase.active_from_step_id === stepId && !activated.has(phase.id)) {
          activated.add(phase.id);
          phaseAge.set(phase.id, 0);
        }
      }
    },

    isPhaseHalted(phaseId) {
      return halted.has(phaseId);
    },

    getActivePhaseSignal(vitals): PhaseSignal | null {
      // Dominant faz = sinyal tanımlı, aktif & durdurulmamış, en YÜKSEK index'li
      // (escalation zinciri sonra gelen fazı daha ileri = daha şiddetli yapar).
      // Halted (müdahale edilmiş) faz AYRI izlenir: kötüleşen bir faz varken
      // monitör 'recovering' göstermesin — en kötü AKTİF süreç kazanır.
      // Kötüleşen sinyal fazı kalmadıysa halted faz reperfüzyon kolunu sürer.
      let dominant: DeteriorationPhase | null = null;
      let dominantIdx = -1;
      let haltedDom: DeteriorationPhase | null = null;
      phases.forEach((p, i) => {
        if (!p.signal) return;
        if (!activated.has(p.id) || stopped.has(p.id)) return;
        if (halted.has(p.id)) {
          if (!haltedDom) haltedDom = p;
        } else if (i > dominantIdx) {
          dominant = p;
          dominantIdx = i;
        }
      });

      // Kötüleşen sinyal fazı yok + müdahale edilmiş faz var → iyileşme kolu.
      // ST rezolüsyonu: vitaller toparlandıysa sinüse döner; değilse ST
      // elevasyonu sürer (yavaş rezolüsyon proxy'si). Kalp sesi normalleşir.
      if (!dominant) {
        if (!haltedDom) return null;
        const recovered =
          (vitals.bp_systolic ?? 0) >= 115 && (vitals.hr ?? 999) <= 95;
        return {
          phaseId: "recovering",
          phaseIndex: -2,
          ekg: recovered ? "sinus" : "st_elevation",
          heartSound: "normal",
          visual: {},
          recovering: true,
        };
      }
      const dom: DeteriorationPhase = dominant;
      const spec = dom.signal!;

      // Tedavisiz seyir: faz içi geç evrim (örn. VF→asistoli) faz yaşına bağlı.
      const age = phaseAge.get(dom.id) ?? 0;
      const late =
        spec.ekg_late_after_sec != null && age >= spec.ekg_late_after_sec;
      return {
        phaseId: dom.id,
        phaseIndex: dominantIdx,
        ekg: late && spec.ekg_late ? spec.ekg_late : spec.ekg,
        heartSound:
          late && spec.heart_sound_late ? spec.heart_sound_late : spec.heart_sound,
        visual: spec.visual ?? {},
        recovering: false,
        narration: spec.narration,
      };
    },

    getState() {
      return { activated: [...activated], halted: [...halted], stopped: [...stopped] };
    },
  };
}
