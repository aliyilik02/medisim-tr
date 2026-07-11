// ============================================================
// SimplePhysiologyProvider testleri — Faz 1 (§4.2)
// ============================================================
import { describe, expect, test } from "vitest";
import {
  createSimplePhysiologyProvider,
  applyTrends,
  matchesAction,
} from "@/engine";
import type {
  Scenario,
  PatientVitals,
  DeteriorationPhase,
} from "@/engine";

const BASE_VITALS: PatientVitals = {
  hr: 128,
  bp_systolic: 78,
  bp_diastolic: 44,
  spo2: 88,
  temp: 36.8,
  rr: 30,
};

function makeScenario(phases: DeteriorationPhase[]): Scenario {
  // Sadece provider'ın okuduğu alanlar önemli — gerisi iskelet
  return {
    id: "test-deterioration",
    version: "0.0.1",
    title: "Test",
    description: "",
    specialty: "acil",
    tags: [],
    difficulty: 2,
    estimated_minutes: 5,
    modes: ["interactive_3d"],
    language: "tr",
    last_updated: "2026-06-12",
    patient: {
      age: 35,
      sex: "F",
      weight_kg: 68,
      chief_complaint: "",
      history_items: [],
      allergies: [],
    },
    initial_vitals: { ...BASE_VITALS },
    available_medications: ["adrenalin"],
    available_equipment: [],
    steps: [],
    start_step_id: "s1",
    scoring: {
      max_points: 100,
      passing_score: 55,
      grade_bands: { A: 85, B: 70, C: 55, D: 40 },
    },
    debrief: { key_learnings: [], references: [] },
    deterioration: phases,
  };
}

const SIMPLE_PHASE: DeteriorationPhase = {
  id: "shock",
  trends: [
    { vital: "bp_systolic", delta_per_sec: -2, floor: 50 },
    { vital: "spo2", delta_per_sec: -1, floor: 72 },
    { vital: "hr", delta_per_sec: 1, ceiling: 152 },
  ],
  halted_by: [{ type: "give_medication", target_id: "adrenalin" }],
  recovery_trends: [
    { vital: "bp_systolic", delta_per_sec: 4, ceiling: 112 },
    { vital: "spo2", delta_per_sec: 2, ceiling: 97 },
    { vital: "hr", delta_per_sec: -2, floor: 96 },
  ],
};

describe("applyTrends — saf trend uygulama", () => {
  test("delta_per_sec × dtSec kadar değiştirir", () => {
    const next = applyTrends(
      BASE_VITALS,
      [{ vital: "bp_systolic", delta_per_sec: -2 }],
      3
    );
    expect(next.bp_systolic).toBe(72);
    // Diğer vitaller dokunulmaz
    expect(next.hr).toBe(128);
    expect(next.spo2).toBe(88);
  });

  test("floor altına inmez", () => {
    const next = applyTrends(
      { ...BASE_VITALS, bp_systolic: 52 },
      [{ vital: "bp_systolic", delta_per_sec: -2, floor: 50 }],
      10
    );
    expect(next.bp_systolic).toBe(50);
  });

  test("ceiling üstüne çıkmaz", () => {
    const next = applyTrends(
      { ...BASE_VITALS, hr: 150 },
      [{ vital: "hr", delta_per_sec: 1, ceiling: 152 }],
      10
    );
    expect(next.hr).toBe(152);
  });

  test("sınırın ÖTESİNDE başlayan değer sınıra zıplatılmaz — mevcut değerde durur", () => {
    // vitals_change mutlak yazınca vital sınır dışına düşebilir (review bulgusu).
    // Kötüleşme (delta<0, floor 72): SpO2 70'ten 72'ye YÜKSELMEMELİ.
    const det = applyTrends(
      { ...BASE_VITALS, spo2: 70 },
      [{ vital: "spo2", delta_per_sec: -1, floor: 72 }],
      5
    );
    expect(det.spo2).toBe(70);

    // İyileşme (delta>0, ceiling 112): SBP 120'den 112'ye DÜŞMEMELİ.
    const rec = applyTrends(
      { ...BASE_VITALS, bp_systolic: 120 },
      [{ vital: "bp_systolic", delta_per_sec: 4, ceiling: 112 }],
      5
    );
    expect(rec.bp_systolic).toBe(120);
  });

  test("tanımsız opsiyonel vital atlanır", () => {
    const next = applyTrends(
      BASE_VITALS, // etco2 yok
      [{ vital: "etco2", delta_per_sec: -1 }],
      5
    );
    expect(next.etco2).toBeUndefined();
  });

  test("kesirli birikim korunur (yuvarlama yapılmaz)", () => {
    const next = applyTrends(
      BASE_VITALS,
      [{ vital: "bp_systolic", delta_per_sec: -0.067 }],
      1
    );
    expect(next.bp_systolic).toBeCloseTo(77.933, 3);
  });

  test("dtSec 0 veya boş trend → aynı obje", () => {
    expect(applyTrends(BASE_VITALS, [], 1)).toBe(BASE_VITALS);
    expect(
      applyTrends(BASE_VITALS, [{ vital: "hr", delta_per_sec: 1 }], 0)
    ).toBe(BASE_VITALS);
  });
});

