# Architecture — Terminal Error Analyzer

Rule-based terminal/command output analysis. No AI: regular expressions and ordered rule tables only.
Shares the visual language and `Severity` type with the Error Log Analyzer; parsing is separate.

## Flow

```
Pasted terminal output
  → POST /api/analyze-terminal (JSON { text })
  → Validation: non-empty, size ≤ 15 MB
  → lib/terminalParser.ts — analyzeTerminalOutput(text)
      1. Line classification — ordered rules per line:
           command      (prompts: $, ❯, PS>, C:\>)
           stack frame  (at …, File "…", line N, panic frame indexes)
           warning      (WARN/WARNING/[warn]/Warning:/npm WARN/deprecat*)
           error        (ERROR/FATAL, TypeError|…Error:, npm ERR!, Traceback,
                         panic:, Segmentation fault, BUILD FAILED, …)
           other        (ignored for issues, still counted)
      2. Detail extraction   — error type, file path, line number, timestamp
                               (regex capture from the raw line)
      3. Normalization       — strip timestamps, paths → <path>, hex → <addr>,
                               numbers → #, quoted strings → "…"
      4. Grouping            — Map keyed by kind + normalized message
      5. Occurrence counting — per group; first/last line numbers;
                               stack frames attached to nearest preceding issue
      6. Severity detection  — TERMINAL_SEVERITY_RULES table (ordered
                               pattern → severity) with kind-based fallback
      7. Ranking             — severity first (Critical > High > Medium > Low),
                               then occurrences desc, then first line asc
  → TerminalAnalysisResult JSON (issues + detected commands + counters)
  → Results UI (app/terminal/page.tsx): stat cards, commands detected,
    ranked issue list with expandable raw sample
```

## Key pieces

| Piece | Location | Role |
|---|---|---|
| Parsing engine | `lib/terminalParser.ts` | Pure functions: `classifyLine`, `analyzeTerminalOutput`. No I/O. |
| Severity rules | `TERMINAL_SEVERITY_RULES` in `lib/terminalParser.ts` | Flat, ordered pattern → severity list; first match wins |
| API endpoint | `app/api/analyze-terminal/route.ts` | Validation boundary; Node.js runtime; JSON body (not FormData) |
| Page | `app/terminal/page.tsx` | `/terminal` route: paste box, Analyze button, results dashboard |
| Shared components | `components/StatCard`, `components/SeverityChip`, `components/Nav`, `components/Footer` | Reused unchanged |

## Design constraints

- Stateless: pasted output is analyzed in-request, never stored.
- Grouping is deterministic: volatile details (paths, addresses, IDs) are normalized away,
  so recurring failures collapse into one ranked issue.
- "Most important first" = severity rank, then occurrence count — not chronological order.
