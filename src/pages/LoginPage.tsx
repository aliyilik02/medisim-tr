// ============================================================
// LoginPage (Tier-2 inc-2) — eğitmen/hoca girişi + davet-kodlu kayıt
// ============================================================
// Kullanıcı = HOCA (öğrenci yönetimi inc-3, burada YOK). Kayıt davet kodu
// (backend SIGNUP_INVITE_CODE) ile korumalı — herkes kayıt olamaz.
//
// Not: react-hook-form + zod projede KURULU DEĞİL (deps'te yok) → hafif
// manuel validation kullanıldı. <form> tag yok, onClick handler (konvansiyon).
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Activity } from "lucide-react";
import { EducationalDisclaimer } from "@/components/EducationalDisclaimer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REDIRECT_AFTER_LOGIN = "/senaryolar";

type Mode = "login" | "signup";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const serverError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // signup ek alanları
  const [inviteCode, setInviteCode] = useState("");
  const [handle, setHandle] = useState("");
  const [institutionSlug, setInstitutionSlug] = useState("");
  const [institutionName, setInstitutionName] = useState("");

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setFieldError(null);
    clearError();
  };

  const validate = (): string | null => {
    if (!EMAIL_RE.test(email)) return "Geçerli bir e-posta girin.";
    if (mode === "login") {
      if (password.length < 1) return "Şifre boş olamaz.";
      return null;
    }
    // signup
    if (inviteCode.trim().length < 1) return "Davet kodu gerekli.";
    if (handle.trim().length < 2) return "Takma ad (handle) en az 2 karakter.";
    if (institutionSlug.trim().length < 1) return "Kurum kısa adı gerekli.";
    if (password.length < 8) return "Şifre en az 8 karakter olmalı.";
    return null;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
      } else {
        await signup({
          email: email.trim().toLowerCase(),
          password,
          inviteCode: inviteCode.trim(),
          handle: handle.trim(),
          institutionSlug: institutionSlug.trim().toLowerCase(),
          institutionName: institutionName.trim() || undefined,
        });
      }
      navigate(REDIRECT_AFTER_LOGIN, { replace: true });
    } catch {
      // serverError store'dan gösterilir
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const inputClass =
    "w-full bg-ink-950/60 border border-ink-700/50 rounded px-3 py-2 text-sm text-ink-100 " +
    "placeholder:text-ink-600 focus:outline-none focus:border-brand/60 transition";
  const labelClass =
    "font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500 mb-1 block";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-overlay">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="relative">
            <Activity className="w-6 h-6 text-brand" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-clinical-stable rounded-full animate-heartbeat" />
          </div>
          <div className="font-display text-2xl">
            MediSim <span className="text-brand">TR</span>
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-700/60 rounded-lg p-6 shadow-xl">
          <h1 className="font-display text-lg mb-1">
            {mode === "login" ? "Eğitmen Girişi" : "Davet Kodu ile Kayıt"}
          </h1>
          <p className="text-[12px] text-ink-500 mb-5">
            {mode === "login"
              ? "Hesabınızla giriş yapın."
              : "Kayıt yalnızca davet kodu ile açıktır."}
          </p>

          <div className="space-y-3" onKeyDown={onKeyDown}>
            <div>
              <label className={labelClass} htmlFor="email">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="hoca@kurum.edu.tr"
              />
            </div>

            {mode === "signup" && (
              <>
                <div>
                  <label className={labelClass} htmlFor="inviteCode">
                    Davet Kodu
                  </label>
                  <input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className={inputClass}
                    placeholder="kurumdan aldığınız kod"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="handle">
                    Takma Ad (handle)
                  </label>
                  <input
                    id="handle"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className={inputClass}
                    placeholder="dr_ayse"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="instSlug">
                      Kurum Kısa Ad
                    </label>
                    <input
                      id="instSlug"
                      type="text"
                      value={institutionSlug}
                      onChange={(e) => setInstitutionSlug(e.target.value)}
                      className={inputClass}
                      placeholder=" ege-tip"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="instName">
                      Kurum Adı
                    </label>
                    <input
                      id="instName"
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className={inputClass}
                      placeholder="opsiyonel"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={labelClass} htmlFor="password">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={mode === "signup" ? "en az 8 karakter" : "••••••••"}
              />
            </div>

            {(fieldError || serverError) && (
              <div
                role="alert"
                className="text-[12px] text-clinical-critical bg-clinical-critical/10 border border-clinical-critical/30 rounded px-3 py-2"
              >
                {fieldError ?? serverError}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-2.5 rounded font-mono text-[12px] uppercase tracking-[0.08em] bg-brand text-ink-950 font-semibold hover:bg-brand-light transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Lütfen bekleyin…"
                : mode === "login"
                  ? "Giriş Yap"
                  : "Kayıt Ol"}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-ink-700/40 text-center">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-mono text-[11px] text-brand-light hover:underline"
              >
                Davet kodu ile kayıt ol →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-mono text-[11px] text-ink-400 hover:text-ink-200"
              >
                ← Girişe dön
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <EducationalDisclaimer />
        </div>
      </div>
    </div>
  );
}
