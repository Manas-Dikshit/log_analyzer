"use client";

import { motion } from "framer-motion";

const RAW_LINES = [
  { t: "10:21:03", lvl: "ERROR", msg: "Database connection failed" },
  { t: "10:21:10", lvl: "ERROR", msg: "Payment API failed" },
  { t: "10:21:15", lvl: "ERROR", msg: "Database connection failed" },
  { t: "10:21:20", lvl: "WARN", msg: "Slow API response" },
  { t: "10:22:01", lvl: "ERROR", msg: "Database connection failed" },
  { t: "10:24:10", lvl: "CRITICAL", msg: "OutOfMemoryError" },
];

const GROUPED = [
  { msg: "Database connection failed", count: 3, sev: "High" },
  { msg: "Payment API failed", count: 1, sev: "High" },
  { msg: "OutOfMemoryError", count: 1, sev: "Critical" },
  { msg: "Slow API response", count: 1, sev: "Medium" },
];

const levelColor: Record<string, string> = {
  ERROR: "text-severity-high",
  CRITICAL: "text-severity-critical",
  WARN: "text-severity-medium",
};

const sevColor: Record<string, string> = {
  High: "text-severity-high",
  Critical: "text-severity-critical",
  Medium: "text-severity-medium",
};

export function TerminalPreview() {
  return (
    <div className="relative w-full max-w-[420px]">
      {/* raw stream window */}
      <motion.div
        initial={{ opacity: 0, y: 16, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative rounded-xl border border-ink bg-ink text-paper shadow-hard-lg overflow-hidden"
      >
        <div className="flex items-center gap-1.5 border-b border-paper/20 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-severity-critical/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-severity-medium/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-severity-info/80" />
          <span className="ml-2 font-mono text-[11px] text-paper/50">application.log</span>
        </div>
        <div className="relative h-[168px] overflow-hidden px-3 py-3 font-mono text-[11.5px] leading-[1.9]">
          <motion.div
            animate={{ y: ["0%", "-50%"] }}
            transition={{ duration: 7, ease: "linear", repeat: Infinity }}
          >
            {[...RAW_LINES, ...RAW_LINES].map((l, i) => (
              <div key={i} className="whitespace-nowrap">
                <span className="text-paper/40">{l.t} </span>
                <span className={levelColor[l.lvl] ?? "text-paper/70"}>{l.lvl}</span>
                <span className="text-paper/80"> {l.msg}</span>
              </div>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-ink to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-ink to-transparent" />
        </div>
      </motion.div>

      {/* grouped result card, offset to feel "picked up" from the stream */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 2 }}
        animate={{ opacity: 1, y: 0, rotate: 2 }}
        transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
        className="absolute -bottom-10 -right-6 w-[248px] rounded-xl border border-ink bg-paper shadow-hard-lg p-3.5 sm:-right-10"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/50">
            Grouped &amp; counted
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-severity-high animate-count-pulse" />
        </div>
        <ul className="space-y-2">
          {GROUPED.map((g) => (
            <li key={g.msg} className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="truncate font-medium">{g.msg}</span>
              <span className={`shrink-0 font-mono font-bold ${sevColor[g.sev]}`}>
                ×{g.count}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
