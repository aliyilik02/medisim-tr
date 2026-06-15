// ============================================================
// ProtectedRoute — yönlendirme + KVKK rıza kapısı (Tier-2 inc-2)
// ============================================================

import { describe, expect, test, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";

function renderAt(path = "/gizli") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/gizli"
          element={
            <ProtectedRoute>
              <div>KORUMALI İÇERİK</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>LOGIN SAYFASI</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    status: "loading",
    consentGiven: false,
    error: null,
  });
});

describe("ProtectedRoute", () => {
  test("loading → spinner gösterir, içerik yok", () => {
    useAuthStore.setState({ status: "loading" });
    renderAt();
    expect(screen.getByText(/oturum doğrulanıyor/i)).toBeInTheDocument();
    expect(screen.queryByText("KORUMALI İÇERİK")).not.toBeInTheDocument();
  });

  test("unauthenticated → /login'e yönlendirir", () => {
    useAuthStore.setState({ status: "unauthenticated" });
    renderAt();
    expect(screen.getByText("LOGIN SAYFASI")).toBeInTheDocument();
    expect(screen.queryByText("KORUMALI İÇERİK")).not.toBeInTheDocument();
  });

  test("authenticated ama consent yok → ConsentGate (içerik gizli)", () => {
    useAuthStore.setState({ status: "authenticated", consentGiven: false });
    renderAt();
    expect(screen.getByText(/kvkk aydınlatma ve açık rıza/i)).toBeInTheDocument();
    expect(screen.queryByText("KORUMALI İÇERİK")).not.toBeInTheDocument();
  });

  test("authenticated + consent → içerik görünür", () => {
    useAuthStore.setState({ status: "authenticated", consentGiven: true });
    renderAt();
    expect(screen.getByText("KORUMALI İÇERİK")).toBeInTheDocument();
  });
});
