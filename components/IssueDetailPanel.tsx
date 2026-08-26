"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Hash,
  Clock,
  ClockArrowUp,
  Tag,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  Network,
  AlertTriangle,
  FileText,
} from "lucide-react";
import type { Issue } from "@/lib/logParser";
import { SeverityChip } from "./SeverityChip";

export function IssueDetailPanel({
  issue,
  onClose,
}: {
  issue: Issue | null;
  onClose: () => void;
}) {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <AnimatePresence>
      {issue && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-ink bg-paper p-7 shadow-hard-lg scroll-thin"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/45">
                Issue Detail
              </p>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/30 transition-colors hover:border-ink"
                aria-label="Close detail panel"
              >
                <X size={15} />
              </button>
            </div>

            <h3 className="font-display text-2xl font-bold leading-snug tracking-tight">
              {issue.title}
            </h3>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SeverityChip severity={issue.severity} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-ink/5 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-ink/60">
                <Tag size={11} />
                {issue.category}
              </span>
              {!issue.isHighConfidence && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-butter/60 bg-butter/20 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-ink/60">
                  <AlertTriangle size={11} />
                  Possible Similar Issue
                </span>
              )}
            </div>

            <p className="mt-4 text-[14px] leading-relaxed text-ink/70">
              {issue.message}
            </p>

            <dl className="mt-8 space-y-5">
              <DetailRow
                icon={Hash}
                label="Total occurrences"
                value={issue.occurrences.toLocaleString()}
              />
              <DetailRow
                icon={Clock}
                label="First seen"
                value={issue.firstSeen ?? "Not captured"}
                mono
              />
              <DetailRow
                icon={ClockArrowUp}
                label="Last seen"
                value={issue.lastSeen ?? "Not captured"}
                mono
              />
              {issue.affectedServices.length > 0 && (
                <DetailRow
                  icon={Network}
                  label="Affected services"
                  value={issue.affectedServices.join(", ")}
                />
              )}
              <DetailRow
                icon={FileText}
                label="Related error variants"
                value={issue.relatedErrors.length.toString()}
              />
              <DetailRow
                icon={Fingerprint}
                label="Confidence"
                value={`${Math.round(issue.confidence * 100)}%`}
              />
            </dl>

            {/* Expandable Technical Details */}
            <div className="mt-8 rounded-xl border border-ink/20 bg-ink/5">
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/55">
                  Technical Details
                </span>
                {showTechnical ? (
                  <ChevronUp size={14} className="text-ink/40" />
                ) : (
                  <ChevronDown size={14} className="text-ink/40" />
                )}
              </button>
              <AnimatePresence>
                {showTechnical && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-ink/10 px-4 py-4 space-y-4">
                      {/* Representative error */}
                      <div>
                        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/40">
                          Representative Error
                        </p>
                        <div className="space-y-1">
                          <p className="font-mono text-[12px] font-semibold text-ink/80">
                            {issue.representativeError.level} &mdash;{" "}
                            {issue.representativeError.occurrences.toLocaleString()} occurrences
                          </p>
                          <p className="font-mono text-[12px] text-ink/60">
                            {issue.representativeError.normalizedMessage}
                          </p>
                        </div>
                      </div>

                      {/* Related errors */}
                      {issue.relatedErrors.length > 1 && (
                        <div>
                          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/40">
                            All Related Variants ({issue.relatedErrors.length})
                          </p>
                          <div className="space-y-2">
                            {issue.relatedErrors.map((eg, i) => (
                              <div
                                key={`${eg.level}-${i}`}
                                className="rounded-lg border border-ink/10 bg-paper px-3 py-2"
                              >
                                <p className="font-mono text-[11px] font-semibold text-ink/70">
                                  {eg.level} &mdash; {eg.occurrences.toLocaleString()}x
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-ink/50">
                                  {eg.normalizedMessage}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raw sample lines */}
                      <div>
                        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/40">
                          Raw Sample Lines
                        </p>
                        <div className="space-y-2">
                          {issue.rawSamples.map((sample, i) => (
                            <pre
                              key={i}
                              className="scroll-thin overflow-x-auto rounded-lg border border-ink bg-ink p-3 font-mono text-[11px] leading-relaxed text-mint"
                            >
                              {sample}
                            </pre>
                          ))}
                        </div>
                      </div>

                      {/* Fingerprint */}
                      <div>
                        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/40">
                          Fingerprint
                        </p>
                        <pre className="scroll-thin overflow-x-auto rounded-lg border border-ink/10 bg-paper px-3 py-2 font-mono text-[11px] text-ink/55">
                          {issue.fingerprint}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink/10 pb-4">
      <dt className="flex items-center gap-2 text-[13px] font-medium text-ink/55">
        <Icon size={14} /> {label}
      </dt>
      <dd
        className={
          mono
            ? "max-w-[60%] truncate font-mono text-[13.5px] font-semibold"
            : "text-[14px] font-semibold"
        }
      >
        {value}
      </dd>
    </div>
  );
}
