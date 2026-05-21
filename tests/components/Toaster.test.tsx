// ============================================================
// Toaster — Unit testler (Sprint B.5+)
// ============================================================
// Kapsam:
//   - pushToast() yeni id döner ve subscriber'ı tetikler
//   - dismissToast() entry'yi düşürür
//   - Auto-dismiss timer setTimeout ile çalışır
//   - useToasts hook subscribe + unsubscribe yapar
//   - Toaster component DOM'a render eder
//   - ToastItem 3 saniye sonra otomatik kaybolur
// ============================================================

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  Toaster,
  pushToast,
  dismissToast,
  dismissAllToasts,
  useToasts,
} from "@/components/dialog/Toaster";

// Her test öncesi global state'i temizle (modül singleton)
beforeEach(() => {
  dismissAllToasts();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Toaster — pushToast", () => {
  test("yeni id döner ve subscriber'ı tetikler", () => {
    const { result } = renderToasterAndGetEntries();
    expect(result.current.length).toBe(0);

    let id1: number;
    act(() => {
      id1 = pushToast({ kind: "success", title: "Test 1" });
    });
    expect(typeof id1!).toBe("number");
    expect(result.current.length).toBeGreaterThan(0);

    let id2: number;
    act(() => {
      id2 = pushToast({ kind: "warning", title: "Test 2" });
    });
    expect(id2!).not.toBe(id1!);
  });

  test("varsayılan durationMs 3000ms", () => {
    const { result } = renderToasterAndGetEntries();
    let id: number;
    act(() => {
      id = pushToast({ kind: "info", title: "Default duration" });
    });
    const entry = result.current.find((t) => t.id === id!);
    expect(entry?.durationMs).toBe(3000);
  });

  test("custom durationMs override edilebilir", () => {
    const { result } = renderToasterAndGetEntries();
    let id: number;
    act(() => {
      id = pushToast({ kind: "info", title: "Custom", durationMs: 8000 });
    });
    const entry = result.current.find((t) => t.id === id!);
    expect(entry?.durationMs).toBe(8000);
  });
});

describe("Toaster — dismissToast", () => {
  test("verilen id'li entry'yi listeden düşürür", () => {
    const { result } = renderToasterAndGetEntries();
    let id: number;
    act(() => {
      id = pushToast({ kind: "info", title: "Will be dismissed" });
    });
    expect(result.current.some((t) => t.id === id!)).toBe(true);

    act(() => {
      dismissToast(id!);
    });
    expect(result.current.some((t) => t.id === id!)).toBe(false);
  });

  test("var olmayan id sessiz no-op", () => {
    const { result } = renderToasterAndGetEntries();
    const lenBefore = result.current.length;
    act(() => {
      dismissToast(999_999_999);
    });
    expect(result.current.length).toBe(lenBefore);
  });
});

describe("Toaster — auto-dismiss", () => {
  test("durationMs sonrası entry otomatik silinir", () => {
    vi.useFakeTimers();
    // ToastItem'ın useEffect'i mount edildiğinde setTimeout başlatır.
    // Toaster'ı render et ki ToastItem'lar mount olsun.
    const { result } = renderToasterWithEntries();

    let id: number;
    act(() => {
      id = pushToast({
        kind: "success",
        title: "Auto dismiss",
        durationMs: 500,
      });
    });
    expect(result.current.some((t) => t.id === id!)).toBe(true);

    // 500ms ileri sar — ToastItem useEffect setTimeout tetiklenir
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.some((t) => t.id === id!)).toBe(false);
  });
});

describe("Toaster — component render", () => {
  test("data-testid='toaster' DOM'a render edilir", () => {
    render(<Toaster />);
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  test("entry varsa toast-item render edilir + kind dataset doğru", () => {
    render(<Toaster />);
    act(() => {
      pushToast({
        kind: "critical",
        title: "Kritik!",
        body: "Alerji",
        points: -10,
      });
    });
    const item = screen.getByTestId("toast-item");
    expect(item).toBeInTheDocument();
    expect(item.dataset.toastKind).toBe("critical");
    expect(item.textContent).toContain("Kritik!");
    expect(item.textContent).toContain("-10");
  });
});

// ============================================================
// Test helpers
// ============================================================
// useToasts hook'unu izole render edip referans tut (ToastItem yok,
// auto-dismiss timer çalışmaz — state-only testler için)
function renderToasterAndGetEntries(): {
  result: { current: ReturnType<typeof useToasts> };
} {
  const result: { current: ReturnType<typeof useToasts> } = {
    current: [] as ReturnType<typeof useToasts>,
  };
  function Probe() {
    result.current = useToasts();
    return null;
  }
  render(<Probe />);
  return { result };
}

// Toaster component + probe — auto-dismiss test'leri için ToastItem'lar
// mount edilir, useEffect setTimeout'ları başlar.
function renderToasterWithEntries(): {
  result: { current: ReturnType<typeof useToasts> };
} {
  const result: { current: ReturnType<typeof useToasts> } = {
    current: [] as ReturnType<typeof useToasts>,
  };
  function Probe() {
    result.current = useToasts();
    return null;
  }
  render(
    <>
      <Probe />
      <Toaster />
    </>,
  );
  return { result };
}