describe("matchesAction — müdahale eşleştirme", () => {
  test("type + target_id eşleşmesi yeter (site verilmemişse)", () => {
    expect(
      matchesAction(
        { type: "give_medication", target_id: "adrenalin" },
        { type: "give_medication", target_id: "adrenalin", site: "im_uyluk" }
      )
    ).toBe(true);
  });

  test("matcher site isterse aksiyon sitesi eşleşmeli", () => {
    expect(
      matchesAction(
        { type: "give_medication", target_id: "adrenalin", site: "im_uyluk" },
        { type: "give_medication", target_id: "adrenalin" }
      )
    ).toBe(false);
  });

  test("farklı ilaç eşleşmez", () => {
    expect(
      matchesAction(
        { type: "give_medication", target_id: "adrenalin" },
        { type: "give_medication", target_id: "feniramin" }
      )
    ).toBe(false);
  });
});

describe("SimplePhysiologyProvider — kötüleşme döngüsü", () => {
  test("aktif faz tedavisiz trendi uygular", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIMPLE_PHASE])
    );
    const next = provider.tick(BASE_VITALS, 1);
    expect(next.bp_systolic).toBe(76);
    expect(next.spo2).toBe(87);
    expect(next.hr).toBe(129);
  });

  test("müdahale fazı durdurur, recovery trendi hedefe taşır", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIMPLE_PHASE])
    );

    // 5 sn kötüleşme: SBP 78 → 68
    let vitals = provider.tick(BASE_VITALS, 5);
    expect(vitals.bp_systolic).toBe(68);
    expect(provider.isPhaseHalted("shock")).toBe(false);

    // Adrenalin (site fark etmez)
    provider.applyIntervention(vitals, {
      type: "give_medication",
      target_id: "adrenalin",
      site: "im_uyluk",
    });
    expect(provider.isPhaseHalted("shock")).toBe(true);

    // Artık iyileşme: SBP 68 → 72 (1 sn × +4)
    vitals = provider.tick(vitals, 1);
    expect(vitals.bp_systolic).toBe(72);

    // Uzun süre sonra ceiling'de durur (hedef 112)
    vitals = provider.tick(vitals, 100);
    expect(vitals.bp_systolic).toBe(112);
    expect(vitals.spo2).toBe(97);
    expect(vitals.hr).toBe(96);
  });

  test("yanlış müdahale fazı durdurmaz", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIMPLE_PHASE])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "feniramin",
    });
    expect(provider.isPhaseHalted("shock")).toBe(false);
    // Kötüleşme devam eder
    const next = provider.tick(BASE_VITALS, 1);
    expect(next.bp_systolic).toBe(76);
  });

  test("recovery_trends olmayan halt edilmiş faz vitalleri değiştirmez", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...SIMPLE_PHASE, recovery_trends: undefined }])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    const next = provider.tick(BASE_VITALS, 10);
    expect(next).toEqual(BASE_VITALS);
  });

  test("active_from_step_id'li faz adım gelmeden çalışmaz, adımla aktifleşir", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...SIMPLE_PHASE, active_from_step_id: "s3" }])
    );

    // Adım gelmedi — vitaller sabit
    expect(provider.tick(BASE_VITALS, 10)).toEqual(BASE_VITALS);

    provider.notifyStepChange("s1");
    expect(provider.tick(BASE_VITALS, 10)).toEqual(BASE_VITALS);

    provider.notifyStepChange("s3");
    const next = provider.tick(BASE_VITALS, 1);
    expect(next.bp_systolic).toBe(76);

    // Adım geçse de faz sürer (halt edilmedikçe)
    provider.notifyStepChange("s4");
    const next2 = provider.tick(next, 1);
    expect(next2.bp_systolic).toBe(74);
  });

  test("erken doğru müdahale — faz aktifleşmeden halt edilirse direkt recovery'ye girer", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...SIMPLE_PHASE, active_from_step_id: "s3" }])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    provider.notifyStepChange("s3");
    const next = provider.tick({ ...BASE_VITALS, bp_systolic: 70 }, 1);
    expect(next.bp_systolic).toBe(74); // recovery +4, kötüleşme değil
  });

  test("deterioration tanımsız senaryoda no-op", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([]));
    expect(provider.tick(BASE_VITALS, 60)).toEqual(BASE_VITALS);
    expect(provider.getState()).toEqual({ activated: [], halted: [], stopped: [] });
  });

  test("notifyStepChange(null) no-op — hiçbir faz aktifleşmez", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...SIMPLE_PHASE, active_from_step_id: "s3" }])
    );
    provider.notifyStepChange(null);
    expect(provider.getState().activated).toEqual([]);
    expect(provider.tick(BASE_VITALS, 5)).toEqual(BASE_VITALS);
  });
});

