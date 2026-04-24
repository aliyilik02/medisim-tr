import { Routes, Route, Link, useLocation } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { ScenarioListPage } from "@/pages/ScenarioListPage";
import { ScenarioPlayPage } from "@/pages/ScenarioPlayPage";
import { ScenarioEditorPage } from "@/pages/ScenarioEditorPage";
import { Activity } from "lucide-react";

export function App() {
  const location = useLocation();
  const isPlayPage = location.pathname.includes("/oyna/");
  const isEditorPage = location.pathname.startsWith("/senaryo-editor");

  return (
    <div className="min-h-screen grid-overlay">
      {!isPlayPage && !isEditorPage && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/senaryolar" element={<ScenarioListPage />} />
          <Route path="/oyna/:id" element={<ScenarioPlayPage />} />
          <Route path="/senaryo-editor" element={<ScenarioEditorPage />} />
          <Route path="/senaryo-editor/:id" element={<ScenarioEditorPage />} />
        </Routes>
      </main>
      {!isPlayPage && !isEditorPage && <Footer />}
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-ink-700/50 bg-ink-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Activity className="w-6 h-6 text-brand" strokeWidth={2.5} />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-clinical-stable rounded-full animate-heartbeat" />
          </div>
          <div>
            <div className="font-display text-xl leading-none">
              MediSim <span className="text-brand">TR</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 mt-0.5">
              Sanal Hasta Platformu
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="px-3 py-1.5 rounded text-ink-200 hover:text-ink-50 hover:bg-ink-800 transition"
          >
            Ana Sayfa
          </Link>
          <Link
            to="/senaryolar"
            className="px-3 py-1.5 rounded text-ink-200 hover:text-ink-50 hover:bg-ink-800 transition"
          >
            Senaryolar
          </Link>
          <Link
            to="/senaryo-editor"
            className="px-3 py-1.5 rounded text-brand-light hover:text-brand hover:bg-brand/10 transition"
          >
            Senaryo Oluştur
          </Link>
          <span className="tag ml-3">v0.1 · alpha</span>
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
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="font-mono text-xs">sistem aktif</span>
        </div>
      </div>
    </footer>
  );
}
