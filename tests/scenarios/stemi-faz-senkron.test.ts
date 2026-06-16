// ============================================================
// STEMI faz-senkron gerçeklik paketi testleri (AŞAMA 5)
// ============================================================
// Tek faz sinyali kaynağı (physiology.getActivePhaseSignal) → EKG + ses + görsel
// + öğretici anlatım. Bu test faz→sinyal eşlemesini, faz içi evrimi (VF→asistoli),
// reperfüzyonu (recovering) ve ÜÇ tüketicinin AYNI sinyali tutarlı okuduğunu doğrular.
// ============================================================
import { describe, expect, test } from "vitest";
import { createSimplePhysiologyProvider, phaseTransitionNarration } from "@/engine";
import type { PatientVitals, PhaseSignal } from "@/engine";
import { patientVitalsToMonitor } from "@/components/monitor/adapter";
import { heartSoundFile } from "@/components/patient-3d/auscultationAudio";
import { buildScenarioRegions } from "@/components/patient-3d/scenarioRegions";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { mapVitalsToVisuals, applyPhaseVisual } from "@/clinical/clinicalVisualMapping";
import { getScenario } from "../helpers/all-scenarios";

const stemi = getScenario("kardiyoloji-stemi-001");
if (!stemi) throw new Error("STEMI senaryosu bulunamadı");
const anaflaksi = getScenario("acil-anaflaksi-001");

/** Provider'ı n×180sn ilerleterek escalation zincirini sürer; son vitals döner. */
function advance(
  provider: ReturnType<typeof createSimplePhysiologyProvider>,
  start: PatientVitals,
  steps: number,
  dt = 180,
): PatientVitals {
  let v = start;
  for (let i = 0; i < steps; i++) v = provider.tick(v, dt);
  return v;
}

function freshProvider() {
  return createSimplePhysiologyProvider(stemi!);
}
const initial = (): PatientVitals => ({ ...stemi!.initial_vitals });

describe("getActivePhaseSignal — faz→EKG eşlemesi", () => {
  test("baseline (stemi-iskemi) → st_elevation + normal kalp sesi", () => {
    const p = freshProvider();
    const sig = p.getActivePhaseSignal!(initial())!;
    expect(sig).not.toBeNull();
    expect(sig.phaseId).toBe("stemi-iskemi");
    expect(sig.ekg).toBe("st_elevation");
    expect(sig.heartSound).toBe("normal");
    expect(sig.recovering).toBe(false);
  });

  test("SCAI C (şok) → st_elev_pvc + tachy", () => {
    const p = freshProvider();
    const v = advance(p, initial(), 1); // 180sn → stemi-sok
    const sig = p.getActivePhaseSignal!(v)!;
    expect(sig.phaseId).toBe("stemi-sok");
    expect(sig.ekg).toBe("st_elev_pvc");
    expect(sig.heartSound).toBe("tachy");
  });

  test("SCAI D (kötüleşme) → vt_salvo", () => {
    const p = freshProvider();
    const v = advance(p, initial(), 2); // 360sn → stemi-kotulesme
    const sig = p.getActivePhaseSignal!(v)!;
    expect(sig.phaseId).toBe("stemi-kotulesme");
    expect(sig.ekg).toBe("vt_salvo");
  });

  test("SCAI E (arrest) → vfib, ~45sn sonra asystole (faz içi evrim)", () => {
    const p = freshProvider();
    let v = advance(p, initial(), 3); // 540sn → stemi-arrest
    let sig = p.getActivePhaseSignal!(v)!;
    expect(sig.phaseId).toBe("stemi-arrest");
    expect(sig.ekg).toBe("vfib"); // faz yaşı < 45sn
    expect(sig.heartSound).toBe("silent");
    expect(sig.visual.breath_stopped).toBe(true);

    v = advance(p, v, 1, 45); // +45sn faz içinde
    sig = p.getActivePhaseSignal!(v)!;
    expect(sig.ekg).toBe("asystole"); // ekg_late tetiklendi
  });
});

describe("getActivePhaseSignal — reperfüzyon (recovering)", () => {
  test("müdahale (tenecteplase) → recovering; vital düzelmeden ST elevasyonu sürer", () => {
    const p = freshProvider();
    p.applyIntervention(initial(), { type: "give_medication", target_id: "tenecteplase" });
    // hr 104 / bp 148 → henüz toparlanmadı (hr>95)
    const sig = p.getActivePhaseSignal!(initial())!;
    expect(sig.recovering).toBe(true);
    expect(sig.phaseId).toBe("recovering");
    expect(sig.ekg).toBe("st_elevation");
    expect(sig.heartSound).toBe("normal");
  });

  test("recovering + vital toparlandı → sinüse döner (ST rezolüsyonu)", () => {
    const p = freshProvider();
    p.applyIntervention(initial(), { type: "decision", target_id: "opt_pci_transfer" });
    const recovered: PatientVitals = { ...initial(), hr: 88, bp_systolic: 122 };
    const sig = p.getActivePhaseSignal!(recovered)!;
    expect(sig.recovering).toBe(true);
    expect(sig.ekg).toBe("sinus");
  });
});

describe("getActivePhaseSignal — null güvenliği", () => {
  test("signal alanı olmayan senaryoda null (eski senaryolar etkilenmez)", () => {
    if (!anaflaksi) return;
    const p = createSimplePhysiologyProvider(anaflaksi);
    const sig = p.getActivePhaseSignal!({ ...anaflaksi.initial_vitals });
    expect(sig).toBeNull();
  });
});

