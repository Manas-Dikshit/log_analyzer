// Terminal Error Analyzer — rule-based parsing engine.
// No AI. Pattern matching, regular expressions, and predefined rules only.

import type { Severity } from "./logParser";

export const TERMINAL_SEVERITY_RULES: { pattern: string; severity: Severity }[] = [
  { pattern: "segmentation fault", severity: "Critical" },
  { pattern: "out of memory", severity: "Critical" },
  { pattern: "heap out of memory", severity: "Critical" },
  { pattern: "panic:", severity: "Critical" },
  { pattern: "fatal", severity: "Critical" },
  { pattern: "econnrefused", severity: "High" },
  { pattern: "econnreset", severity: "High" },
  { pattern: "etimedout", severity: "High" },
  { pattern: "timeout", severity: "High" },
  { pattern: "eacces", severity: "High" },
  { pattern: "eperm", severity: "High" },
  { pattern: "enoent", severity: "High" },
  { pattern: "cannot find module", severity: "High" },
  { pattern: "build failed", severity: "High" },
  { pattern: "compilation failed", severity: "High" },
  { pattern: "exception", severity: "High" },
  { pattern: "npm err!", severity: "High" },
  { pattern: "error", severity: "High" },
  { pattern: "deprecated", severity: "Medium" },
  { pattern: "warn", severity: "Medium" },
];

const SEVERITY_RANK: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

// Matches common timestamp shapes, e.g. 2026-08-22 10:21:03 or [10:21:03] or ISO.
const TIMESTAMP_PATTERN =
  /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?)|(\d{2}:\d{2}:\d{2})/;

const COMMAND_PATTERNS = [
  /^\$\s+\S/, // $ npm run build
  /^❯\s*\S/, // ❯ command
  /^PS [^>]*>\s*\S/, // PS C:\project> command
  /^[A-Za-z]:\\[^>]*>\s*\S/, // C:\project> command
];

const STACK_FRAME_PATTERNS = [
  /^\s+at\s+\S/, // at Object.<anonymous> (file.js:12:34)
  /^\s+File "[^"]+", line \d+/, // Python traceback frame
  /^\s+#[\d\s]+(?:\s+0x[\da-fA-F]+)?/m, // Go/C panic trace index
];

const ERROR_LINE_PATTERNS: RegExp[] = [
  /\b(FATAL|CRITICAL|ERROR)\b/,
  /^\[(?:error|ERROR)\]/,
  /^(?:TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|AggregateError)\b/,
  /^Error\b/,
  /Error:\s/,
  /^UnhandledPromiseRejection/,
  /^Traceback \(most recent call last\):/,
  /^npm ERR!/,
  /^yarn error/,
  /Segmentation fault/i,
  /core dumped/i,
  /BUILD\s+FAILED/,
  /Compilation failed/,
  /FAILED\s+\|/,
  /✗|×.*failed/i,
  /^panic:/,
  /Exception in thread/,
  /command not found/,
  /is not recognized as an internal or external command/,
];

const WARNING_LINE_PATTERNS: RegExp[] = [
  /\b(WARNING|WARN)\b/,
  /^\[(?:warn|WARN)\]/,
  /^Warning:\s/,
  /^npm WARN/,
  /deprecat/i,
  /^\(node:\d+\) \w*Warning/,
];

const EXCEPTION_TYPE_PATTERN =
  /\b[A-Z][A-Za-z0-9_]*(?:Error|Exception|Fault|Rejection)\b|\bSegmentation fault\b|^panic:/;

const FILE_PATH_PATTERN =
  /(?:[A-Za-z]:)?(?:[\\/][\w.@+-]+)+\.(?:ts|tsx|js|jsx|mjs|cjs|json|py|go|rb|java|php|css|scss|html|yml|yaml|log|txt|sh|sql)\b/gi;

const PATH_LINENO_PATTERN = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|py|go|rb|java|php|css|scss|html|yml|yaml|log|txt|sh|sql)[:](\d+)(?::\d+)?/i;
const PYTHON_LINENO_PATTERN = /File "[^"]+", line (\d+)/;
const ON_LINE_NUMBER_PATTERN = /\bon line (\d+)\b/i;

export interface TerminalIssue {
  kind: "error" | "warning";
  message: string;
  severity: Severity;
  errorType: string | null;
  filePath: string | null;
  lineNumber: number | null;
  timestamp: string | null;
  occurrences: number;
  firstLine: number;
  lastLine: number;
  stackFrames: number;
  sampleRaw: string;
}

export interface TerminalCommand {
  command: string;
  occurrences: number;
}

export interface TerminalAnalysisResult {
  totalLines: number;
  commandCount: number;
  errorCount: number;
  warningCount: number;
  stackFrameCount: number;
  uniqueIssueCount: number;
  issues: TerminalIssue[];
  commands: TerminalCommand[];
  processedAt: string;
}

function extractTimestamp(line: string): string | null {
  return line.match(TIMESTAMP_PATTERN)?.[0] ?? null;
}

function extractFilePath(line: string): string | null {
  const matches = line.match(FILE_PATH_PATTERN);
  if (matches && matches.length > 0) {
    // Prefer the shortest match — usually the source file, not a URL prefix.
    return matches.sort((a, b) => a.length - b.length)[0];
  }
  return null;
}

