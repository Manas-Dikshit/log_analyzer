import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "paper",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "paper" | "blush" | "butter" | "mint";
}) {
  const toneClass = {
    paper: "bg-paper",
    blush: "bg-blush",
    butter: "bg-butter",
    mint: "bg-mint",
  }[tone];

  return (
    <div
      className={clsx(
        "rounded-2xl border border-ink p-5 shadow-hard-sm",
        toneClass
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/50">
          {label}
        </span>
        <Icon size={16} strokeWidth={2.25} className="text-ink/40" />
      </div>
      <p className="font-display text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}
