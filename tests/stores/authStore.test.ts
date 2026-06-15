// ============================================================
// authStore — durum geçişleri (Tier-2 inc-2)
// ============================================================

import { describe, expect, test, vi, beforeEach, type Mock } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import type { UserPublic } from "@/api/auth";

// API katmanını mock'la — gerçek fetch çağrılmaz.
vi.mock("@/api/auth", () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
  submitConsent: vi.fn(),
}));

import * as authApi from "@/api/auth";

const mockGetMe = authApi.getMe as Mock;
const mockLogin = authApi.login as Mock;
const mockLogout = authApi.logout as Mock;
const mockConsent = authApi.submitConsent as Mock;

const USER: UserPublic = {
  id: "u1",
  role: "instructor",
  handle: "dr_test",
  email: "dr@kurum.edu.tr",
  institution_id: "i1",
  consent: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Store'u başlangıç durumuna döndür (modül singleton).
  useAuthStore.setState({
    user: null,
    status: "loading",
    consentGiven: false,
    error: null,
  });
});

describe("checkAuth", () => {
  test("oturum varsa authenticated + consent yansıtılır", async () => {
    mockGetMe.mockResolvedValue({ ...USER, consent: true });
    await useAuthStore.getState().checkAuth();
    const s = useAuthStore.getState();
    expect(s.status).toBe("authenticated");
    expect(s.user?.handle).toBe("dr_test");
    expect(s.consentGiven).toBe(true);
  });

  test("oturum yoksa (null) unauthenticated", async () => {
    mockGetMe.mockResolvedValue(null);
    await useAuthStore.getState().checkAuth();
    const s = useAuthStore.getState();
    expect(s.status).toBe("unauthenticated");
    expect(s.user).toBeNull();
  });

  test("backend hatası → çökme yok, unauthenticated", async () => {
    mockGetMe.mockRejectedValue(new Error("network"));
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });
});

describe("login", () => {
  test("başarılı login authenticated yapar", async () => {
    mockLogin.mockResolvedValue({ ...USER, consent: true });
    await useAuthStore.getState().login("dr@kurum.edu.tr", "secret123");
    const s = useAuthStore.getState();
    expect(s.status).toBe("authenticated");
    expect(s.consentGiven).toBe(true);
    expect(s.error).toBeNull();
  });

  test("hatalı login error set eder ve fırlatır", async () => {
    mockLogin.mockRejectedValue(new Error("Kimlik veya şifre hatalı"));
    await expect(
      useAuthStore.getState().login("dr@kurum.edu.tr", "yanlis"),
    ).rejects.toThrow();
    const s = useAuthStore.getState();
    expect(s.error).toBe("Kimlik veya şifre hatalı");
    expect(s.status).not.toBe("authenticated");
  });
});

describe("logout", () => {
  test("state temizlenir", async () => {
    useAuthStore.setState({
      user: { ...USER, consent: true },
      status: "authenticated",
      consentGiven: true,
    });
    mockLogout.mockResolvedValue(undefined);
    await useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.status).toBe("unauthenticated");
    expect(s.consentGiven).toBe(false);
  });
});

describe("setConsent", () => {
  test("consent backend'e gönderilir, consentGiven true olur", async () => {
    useAuthStore.setState({
      user: USER,
      status: "authenticated",
      consentGiven: false,
    });
    mockConsent.mockResolvedValue({ ...USER, consent: true });
    await useAuthStore.getState().setConsent();
    expect(useAuthStore.getState().consentGiven).toBe(true);
    expect(mockConsent).toHaveBeenCalledOnce();
  });
});

describe("clearError", () => {
  test("error null'a çekilir", () => {
    useAuthStore.setState({ error: "bir hata" });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
