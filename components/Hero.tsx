"use client";

import { TerminalPreview } from "./TerminalPreview";
import { Nav } from "./Nav";
import { ArrowRight } from "lucide-react";

export function Hero({ onScrollToUpload }: { onScrollToUpload: () => void }) {
  return (
    <section
      id="top"
      className="flex min-h-screen flex-col bg-ink text-paper"
    >
      <Nav />

      <div className="mx-auto flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:max-w-6xl lg:grid lg:grid-cols-[0.48fr_0.52fr] lg:items-center lg:gap-16 lg:py-0">
        {/* ── Text column ──────────────────────────── */}
        <div>
          <h1 className="font-display text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.92] tracking-tight">
            Logline
          </h1>
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.25em] text-paper/35">
            error log analyzer
          </p>

          <p className="mt-8 max-w-md text-[17px] leading-relaxed text-paper/75">
            Upload a log file. Understand what&apos;s actually
            broken.
          </p>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-paper/45">
            Pattern matching — not AI. Grouped errors, severity
            ranking, first and last seen. Runs in your browser.
          </p>

          {/* ── Format strip ──────────────────────────── */}
          <div className="mt-8 inline-flex items-center border border-paper/15">
            {[".log", ".txt", ".json", ".jsonl"].map((f, i, arr) => (
              <span
                key={f}
                className="px-3 py-1.5 font-mono text-[12px] text-paper/50"
              >
                {f}
                {i < arr.length - 1 && (
                  <span className="ml-3 inline-block h-3 w-px bg-paper/15 align-middle" />
                )}
              </span>
            ))}
          </div>

          {/* ── CTA ──────────────────────────────────── */}
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <button
              onClick={onScrollToUpload}
              className="group inline-flex items-center gap-2.5 border border-paper/25 bg-paper px-7 py-3.5 font-semibold text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Analyze a log
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
            <span className="text-[12px] text-paper/30">
              Nothing is stored.
            </span>
          </div>
        </div>

        {/* ── Terminal (the picture) ────────────────── */}
        <div className="mt-12 flex justify-center lg:mt-0 lg:justify-end">
          <TerminalPreview />
        </div>
      </div>

      {/* ── Bottom edge ─────────────────────────────── */}
      <div className="h-px bg-paper/8" />
    </section>
  );
}
