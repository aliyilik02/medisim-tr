// ============================================================
// Reveal — scroll'a bağlı kademeli beliriş (neon UI seti)
// ============================================================
// IntersectionObserver: öğe görünüm alanına girince .reveal-in eklenir,
// CSS geçişi oynar (index.css). delay ile kart zincirleri birbirine bağlı
// akar. Bir kez belirir (io.disconnect) — geri kaydırınca tekrar oynamaz,
// okuma akışını bozmaz. IO yoksa (jsdom/vitest) anında görünür — test
// güvenli. prefers-reduced-motion CSS tarafında kapatır.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

interface RevealProps {
  children: ReactNode;
  /** Görünürlük sonrası gecikme (ms) — zincir kademesi */
  delay?: number;
  className?: string;
  /** Tetik eşiği — öğenin ne kadarı görününce (0-1) */
  threshold?: number;
  as?: "div" | "section" | "article";
}

export function Reveal({
  children,
  delay = 0,
  className,
  threshold = 0.12,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -36px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", inView && "reveal-in", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