// ------------------------------------------------------------
// tick — sınır durumları (dtSec=0, büyük dtSec)
// ------------------------------------------------------------

/** Eskalasyonlu 2 fazlı sentetik fixture — klinik senaryolardan bağımsız. */
const ESC_PHASE_A: DeteriorationPhase = {
  id: "faz-a",
  trends: [{ vital: "bp_systolic", delta_per_sec: -1, floor: 60 }],
  halted_by: [{ type: "give_medication", target_id: "adrenalin" }],
  escalations: [{ to_phase_id: "faz-b", after_sec: 30, halt_self: true }],
};
const ESC_PHASE_B: DeteriorationPhase = {
  id: "faz-b",
  trends: [{ vital: "hr", delta_per_sec: -2, floor: 0 }],
  halted_by: [],
};

describe("tick — sınır durumları", () => {
  test("dtSec=0: vitaller değişmez, faz yaşı ilerlemez (after_sec tetiklenmez)", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([ESC_PHASE_A, ESC_PHASE_B])
    );
    let v = BASE_VITALS;
    for (let i = 0; i < 100; i++) v = provider.tick(v, 0);
    expect(v).toEqual(BASE_VITALS);
    // 100 kez 0-sn tick → yaş 0 kaldı, 30sn eskalasyonu tetiklenmedi
    expect(provider.getState().activated).not.toContain("faz-b");
  });

  test("büyük dtSec tek tick: floor clamp korunur, aşım yok", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([SIMPLE_PHASE]));
    const next = provider.tick(BASE_VITALS, 1000);
    expect(next.bp_systolic).toBe(50); // floor'un altına inmedi
    expect(next.spo2).toBe(72);
    expect(next.hr).toBe(152); // ceiling
  });

  test("büyük dtSec tek tick after_sec eşiğini bir seferde aşar; yeni fazın trendi SONRAKİ tick'te başlar", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([ESC_PHASE_A, ESC_PHASE_B])
    );
    const afterBig = provider.tick(BASE_VITALS, 1000);
    // Eskalasyon aynı tick'in SONUNDA değerlendirilir → faz-b aktive oldu
    expect(provider.getState().activated).toContain("faz-b");
    expect(provider.getState().stopped).toContain("faz-a");
    // ama faz-b trendi (hr -2) bu tick'te HENÜZ uygulanmadı
    expect(afterBig.hr).toBe(BASE_VITALS.hr);
    // sonraki tick'te uygulanır
    const next = provider.tick(afterBig, 1);
    expect(next.hr).toBe(BASE_VITALS.hr - 2);
  });
});

// ------------------------------------------------------------
// Eskalasyon FSM — sentetik fixture (senaryo bağımsız)
// ------------------------------------------------------------