describe("Ses faz eşlemesi — heartSoundFile", () => {
  test("normal→heart_normal, tachy→heart_61bpm, silent→null", () => {
    expect(heartSoundFile("normal")).toBe("heart_normal");
    expect(heartSoundFile("tachy")).toBe("heart_61bpm");
    expect(heartSoundFile("silent")).toBeNull();
  });
  test("placeholder (s3_gallop/muffled) çalan bir dosyaya düşer (404 değil)", () => {
    expect(heartSoundFile("s3_gallop")).toBeTruthy();
    expect(heartSoundFile("muffled")).toBeTruthy();
  });
});

describe("EKG adapter — EkgPattern → ritim + ST", () => {
  test("st_elevation → sinüs + belirgin ST", () => {
    const m = patientVitalsToMonitor(initial(), "st_elevation");
    expect(m.rhythm).toBe("sinus");
    expect(m.st).toBeCloseTo(0.18, 5);
  });
  test("st_elev_pvc → pvc + ST", () => {
    const m = patientVitalsToMonitor(initial(), "st_elev_pvc");
    expect(m.rhythm).toBe("pvc");
    expect(m.st).toBeCloseTo(0.18, 5);
  });
  test("vt_salvo → vt_salvo ritmi (ST yok)", () => {
    const m = patientVitalsToMonitor(initial(), "vt_salvo");
    expect(m.rhythm).toBe("vt_salvo");
    expect(m.st).toBeUndefined();
  });
  test("vfib / asystole doğru ritim", () => {
    expect(patientVitalsToMonitor(initial(), "vfib").rhythm).toBe("vfib");
    expect(patientVitalsToMonitor(initial(), "asystole").rhythm).toBe("asystole");
  });
});

describe("Görsel faz — applyPhaseVisual", () => {
  test("hint yoksa base aynen döner", () => {
    const base = mapVitalsToVisuals(initial());
    expect(applyPhaseVisual(base)).toEqual(base);
  });
  test("breath_stopped → breathingRate 0 (arrest nefes durur)", () => {
    const base = mapVitalsToVisuals(initial());
    const out = applyPhaseVisual(base, { breath_stopped: true });
    expect(out.breathingRate).toBe(0);
  });
  test("boost'lar 0-1 clamp'li biner", () => {
    const base = mapVitalsToVisuals({ ...initial(), spo2: 99, bp_systolic: 140 });
    const out = applyPhaseVisual(base, { cyanosis_boost: 0.6, pallor_boost: 2 });
    expect(out.cyanosis).toBeCloseTo(base.cyanosis + 0.6, 5);
    expect(out.pallor).toBe(1); // clamp
  });
});

describe("Oskültasyon faz-senkron — buildScenarioRegions", () => {
  function arrestSignal(): PhaseSignal {
    const p = freshProvider();
    const v = advance(p, initial(), 3);
    return p.getActivePhaseSignal!(v)!;
  }
  function shockSignal(): PhaseSignal {
    const p = freshProvider();
    const v = advance(p, initial(), 1);
    return p.getActivePhaseSignal!(v)!;
  }

  test("şok fazı: kardiyak noktalar faz kalp sesini çalar (tachy→heart_61bpm)", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, stemi!, [], shockSignal());
    for (const id of ["chest-front", "chest-left", "chest-right"]) {
      const r = regions.find((x) => x.id === id)!;
      expect(r.auscultationSoundId).toBe("heart_61bpm");
      expect(r.availableProcedures).toContain("stethoscope");
    }
  });

  test("arrest: silent → kardiyak noktada ses yok (auscultationSoundId undefined)", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, stemi!, [], arrestSignal());
    const chestFront = regions.find((r) => r.id === "chest-front")!;
    expect(chestFront.auscultationSoundId).toBeUndefined();
  });

  test("kardiyak olmayan bölgeler faz sinyalinden etkilenmez", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, stemi!, [], shockSignal());
    const mouth = regions.find((r) => r.id === "face-mouth")!;
    const baseMouth = DEFAULT_REGIONS.find((r) => r.id === "face-mouth")!;
    expect(mouth).toEqual(baseMouth);
  });

  test("faz sinyali yoksa eski davranış (base regions)", () => {
    expect(buildScenarioRegions(DEFAULT_REGIONS, stemi!, [])).toBe(DEFAULT_REGIONS);
  });
});

describe("TEK KAYNAK / senkron — bir sinyal, üç tüketici tutarlı", () => {
  test("arrest sinyali: EKG + ses + görsel AYNI faz sinyalini okur", () => {
    const p = freshProvider();
    const v = advance(p, initial(), 3);
    const sig = p.getActivePhaseSignal!(v)!;
    // tek kaynak
    expect(sig.ekg).toBe("vfib");
    expect(sig.heartSound).toBe("silent");
    // 1) EKG tüketici (monitör adapter)
    expect(patientVitalsToMonitor(v, sig.ekg).rhythm).toBe("vfib");
    // 2) Ses tüketici (oskültasyon)
    expect(heartSoundFile(sig.heartSound)).toBeNull();
    // 3) Görsel tüketici (nefes durur)
    expect(applyPhaseVisual(mapVitalsToVisuals(v), sig.visual).breathingRate).toBe(0);
    // 4) Anlatım tüketici (öğretici)
    expect(phaseTransitionNarration(sig)).toMatch(/fibrilasyon|arrest/i);
  });

  test("kötüleşme sinyali: VES/VT salvosu anlatımı EKG ile uyumlu", () => {
    const p = freshProvider();
    const v = advance(p, initial(), 2);
    const sig = p.getActivePhaseSignal!(v)!;
    expect(sig.ekg).toBe("vt_salvo");
    expect(phaseTransitionNarration(sig)).toMatch(/VT salvo|VES|fibrilasyon riski/i);
  });
});
