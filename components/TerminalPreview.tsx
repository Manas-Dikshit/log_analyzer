"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const RAW_LINES = [
  { t: "10:21:03", lvl: "ERROR", msg: "Database connection failed" },
  { t: "10:21:10", lvl: "ERROR", msg: "Payment API timeout" },
  { t: "10:21:15", lvl: "ERROR", msg: "Database connection failed" },
  { t: "10:21:20", lvl: "WARN", msg: "Slow API response" },
  { t: "10:22:01", lvl: "ERROR", msg: "Database connection failed" },
  { t: "10:24:10", lvl: "CRIT", msg: "OutOfMemoryError" },
];

const GROUPED = [
  { msg: "Database connection failed", count: 3, sev: "High" as const },
  { msg: "Payment API timeout", count: 1, sev: "High" as const },
  { msg: "OutOfMemoryError", count: 1, sev: "Critical" as const },
  { msg: "Slow API response", count: 1, sev: "Medium" as const },
];

const levelColor: Record<string, string> = {
  ERROR: "text-[#DD6A1B]",
  CRIT: "text-[#D6274C]",
  WARN: "text-[#B58900]",
};

const sevColor = {
  High: "text-[#DD6A1B]",
  Critical: "text-[#D6274C]",
  Medium: "text-[#B58900]",
};

export function TerminalPreview() {
  return (
    <div className="flex w-full max-w-[480px] flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0">
      {/* raw stream */}
      <div className="relative flex-1 overflow-hidden rounded-l-xl border border-paper/15 bg-paper/[0.04] sm:max-w-[230px]">
        <div className="flex items-center gap-1.5 border-b border-paper/10 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#D6274C]/70" />
          <span className="h-2 w-2 rounded-full bg-[#B58900]/70" />
          <span className="h-2 w-2 rounded-full bg-[#0F8F7E]/70" />
          <span className="ml-1.5 font-mono text-[10px] text-paper/40">raw</span>
        </div>
        <div className="relative h-[180px] overflow-hidden px-3 py-2.5 font-mono text-[11px] leading-[1.85]">
          <motion.div
            animate={{ y: ["0%", "-50%"] }}
            transition={{ duration: 8, ease: "linear", repeat: Infinity }}
          >
            {[...RAW_LINES, ...RAW_LINES].map((l, i) => (
              <div key={i} className="whitespace-nowrap">
                <span className="text-paper/30">{l.t} </span>
                <span className={levelColor[l.lvl] ?? "text-paper/60"}>
                  {l.lvl}
                </span>
                <span className="text-paper/70"> {l.msg}</span>
              </div>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-paper/[0.04] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-paper/[0.04] to-transparent" />
        </div>
      </div>

      {/* arrow divider */}
      <div className="hidden items-center justify-center px-2 sm:flex">
        <ArrowRight size={14} className="text-paper/25" />
      </div>

      {/* grouped result */}
      <div className="overflow-hidden rounded-r-xl border border-paper/15 bg-paper/[0.04] sm:flex-1 sm:max-w-[230px] sm:border-l-0">
        <div className="flex items-center justify-between border-b border-paper/10 px-3 py-2">
          <span className="font-mono text-[10px] text-paper/40">grouped</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#DD6A1B] animate-count-pulse" />
        </div>
        <div className="px-3 py-2.5">
          <ul className="space-y-2">
            {GROUPED.map((g) => (
              <li
                key={g.msg}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="truncate font-medium text-paper/80">
                  {g.msg}
                </span>
                <span
                  className={`shrink-0 font-mono font-bold ${sevColor[g.sev]}`}
                >
                  ×{g.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
