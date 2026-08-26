<div align="center">

# Logline

**Error Log Analyzer — MVP**

Upload a `.log` / `.txt` / `.json` / `.jsonl` file or paste log text directly. Parsed with
`@v0idd0/logparse` for multi-format detection and our own rule-based engine for severity
classification, grouping, and ranking. No AI involved, by design.

A second tool, the **Terminal Error Analyzer** ([`/terminal`](app/terminal/page.tsx)),
does the same for pasted terminal/command output: errors, warnings, stack traces, and
commands are detected, grouped, and ranked most-important-first.

Architecture docs: [`architectures/archlog.md`](architectures/archlog.md) (Log Analyzer),
[`architectures/archter.md`](architectures/archter.md) (Terminal Analyzer).

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

<img src="public/sample/logline.png" alt="Logline application UI" width="820" />

</div>

---

## Features

| Input | Analysis | Output |
|---|---|---|
| Drag-and-drop or click-to-upload `.log` / `.txt` / `.json` / `.jsonl` files, plus a bundled sample | Auto-format detection via [`@v0idd0/logparse`](https://www.npmjs.com/package/@v0idd0/logparse): JSON, plain text, Nginx, Apache, Syslog, Python logging | Dashboard: total lines, error / critical / warning counts, unique error count |
| Side-by-side paste box for raw log text — same endpoint, same analysis | Structured parsing: timestamps, levels, and messages extracted per format | Format detection indicator showing the detected log format |
| | Dynamic-value normalization: UUIDs, IPs, hex addresses, and numeric IDs collapse for grouping | Severity filter: All / Critical / High / Medium / Low |
| | Editable severity rules table (`SEVERITY_RULES`) | Time-bucket error counts (hourly) |
| | Graceful fallback to regex parser for unsupported formats | Error frequency ranking with percentage breakdown |

- Detail panel per error: severity, log level, first/last occurrence, normalized signature, raw sample line
- Fully responsive, keyboard-accessible, `prefers-reduced-motion` respected

### Supported log formats

| Format | Detection | Level mapping |
|---|---|---|
| JSON / JSONL | `{` prefix, parses `level`/`lvl`/`severity` fields | Maps `warning` → `warn`, `critical` → `fatal` |
| Plain text | Timestamp + level keyword patterns | FATAL, CRITICAL, ERROR, WARNING, WARN, INFO, DEBUG |
| Nginx combined | IP + timestamp + request + status | 5xx → error, 4xx → warn, else → info |
| Apache common | IP + timestamp + request + status | Same as Nginx |
| Syslog RFC 3164 | `<pri>month day host proc[pid]: msg` | Defaults to info |
| Python logging | `timestamp - logger - LEVEL - msg` | Full level support including CRITICAL |

### Terminal Error Analyzer (`/terminal`)

- Large paste box for terminal / command output with a single Analyze button
- ANSI/VT normalization first: pasted escape sequences (colors, cursor/title
  controls) are tokenized and stripped with [`@ansi-tools/parser`](https://www.npmjs.com/package/@ansi-tools/parser)
  before detection — original lines are preserved verbatim alongside the
  normalized ones so every match can be verified
- Rule-based detection of errors, warnings, stack-trace frames, and entered commands
  (npm/pnpm/yarn, Git, Python, Node.js, Next.js, Java/Maven/Gradle, Docker, databases,
  network, permissions, build errors, command errors)
- JavaScript/Node stack traces are additionally parsed into structured frames
  (function · file · line · column) via [`error-stack-parser`](https://www.npmjs.com/package/error-stack-parser);
  non-JS traces (Python, Java, GDB…) fall back to regex frame detection
- Normalization + grouping: recurring failures collapse into one ranked issue
- Extracted details per issue: error type, file path, line number, timestamp (when present)
- Ranked "Most important issues" list — severity first, then occurrence count — with an
  expandable detail view per row: structured frames, normalized lines, and raw terminal lines

Both analyzers are fully rule-based — no AI and no external APIs.

## Tech stack

<div align="center">

<a href="https://nextjs.org"><img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,nodejs&perline=10" alt="Next.js, React, TypeScript, Tailwind CSS, Node.js" /></a>

</div>

## Getting started

```bash
git clone <your-repo-url>
cd log-analyzer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the analyzer tests (Node built-in test runner):

```bash
npm test
```

## Project structure

```text
app/
  api/analyze/route.ts         # POST endpoint — receives a file, returns AnalysisResult JSON
  api/analyze-terminal/route.ts # POST endpoint — receives pasted terminal output (JSON)
  page.tsx                     # Landing + upload + results, single-page flow
  terminal/page.tsx            # Terminal Error Analyzer: paste box + results dashboard
architectures/                 # Architecture docs for both analyzers
components/                    # Hero, upload dropzone + paste box, dashboard, detail panel, etc.
lib/logParser.ts               # Types, severity rules, fallback parser (client-safe)
lib/logAnalyzer.ts             # Enhanced analyzer with @v0idd0/logparse (server-only)
lib/terminalRules.ts           # Terminal category rule tables (regex patterns + explanations)
lib/terminalParser.ts          # Terminal output engine: ANSI normalization (@ansi-tools/parser),
                               #   structured stack parsing (error-stack-parser), rule matching
tests/logAnalyzer.test.ts      # node:test suite — all log format support, normalization, grouping
tests/terminalAnalyzer.test.ts # node:test suite — ANSI output, JS stack traces, mixed input
next.config.mjs                # React strict mode; explicit Turbopack root (this project dir)
public/sample/application.log  # Sample log used by "Try sample log"
```

## Extending severity rules

Edit `SEVERITY_RULES` in `lib/logParser.ts` — a flat, ordered list of
`{ pattern, severity }` pairs matched top-to-bottom against each error's level + message.

## Deployment

This is a standard Next.js app — deploy it anywhere Next.js is supported.

### Vercel (recommended)

```bash
npm i -g vercel
vercel
```

Or connect the repo at [vercel.com/new](https://vercel.com/new) — no environment variables
are required, and the default build command (`next build`) works out of the box.

### Any Node host

```bash
npm run build
npm run start
```

## What is intentionally not in this MVP

Per the product spec: no AI-based explanations, no authentication, no real-time monitoring,
no cloud log integrations, and no persistence layer. Logs are parsed for the length of the
request and never stored.

---

<div align="center">

Made by MRD with ❤️

</div>