describe("eskalasyon FSM — after_sec (zaman tetikli)", () => {
  test("eskalasyon hedefi başta İNAKTİF, after_sec dolunca aktifleşir", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([ESC_PHASE_A, ESC_PHASE_B])
    );
    expect(provider.getState().activated).toEqual(["faz-a"]);

    let v = BASE_VITALS;
    for (let i = 0; i < 29; i++) v = provider.tick(v, 1);
    expect(provider.getState().activated).not.toContain("faz-b");

    provider.tick(v, 1); // yaş = 30 ≥ after_sec
    expect(provider.getState().activated).toContain("faz-b");
  });

  test("halted faz yaşlansa da eskale OLMAZ (erken müdahale eskalasyonu önler)", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([ESC_PHASE_A, ESC_PHASE_B])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    let v = BASE_VITALS;
    for (let i = 0; i < 60; i++) v = provider.tick(v, 1);
    expect(provider.getState().activated).not.toContain("faz-b");
  });
});

describe("eskalasyon FSM — when_vital (vital eşik tetikli)", () => {
  // trends boş → vitaller test kontrolünde; koşul tick'e verilen vitals üstünden değerlendirilir
  const vitalEsc: DeteriorationPhase = {
    id: "hipoksi",
    trends: [],
    halted_by: [],
    escalations: [
      {
        to_phase_id: "arrest",
        when_vital: { vital: "spo2", op: "lt", value: 80, for_sec: 5 },
      },
    ],
  };
  const arrest: DeteriorationPhase = { id: "arrest", trends: [], halted_by: [] };
  const low = { ...BASE_VITALS, spo2: 70 };
  const ok = { ...BASE_VITALS, spo2: 95 };

  test("koşul for_sec boyunca TUTULUNCA tetiklenir, öncesinde tetiklenmez", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([vitalEsc, arrest]));
    for (let i = 0; i < 4; i++) provider.tick(low, 1); // 4sn < 5sn
    expect(provider.getState().activated).not.toContain("arrest");
    provider.tick(low, 1); // 5. sn → held ≥ for_sec
    expect(provider.getState().activated).toContain("arrest");
  });

  test("koşul bozulursa tutulma sayacı SIFIRLANIR (kaldığı yerden devam etmez)", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([vitalEsc, arrest]));
    for (let i = 0; i < 4; i++) provider.tick(low, 1); // held = 4
    provider.tick(ok, 1); // koşul bozuldu → held = 0 (physiology.ts:184)
    for (let i = 0; i < 4; i++) provider.tick(low, 1); // held = 4 (yeniden)
    expect(provider.getState().activated).not.toContain("arrest");
    provider.tick(low, 1); // held = 5
    expect(provider.getState().activated).toContain("arrest");
  });

  test("for_sec verilmezse ANLIK tetik — koşulun sağlandığı ilk tick yeter", () => {
    const anlik: DeteriorationPhase = {
      ...vitalEsc,
      id: "hipoksi-anlik",
      escalations: [
        { to_phase_id: "arrest", when_vital: { vital: "spo2", op: "lt", value: 80 } },
      ],
    };
    const provider = createSimplePhysiologyProvider(makeScenario([anlik, arrest]));
    provider.tick(low, 1);
    expect(provider.getState().activated).toContain("arrest");
  });

  test("tek büyük tick for_sec'i BİR SEFERDE doldurur (held += dtSec, alt-örnekleme yok)", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([vitalEsc, arrest]));
    provider.tick(low, 10); // tek tick'te held = 10 ≥ 5
    expect(provider.getState().activated).toContain("arrest");
  });

  test("after_sec + when_vital birlikte → VEYA mantığı (erken sağlanan tetikler)", () => {
    const both: DeteriorationPhase = {
      ...vitalEsc,
      id: "faz-ikili",
      escalations: [
        {
          to_phase_id: "arrest",
          after_sec: 100,
          when_vital: { vital: "spo2", op: "lt", value: 80 },
        },
      ],
    };
    const provider = createSimplePhysiologyProvider(makeScenario([both, arrest]));
    provider.tick(low, 1); // vital koşulu sağlandı, 100sn beklenmeden
    expect(provider.getState().activated).toContain("arrest");
  });

  test("hedef faz adımla ZATEN aktifse bile halt_self devri gerçekleşir — süperpozisyon yok", () => {
    // Eski bug: (trigger && !activated.has(to_phase_id)) guard'ı hedef önceden
    // aktifse halt_self'i atlıyordu → iki fazın trendi toplanıyordu. Düzeltme:
    // devir hedef aktifken de işler; hedefin yaşı korunur (sıfırlanmaz).
    const a: DeteriorationPhase = {
      id: "faz-a",
      trends: [{ vital: "bp_systolic", delta_per_sec: -1 }],
      halted_by: [],
      escalations: [{ to_phase_id: "faz-b", after_sec: 10, halt_self: true }],
    };
    const b: DeteriorationPhase = {
      id: "faz-b",
      active_from_step_id: "s2",
      trends: [{ vital: "bp_systolic", delta_per_sec: -2 }],
      halted_by: [],
    };
    const provider = createSimplePhysiologyProvider(makeScenario([a, b]));
    provider.notifyStepChange("s2"); // faz-b adımla aktifleşti
    let v = BASE_VITALS;
    for (let i = 0; i < 15; i++) v = provider.tick(v, 1); // after_sec 10 aşıldı
    // faz-a DURDU (halt_self hedef aktifken de işledi):
    expect(provider.getState().stopped).toContain("faz-a");
    // tick 1-10 süperpoze (10×3=30), tick 11-15 sadece faz-b (5×2=10) → 40
    expect(v.bp_systolic).toBe(BASE_VITALS.bp_systolic - 40);
  });
});

