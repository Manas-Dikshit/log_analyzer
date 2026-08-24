"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function Nav() {
  const pathname = usePathname();
  const onTerminal = pathname?.startsWith("/terminal");

  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink bg-ink shadow-hard-sm">
          <Image
            src="/LogLine-icon.png"
            alt="LogLine logo"
            width={36}
            height={36}
            sizes="36px"
            className="h-full w-full object-cover"
            priority
          />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">
          Logline
        </span>
      </Link>

      <nav className="hidden items-center gap-8 font-medium text-[15px] md:flex">
        {!onTerminal && (
          <>
            <a href="#how" className="hover:opacity-60 transition-opacity">How it works</a>
            <a href="#rules" className="hover:opacity-60 transition-opacity">Severity rules</a>
            <a href="#faq" className="hover:opacity-60 transition-opacity">FAQ</a>
          </>
        )}
        <Link
          href="/terminal"
          className={clsx(!onTerminal && "hover:opacity-60 transition-opacity")}
        >
          Terminal analyzer
        </Link>
      </nav>

      <Link
        href={onTerminal ? "/" : "#upload"}
        className="rounded-full border border-ink bg-ink px-4 py-2 text-[14px] font-semibold text-paper shadow-hard-sm transition-transform hover:-translate-y-0.5"
      >
        {onTerminal ? "Log analyzer" : "Analyze a log"}
      </Link>
    </header>
  );
}
