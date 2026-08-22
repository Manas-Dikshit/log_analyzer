"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { clsx } from "clsx";

const FAQS = [
  {
    q: "Does this use AI to explain my errors?",
    a: "No. The MVP is intentionally rule-based — regular expressions detect log levels and messages, and a small configuration table assigns severity. Nothing is sent to a language model.",
  },
  {
    q: "What file types can I upload?",
    a: "Plain .log or .txt files. Each line is expected to contain a log level (ERROR, WARN, INFO, DEBUG, CRITICAL, FATAL) and, ideally, a timestamp.",
  },
  {
    q: "How are identical errors grouped?",
    a: "Messages are normalized — timestamps and numeric IDs are stripped — then matched by log level and text, so 'failed for user 123' and 'failed for user 456' still group together.",
  },
  {
    q: "Is my log file stored anywhere?",
    a: "No. The file is parsed for the length of your session to produce the summary you see. This MVP has no database, accounts, or persistence layer.",
  },
  {
    q: "Can I add my own severity rules?",
    a: "Yes — severity rules live in one small, readable list (see the table above) that's built to be extended as new failure patterns show up in your systems.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
      <p className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-ink/45">
        FAQ
      </p>
      <h2 className="mb-10 font-display text-3xl font-bold tracking-tight sm:text-[2.2rem]">
        Good to know
      </h2>

      <div className="divide-y divide-ink/15 rounded-2xl border border-ink">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="px-6">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
                aria-expanded={isOpen}
              >
                <span className="font-semibold">{f.q}</span>
                <Plus
                  size={18}
                  className={clsx(
                    "shrink-0 transition-transform duration-200",
                    isOpen && "rotate-45"
                  )}
                />
              </button>
              <div
                className={clsx(
                  "grid transition-all duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                )}
                style={{ display: "grid" }}
              >
                <div className="overflow-hidden">
                  <p className="text-[14.5px] leading-relaxed text-ink/60">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
