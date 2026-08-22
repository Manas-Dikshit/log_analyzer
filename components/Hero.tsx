"use client";

import { TerminalPreview } from "./TerminalPreview";
import { Pill } from "./Pill";
import { Nav } from "./Nav";
import { ArrowRight } from "lucide-react";

const FEATURES = [
  { label: "Pattern Matching", tone: "lav" as const },
  { label: "Zero AI, Full Transparency", tone: "mint" as const },
  { label: "Instant Grouping", tone: "butter" as const },
  { label: "Severity Rules", tone: "blush" as const },
  { label: "First / Last Seen", tone: "lav" as const },
  { label: "Runs In Your Browser", tone: "mint" as const },
];

export function Hero({ onScrollToUpload }: { onScrollToUpload: () => void }) {
  return (
    <section id="top" className="relative overflow-hidden bg-hero-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #12111A 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative">
        <Nav />
        <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-6 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-28 lg:pt-10">
          <div>
            <h1 className="text-balance font-display text-[clamp(2.4rem,5.4vw,4.1rem)] font-bold leading-[1.05] tracking-tight">
              Turn thousands of{" "}
              <span className="inline-flex translate-y-[-0.1em] items-center rounded-md border border-severity-high bg-severity-highBg px-2.5 py-0.5 font-mono text-[0.55em] font-bold text-severity-high align-middle">
                ERROR
              </span>{" "}
              lines into one clear picture — without a single line of AI.
            </h1>

            <p className="mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-ink/70">
              Upload an <span className="font-mono text-[0.92em] text-ink">.log</span> or{" "}
              <span className="font-mono text-[0.92em] text-ink">.txt</span> file. Logline scans
              it with plain pattern matching — grouping repeats, counting occurrences, and ranking
              what needs attention first.
            </p>

            <div className="mt-9 flex flex-wrap gap-2.5">
              {FEATURES.map((f) => (
                <Pill key={f.label} tone={f.tone}>
                  {f.label}
                </Pill>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={onScrollToUpload}
                className="group inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-6 py-3.5 font-semibold text-paper shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-sm"
              >
                Upload a log file
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
              <span className="text-[13px] text-ink/50">
                Processed in your session. Nothing is stored.
              </span>
            </div>
          </div>

          <div className="relative flex justify-center pb-10 pt-4 lg:justify-end lg:pb-16">
            <TerminalPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
