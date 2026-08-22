import { ScrollText } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-[13px] text-ink/50 sm:flex-row sm:px-10">
        <div className="flex items-center gap-2">
          <ScrollText size={15} />
          <span className="font-semibold text-ink/70">Logline</span>
          <span>— error log analyzer, v1 MVP</span>
        </div>
        <p>Pattern matching only. No AI, no auth, no cloud logging — by design.</p>
      </div>
    </footer>
  );
}
