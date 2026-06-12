// ============================================================
// PulsePhysiologyProvider İSKELET testleri — Faz 3 swap-noktası kanıtı
// ============================================================
// Doğrulanan: (1) Pulse state → vitals map'i doğru birim çevirir,
// (2) ActionRef → Pulse mesaj map'i, (3) WS yokken Simple'a delege
// ederek Faz 1 senaryosunu BOZMADAN aynı arayüzü sunar.
import { describe, expect, test } from "vitest";
import {
  createPulsePhysiologyProvider,
  createSimplePhysiologyProvider,
  mapPulseStateToVitals,
  mapActionToPulse,
} from "@/engine";
import type { PatientVitals, PulsePatientState } from "@/engine";
import { getScenario } from "../helpers/all-scenarios";

const anaflaksi = getScenario("acil-anaflaksi-001");
if (!anaflaksi) throw new Error("Anaflaksi senaryosu bulunamadı");

const BASE: PatientVitals = {
  hr: 80,
  bp_systolic: 120,
  bp_diastolic: 80,
  spo2: 98,
  temp: 36.8,
  rr: 14,
};

describe("mapPulseStateToVitals — birim çevirimi", () => {
  test("SI/fraksiyon değerlerini UI birimine çevirir", () => {
    const state: PulsePatientState = {
      HeartRate_per_min: 128.4,
      SystolicArterialPressure_mmHg: 78.9,
      DiastolicArterialPressure_mmHg: 44.2,
      OxygenSaturation: 0.881, // fraction → %
      RespirationRate_per_min: 30.2,
      CoreTemperature_C: 36.84,
      EndTidalCarbonDioxidePressure_mmHg: 33.6,
    };
    const v = mapPulseStateToVitals(BASE, state);
    expect(v.hr).toBe(128);
    expect(v.bp_systolic).toBe(79);
    expect(v.bp_diastolic).toBe(44);
    expect(v.spo2).toBe(88);
    expect(v.rr).toBe(30);
    expect(v.temp).toBe(36.8);
    expect(v.etco2).toBe(34);
  });

  test("eksik alanlar mevcut vitalden korunur", () => {
    const v = mapPulseStateToVitals(BASE, { HeartRate_per_min: 100 });
    expect(v.hr).toBe(100);
    expect(v.bp_systolic).toBe(120); // dokunulmadı
    expect(v.spo2).toBe(98);
  });
});

describe("mapActionToPulse — aksiyon sözleşmesi", () => {
  test("bilinen ilaç → substance_bolus + Pulse substance adı", () => {
    const msg = mapActionToPulse({
      type: "give_medication",
      target_id: "adrenalin",
      site: "im_uyluk",
    });
    expect(msg.kind).toBe("substance_bolus");
    expect(msg.substance).toBe("Epinephrine");
  });

  test("haritada olmayan aksiyon → raw", () => {
    const msg = mapActionToPulse({ type: "examine", target_id: "stetoskop" });
    expect(msg.kind).toBe("raw");
    expect(msg.substance).toBeUndefined();
  });
});

describe("createPulsePhysiologyProvider — offline delege (WS yok)", () => {
  test("wsUrl verilmezse Simple ile AYNI davranır (arayüz uyumu)", () => {
    const pulse = createPulsePhysiologyProvider(anaflaksi);
    const simple = createSimplePhysiologyProvider(anaflaksi);

    const pTick = pulse.tick(anaflaksi.initial_vitals, 30);
    const sTick = simple.tick(anaflaksi.initial_vitals, 30);
    expect(pTick).toEqual(sTick);
  });

  test("offline halt/recovery durum makinesi fallback'te işler", () => {
    const pulse = createPulsePhysiologyProvider(anaflaksi);
    const t1 = pulse.tick(anaflaksi.initial_vitals, 30);
    expect(t1.bp_systolic).toBeLessThan(anaflaksi.initial_vitals.bp_systolic);

    pulse.applyIntervention(t1, {
      type: "give_medication",
      target_id: "adrenalin",
      site: "im_uyluk",
    });
    expect(pulse.isPhaseHalted("untreated-anaphylaxis")).toBe(true);

    const t2 = pulse.tick(t1, 60);
    expect(t2.bp_systolic).toBeGreaterThan(t1.bp_systolic);
  });

  test("getState fallback durumunu yansıtır", () => {
    const pulse = createPulsePhysiologyProvider(anaflaksi);
    expect(pulse.getState().halted).toEqual([]);
    pulse.applyIntervention(anaflaksi.initial_vitals, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    expect(pulse.getState().halted).toContain("untreated-anaphylaxis");
  });
});

describe("createPulsePhysiologyProvider — sahte WS bağlı", () => {
  // Minimal WebSocket sahtesi — onopen tetikler, mesaj enjekte edilebilir
  class FakeWS {
    static OPEN = 1;
    readyState = 1;
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((ev: { data: string }) => void) | null = null;
    sent: string[] = [];
    constructor(public url: string) {
      // senkron "bağlandı"
      queueMicrotask(() => this.onopen?.());
    }
    send(data: string) {
      this.sent.push(data);
    }
    close() {
      this.readyState = 3;
      this.onclose?.();
    }
    emit(state: PulsePatientState) {
      this.onmessage?.({ data: JSON.stringify(state) });
    }
  }

  test("bağlı + state geldiyse Pulse otoritedir (fallback değil)", async () => {
    let captured: FakeWS | null = null;
    const Impl = class extends FakeWS {
      constructor(url: string) {
        super(url);
        captured = this;
      }
    } as unknown as typeof WebSocket;

    const pulse = createPulsePhysiologyProvider(anaflaksi, {
      wsUrl: "ws://localhost:0/pulse",
      webSocketImpl: Impl,
    });

    // onopen microtask'ını bekle
    await Promise.resolve();
    captured!.emit({ HeartRate_per_min: 70, SystolicArterialPressure_mmHg: 115 });

    // Simple olsaydı kötüleşirdi (SBP düşer); Pulse otoritesi 115 verir
    const v = pulse.tick(anaflaksi.initial_vitals, 30);
    expect(v.bp_systolic).toBe(115);
    expect(v.hr).toBe(70);

    // Aksiyon sidecar'a iletildi
    pulse.applyIntervention(v, {
      type: "give_medication",
      target_id: "adrenalin",
    });
    expect(captured!.sent.length).toBe(1);
    expect(captured!.sent[0]).toContain("Epinephrine");
  });
});
