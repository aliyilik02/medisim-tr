// ============================================================
// Muayene arayüzü — ABCDE çubuğu + bulgu kartı (tetik yüzeyi)
// ============================================================
// Klinik çözüm motor testinde (tests/engine/exam.test.ts); burada yalnız
// kullanıcının gördüğü/dokunduğu yüzey doğrulanır.

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AbcdeBar } from "@/components/exam/AbcdeBar";
import { ExamFindingCard } from "@/components/exam/ExamFindingCard";
import { examCoverage, resolveExamFinding } from "@/engine";
import type { PatientVitals } from "@/engine";
import { STEMI_EXAM } from "@/data/exam/stemi-exam";
import { heartSoundFile } from "@/components/patient-3d/auscultationAudio";

const VITALS: PatientVitals = {
  hr: 98, bp_systolic: 148, bp_diastolic: 92, spo2: 96, temp: 36.8, rr: 20, gcs: 15,
};
const point = (id: string) => STEMI_EXAM.points.find((p) => p.id === id)!;

describe("AbcdeBar", () => {
  test("beş basamak + sayım + süre; harf seçimi bildirilir", () => {
    const onChange = vi.fn();
    render(
      <AbcdeBar
        coverage={examCoverage(STEMI_EXAM, ["hava-yolu"])}
        active="A"
        onChange={onChange}
        suggested="B"
        elapsedSec={75}
      />,
    );
    expect(screen.getByTestId("abcde-A")).toHaveTextContent("1/1");
    expect(screen.getByTestId("abcde-C")).toHaveTextContent("0/6");
    expect(screen.getByTestId("exam-elapsed")).toHaveTextContent("01:15");
    expect(screen.getByTestId("abcde-A")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("abcde-C"));
    expect(onChange).toHaveBeenCalledWith("C");
    fireEvent.click(screen.getByTestId("abcde-all"));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  test("2B yedek yolu: nokta düğmeleri tıklanınca id bildirilir", () => {
    const onChip = vi.fn();
    render(
      <AbcdeBar
        coverage={examCoverage(STEMI_EXAM, [])}
        active="D"
        onChange={() => undefined}
        suggested="A"
        elapsedSec={0}
        chips={[{ id: "pupiller", label: "Göz bebekleri", done: false }]}
        onChipSelect={onChip}
      />,
    );
    fireEvent.click(screen.getByTestId("exam-chip-pupiller"));
    expect(onChip).toHaveBeenCalledWith("pupiller");
  });
});

describe("ExamFindingCard", () => {
  test("normal bulgu: metin + yeniden dinle; kapat çalışır", () => {
    const onClose = vi.fn();
    const onReplay = vi.fn();
    const f = resolveExamFinding(point("kalp-apeks"), { phaseId: "stemi-iskemi", heartSound: "normal" }, VITALS, heartSoundFile);
    render(<ExamFindingCard finding={f} onClose={onClose} onReplaySound={onReplay} />);
    expect(screen.getByTestId("exam-finding-card")).toHaveAttribute("data-abnormal", "0");
    expect(screen.getByTestId("exam-finding-text")).toHaveTextContent("98/dk");
    fireEvent.click(screen.getByTestId("exam-finding-replay"));
    expect(onReplay).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("exam-finding-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("arrest: patolojik işaretli, 'Ses yok', yeniden dinle YOK", () => {
    const f = resolveExamFinding(point("kalp-apeks"), { phaseId: "stemi-arrest", heartSound: "silent" }, VITALS, heartSoundFile);
    render(<ExamFindingCard finding={f} onClose={() => undefined} />);
    expect(screen.getByTestId("exam-finding-card")).toHaveAttribute("data-abnormal", "1");
    expect(screen.getByText("Ses yok")).toBeInTheDocument();
    expect(screen.queryByTestId("exam-finding-replay")).toBeNull();
  });

  test("ses kaydı olmayan bulguda ses satırı hiç çıkmaz", () => {
    const f = resolveExamFinding(point("nabiz-radial"), null, VITALS, heartSoundFile);
    render(<ExamFindingCard finding={f} onClose={() => undefined} />);
    expect(screen.queryByText("Ses yok")).toBeNull();
    expect(screen.queryByTestId("exam-finding-replay")).toBeNull();
  });

  test("göz bebeği ve kapiller dolum yakın görselleri çizilir", () => {
    const pup = resolveExamFinding(point("pupiller"), null, VITALS, heartSoundFile);
    const { unmount } = render(<ExamFindingCard finding={pup} onClose={() => undefined} />);
    expect(screen.getByTestId("exam-visual-pupil")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("exam-pupil-light"));
    unmount();

    const crt = resolveExamFinding(point("kapiller-dolum"), null, VITALS, heartSoundFile);
    render(<ExamFindingCard finding={crt} onClose={() => undefined} />);
    const box = screen.getByTestId("exam-visual-caprefill");
    expect(box).toHaveAttribute("data-stage", "idle");
    fireEvent.click(screen.getByTestId("exam-caprefill-press"));
    expect(box).toHaveAttribute("data-stage", "pressing");
  });
});
