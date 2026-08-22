import { ScrollText } from "lucide-react";

export function Nav() {
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
      <a href="#top" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink bg-paper shadow-hard-sm">
          <ScrollText size={18} strokeWidth={2.25} />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">
          Logline
        </span>
      </a>

      <nav className="hidden items-center gap-8 font-medium text-[15px] md:flex">
        <a href="#how" className="hover:opacity-60 transition-opacity">How it works</a>
        <a href="#rules" className="hover:opacity-60 transition-opacity">Severity rules</a>
        <a href="#faq" className="hover:opacity-60 transition-opacity">FAQ</a>
      </nav>

      <a
        href="#upload"
        className="rounded-full border border-ink bg-ink px-4 py-2 text-[14px] font-semibold text-paper shadow-hard-sm transition-transform hover:-translate-y-0.5"
      >
        Analyze a log
      </a>
    </header>
  );
}
