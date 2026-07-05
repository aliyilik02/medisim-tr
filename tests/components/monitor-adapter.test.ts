// ============================================================
// Monitör adaptörü — arrest fizyolojik kuralları + DBP invaryantı
// ============================================================
// STEMI görsel kanıt paketinin 3 kozmetik boşluğundan 2'sinin kanıtı:
// 1. Arrest ritminde (vfib/asystole/pea) RR→0 (apne) ve EtCO₂→0 (perfüzyon
//    kaybı) — monitör asistolide RR 20 / EtCO₂ 35 göstermesin.
// 2. Diastolik sistoliği aşamaz — SBP 0'a inerken DBP 92'de donmasın.
// Kurallar senaryodan bağımsız (adapter katmanı), klinik trend gerektirmez.
// ============================================================

import { describe, expect, test } from "vitest";
import { patientVitalsToMonitor } from "@/components/monitor/adapter";
import type { PatientVitals } from "@/engine";

const BASE: PatientVitals = {
  hr: 98,
  bp_systolic: 148,
  bp_diastolic: 92,
  rr: 20,
  spo2: 96,
  temp: 36.8,
};

describe("patientVitalsToMonitor — arrest ritmi kuralları", () => {
  test.each(["vfib", "asystole", "pea"] as const)(
    "%s ritminde RR 0 (apne) ve EtCO₂ 0 (perfüzyon kaybı)",
    (pattern) => {
      const m = patientVitalsToMonitor({ ...BASE, etco2: 35 }, pattern);
      expect(m.rr).toBe(0); // monitör RR<2'yi "--" gösterir
      expect(m.etco2).toBe(0);
    }
  );

  test("arrest DIŞI ritimde RR ve EtCO₂ ham geçer", () => {
    const m = patientVitalsToMonitor({ ...BASE, etco2: 38 }, "st_elevation");
    expect(m.rr).toBe(20);
    expect(m.etco2).toBe(38);
  });

  test("etco2 tanımsızsa arrest dışında varsayılan 35, arrestte 0", () => {
    expect(patientVitalsToMonitor(BASE, "sinus").etco2).toBe(35);
    expect(patientVitalsToMonitor(BASE, "asystole").etco2).toBe(0);
  });

  test("vt_salvo arrest sayılmaz — nabızlı VT'de solunum sürer", () => {
    const m = patientVitalsToMonitor(BASE, "vt_salvo");
    expect(m.rr).toBe(20);
  });
});

describe("patientVitalsToMonitor — diastolik ≤ sistolik invaryantı", () => {
  test("normal durumda DBP değişmez", () => {
    expect(patientVitalsToMonitor(BASE, "sinus").dbp).toBe(92);
  });

  test("SBP diastoliğin altına inince DBP sistolikle birlikte düşer", () => {
    // STEMI arrest: bp_systolic trendi 0'a iner, diastolik trend yok
    const m = patientVitalsToMonitor(
      { ...BASE, bp_systolic: 33, bp_diastolic: 92 },
      "vfib"
    );
    expect(m.dbp).toBe(33); // 92'de donmaz
    expect(m.sbp).toBe(33);
  });

  test("SBP 0'da DBP de 0 → monitör her ikisini '--' gösterir (dbp<20)", () => {
    const m = patientVitalsToMonitor(
      { ...BASE, bp_systolic: 0, bp_diastolic: 92 },
      "asystole"
    );
    expect(m.dbp).toBe(0);
  });
});

describe("patientVitalsToMonitor — mevcut davranış korunumu", () => {
  test("ST elevasyon paternleri st=0.18 üretmeye devam eder", () => {
    expect(patientVitalsToMonitor(BASE, "st_elevation").st).toBe(0.18);
    expect(patientVitalsToMonitor(BASE, "st_elev_pvc").st).toBe(0.18);
  });

  test("ritim eşlemesi değişmedi: vfib→vfib, asystole→asystole, bilinmeyen→sinus", () => {
    expect(patientVitalsToMonitor(BASE, "vfib").rhythm).toBe("vfib");
    expect(patientVitalsToMonitor(BASE, "asystole").rhythm).toBe("asystole");
    expect(patientVitalsToMonitor(BASE, "bilinmeyen-patern").rhythm).toBe("sinus");
  });
});