describe("halt_self faz devri (handoff)", () => {
  test("eski faz 'stopped' olur ('halted' değil), yeni faz devralır", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([ESC_PHASE_A, ESC_PHASE_B])
    );
    let v = BASE_VITALS;
    for (let i = 0; i < 31; i++) v = provider.tick(v, 1);
    const st = provider.getState();
    expect(st.stopped).toContain("faz-a");
    expect(st.halted).not.toContain("faz-a");
    expect(st.activated).toContain("faz-b");
  });

  test("durdurulan faz geri gelmez — sonraki tick'lerde trendi uygulanmaz", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([ESC_PHASE_A, ESC_PHASE_B])
    );
    let v = BASE_VITALS;
    for (let i = 0; i < 31; i++) v = provider.tick(v, 1);
    const bpAtHandoff = v.bp_systolic;
    const hrAtHandoff = v.hr; // faz-b handoff sonrası 1 tick trend uyguladı (31. tick)
    for (let i = 0; i < 20; i++) v = provider.tick(v, 1);
    // faz-a (bp trendi) durdu → SBP sabit; sadece faz-b (hr) akar
    expect(v.bp_systolic).toBe(bpAtHandoff);
    expect(v.hr).toBe(hrAtHandoff - 40);
    expect(provider.getState().stopped).toContain("faz-a");
  });

  test("eskalasyon zinciri A→B→C: her devirde önceki faz durur, yaş sıfırdan sayılır", () => {
    const a: DeteriorationPhase = {
      id: "z-a",
      trends: [],
      halted_by: [],
      escalations: [{ to_phase_id: "z-b", after_sec: 30, halt_self: true }],
    };
    const b: DeteriorationPhase = {
      id: "z-b",
      trends: [],
      halted_by: [],
      escalations: [{ to_phase_id: "z-c", after_sec: 10, halt_self: true }],
    };
    const c: DeteriorationPhase = { id: "z-c", trends: [], halted_by: [] };
    const provider = createSimplePhysiologyProvider(makeScenario([a, b, c]));

    let v = BASE_VITALS;
    for (let i = 0; i < 30; i++) v = provider.tick(v, 1); // A yaş 30 → B aktive
    expect(provider.getState().activated).toContain("z-b");
    expect(provider.getState().stopped).toContain("z-a");

    // B'nin yaşı aktivasyonda SIFIRLANIR: 9sn sonra C henüz yok, 10. sn'de gelir
    for (let i = 0; i < 9; i++) v = provider.tick(v, 1);
    expect(provider.getState().activated).not.toContain("z-c");
    provider.tick(v, 1);
    expect(provider.getState().activated).toContain("z-c");
    expect(provider.getState().stopped).toContain("z-b");
  });

  test("stopped (devredilmiş) faza müdahale işlemez — isPhaseHalted false kalır, recovery yok", () => {
    // Eski bug: applyIntervention stopped kontrolü yapmıyordu → terminal faz
    // 'halted'a giriyor, isPhaseHalted true dönüyordu (oskültasyon
    // resolved_sound terminal fazda yanlış tetiklenebilirdi). Düzeltme:
    // stopped faz müdahaleyle halted olamaz.
    const provider = createSimplePhysiologyProvider(
      makeScenario([{ ...ESC_PHASE_A, recovery_trends: [{ vital: "bp_systolic", delta_per_sec: 4, ceiling: 112 }] }, ESC_PHASE_B])
    );
    let v = BASE_VITALS;
    for (let i = 0; i < 31; i++) v = provider.tick(v, 1); // handoff: faz-a stopped
    expect(provider.getState().stopped).toContain("faz-a");

    provider.applyIntervention(v, { type: "give_medication", target_id: "adrenalin" });
    expect(provider.isPhaseHalted("faz-a")).toBe(false); // terminal faz halted OLMAZ

    const bpBefore = v.bp_systolic;
    v = provider.tick(v, 10);
    expect(v.bp_systolic).toBe(bpBefore); // recovery uygulanmaz — stopped terminal
  });
});

