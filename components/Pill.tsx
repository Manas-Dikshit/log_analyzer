import { clsx } from "clsx";

const palettes = {
  lav: "bg-lav",
  mint: "bg-mint",
  butter: "bg-butter",
  blush: "bg-blush",
  paper: "bg-paper",
} as const;

export function Pill({
  children,
  tone = "paper",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof palettes;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-ink px-3.5 py-1.5 text-[13px] font-medium leading-none whitespace-nowrap",
        palettes[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
