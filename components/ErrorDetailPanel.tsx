"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Hash, Clock, ClockArrowUp, Tag } from "lucide-react";
import type { ErrorGroup } from "@/lib/logParser";
import { SeverityChip } from "./SeverityChip";

export function ErrorDetailPanel({
  error,
  onClose,
}: {
  error: ErrorGroup | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {error && (
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
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-ink bg-paper p-7 shadow-hard-lg scroll-thin"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink/45">
                Error detail
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
              {error.message}
            </h3>

            <div className="mt-4">
              <SeverityChip severity={error.severity} />
            </div>

            <dl className="mt-8 space-y-5">
              <DetailRow icon={Hash} label="Occurrences" value={error.occurrences.toLocaleString()} />
              <DetailRow icon={Tag} label="Log level" value={error.level} mono />
              <DetailRow
                icon={Clock}
                label="First occurrence"
                value={error.firstOccurrence ?? "Not captured in file"}
                mono
              />
              <DetailRow
                icon={ClockArrowUp}
                label="Last occurrence"
                value={error.lastOccurrence ?? "Not captured in file"}
                mono
              />
            </dl>

            <div className="mt-8">
              <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-ink/45">
                Sample raw line
              </p>
              <pre className="scroll-thin overflow-x-auto rounded-xl border border-ink bg-ink p-4 font-mono text-[12px] leading-relaxed text-mint">
{error.sampleRaw}
              </pre>
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
      <dd className={mono ? "font-mono text-[13.5px] font-semibold" : "text-[14px] font-semibold"}>
        {value}
      </dd>
    </div>
  );
}
