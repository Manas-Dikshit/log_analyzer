import { SEVERITY_RULES } from "@/lib/logParser";
import { SeverityChip } from "./SeverityChip";

export function RulesTable() {
  return (
    <section id="rules" className="bg-ink py-20 text-paper">
      <div className="mx-auto max-w-4xl px-6 sm:px-10">
        <p className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-paper/45">
          Configuration, not a black box
        </p>
        <h2 className="mb-3 font-display text-3xl font-bold tracking-tight sm:text-[2.2rem]">
          Severity comes from a plain rules list
        </h2>
        <p className="mb-10 max-w-lg text-[15px] leading-relaxed text-paper/60">
          Every pattern below lives in one small config so it's easy to read, and easy to extend
          as your systems grow new failure modes.
        </p>

        <div className="overflow-hidden rounded-2xl border border-paper/20">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-paper/20 bg-paper/5">
                <th className="px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-paper/50">
                  Keyword / pattern
                </th>
                <th className="px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-paper/50">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody>
              {SEVERITY_RULES.map((rule, i) => (
                <tr
                  key={rule.pattern}
                  className={i !== SEVERITY_RULES.length - 1 ? "border-b border-paper/10" : ""}
                >
                  <td className="px-5 py-3.5 font-mono text-[13.5px] text-paper/85">
                    {rule.pattern}
                  </td>
                  <td className="px-5 py-3.5">
                    <SeverityChip severity={rule.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
