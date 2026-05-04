// ============================================================
// PatientCard — render + edge case testleri (Faz 10)
// ============================================================

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatientCard } from "@/components/PatientCard";
import type { Patient } from "@/engine";

const basePatient: Patient = {
  age: 62,
  sex: "M",
  weight_kg: 84,
  chief_complaint: "Retrosternal göğüs ağrısı, sol kola yayılan",
  history_items: ["HT 20 yıl", "DM Tip 2", "Sigara 30 paket-yıl"],
  allergies: [],
};

describe("PatientCard — temel render", () => {
  test("yaş + cinsiyet + kilo gösterilir", () => {
    render(<PatientCard patient={basePatient} />);
    expect(screen.getByText(/62 yaş, Erkek/)).toBeInTheDocument();
    expect(screen.getByText(/84 kg/)).toBeInTheDocument();
  });

  test("kadın hasta için cinsiyet etiketi", () => {
    render(<PatientCard patient={{ ...basePatient, sex: "F" }} />);
    expect(screen.getByText(/Kadın/)).toBeInTheDocument();
  });

  test("ana şikayet metni gösterilir", () => {
    render(<PatientCard patient={basePatient} />);
    expect(screen.getByText(/Retrosternal göğüs ağrısı/)).toBeInTheDocument();
  });

  test("history_items hepsi listelenir", () => {
    render(<PatientCard patient={basePatient} />);
    for (const item of basePatient.history_items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });
});

describe("PatientCard — koşullu blok davranışı", () => {
  test("history_items boşsa 'Özgeçmiş' başlığı render edilmez", () => {
    render(<PatientCard patient={{ ...basePatient, history_items: [] }} />);
    expect(screen.queryByText(/Özgeçmiş/)).not.toBeInTheDocument();
  });

  test("alerji yoksa kritik alerji bloğu görünmez", () => {
    render(<PatientCard patient={basePatient} />);
    expect(screen.queryByText(/Alerjiler/)).not.toBeInTheDocument();
  });

  test("alerji varsa kritik renkle uyarı görünür", () => {
    render(
      <PatientCard
        patient={{ ...basePatient, allergies: ["Penisilin", "ASA"] }}
      />
    );
    expect(screen.getByText(/Alerjiler/)).toBeInTheDocument();
    expect(screen.getByText(/Penisilin/)).toBeInTheDocument();
  });
});
