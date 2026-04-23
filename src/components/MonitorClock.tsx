import { useState, useEffect } from "react";

interface MonitorClockProps {
  startedAt: number;
}

export function MonitorClock({ startedAt }: MonitorClockProps) {
  const [elapsed, setElapsed] = useState(
    Math.floor((Date.now() - startedAt) / 1000)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="font-mono text-[11px] tabular-nums tracking-wider text-ink-400">
      {mm}:{ss}
    </span>
  );
}
