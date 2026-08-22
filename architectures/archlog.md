# Architecture — Error Log Analyzer

Rule-based log file analysis. No AI: regular expressions and ordered rule tables only.

## Flow

```
Log file upload (.log / .txt)
  → POST /api/analyze (multipart FormData)
  → Validation: extension, size ≤ 15 MB, non-empty content
  → lib/logParser.ts — analyzeLog(content, fileName)
      1. Line parsing        — regex extraction of level, timestamp, message per line
      2. Message normalization — strip timestamps, level tokens, scaffolding, numeric IDs
      3. Grouping            — Map keyed by level + normalized message
      4. Occurrence counting — per group; first/last occurrence tracked
      5. Severity detection  — SEVERITY_RULES table (ordered pattern → severity)
                               with level-based fallback
      6. Ranking             — sort by occurrences desc, first line asc
  → AnalysisResult JSON
  → Dashboard UI (components/Dashboard.tsx)
```

## Key pieces

| Piece | Location | Role |
|---|---|---|
| Parsing engine | `lib/logParser.ts` | Pure functions: `parseLine`, `analyzeLog`. No I/O. |
| Severity rules | `SEVERITY_RULES` in `lib/logParser.ts` | Flat, ordered `{ pattern, severity }` list; first match wins |
| API endpoint | `app/api/analyze/route.ts` | Validation boundary; Node.js runtime |
| Upload UI | `components/UploadCard.tsx` | Drag-and-drop box + paste box (both wrap input into a `File`) |
| Results UI | `components/Dashboard.tsx` | Stat cards, ranked error list, detail panel |

## Design constraints

- Stateless: logs are parsed for the duration of the request, never stored.
- Grouping is deterministic: identical messages with different timestamps collapse to one entry.
- Severity rules are data, not code — extending analysis means editing a list.