// ------------------------------------------------------------
// getActivePhaseSignal — sentetik fixture (STEMI senaryosuna bağımsız)
// ------------------------------------------------------------

const SIG_LOW: DeteriorationPhase = {
  id: "sig-dusuk",
  trends: [{ vital: "bp_systolic", delta_per_sec: -1, floor: 60 }],
  halted_by: [{ type: "give_medication", target_id: "adrenalin" }],
  signal: {
    ekg: "st_elevation",
    heart_sound: "normal",
    narration: "İskemi anlatımı",
  },
};
const SIG_HIGH: DeteriorationPhase = {
  id: "sig-yuksek",
  trends: [{ vital: "hr", delta_per_sec: -2, floor: 0 }],
  halted_by: [{ type: "use_equipment", target_id: "defibrillator" }],
  signal: {
    ekg: "vfib",
    heart_sound: "silent",
    ekg_late: "asystole",
    heart_sound_late: "silent",
    ekg_late_after_sec: 45,
    visual: { breath_stopped: true },
  },
};

describe("getActivePhaseSignal — dominant faz seçimi", () => {
  test("hiç signal'li faz yoksa null (eski senaryolar etkilenmez)", () => {
    const noSignal = createSimplePhysiologyProvider(makeScenario([SIMPLE_PHASE]));
    expect(noSignal.getActivePhaseSignal!(BASE_VITALS)).toBeNull();

    const empty = createSimplePhysiologyProvider(makeScenario([]));
    expect(empty.getActivePhaseSignal!(BASE_VITALS)).toBeNull();
  });

  test("tek aktif faz → spec alanları çözülmüş sinyal döner", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([SIG_LOW]));
    const sig = provider.getActivePhaseSignal!(BASE_VITALS)!;
    expect(sig).toMatchObject({
      phaseId: "sig-dusuk",
      phaseIndex: 0,
      ekg: "st_elevation",
      heartSound: "normal",
      recovering: false,
      narration: "İskemi anlatımı",
    });
    expect(sig.visual).toEqual({}); // spec.visual yok → boş obje
  });

  test("iki aktif signal'li faz → en YÜKSEK index'li dominant", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIG_LOW, SIG_HIGH])
    );
    const sig = provider.getActivePhaseSignal!(BASE_VITALS)!;
    expect(sig.phaseId).toBe("sig-yuksek");
    expect(sig.phaseIndex).toBe(1);
    expect(sig.ekg).toBe("vfib");
    expect(sig.visual).toEqual({ breath_stopped: true });
  });

  test("signal'siz faz index'i yüksek olsa da dominant sayılmaz", () => {
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIG_LOW, SIMPLE_PHASE]) // SIMPLE_PHASE'in signal'i yok
    );
    const sig = provider.getActivePhaseSignal!(BASE_VITALS)!;
    expect(sig.phaseId).toBe("sig-dusuk");
  });

  test("handoff sonrası stopped faz dominant seçilmez", () => {
    const withEsc: DeteriorationPhase = {
      ...SIG_LOW,
      escalations: [{ to_phase_id: "sig-yuksek", after_sec: 30, halt_self: true }],
    };
    const provider = createSimplePhysiologyProvider(
      makeScenario([withEsc, SIG_HIGH])
    );
    // Başta hedef inaktif → dominant düşük faz
    expect(provider.getActivePhaseSignal!(BASE_VITALS)!.phaseId).toBe("sig-dusuk");

    let v = BASE_VITALS;
    for (let i = 0; i < 31; i++) v = provider.tick(v, 1); // handoff
    const sig = provider.getActivePhaseSignal!(v)!;
    expect(sig.phaseId).toBe("sig-yuksek");
    expect(sig.recovering).toBe(false);
  });
});

