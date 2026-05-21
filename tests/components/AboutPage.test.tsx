// ============================================================
// AboutPage — Unit testler (Sprint B.5+)
// ============================================================
// /hakkinda sayfası — CC BY/BY-SA görünür atıf gereksinimi, disclaimer,
// klinik standartlar, KVKK referans.
// ============================================================

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "@/pages/AboutPage";

function renderAbout() {
  return render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );
}

describe("AboutPage — temel render", () => {
  test("başlık ve misyon paragrafı görünür", () => {
    renderAbout();
    expect(
      screen.getByText(/Türkiye'ye özel sanal hasta simülasyon platformu/i),
    ).toBeInTheDocument();
  });

  test("disclaimer ribbon görünür (eğitim amaçlı)", () => {
    renderAbout();
    expect(screen.getByTestId("about-disclaimer")).toBeInTheDocument();
    // "Eğitim amaçlıdır" birden fazla yerde (ribbon + footer); en az 1 yerde olsun
    expect(screen.getAllByText(/Eğitim amaçlıdır/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Klinik karar destek aracı değildir/i),
    ).toBeInTheDocument();
  });
});

describe("AboutPage — atıflar (CC BY/BY-SA)", () => {
  test("12+ attribution-item render edilir", () => {
    renderAbout();
    const items = screen.getAllByTestId("attribution-item");
    expect(items.length).toBeGreaterThanOrEqual(12);
  });

  test("3D model atıfları (chuma6oy + MaceLogice + Z-Anatomy)", () => {
    renderAbout();
    expect(screen.getByText(/chuma6oy/i)).toBeInTheDocument();
    expect(screen.getByText(/MaceLogice/i)).toBeInTheDocument();
    expect(screen.getByText(/Z-Anatomy/i)).toBeInTheDocument();
  });

  test("Wikimedia ses atıfları (Wheeze2O + Crackles + Heartbeat)", () => {
    renderAbout();
    expect(screen.getByText(/Wheeze2O/i)).toBeInTheDocument();
    expect(screen.getByText(/Crackles in pneumonia/i)).toBeInTheDocument();
    expect(screen.getByText(/Heartbeat/i)).toBeInTheDocument();
  });

  test("Font atıfları (Instrument Serif + Geist)", () => {
    renderAbout();
    expect(screen.getByText(/Instrument Serif/i)).toBeInTheDocument();
    expect(screen.getByText(/Geist/i)).toBeInTheDocument();
  });

  test("Yazılım atıfları (React + Three.js + Tailwind + Lucide)", () => {
    renderAbout();
    expect(screen.getAllByText(/Three\.js/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tailwind/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lucide/i).length).toBeGreaterThan(0);
  });
});

describe("AboutPage — klinik standartlar", () => {
  test("PALS 2015 + Calgary-Cambridge + TCCC v5 + TA2-2019", () => {
    renderAbout();
    expect(screen.getByText(/PALS 2015/i)).toBeInTheDocument();
    // Calgary-Cambridge — hem misyon paragrafında hem grid'de geçer
    expect(screen.getAllByText(/Calgary-Cambridge/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/TCCC Handbook v5/i)).toBeInTheDocument();
    expect(screen.getByText(/TA2-2019/i)).toBeInTheDocument();
  });

  test("KVKK 6698 + ICD-10/SNOMED CT + UÇEP-2020", () => {
    renderAbout();
    expect(screen.getAllByText(/KVKK 6698/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ICD-10/i)).toBeInTheDocument();
    expect(screen.getByText(/UÇEP-2020/i)).toBeInTheDocument();
  });
});

describe("AboutPage — link davranışları", () => {
  test("Ana sayfa linkleri href=/", () => {
    renderAbout();
    const homeLinks = screen.getAllByRole("link", { name: /Ana Sayfa/i });
    expect(homeLinks.length).toBeGreaterThan(0);
    homeLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/");
    });
  });

  test("CC BY 4.0 lisans linkleri target=_blank", () => {
    renderAbout();
    const ccLinks = screen.getAllByRole("link", { name: /CC BY 4\.0/i });
    expect(ccLinks.length).toBeGreaterThan(0);
    ccLinks.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringMatching(/noopener|noreferrer/));
    });
  });

  test("KVKK ÜYZ Rehberi linki kvkk.gov.tr'ye", () => {
    renderAbout();
    const uyzLink = screen.getByRole("link", { name: /ÜYZ Rehberi/i });
    expect(uyzLink).toHaveAttribute("href", expect.stringMatching(/kvkk\.gov\.tr/));
    expect(uyzLink).toHaveAttribute("target", "_blank");
  });
});

describe("AboutPage — Stack bilgisi", () => {
  test("Frontend / Backend & AI / Test & Build kategorileri", () => {
    renderAbout();
    expect(screen.getByText(/^Frontend$/)).toBeInTheDocument();
    expect(screen.getByText(/Backend & AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Test & Build/i)).toBeInTheDocument();
  });
});
