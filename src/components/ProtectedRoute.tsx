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
import type { UserPublic } from "@/api/auth";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  /** Verilirse yalnızca bu rollerdeki kullanıcılar erişir (örn. eğitmen paneli). */
  requireRole?: UserPublic["role"][];
}) {
  const status = useAuthStore((s) => s.status);
  const consentGiven = useAuthStore((s) => s.consentGiven);
  const user = useAuthStore((s) => s.user);

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

  // Rol kapısı — yetkisiz kullanıcı senaryolara yönlendirilir.
  if (requireRole && (!user || !requireRole.includes(user.role))) {
    return <Navigate to="/senaryolar" replace />;
  }

  return <>{children}</>;
}
