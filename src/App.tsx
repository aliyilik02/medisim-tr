import { lazy, Suspense } from "react";
import { Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { ScenarioListPage } from "@/pages/ScenarioListPage";
import { ScenarioPlayPage } from "@/pages/ScenarioPlayPage";
import { ScenarioEditorPage } from "@/pages/ScenarioEditorPage";
import { SessionHistoryPage } from "@/pages/SessionHistoryPage";
import { AboutPage } from "@/pages/AboutPage";
import { Activity } from "lucide-react";
import { cn } from "@/lib/cn";

// Sprint A — 3D demo route lazy yüklenir. three/R3F bundle main'i şişirmesin.
const PatientBody3DDemoPage = lazy(() =>
  import("@/pages/PatientBody3DDemoPage").then((m) => ({
    default: m.PatientBody3DDemoPage,
  }))
);

// Sprint B.2 — AI hasta diyaloğu demo (mock backend).
const DialogDemoPage = lazy(() =>
  import("@/pages/DialogDemoPage").then((m) => ({
    default: m.DialogDemoPage,
  }))
);

// Sprint B.2 entegrasyon — 3D model + AI diyalog yan yana, mock lipsync.
const PatientDialog3DPage = lazy(() =>
  import("@/pages/PatientDialog3DPage").then((m) => ({
    default: m.PatientDialog3DPage,
  }))
);

export function App() {
  const location = useLocation();
  const isPlayPage = location.pathname.includes("/oyna/");
  const isEditorPage = location.pathname.startsWith("/senaryo-editor");
  const is3dDemo = location.pathname.startsWith("/3d-demo");
  const isDialogDemo = location.pathname.startsWith("/dialog-demo");
  const isDialog3d = location.pathname.startsWith("/dialog-3d-demo");

  return (
    <div className="min-h-screen grid-overlay">
      {!isPlayPage && !isEditorPage && !is3dDemo && !isDialogDemo && !isDialog3d && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/senaryolar" element={<ScenarioListPage />} />
          <Route path="/oyna/:id" element={<ScenarioPlayPage />} />
          <Route path="/senaryo-editor" element={<ScenarioEditorPage />} />
          <Route path="/senaryo-editor/:id" element={<ScenarioEditorPage />} />
          <Route path="/gecmis" element={<SessionHistoryPage />} />
          <Route path="/hakkinda" element={<AboutPage />} />
          <Route
            path="/3d-demo"
            element={
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-xs uppercase tracking-wider">
                    3D yükleniyor…
                  </div>
                }
              >
                <PatientBody3DDemoPage />
              </Suspense>
            }
          />
          <Route
            path="/dialog-demo"
            element={
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-xs uppercase tracking-wider">
                    Diyalog yükleniyor…
                  </div>
                }
              >
                <DialogDemoPage />
              </Suspense>
            }
          />
          <Route
            path="/dialog-3d-demo"
            element={
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-xs uppercase tracking-wider">
                    3D + Diyalog yükleniyor…
                  </div>
                }
              >
                <PatientDialog3DPage />
              </Suspense>
            }
          />
        </Routes>
      </main>
      {!isPlayPage && !isEditorPage && !is3dDemo && !isDialogDemo && !isDialog3d && <Footer />}
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
            { to: "/hakkinda", label: "Hakkında" },
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
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-700/50 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-ink-400 flex flex-wrap items-center justify-between gap-4">
        <div className="font-mono text-xs uppercase tracking-wider">
          MediSim TR · Eğitim amaçlıdır · Klinik karar yerine geçmez
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/hakkinda"
            className="font-mono text-xs uppercase tracking-wider text-ink-400 hover:text-brand-light transition"
          >
            Hakkında & Lisanslar
          </Link>
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="font-mono text-xs">sistem aktif</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
