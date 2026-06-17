// ============================================================
// Auth store (Tier-2 inc-2) — zustand
// ============================================================
// Kullanıcı = HOCA/eğitmen (öğrenci yönetimi inc-3). Oturum httpOnly
// cookie'de; store sadece türetilmiş durumu (user/status/consent) tutar.
//
// STALE CLOSURE KURALI: async eylem içindeki tüm set() çağrıları functional
// form kullanır — eşzamanlı login/checkAuth yarışında eski state'i ezmemek için.
// ============================================================

import { create } from "zustand";
import * as authApi from "@/api/auth";
import type { UserPublic, SignupParams } from "@/api/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// E2E seam: Playwright'ta backend yok → auth gate tüm route'ları /login'e
// yönlendirip uygulamayı test edilemez kılar. VITE_E2E=1 (playwright webServer
// veya dev login-bypass .env.local) ile mock eğitmen oturumu açılır. Production
// build'de VITE_E2E tanımsız → gerçek auth akışı (güvenlik etkilenmez).
// MODE !== "test": vitest unit testleri GERÇEK auth akışını test eder — env'e
// sızan VITE_E2E bypass'ı testte devre dışı (yalnız tarayıcı dev/e2e'de aktif).
const E2E_BYPASS =
  import.meta.env.VITE_E2E === "1" && import.meta.env.MODE !== "test";
const E2E_USER: UserPublic = {
  id: "e2e-instructor",
  role: "instructor",
  handle: "e2e",
  email: "e2e@medisim.test",
  institution_id: "e2e-inst",
  consent: true,
};

export interface AuthState {
  user: UserPublic | null;
  status: AuthStatus;
  consentGiven: boolean;
  error: string | null;

  /** Mount'ta çağrılır — getMe ile mevcut cookie oturumunu doğrular. */
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (params: SignupParams) => Promise<void>;
  logout: () => Promise<void>;
  setConsent: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  consentGiven: false,
  error: null,

  checkAuth: async () => {
    if (E2E_BYPASS) {
      set((s) => ({
        ...s,
        user: E2E_USER,
        status: "authenticated",
        consentGiven: true,
        error: null,
      }));
      return;
    }
    set((s) => ({ ...s, status: "loading", error: null }));
    try {
      const user = await authApi.getMe();
      set((s) => ({
        ...s,
        user,
        status: user ? "authenticated" : "unauthenticated",
        consentGiven: user?.consent ?? false,
      }));
    } catch {
      // Backend ulaşılamaz / yapılandırılmamış → oturumsuz say (uygulama
      // çökmesin, login ekranı gösterilsin).
      set((s) => ({ ...s, user: null, status: "unauthenticated", consentGiven: false }));
    }
  },

  login: async (email, password) => {
    set((s) => ({ ...s, error: null }));
    try {
      const user = await authApi.login(email, password);
      set((s) => ({
        ...s,
        user,
        status: "authenticated",
        consentGiven: user.consent,
        error: null,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Giriş başarısız";
      set((s) => ({ ...s, error: msg }));
      throw e;
    }
  },

  signup: async (params) => {
    set((s) => ({ ...s, error: null }));
    try {
      const user = await authApi.signup(params);
      set((s) => ({
        ...s,
        user,
        status: "authenticated",
        consentGiven: user.consent,
        error: null,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kayıt başarısız";
      set((s) => ({ ...s, error: msg }));
      throw e;
    }
  },

  logout: async () => {
    await authApi.logout();
    set((s) => ({
      ...s,
      user: null,
      status: "unauthenticated",
      consentGiven: false,
      error: null,
    }));
  },

  setConsent: async () => {
    const user = await authApi.submitConsent({
      dataProcessing: true,
      explicitConsent: true,
    });
    set((s) => ({
      ...s,
      user: user ?? s.user,
      consentGiven: user ? user.consent : s.consentGiven,
    }));
  },

  clearError: () => set((s) => ({ ...s, error: null })),
}));
