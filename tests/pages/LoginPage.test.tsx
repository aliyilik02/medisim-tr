// ============================================================
// LoginPage — render + validation (Tier-2 inc-2)
// ============================================================

import { describe, expect, test, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/api/auth", () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  loginStudent: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
  submitConsent: vi.fn(),
}));

import * as authApi from "@/api/auth";
const mockLogin = authApi.login as Mock;
const mockLoginStudent = authApi.loginStudent as Mock;

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: null,
    status: "unauthenticated",
    consentGiven: false,
    error: null,
  });
});

describe("LoginPage render", () => {
  test("e-posta + şifre alanları ve giriş butonu var", () => {
    renderLogin();
    expect(screen.getByLabelText("E-posta")).toBeInTheDocument();
    expect(screen.getByLabelText("Şifre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /giriş yap/i })).toBeInTheDocument();
  });

  test("kayıt moduna geçince davet kodu alanı çıkar", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /davet kodu ile kayıt/i }));
    expect(screen.getByLabelText("Davet Kodu")).toBeInTheDocument();
    expect(screen.getByLabelText(/takma ad/i)).toBeInTheDocument();
  });

  test("öğrenci moduna geçince kurum kodu + kullanıcı adı çıkar, e-posta gizlenir", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /öğrenci girişi/i }));
    expect(screen.getByLabelText("Kurum Kodu")).toBeInTheDocument();
    expect(screen.getByLabelText("Kullanıcı Adı")).toBeInTheDocument();
    expect(screen.queryByLabelText("E-posta")).not.toBeInTheDocument();
  });
});

describe("LoginPage validation", () => {
  test("geçersiz e-posta hata gösterir, login çağrılmaz", async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText("E-posta"), {
      target: { value: "gecersiz" },
    });
    fireEvent.change(screen.getByLabelText("Şifre"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/geçerli bir e-posta/i);
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test("geçerli giriş login() çağırır", async () => {
    mockLogin.mockResolvedValue({
      id: "u1",
      role: "instructor",
      handle: "dr",
      email: "dr@k.tr",
      institution_id: "i1",
      consent: true,
    });
    renderLogin();
    fireEvent.change(screen.getByLabelText("E-posta"), {
      target: { value: "dr@kurum.edu.tr" },
    });
    fireEvent.change(screen.getByLabelText("Şifre"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith("dr@kurum.edu.tr", "secret123"),
    );
  });

  test("öğrenci modu loginStudent(kurum, handle, şifre) çağırır", async () => {
    mockLoginStudent.mockResolvedValue({
      id: "s1",
      role: "student",
      handle: "ogr_01",
      email: null,
      institution_id: "i1",
      consent: false,
    });
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /öğrenci girişi/i }));
    fireEvent.change(screen.getByLabelText("Kurum Kodu"), { target: { value: "Ege-Tip" } });
    fireEvent.change(screen.getByLabelText("Kullanıcı Adı"), { target: { value: "ogr_01" } });
    fireEvent.change(screen.getByLabelText("Şifre"), { target: { value: "parola1" } });
    fireEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    await waitFor(() =>
      expect(mockLoginStudent).toHaveBeenCalledWith("ege-tip", "ogr_01", "parola1"),
    );
  });
});
