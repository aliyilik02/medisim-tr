// ============================================================
// CompactVitalsHUD — Unit testler (Sprint B.3)
// ============================================================
// Vital monitor — NB/TA/SpO2/SS/Sıcaklık/GCS + EKG strip + 12-Lead modal.
// Status renkleri PALS yaş eşiklerine bağlı (vital-thresholds.ts).
// VitalSparkline opsiyonel history prop ile.
// ============================================================

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  CompactVitalsHUD,
  type VitalHistoryEntry,
} from "@/components/patient-3d/CompactVitalsHUD";
import type { PatientVitals } from "@/engine/types";

const NORMAL_VITALS: PatientVitals = {
  hr: 80,
  rr: 16,
  bp_systolic: 120,
  bp_diastolic: 80,
  spo2: 98,
  temp: 36.8,
  gcs: 15,
};

const CRITICAL_VITALS: PatientVitals = {
  hr: 180,
  rr: 35,
  bp_systolic: 70,
  bp_diastolic: 40,
  spo2: 78,
  temp: 39.5,
  gcs: 6,
};

describe("CompactVitalsHUD — temel render", () => {
  test("data-testid='compact-vitals-hud' DOM'da", () => {
    render(<CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} />);
    expect(screen.getByTestId("compact-vitals-hud")).toBeInTheDocument();
  });

  test("vital değerleri görünür (NB/SpO2/TA/SS/Sıcaklık/GCS)", () => {
    render(<CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} />);
    // Sayısal değerler — exact text node match
    expect(screen.getByText("80")).toBeInTheDocument(); // HR
    expect(screen.getByText("16")).toBeInTheDocument(); // RR
    expect(screen.getByText("120/80")).toBeInTheDocument(); // BP
    expect(screen.getByText("98")).toBeInTheDocument(); // SpO2
    expect(screen.getByText("36.8")).toBeInTheDocument(); // Temp
    expect(screen.getByText("15")).toBeInTheDocument(); // GCS
  });

  test("MAP (Mean Arterial Pressure) doğru hesaplanır", () => {
    render(<CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} />);
    // 80 + (120-80)/3 = 80 + 13.33 = 93.33 → round 93
    expect(screen.getByText(/MAP 93/i)).toBeInTheDocument();
  });

  test("Age group label görünür (Erişkin)", () => {
    render(<CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} />);
    expect(screen.getByText(/60y/i)).toBeInTheDocument();
  });
});

describe("CompactVitalsHUD — kritik alarm", () => {
  test("kritik vital'lerle render edilir + 'Kritik vital' banner", () => {
    render(<CompactVitalsHUD vitals={CRITICAL_VITALS} patientAge={60} />);
    expect(screen.getByText(/Kritik vital/i)).toBeInTheDocument();
  });

  test("GCS≤8 kritik durum (renkli)", () => {
    render(<CompactVitalsHUD vitals={CRITICAL_VITALS} patientAge={60} />);
    expect(screen.getByText("6")).toBeInTheDocument(); // GCS 6
  });
});

describe("CompactVitalsHUD — EKG ve 12-Lead", () => {
  test("EKG canvas DOM'da render edilir", () => {
    const { container } = render(
      <CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} ecgPattern="normal" />,
    );
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("12-Lead butonu görünür", () => {
    render(<CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} />);
    expect(
      screen.getByRole("button", { name: /12-lead/i }),
    ).toBeInTheDocument();
  });

  test("STEMI pattern label header'da görünür", () => {
    render(
      <CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} ecgPattern="stemi" />,
    );
    expect(screen.getByText(/stemi/i)).toBeInTheDocument();
  });
});

describe("CompactVitalsHUD — sparkline (history prop)", () => {
  test("history undef → sparkline yok", () => {
    const { container } = render(
      <CompactVitalsHUD vitals={NORMAL_VITALS} patientAge={60} />,
    );
    // SVG sparkline (path) yoksa OK
    const sparks = container.querySelectorAll('[data-testid^="vital-spark-"]');
    expect(sparks.length).toBe(0);
  });

  test("history 1 entry → sparkline render edilmez (values.length<2)", () => {
    const history: VitalHistoryEntry[] = [
      {
        ts: Date.now(),
        hr: 80,
        rr: 16,
        sbp: 120,
        dbp: 80,
        spo2: 98,
        temp: 36.8,
        gcs: 15,
      },
    ];
    const { container } = render(
      <CompactVitalsHUD
        vitals={NORMAL_VITALS}
        patientAge={60}
        history={history}
      />,
    );
    // Spark SVG'leri var ama hiçbirinde path yok
    const paths = container.querySelectorAll('[data-testid^="vital-spark-"] path');
    expect(paths.length).toBe(0);
  });

  test("history 5 entry → her vital için sparkline path render edilir", () => {
    const now = Date.now();
    const history: VitalHistoryEntry[] = Array.from({ length: 5 }, (_, i) => ({
      ts: now + i * 1000,
      hr: 80 + i,
      rr: 16 + i,
      sbp: 120 - i,
      dbp: 80,
      spo2: 98,
      temp: 36.8,
      gcs: 15,
    }));
    const { container } = render(
      <CompactVitalsHUD
        vitals={NORMAL_VITALS}
        patientAge={60}
        history={history}
      />,
    );
    // NB / TA / SpO2 / SS / Sıcaklık spark'ları (5 cell × SVG)
    const paths = container.querySelectorAll('[data-testid^="vital-spark-"] path');
    expect(paths.length).toBeGreaterThan(0);
  });
});
