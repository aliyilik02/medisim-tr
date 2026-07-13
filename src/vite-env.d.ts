/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  /** "1" → e2e auth bypass (yalnız Playwright webServer'ı set eder). */
  readonly VITE_E2E?: string;
  /** "1" → dev'de yalnız auth bypass (görsel yan etkisiz; prod'da derlenmez). */
  readonly VITE_AUTH_BYPASS?: string;
  /** Hasta görsel katmanı: "2d" (Higgsfield kare, varsayılan) | "3d" (dondurulmuş R3F). */
  readonly VITE_VISUAL_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
