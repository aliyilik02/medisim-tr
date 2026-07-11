// ============================================================
// ErrorBoundary — beyaz ekran siperi (11 Tem güvenlik/stabilite paketi)
// ============================================================
// Denetim bulgusu R1: projede hiç error boundary yoktu — görsel varlık
// yüklemesi (GLB/2D görsel) veya herhangi bir render hatası throw edince
// TÜM React ağacı unmount oluyordu (beyaz ekran, TR mesaj yok).
// İki kullanım:
//   1. App-level (route içeriği) — genel siper, "Sayfayı yenile".
//   2. Görsel katman (ScenarioBedPlayPage sahne bloğu) — sahne çökse bile
//      oyun UI'ı (monitör, aksiyonlar, debrief) ayakta kalır; "Yeniden dene"
//      boundary'yi resetler. Render katmanından bağımsız (3D veya 2D).
// ============================================================

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Kutu başlığı (varsayılan genel). */
  title?: string;
  /** Açıklama satırı. */
  description?: string;
  /** "Yeniden dene" butonu — boundary state'ini sıfırlar (görsel katman için).
   *  Verilmezse "Sayfayı yenile" (tam reload) gösterilir. */
  retryable?: boolean;
  /** Kompakt yerleşim (sahne paneli içinde) — tam-sayfa ortalama yerine dolgu. */
  compact?: boolean;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Üretimde tanı için tek log — PII yok, sadece hata + bileşen yığını.
    console.error("[error-boundary]", error.message, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const {
      title = "Bir şeyler ters gitti",
      description = "Beklenmeyen bir hata oluştu. Sayfayı yenilemek genellikle çözer.",
      retryable = false,
      compact = false,
    } = this.props;

    return (
      <div
        data-testid="error-boundary"
        className={
          compact
            ? "w-full h-full flex items-center justify-center bg-ink-950"
            : "min-h-[60vh] flex items-center justify-center bg-ink-950"
        }
      >
        <div className="max-w-md mx-4 p-6 rounded-lg border border-clinical-critical/40 bg-ink-900/80 text-center">
          <AlertTriangle className="w-8 h-8 text-clinical-critical mx-auto mb-3" />
          <h2 className="font-display text-lg text-ink-50 mb-1">{title}</h2>
          <p className="text-sm text-ink-300 mb-4">{description}</p>
          {retryable ? (
            <button
              type="button"
              onClick={this.reset}
              data-testid="error-boundary-retry"
              className="px-4 py-1.5 rounded-md bg-brand/20 text-brand-light border border-brand/40 hover:bg-brand/30 transition font-mono text-xs uppercase tracking-[0.1em]"
            >
              Yeniden dene
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              data-testid="error-boundary-reload"
              className="px-4 py-1.5 rounded-md bg-brand/20 text-brand-light border border-brand/40 hover:bg-brand/30 transition font-mono text-xs uppercase tracking-[0.1em]"
            >
              Sayfayı yenile
            </button>
          )}
          <p className="mt-4 font-mono text-[10px] text-ink-500 break-all">{error.message}</p>
        </div>
      </div>
    );
  }
}
