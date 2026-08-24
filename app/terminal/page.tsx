"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  AlignLeft,
  AlertTriangle,
  TriangleAlert,
  ListTree,
  Layers,
  ChevronRight,
  RotateCcw,
  Loader2,
  Terminal,
} from "lucide-react";
import { clsx } from "clsx";
import type { TerminalAnalysisResult, TerminalIssue } from "@/lib/terminalParser";
import { StatCard } from "@/components/StatCard";
import { SeverityChip } from "@/components/SeverityChip";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function TerminalAnalyzerPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TerminalAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<TerminalIssue | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong while analyzing that output.");
        return;
      }
      setResult(data as TerminalAnalysisResult);
      requestAnimationFrame(() => {
        document.getElementById("terminal-results")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch {
      setError("Couldn't reach the analyzer. Check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [text]);

  const handleReset = useCallback(() => {
    setResult(null);
    setText("");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <main className="min-h-screen">
      <Nav />

      <section className="mx-auto max-w-3xl px-6 pt-14 pb-10 text-center sm:px-10">
        <p className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-ink/45">
          Rule-based · No AI
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-[2.4rem]">
          Terminal Error Analyzer
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-ink/60">
          Paste terminal or command output. It detects errors, warnings, and stack traces,
          groups similar ones, and ranks what matters most first.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 sm:px-10">
        <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-paper p-6 transition-colors focus-within:border-ink sm:p-8">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Terminal size={18} />
            <h2 className="font-display text-lg font-bold tracking-tight">Paste terminal output</h2>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isAnalyzing}
            rows={14}
            placeholder={
              "$ npm run build\n" +
              "TypeError: Cannot read properties of undefined (reading 'map')\n" +
              "    at Dashboard (src/components/Dashboard.tsx:42:19)\n" +
              "npm ERR! code ELIFECYCLE"
            }
            className="w-full resize-y rounded-xl border border-ink/50 bg-paper p-4 font-mono text-[13px] leading-relaxed transition-colors placeholder:text-ink/30 focus:border-ink focus:outline-none focus:ring-2 focus:ring-lav/60 disabled:bg-ink/5"
          />
          {error && (
            <p className="mt-4 rounded-lg border border-severity-critical bg-severity-criticalBg px-4 py-3 text-center text-[14px] font-medium text-severity-critical">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              disabled={!text.trim() || isAnalyzing}
              onClick={handleAnalyze}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border border-ink px-8 py-3.5 font-semibold shadow-hard transition-transform",
                !text.trim() || isAnalyzing
                  ? "cursor-not-allowed bg-ink/10 text-ink/40 shadow-none"
                  : "bg-ink text-paper hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-sm"
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Analyzing…
                </>
              ) : (
                "Analyze Output"
              )}
            </button>
          </div>
        </div>
      </section>

      {result && (
        <section id="terminal-results" className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-ink/45">
                Analysis result
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[2.2rem]">
                What broke
              </h2>
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-4 py-2 text-[13px] font-semibold text-ink/70 transition-colors hover:border-ink hover:text-ink"
            >
              <RotateCcw size={13} /> Analyze another output
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total lines" value={result.totalLines.toLocaleString()} icon={AlignLeft} />
            <StatCard label="Errors" value={result.errorCount.toLocaleString()} icon={AlertTriangle} tone="blush" />
            <StatCard label="Warnings" value={result.warningCount.toLocaleString()} icon={TriangleAlert} tone="butter" />
            <StatCard label="Stack frames" value={result.stackFrameCount.toLocaleString()} icon={ListTree} />
            <StatCard label="Unique issues" value={result.uniqueIssueCount.toLocaleString()} icon={Layers} tone="mint" />
          </div>

          {result.commandCount > 0 && (
            <div className="mt-12">
              <h3 className="mb-1 font-display text-xl font-bold tracking-tight">Commands detected</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.commands.slice(0, 10).map((cmd) => (
                  <span
                    key={cmd.command}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-ink bg-paper px-3.5 py-1.5 font-mono text-[12px] shadow-hard-sm"
                  >
                    <span className="truncate">{cmd.command}</span>
                    <span className="shrink-0 text-ink/45">×{cmd.occurrences}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-14">
            <h3 className="mb-1 font-display text-xl font-bold tracking-tight">
              Most important issues
            </h3>
            <p className="mb-6 text-[14px] text-ink/55">
              Ranked by severity, then by how often each issue occurred. Tap any row for the raw
              line.
            </p>

            {result.issues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/30 bg-mint/20 px-6 py-14 text-center">
                <p className="font-display text-lg font-bold">No errors found</p>
                <p className="mt-1 text-[14px] text-ink/60">
                  This output came back clean — no error, warning, or exception patterns matched.
                </p>
              </div>
            ) : (
              <ol className="space-y-3">
                {result.issues.map((issue, i) => {
                  const isOpen = expanded?.message === issue.message && expanded?.kind === issue.kind;
                  return (
                    <motion.li
                      key={`${issue.kind}-${issue.category}-${issue.message}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
                    >
                      <button
                        onClick={() => setExpanded(isOpen ? null : issue)}
                        className="group relative w-full overflow-hidden rounded-xl border border-ink bg-paper text-left shadow-hard-sm transition-transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-4 px-5 py-4">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink bg-paper font-mono text-[12px] font-bold">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-md border border-ink/30 bg-lav/30 px-2 py-0.5 font-mono text-[10.5px] font-bold text-ink/80">
                                {issue.category}
                              </span>
                              {issue.errorType && (
                                <span className="inline-flex items-center rounded-md border border-ink/20 bg-paper px-2 py-0.5 font-mono text-[10.5px] font-semibold text-ink/65">
                                  {issue.errorType}
                                </span>
                              )}
                              {issue.filePath && (
                                <span className="inline-flex items-center rounded-md border border-ink/20 bg-mint/20 px-2 py-0.5 font-mono text-[10.5px] font-medium text-ink/75">
                                  {issue.filePath}{issue.lineNumber ? `:${issue.lineNumber}` : ""}
                                </span>
                              )}
                            </div>
                            <span className="block truncate font-mono text-[13px] font-semibold">
                              {issue.message}
                            </span>
                            <span className="mt-1 block truncate font-mono text-[11px] text-ink/45">
                              {[
                                issue.command && `$ ${issue.command}`,
                                issue.timestamp && `at ${issue.timestamp}`,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "No additional context"}
                            </span>
                          </span>
                          {issue.stackFrames > 0 && (
                            <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-ink/45 sm:flex">
                              <ListTree size={13} /> {issue.stackFrames}
                            </span>
                          )}
                          <span className="hidden shrink-0 font-mono text-[12px] text-ink/60 sm:block">
                            {issue.occurrences.toLocaleString()} occurrence{issue.occurrences === 1 ? "" : "s"}
                          </span>
                          <SeverityChip severity={issue.severity} className="hidden md:inline-flex" />
                          <ChevronRight
                            size={16}
                            className={clsx(
                              "shrink-0 text-ink/30 transition-transform group-hover:translate-x-0.5",
                              isOpen && "rotate-90"
                            )}
                          />
                        </div>

                        {isOpen && (
                          <div className="border-t border-ink/20 bg-paper px-5 py-4 space-y-4">
                            <div className="flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[12px] text-ink/60">
                              <span><strong className="text-ink">Category:</strong> {issue.category}</span>
                              <span><strong className="text-ink">Lines:</strong> {issue.firstLine} – {issue.lastLine}</span>
                              {issue.timestamp && <span><strong className="text-ink">Timestamp:</strong> {issue.timestamp}</span>}
                              {issue.command && <span><strong className="text-ink">Command:</strong> ${issue.command}</span>}
                              <span><strong className="text-ink">Occurrences:</strong> {issue.occurrences.toLocaleString()}</span>
                            </div>

                            {issue.stackTrace && issue.stackTrace.length > 0 && (
                              <div>
                                <h4 className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink/60">
                                  Relevant Stack Trace ({issue.stackTrace.length} frame{issue.stackTrace.length === 1 ? "" : "s"})
                                </h4>
                                <pre className="max-h-48 overflow-y-auto overflow-x-auto rounded-lg border border-ink bg-ink p-3 font-mono text-[11.5px] leading-relaxed text-paper">
                                  {issue.stackTrace.join("\n")}
                                </pre>
                              </div>
                            )}

                            <div>
                              <h4 className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink/60">
                                Original Terminal Lines
                              </h4>
                              <pre className="max-h-60 overflow-y-auto overflow-x-auto rounded-lg border border-ink/30 bg-lav/20 p-3 font-mono text-[12px] leading-relaxed">
                                {issue.sampleRaw || issue.rawLines.join("\n")}
                              </pre>
                            </div>
                          </div>
                        )}
                      </button>
                    </motion.li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
