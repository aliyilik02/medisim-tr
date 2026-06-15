import { lazy, Suspense, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { ScenarioListPage } from "@/pages/ScenarioListPage";
import { ScenarioPlayPage } from "@/pages/ScenarioPlayPage";
import { ScenarioEditorPage } from "@/pages/ScenarioEditorPage";
import { SessionHistoryPage } from "@/pages/SessionHistoryPage";
import { ClinicalReviewPage } from "@/pages/ClinicalReviewPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EducationalDisclaimer } from "@/components/EducationalDisclaimer";
import { useAuthStore } from "@/stores/authStore";
import { Activity, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

// ============================================================
// Dikey dilim (stratejik değerlendirme ① / sorun #3 — demo fragmentasyon):
// Pahalı katman tek canonical akış → /hasta/:id (ScenarioBedPlayPage,
// param-aware). Saf özellik-vitrini demoları (/3d-demo, /dialog-demo,
// /faz2-demo, /animasyon-demo, /monitor-demo, /ventilator-demo) artık
// /senaryolar'a yönlenir — parçalar dikey dilim içinde birleşti. Fonksiyonel
// akışlar korunur: /dialog-3d-demo (ayakta + diyalog, e2e'li),
// /senaryo-yatak (paramsız dev gezinti — aynı ScenarioBedPlayPage).
// ============================================================

// Sprint B.2 entegrasyon — 3D model + AI diyalog yan yana (ayakta hasta).
const PatientDialog3DPage = lazy(() =>
  import("@/pages/PatientDialog3DPage").then((m) => ({
    default: m.PatientDialog3DPage,
  }))
);

// Pahalı katman canonical: tam senaryo motoru + supine yatak hastası +
// köşe monitör + diyalog + (Faz B) 3D ventilatör cihazı.
const ScenarioBedPlayPage = lazy(() =>
  import("@/pages/ScenarioBedPlayPage").then((m) => ({
    default: m.ScenarioBedPlayPage,
  }))
);

export function App() {
  const location = useLocation();
  // Mount'ta mevcut cookie oturumunu doğrula (getMe). Tek sefer.
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const isLoginPage = location.pathname.startsWith("/login");
  const isPlayPage = location.pathname.includes("/oyna/");
  const isEditorPage = location.pathname.startsWith("/senaryo-editor");
  const isDialog3d = location.pathname.startsWith("/dialog-3d-demo");
  const isBedPlay = location.pathname.startsWith("/senaryo-yatak");
  const isHasta = location.pathname.startsWith("/hasta/");
  // Tam-ekran immersive sayfalarda site Header/Footer gizlenir.
  const immersive =
    isPlayPage || isEditorPage || isDialog3d || isBedPlay || isHasta;

  return (
    <div className="min-h-screen grid-overlay">
      {!immersive && !isLoginPage && <Header />}
      <main>
        <Routes>
          {/* Açık (public) — landing + giriş */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Korumalı (eğitmen oturumu + KVKK rıza gerekli) */}
          <Route
            path="/senaryolar"
            element={
              <ProtectedRoute>
                <ScenarioListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/oyna/:id"
            element={
              <ProtectedRoute>
                <ScenarioPlayPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/senaryo-editor"
            element={
              <ProtectedRoute>
                <ScenarioEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/senaryo-editor/:id"
            element={
              <ProtectedRoute>
                <ScenarioEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gecmis"
            element={
              <ProtectedRoute>
                <SessionHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/klinik-review"
            element={
              <ProtectedRoute>
                <ClinicalReviewPage />
              </ProtectedRoute>
            }
          />

          {/* Pahalı katman canonical akış — gerçek senaryo seansı */}
          <Route
            path="/hasta/:id"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-xs uppercase tracking-wider">
                      Hasta sahnesi yükleniyor…
                    </div>
                  }
                >
                  <ScenarioBedPlayPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Fonksiyonel akış — ayakta hasta + AI diyalog (e2e kapsamlı) */}
          <Route
            path="/dialog-3d-demo"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-xs uppercase tracking-wider">
                      3D + Diyalog yükleniyor…
                    </div>
                  }
                >
                  <PatientDialog3DPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Dev gezinti — paramsız ScenarioBedPlayPage (senaryo dropdown) */}
          <Route
            path="/senaryo-yatak"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-xs uppercase tracking-wider">
                      Yatak senaryosu yükleniyor…
                    </div>
                  }
                >
                  <ScenarioBedPlayPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Emekli edilen saf özellik-vitrini demoları → senaryo listesi.
              Parçaları (3D/diyalog/monitör/animasyon/ventilatör) /hasta/:id
              dikey diliminde birleşti (sorun #3 — fragmentasyon). */}
          <Route path="/3d-demo" element={<Navigate to="/senaryolar" replace />} />
          <Route path="/dialog-demo" element={<Navigate to="/senaryolar" replace />} />
          <Route path="/faz2-demo" element={<Navigate to="/senaryolar" replace />} />
          <Route path="/animasyon-demo" element={<Navigate to="/senaryolar" replace />} />
          <Route path="/monitor-demo" element={<Navigate to="/senaryolar" replace />} />
          <Route path="/ventilator-demo" element={<Navigate to="/senaryolar" replace />} />
        </Routes>
      </main>
      {!immersive && !isLoginPage && <Footer />}
      {/* Disclaimer: immersive sayfalarda footer gizli → sabit köşe rozeti.
          Login kendi disclaimer'ını gösterir. */}
      {immersive && <EducationalDisclaimer variant="fixed" />}
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-ink-700/50 bg-ink-950/90 backdrop-blur-md sticky top-0 z-40 h-14">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative">
            <Activity className="w-5 h-5 text-brand" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-clinical-stable rounded-full animate-heartbeat" />
          </div>
          <div>
            <div className="font-display text-lg leading-none">
              MediSim <span className="text-brand">TR</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500 mt-0.5 hidden sm:block">
              Sanal Hasta Platformu
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 text-sm">
          {[
            { to: "/", label: "Ana Sayfa", exact: true },
            { to: "/senaryolar", label: "Senaryolar" },
            { to: "/gecmis", label: "Geçmiş" },
            { to: "/klinik-review", label: "Klinik Review" },
          ].map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  "relative px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] transition",
                  isActive
                    ? "text-ink-50"
                    : "text-ink-400 hover:text-ink-200 hover:bg-ink-800"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-px bg-brand rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          <Link
            to="/senaryo-editor"
            className="ml-2 px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] text-brand-light border border-brand/25 hover:bg-brand/10 transition"
          >
            + Senaryo
          </Link>
          <SessionControl />
        </nav>
      </div>
    </header>
  );
}

// Oturum göstergesi + çıkış (eğitmen). Oturumsuzken "Giriş" linki.
function SessionControl() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (status === "authenticated" && user) {
    return (
      <div className="ml-2 flex items-center gap-2">
        <span className="font-mono text-[10px] text-ink-500 hidden sm:inline">
          {user.handle}
        </span>
        <button
          type="button"
          onClick={() => logout()}
          title="Çıkış yap"
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400 hover:text-clinical-critical transition"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Link
        to="/login"
        className="ml-2 px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.08em] text-ink-300 hover:text-ink-100 transition"
      >
        Giriş
      </Link>
    );
  }

  return null;
}

function Footer() {
  return (
    <footer className="border-t border-ink-700/50 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-ink-400 flex flex-wrap items-center justify-between gap-4">
        <div className="font-mono text-xs uppercase tracking-wider">
          MediSim TR · Eğitim amaçlıdır · Klinik karar yerine geçmez
        </div>
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="font-mono text-xs">sistem aktif</span>
        </div>
      </div>
    </footer>
  );
}
