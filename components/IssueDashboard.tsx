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
  Clock,
  Filter,
  BarChart3,
  Brain,
  Link2,
} from "lucide-react";
import type {
  AnalysisResult,
  Issue,
  Severity,
  SemanticAnalysisResult,
} from "@/lib/logParser";
import { StatCard } from "./StatCard";
import { SeverityChip } from "./SeverityChip";
import { IssueDetailPanel } from "./IssueDetailPanel";

const FORMAT_LABELS: Record<string, string> = {
  json: "JSON",
  nginx: "Nginx",
  apache: "Apache",
  syslog: "Syslog",
  text: "Plain Text",
  unknown: "Unknown",
};

const SEVERITY_FILTERS: (Severity | "All")[] = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
];

export function IssueDashboard({
  result,
  onReset,
}: {
  result: AnalysisResult & { semantic: SemanticAnalysisResult };
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<Issue | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All");

  const { semantic } = result;

  const maxOccurrences = useMemo(
    () => Math.max(...semantic.issues.map((i) => i.occurrences), 1),
    [semantic.issues]
  );

  const filteredIssues = useMemo(() => {
    if (severityFilter === "All") return semantic.issues;
    return semantic.issues.filter((i) => i.severity === severityFilter);
  }, [semantic.issues, severityFilter]);

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

      {/* Format detection indicator */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-ink/5 px-3 py-1.5 font-mono text-[12px] font-semibold text-ink/60">
          <BarChart3 size={13} />
          Format: {FORMAT_LABELS[result.detectedFormat] ?? result.detectedFormat}
        </span>
        {result.timeBuckets.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-ink/5 px-3 py-1.5 font-mono text-[12px] font-semibold text-ink/60">
            <Clock size={13} />
            {result.timeBuckets.length} time bucket{result.timeBuckets.length === 1 ? "" : "s"}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-ink/5 px-3 py-1.5 font-mono text-[12px] font-semibold text-ink/60">
          <Brain size={13} />
          {semantic.embeddingAvailable
            ? "Semantic clustering"
            : "Fingerprint grouping"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total lines"
          value={result.totalLines.toLocaleString()}
          icon={AlignLeft}
        />
        <StatCard
          label="Errors"
          value={result.errorCount.toLocaleString()}
          icon={AlertTriangle}
          tone="blush"
        />
        <StatCard
          label="Critical"
          value={result.criticalCount.toLocaleString()}
          icon={Flame}
          tone="blush"
        />
        <StatCard
          label="Warnings"
          value={result.warningCount.toLocaleString()}
          icon={TriangleAlert}
          tone="butter"
        />
        <StatCard
          label="Unique errors"
          value={result.uniqueErrorCount.toLocaleString()}
          icon={Layers}
          tone="mint"
        />
        <StatCard
          label="Issues"
          value={semantic.issues.length.toLocaleString()}
          icon={Link2}
        />
      </div>

      {/* Semantic analysis summary */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[12px] text-ink/50">
          {semantic.fingerprintCount} unique fingerprint{semantic.fingerprintCount === 1 ? "" : "s"}
          {" → "}
          {semantic.clusterCount} cluster{semantic.clusterCount === 1 ? "" : "s"}
          {" → "}
          {semantic.issues.length} issue{semantic.issues.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Time bucket summary */}
      {result.timeBuckets.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-ink/45">
            Errors by time bucket
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.timeBuckets.map((bucket) => {
              const d = new Date(bucket.start);
              const label = `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
              return (
                <span
                  key={bucket.start}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-paper px-3 py-1.5 font-mono text-[12px] text-ink/60"
                >
                  {label}
                  <span className="font-bold text-severity-critical">
                    {bucket.errorCount}
                  </span>
                  err
                  {bucket.warnCount > 0 && (
                    <>
                      {" / "}
                      <span className="font-bold text-severity-warning">
                        {bucket.warnCount}
                      </span>
                      warn
                    </>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">
              Issues
            </h3>
            <p className="mt-1 text-[14px] text-ink/55">
              Semantic grouping of related errors. Tap any issue for details and
              raw samples.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-ink/40" />
            {SEVERITY_FILTERS.map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold transition-colors ${
                  severityFilter === sev
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/30 text-ink/50 hover:border-ink hover:text-ink"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/30 bg-mint/20 px-6 py-14 text-center">
            <p className="font-display text-lg font-bold">No issues found</p>
            <p className="mt-1 text-[14px] text-ink/60">
              {severityFilter === "All"
                ? "This log came back clean — no ERROR, CRITICAL, or FATAL lines matched."
                : `No ${severityFilter.toLowerCase()} severity issues found.`}
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {filteredIssues.map((issue, i) => (
              <motion.li
                key={`${issue.fingerprint}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(i * 0.04, 0.4),
                }}
              >
                <button
                  onClick={() => setSelected(issue)}
                  className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-ink bg-paper px-5 py-4 text-left shadow-hard-sm transition-transform hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-lav/50"
                    style={{
                      width: `${Math.max((issue.occurrences / maxOccurrences) * 100, 4)}%`,
                    }}
                  />
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink bg-paper font-mono text-[12px] font-bold">
                    {i + 1}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {issue.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 font-mono text-[12px] text-ink/45">
                      <span>
                        {issue.occurrences.toLocaleString()} occurrence
                        {issue.occurrences === 1 ? "" : "s"}
                      </span>
                      {issue.relatedErrors.length > 1 && (
                        <span className="text-ink/30">
                          &middot; {issue.relatedErrors.length} variants
                        </span>
                      )}
                      {!issue.isHighConfidence && (
                        <span className="text-butter">
                          &middot; possible match
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="relative hidden shrink-0 sm:flex items-center gap-2">
                    <SeverityChip severity={issue.severity} />
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

      <IssueDetailPanel issue={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
