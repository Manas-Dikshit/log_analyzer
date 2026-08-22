# Logline — Error Log Analyzer (MVP)

A rule-based log analyzer built with Next.js 14 (App Router) + TypeScript + Tailwind CSS.
Upload a `.log`/`.txt` file, and it's parsed with plain regular expressions — grouped,
counted, and ranked by severity. No AI involved, by design.

## Features

- Drag-and-drop or click-to-upload `.log` / `.txt` files (plus a bundled sample file)
- Server-side rule-based parsing (`lib/logParser.ts`) — log level detection, message
  normalization, grouping, and severity classification via a small, editable rules table
- Dashboard: total lines, error/critical/warning counts, unique error count
- Ranked "Top errors" list with occurrence counts and severity chips
- Detail panel per error: severity, log level, first/last occurrence, raw sample line
- Fully responsive, keyboard-accessible, `prefers-reduced-motion` respected

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  api/analyze/route.ts   # POST endpoint — receives a file, returns AnalysisResult JSON
  page.tsx                # Landing + upload + results, single-page flow
  layout.tsx               # Fonts, metadata
components/                # Hero, upload dropzone, dashboard, detail panel, etc.
lib/logParser.ts           # Core rule-based parsing engine + severity rules config
public/sample/application.log  # Sample log used by "Try sample log"
```

## Extending severity rules

Edit `SEVERITY_RULES` in `lib/logParser.ts` — it's a flat, ordered list of
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

## What's intentionally not in this MVP

Per the product spec: no AI-based explanations, no authentication, no real-time monitoring,
no cloud log integrations, and no persistence layer. The file is parsed for the length of
the request and never stored.
