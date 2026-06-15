// ============================================================
// ProtectedRoute (Tier-2 inc-2) — oturum + KVKK rıza kapısı
// ============================================================
// Akış:
//   status === 'loading'         → spinner (checkAuth bitene kadar)
//   status !== 'authenticated'   → /login'e yönlendir
//   authenticated & !consent     → ConsentGate (tam-ekran, içeri girilemez)
//   authenticated & consent      → children
// ============================================================

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ConsentGate } from "@/legal/kvkk-aydinlatma";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const consentGiven = useAuthStore((s) => s.consentGiven);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-xs uppercase tracking-wider">
        <span className="pulse-dot mr-2" />
        Oturum doğrulanıyor…
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (!consentGiven) {
    return <ConsentGate />;
  }

  return <>{children}</>;
}
