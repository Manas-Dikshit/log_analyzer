import { clsx } from "clsx";
import type { Severity } from "@/lib/logParser";

const styles: Record<Severity, string> = {
  Critical: "bg-severity-criticalBg text-severity-critical border-severity-critical",
  High: "bg-severity-highBg text-severity-high border-severity-high",
  Medium: "bg-severity-mediumBg text-severity-medium border-severity-medium",
  Low: "bg-severity-infoBg text-severity-info border-severity-info",
};

const dot: Record<Severity, string> = {
  Critical: "bg-severity-critical",
  High: "bg-severity-high",
  Medium: "bg-severity-medium",
  Low: "bg-severity-info",
};

export function SeverityChip({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wide",
        styles[severity],
        className
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", dot[severity])} />
      {severity}
    </span>
  );
}
