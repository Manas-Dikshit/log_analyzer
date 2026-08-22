"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlignLeft,
  AlertTriangle,
  Flame,
  TriangleAlert,
  Layers,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import type { AnalysisResult, ErrorGroup } from "@/lib/logParser";
import { StatCard } from "./StatCard";
import { SeverityChip } from "./SeverityChip";
import { ErrorDetailPanel } from "./ErrorDetailPanel";

export function Dashboard({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<ErrorGroup | null>(null);
  const maxOccurrences = useMemo(
    () => Math.max(...result.errors.map((e) => e.occurrences), 1),
    [result.errors]
  );

  return (
    <section id="results" className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-ink/45">
            Step 2 of 2 — {result.fileName}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[2.2rem]">
            Log analysis
          </h2>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-4 py-2 text-[13px] font-semibold text-ink/70 transition-colors hover:border-ink hover:text-ink"
        >
          <RotateCcw size={13} /> Analyze another file
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total lines" value={result.totalLines.toLocaleString()} icon={AlignLeft} />
        <StatCard label="Errors" value={result.errorCount.toLocaleString()} icon={AlertTriangle} tone="blush" />
        <StatCard label="Critical" value={result.criticalCount.toLocaleString()} icon={Flame} tone="blush" />
        <StatCard label="Warnings" value={result.warningCount.toLocaleString()} icon={TriangleAlert} tone="butter" />
        <StatCard label="Unique errors" value={result.uniqueErrorCount.toLocaleString()} icon={Layers} tone="mint" />
      </div>

      <div className="mt-14">
        <h3 className="mb-1 font-display text-xl font-bold tracking-tight">Top errors</h3>
        <p className="mb-6 text-[14px] text-ink/55">
          Ranked by how often each grouped error occurs. Tap any row for first/last seen and the
          raw sample line.
        </p>

        {result.errors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/30 bg-mint/20 px-6 py-14 text-center">
            <p className="font-display text-lg font-bold">No errors found</p>
            <p className="mt-1 text-[14px] text-ink/60">
              This log came back clean — no ERROR, CRITICAL, or FATAL lines matched.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {result.errors.map((err, i) => (
              <motion.li
                key={`${err.level}-${err.message}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
              >
                <button
                  onClick={() => setSelected(err)}
                  className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-ink bg-paper px-5 py-4 text-left shadow-hard-sm transition-transform hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-lav/50"
                    style={{
                      width: `${Math.max((err.occurrences / maxOccurrences) * 100, 4)}%`,
                    }}
                  />
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink bg-paper font-mono text-[12px] font-bold">
                    {i + 1}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate font-semibold">{err.message}</span>
                    <span className="mt-0.5 block font-mono text-[12px] text-ink/45">
                      {err.occurrences.toLocaleString()} occurrence{err.occurrences === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="relative hidden sm:block">
                    <SeverityChip severity={err.severity} />
                  </span>
                  <ChevronRight
                    size={16}
                    className="relative shrink-0 text-ink/30 transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </motion.li>
            ))}
          </ol>
        )}
      </div>

      <ErrorDetailPanel error={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