function extractLineNumber(line: string): number | null {
  const pathMatch = line.match(PATH_LINENO_PATTERN);
  if (pathMatch) return parseInt(pathMatch[1], 10);
  const pyMatch = line.match(PYTHON_LINENO_PATTERN);
  if (pyMatch) return parseInt(pyMatch[1], 10);
  const onLineMatch = line.match(ON_LINE_NUMBER_PATTERN);
  if (onLineMatch) return parseInt(onLineMatch[1], 10);
  return null;
}

function extractErrorType(line: string): string | null {
  const match = line.match(EXCEPTION_TYPE_PATTERN);
  if (match) return match[0].replace(/:$/, "");
  const npm = line.match(/^npm ERR! (\S+)/);
  if (npm) return `npm ${npm[1]}`;
  return null;
}

// Strip volatile details so similar lines group together:
// timestamps, file paths, numbers, hex addresses, quoted strings.
function normalizeLine(raw: string): string {
  let msg = raw.trim();
  msg = msg.replace(TIMESTAMP_PATTERN, "");
  msg = msg.replace(FILE_PATH_PATTERN, "<path>");
  msg = msg.replace(/\b0x[\da-fA-F]+\b/g, "<addr>");
  msg = msg.replace(/"[^"]*"/g, '"…"');
  msg = msg.replace(/'[^']*'/g, "'…'");
  msg = msg.replace(/\b\d[\d.,]*\b/g, "#");
  msg = msg.replace(/\s+/g, " ");
  return msg.trim();
}

function classifySeverity(kind: "error" | "warning", raw: string): Severity {
  const haystack = raw.toLowerCase();
  for (const rule of TERMINAL_SEVERITY_RULES) {
    if (haystack.includes(rule.pattern.toLowerCase())) return rule.severity;
  }
  if (kind === "error") return "High";
  return "Medium";
}

function isStackFrame(line: string): boolean {
  return STACK_FRAME_PATTERNS.some((p) => p.test(line));
}

interface ClassifiedLine {
  kind: "command" | "stack-frame" | "error" | "warning" | "other";
  raw: string;
  lineNumber: number;
  command?: string;
}

function classifyLine(raw: string, lineNumber: number): ClassifiedLine {
  const trimmedStart = raw.trimStart();

  for (const p of COMMAND_PATTERNS) {
    const m = raw.match(p);
    if (m) {
      // Strip the prompt ($ / ❯ / PS ...>) but keep the command itself.
      const command = raw.slice(m[0].length).trim() || trimmedStart.trim();
      return { kind: "command", raw, lineNumber, command };
    }
  }

  if (isStackFrame(raw)) return { kind: "stack-frame", raw, lineNumber };

  if (WARNING_LINE_PATTERNS.some((p) => p.test(raw))) {
    return { kind: "warning", raw, lineNumber };
  }
  if (ERROR_LINE_PATTERNS.some((p) => p.test(raw))) {
    return { kind: "error", raw, lineNumber };
  }

  return { kind: "other", raw, lineNumber };
}

export function analyzeTerminalOutput(content: string): TerminalAnalysisResult {
  const lines = content.split(/\r?\n/);
  const issues = new Map<string, TerminalIssue>();
  const commands = new Map<string, TerminalCommand>();
  let totalLines = 0;
  let commandCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let stackFrameCount = 0;

  lines.forEach((raw, idx) => {
    if (!raw.trim()) return;
    totalLines++;

    const classified = classifyLine(raw, idx + 1);

    if (classified.kind === "command") {
      commandCount++;
      const cmd = classified.command!;
      const existing = commands.get(cmd);
      if (existing) existing.occurrences++;
      else commands.set(cmd, { command: cmd, occurrences: 1 });
      return;
    }

    if (classified.kind === "stack-frame") {
      stackFrameCount++;
      // Attach the frame to the most recent issue so each issue reports
      // how deep its stack trace went.
      const candidates = Array.from(issues.values());
      const latest = candidates
        .filter((i) => i.lastLine < classified.lineNumber)
        .sort((a, b) => b.lastLine - a.lastLine)[0];
      if (latest) latest.stackFrames++;
      return;
    }

    if (classified.kind !== "error" && classified.kind !== "warning") return;

    if (classified.kind === "error") errorCount++;
    else warningCount++;

    const normalized = normalizeLine(raw);
    const key = `${classified.kind}::${normalized.toLowerCase()}`;
    const timestamp = extractTimestamp(raw);

    const existing = issues.get(key);
    if (existing) {
      existing.occurrences++;
      existing.lastLine = classified.lineNumber;
      if (!existing.timestamp && timestamp) existing.timestamp = timestamp;
    } else {
      issues.set(key, {
        kind: classified.kind,
        message: normalized || raw.trim(),
        severity: classifySeverity(classified.kind, raw),
        errorType: extractErrorType(raw),
        filePath: extractFilePath(raw),
        lineNumber: extractLineNumber(raw),
        timestamp,
        occurrences: 1,
        firstLine: classified.lineNumber,
        lastLine: classified.lineNumber,
        stackFrames: 0,
        sampleRaw: raw.trim(),
      });
    }
  });

  const sortedIssues = Array.from(issues.values()).sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.occurrences - a.occurrences ||
      a.firstLine - b.firstLine
  );

  const sortedCommands = Array.from(commands.values()).sort(
    (a, b) => b.occurrences - a.occurrences
  );

  return {
    totalLines,
    commandCount,
    errorCount,
    warningCount,
    stackFrameCount,
    uniqueIssueCount: sortedIssues.length,
    issues: sortedIssues,
    commands: sortedCommands,
    processedAt: new Date().toISOString(),
  };
}