describe("getActivePhaseSignal — ekg_late faz içi evrim", () => {
  test("faz yaşı < ekg_late_after_sec → erken patern; eşikte geç paterne geçer", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([SIG_HIGH]));
    let v = provider.tick(BASE_VITALS, 44); // yaş 44 < 45
    expect(provider.getActivePhaseSignal!(v)!.ekg).toBe("vfib");

    v = provider.tick(v, 1); // yaş 45 ≥ 45
    const late = provider.getActivePhaseSignal!(v)!;
    expect(late.ekg).toBe("asystole");
    expect(late.heartSound).toBe("silent"); // heart_sound_late
  });

  test("ekg_late tanımsızsa yaş ne olursa olsun temel patern sürer", () => {
    const provider = createSimplePhysiologyProvider(makeScenario([SIG_LOW]));
    const v = provider.tick(BASE_VITALS, 500);
    expect(provider.getActivePhaseSignal!(v)!.ekg).toBe("st_elevation");
  });
});

describe("getActivePhaseSignal — recovering (reperfüzyon) kolu", () => {
  function haltedProvider() {
    const provider = createSimplePhysiologyProvider(makeScenario([SIG_LOW]));
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    return provider;
  }

  test("halted dominant faz → phaseId 'recovering', phaseIndex -2, recovering true", () => {
    const provider = haltedProvider();
    const sig = provider.getActivePhaseSignal!(BASE_VITALS)!;
    expect(sig.phaseId).toBe("recovering");
    expect(sig.phaseIndex).toBe(-2);
    expect(sig.recovering).toBe(true);
    expect(sig.heartSound).toBe("normal");
    expect(sig.visual).toEqual({});
  });

  test("vitaller toparlanmadıysa ST elevasyonu sürer (yavaş rezolüsyon)", () => {
    const provider = haltedProvider();
    // BASE_VITALS: SBP 78 < 115, HR 128 > 95 → toparlanmadı
    expect(provider.getActivePhaseSignal!(BASE_VITALS)!.ekg).toBe("st_elevation");
  });

  test("eşik SINIRLARI: SBP ≥115 VE HR ≤95 tam sınırda sinüse döner", () => {
    const provider = haltedProvider();
    const tam = { ...BASE_VITALS, bp_systolic: 115, hr: 95 };
    expect(provider.getActivePhaseSignal!(tam)!.ekg).toBe("sinus");

    // Tek eşik yetmez:
    const dusukSbp = { ...BASE_VITALS, bp_systolic: 114, hr: 95 };
    expect(provider.getActivePhaseSignal!(dusukSbp)!.ekg).toBe("st_elevation");

    const yuksekHr = { ...BASE_VITALS, bp_systolic: 115, hr: 96 };
    expect(provider.getActivePhaseSignal!(yuksekHr)!.ekg).toBe("st_elevation");
  });

  test("halted yüksek-index faza rağmen kötüleşen düşük-index faz sinyali kazanır — yanıltıcı 'recovering' yok", () => {
    // Eski bug: dominant seçim halted fazı dışlamıyordu → yüksek-index faz
    // durdurulunca düşük-index faz hâlâ kötüleşirken monitör 'recovering'
    // gösteriyordu. Düzeltme: en kötü AKTİF (halted olmayan) süreç kazanır;
    // recovering koluna ancak kötüleşen sinyal fazı kalmayınca girilir.
    const provider = createSimplePhysiologyProvider(
      makeScenario([SIG_LOW, SIG_HIGH])
    );
    provider.applyIntervention(BASE_VITALS, {
      type: "use_equipment",
      target_id: "defibrillator",
    }); // sadece sig-yuksek halted; sig-dusuk hâlâ aktif kötüleşiyor
    const sig = provider.getActivePhaseSignal!(BASE_VITALS)!;
    expect(sig.phaseId).toBe("sig-dusuk"); // kötüleşen süreç monitörü belirler
    expect(sig.ekg).toBe("st_elevation");
    expect(sig.recovering).toBe(false);
    expect(provider.isPhaseHalted("sig-dusuk")).toBe(false);

    // İkinci müdahale sig-dusuk'u da durdurunca artık recovering'e geçilir:
    provider.applyIntervention(BASE_VITALS, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    const sig2 = provider.getActivePhaseSignal!(BASE_VITALS)!;
    expect(sig2.phaseId).toBe("recovering");
    expect(sig2.recovering).toBe(true);
  });
});
