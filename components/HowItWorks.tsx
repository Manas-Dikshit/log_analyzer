import { Upload, ScanSearch, Layers, ListOrdered } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Upload",
    body: "Drop a .log or .txt file. It's read directly — nothing leaves your session to train a model.",
    tone: "lav" as const,
  },
  {
    icon: ScanSearch,
    title: "Match",
    body: "Regular expressions pull out the timestamp, log level, and message from every line.",
    tone: "mint" as const,
  },
  {
    icon: Layers,
    title: "Group & count",
    body: "Identical error messages collapse into one entry with an occurrence count, first seen, and last seen.",
    tone: "butter" as const,
  },
  {
    icon: ListOrdered,
    title: "Rank by severity",
    body: "A small rules table — not a model — tags each error Critical, High, or Medium so you know what to fix first.",
    tone: "blush" as const,
  },
];

const toneClass = {
  lav: "bg-lav",
  mint: "bg-mint",
  butter: "bg-butter",
  blush: "bg-blush",
};

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
      <div className="mb-12 max-w-xl">
        <p className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-ink/45">
          How it works
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[2.2rem]">
          Four rule-based steps. No model, no guessing.
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="rounded-2xl border border-ink bg-paper p-6 shadow-hard-sm"
          >
            <div
              className={`mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-ink ${toneClass[s.tone]}`}
            >
              <s.icon size={19} strokeWidth={2.1} />
            </div>
            <p className="mb-1.5 font-mono text-[11px] font-bold text-ink/40">
              0{i + 1}
            </p>
            <h3 className="mb-2 font-display text-lg font-bold tracking-tight">
              {s.title}
            </h3>
            <p className="text-[14px] leading-relaxed text-ink/60">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
