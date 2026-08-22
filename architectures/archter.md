# Architecture — Terminal Error Analyzer

Rule-based terminal/command output analysis. No AI: regular expressions and ordered rule tables only.
Shares the visual language and `Severity` type with the Error Log Analyzer; parsing is separate.

## Flow

```mermaid
flowchart TD
    A[Pasted terminal output] --> B["POST /api/analyze-terminal<br/>(JSON { text })"]
    B --> C{Validation:<br/>non-empty · size ≤ 15 MB}
    C -- invalid --> C1[4xx JSON error]
    C -- valid --> D["analyzeTerminalOutput(text)<br/>lib/terminalParser.ts"]
    D --> E{"Per-line classification<br/>(ordered rules)"}
    E -->|command| F[Command extraction — $ / ❯ / PS> / CMD>]
    E -->|stack frame| G[Attach to nearest preceding issue]
    E -->|warning / error| H[Detail extraction:<br/>error type · path · line · timestamp]
    E -->|other| Z[Counted, not grouped]
    H --> I["Normalization —<br/>paths → &lt;path&gt; · hex → &lt;addr&gt; · numbers → #"]
    I --> J[Grouping by kind + normalized message]
    J --> K[Occurrence counting + first/last line]
    K --> L["Severity detection — TERMINAL_SEVERITY_RULES<br/>(ordered pattern → severity)"]
    L --> M[Rank: severity → occurrences → first line]
    F --> N["TerminalAnalysisResult JSON<br/>(issues + commands + counters)"]
    G --> N
    M --> N
    N --> O["Results UI — app/terminal/page.tsx<br/>(stat cards · commands · ranked issues)"]
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
