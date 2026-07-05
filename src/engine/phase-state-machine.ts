// ============================================================
// MediSim TR — Faz Durum Makinesi (PhaseStateMachine)
// ============================================================
// physiology.ts'teki dağınık closure state'in (activated/halted/stopped/
// phaseAge/heldSec) açık, tek-sorumlu FSM nesnesine çıkarımı (Hat A #7).
// SimplePhysiologyProvider bunun üstünde ince bir adaptördür; Faz 3'te
// Pulse provider aynı FSM'i faz-senkron sinyal için yeniden kullanabilir.
//
// Saf motor kuralı: React import YOK. Durum instance içinde — her oturum
// yeni instance. Davranış physiology testleriyle (44) birebir kilitli:
// tick sırası AYNEN korunur: (1) yaş ilerlet → (2) trend uygula →
// (3) eskalasyonları POST-TREND vitallerle değerlendir.
// ============================================================

import type {
  ActionMatcher,
  ActionRef,
  DeteriorationPhase,
  PatientVitals,
  PhaseSignal,
  VitalCondition,
  VitalTrend,
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

// ------------------------------------------------------------
// Saf yardımcılar (tanım burada; kamu yüzü physiology.ts re-export eder)
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

/** Vital eşik koşulu sağlanıyor mu (saf). */
export function matchesVitalCondition(
  vitals: PatientVitals,
  cond: VitalCondition
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

export class PhaseStateMachine {
  private readonly phases: DeteriorationPhase[];
  /** Aktifleşmiş fazlar (adım tetiklemeli fazlar dahil). */
  private readonly activated = new Set<string>();
  /** Müdahale ile durdurulmuş fazlar — recovery_trends çalışır. */
  private readonly halted = new Set<string>();
  /** Eskalasyon (halt_self) ile durdurulmuş fazlar — TAM durur, recovery YOK. */
  private readonly stopped = new Set<string>();
  /** Faz yaşı (aktiften beri sim-sn) — escalation + faz içi geç evrim için. */
  private readonly phaseAge = new Map<string, number>();
  /** when_vital koşulunun kesintisiz tutulma süresi. Key: `${phaseId}#${escIdx}` */
  private readonly heldSec = new Map<string, number>();

  constructor(phases: DeteriorationPhase[]) {
    this.phases = phases;

    // Eskalasyon hedefi olan fazlar başta inaktif — escalation/step tetikler.
    const escalationTargets = new Set<string>();
    for (const p of phases)
      for (const e of p.escalations ?? []) escalationTargets.add(e.to_phase_id);

    // Başlangıçta aktif: adım tetikleyicisi YOK + eskalasyon hedefi DEĞİL
    for (const p of phases) {
      if (!p.active_from_step_id && !escalationTargets.has(p.id)) {
        this.activated.add(p.id);
        this.phaseAge.set(p.id, 0);
      }
    }
  }

  /** Bir tick: yaş ilerlet → trendleri uygula → eskalasyonları değerlendir.
      Eskalasyon POST-TREND vitallerle çalışır (tick sonunda) — yeni fazın
      trendi SONRAKİ tick'te başlar. */
  tick(vitals: PatientVitals, dtSec: number): PatientVitals {
    // Faz yaşı: aktif & devredilmemiş fazlar. Halted faz da yaşlanır
    // (zararsız — escalation halted'ı atlar, recovery yaşı kullanmaz).
    for (const phase of this.phases) {
      if (this.activated.has(phase.id) && !this.stopped.has(phase.id)) {
        this.phaseAge.set(phase.id, (this.phaseAge.get(phase.id) ?? 0) + dtSec);
      }
    }

    let next = vitals;
    for (const phase of this.phases) {
      if (!this.activated.has(phase.id)) continue;
      if (this.stopped.has(phase.id)) continue; // devredildi — hiçbir trend yok

      if (this.halted.has(phase.id)) {
        // Müdahale edildi — iyileşme trendi (varsa) hedefe doğru
        if (phase.recovery_trends?.length) {
          next = applyTrends(next, phase.recovery_trends, dtSec);
        }
      } else {
        next = applyTrends(next, phase.trends, dtSec); // tedavisiz seyir
      }
    }

    this.evaluateEscalations(next, dtSec);
    return next;
  }

  /** Eskalasyon değerlendirmesi — aktif + durdurulmamış fazlar. */
  private evaluateEscalations(vitals: PatientVitals, dtSec: number): void {
    for (const phase of this.phases) {
      if (
        !this.activated.has(phase.id) ||
        this.halted.has(phase.id) ||
        this.stopped.has(phase.id) ||
        !phase.escalations?.length
      )
        continue;
      const age = this.phaseAge.get(phase.id) ?? 0;
      phase.escalations.forEach((esc, i) => {
        let trigger = false;
        if (esc.after_sec != null && age >= esc.after_sec) trigger = true;
        if (esc.when_vital) {
          const key = `${phase.id}#${i}`;
          if (matchesVitalCondition(vitals, esc.when_vital)) {
            const held = (this.heldSec.get(key) ?? 0) + dtSec;
            this.heldSec.set(key, held);
            if (held >= (esc.when_vital.for_sec ?? 0)) trigger = true;
          } else {
            this.heldSec.set(key, 0); // koşul bozuldu — sayaç sıfırdan
          }
        }
        if (trigger) {
          if (!this.activated.has(esc.to_phase_id)) {
            this.activated.add(esc.to_phase_id);
            this.phaseAge.set(esc.to_phase_id, 0);
          }
          // halt_self: önceki fazı DURDUR (handoff) — 'stopped'a, 'halted'a
          // DEĞİL (recovery_trends'li faz eskalasyonda yanlışlıkla iyileşmesin).
          // Hedef faz ZATEN aktif olsa bile devir gerçekleşir; hedefin yaşı
          // korunur — koşan faz sıfırlanmaz.
          if (esc.halt_self) this.stopped.add(phase.id);
        }
      });
    }
  }

  /** Öğrenci aksiyonu — eşleşen fazları durdurur (recovery koluna alır).
      stopped (devredilmiş/terminal) faz müdahaleyle 'halted'a giremez.
      Henüz aktifleşmemiş faz durdurulabilir (erken doğru müdahale):
      halted aktivasyondan bağımsız — faz sonradan aktifleşse bile
      doğrudan recovery koluna girer. */
  haltBy(action: ActionRef): void {
    for (const phase of this.phases) {
      if (this.halted.has(phase.id) || this.stopped.has(phase.id)) continue;
      if (phase.halted_by.some((m) => matchesAction(m, action))) {
        this.halted.add(phase.id);
      }
    }
  }

  /** Adım değişimi — active_from_step_id'li fazları aktifleştirir. */
  activateFromStep(stepId: string): void {
    for (const phase of this.phases) {
      if (phase.active_from_step_id === stepId && !this.activated.has(phase.id)) {
        this.activated.add(phase.id);
        this.phaseAge.set(phase.id, 0);
      }
    }
  }

  isHalted(phaseId: string): boolean {
    return this.halted.has(phaseId);
  }

  /** Faz-senkron sinyal: en kötü AKTİF (halted olmayan) sinyal fazı kazanır;
      kötüleşen sinyal fazı kalmadıysa halted faz reperfüzyon (recovering)
      kolunu sürer; hiçbiri yoksa null (eski senaryolar etkilenmez). */
  dominantSignal(vitals: PatientVitals): PhaseSignal | null {
    let dominant: DeteriorationPhase | null = null;
    let dominantIdx = -1;
    let haltedDom: DeteriorationPhase | null = null;
    this.phases.forEach((p, i) => {
      if (!p.signal) return;
      if (!this.activated.has(p.id) || this.stopped.has(p.id)) return;
      if (this.halted.has(p.id)) {
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
    const age = this.phaseAge.get(dom.id) ?? 0;
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
      symptomEvents: spec.symptom_events,
    };
  }

  getState(): PhysiologyProviderState {
    return {
      activated: [...this.activated],
      halted: [...this.halted],
      stopped: [...this.stopped],
    };
  }
}
