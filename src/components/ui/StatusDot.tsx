import { cn } from "@/lib/cn";

interface StatusDotProps {
  status: "stable" | "warning" | "critical" | "info" | "neutral";
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const STATUS_COLORS: Record<StatusDotProps["status"], string> = {
  stable:   "bg-status-stable",
  warning:  "bg-status-warning",
  critical: "bg-status-critical",
  info:     "bg-status-info",
  neutral:  "bg-status-neutral",
};

const RING_COLORS: Record<StatusDotProps["status"], string> = {
  stable:   "bg-status-stable",
  warning:  "bg-status-warning",
  critical: "bg-status-critical",
  info:     "bg-status-info",
  neutral:  "bg-status-neutral",
};

const SIZES: Record<NonNullable<StatusDotProps["size"]>, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function StatusDot({
  status,
  pulse = false,
  size = "md",
  className,
}: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      <span
        className={cn(
          "rounded-full block",
          SIZES[size],
          STATUS_COLORS[status]
        )}
      />
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-60",
            RING_COLORS[status],
            // Kritik durumda daha hızlı animasyon için inline style
          )}
          style={status === "critical" ? { animationDuration: "0.8s" } : undefined}
        />
      )}
    </span>
  );
}
