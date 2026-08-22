// Error Log Analyzer — rule-based parsing engine.
// No AI. Pattern matching, regular expressions, and predefined rules only.

export type LogLevel =
  | "FATAL"
  | "CRITICAL"
  | "ERROR"
  | "WARN"
  | "WARNING"
  | "INFO"
  | "DEBUG"
  | "UNKNOWN";

export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface SeverityRule {
  pattern: string; // substring or regex source to test against the message/level
  severity: Severity;
  isRegex?: boolean;
}

// 4.6 — Severity rules live in a simple, expandable configuration list.
export const SEVERITY_RULES: SeverityRule[] = [
  { pattern: "FATAL", severity: "Critical" },
  { pattern: "CRITICAL", severity: "Critical" },
  { pattern: "OutOfMemory", severity: "Critical" },
  { pattern: "out of memory", severity: "Critical" },
  { pattern: "deadlock", severity: "Critical" },
  { pattern: "Database connection failed", severity: "High" },
  { pattern: "connection refused", severity: "High" },
  { pattern: "timeout", severity: "High" },
  { pattern: "ERROR", severity: "High" },
  { pattern: "WARN", severity: "Medium" },
];

const LOG_LEVEL_PATTERN =
  /\b(FATAL|CRITICAL|ERROR|WARNING|WARN|INFO|DEBUG)\b/;

// Matches common timestamp shapes at the start of a line, e.g.
// 2026-08-21 10:21:03  or  2026-08-21T10:21:03.123Z  or  [10:21:03]
const TIMESTAMP_PATTERN =
  /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?)|(\d{2}:\d{2}:\d{2})/;

export interface ParsedLine {
  raw: string;
  lineNumber: number;
  level: LogLevel;
  timestamp: string | null;
  message: string;
}

export interface ErrorGroup {
  message: string;
  level: LogLevel;
  severity: Severity;
  occurrences: number;
  firstOccurrence: string | null;
  lastOccurrence: string | null;
  firstLine: number;
  sampleRaw: string;
}

export interface AnalysisResult {
  fileName: string;
  totalLines: number;
  blankOrUnparsedLines: number;
  levelCounts: Record<string, number>;
  errorCount: number; // ERROR + CRITICAL + FATAL
  criticalCount: number;
  warningCount: number;
  uniqueErrorCount: number;
  errors: ErrorGroup[]; // sorted by occurrences desc
  processedAt: string;
}

function normalizeLevel(raw: string | undefined): LogLevel {
  if (!raw) return "UNKNOWN";
  const upper = raw.toUpperCase();
  if (upper === "WARNING") return "WARN";
  if (
    upper === "FATAL" ||
    upper === "CRITICAL" ||
    upper === "ERROR" ||
    upper === "WARN" ||
    upper === "INFO" ||
    upper === "DEBUG"
  ) {
    return upper as LogLevel;
  }
  return "UNKNOWN";
}

// Strip timestamp + level markers so identical errors with different
// timestamps normalize to the same grouping key (4.4 Error Grouping).
function normalizeMessage(line: string, level: string, timestamp: string | null): string {
  let msg = line;
  if (timestamp) msg = msg.replace(timestamp, "");
  msg = msg.replace(new RegExp(`\\b${level}\\b`), "");
  // strip common log scaffolding: brackets, pipes, leading dashes/colons
  msg = msg.replace(/^\s*[\[\(][^\]\)]*[\]\)]\s*/g, "");
  msg = msg.replace(/^[\s:\-|]+/, "");
  // collapse numeric IDs / request ids so "failed for user 123" groups with "user 456"
  msg = msg.replace(/\b\d{3,}\b/g, "#");
  return msg.trim() || line.trim();
}

function classifySeverity(level: LogLevel, message: string): Severity {
  const haystack = `${level} ${message}`;
  for (const rule of SEVERITY_RULES) {
    if (rule.isRegex) {
      if (new RegExp(rule.pattern, "i").test(haystack)) return rule.severity;
    } else if (haystack.toLowerCase().includes(rule.pattern.toLowerCase())) {
      return rule.severity;
    }
  }
  if (level === "WARN") return "Medium";
  if (level === "ERROR") return "High";
  return "Low";
}

export function parseLine(raw: string, lineNumber: number): ParsedLine | null {
  if (!raw.trim()) return null;

  const levelMatch = raw.match(LOG_LEVEL_PATTERN);
  const level = normalizeLevel(levelMatch?.[0]);

  const tsMatch = raw.match(TIMESTAMP_PATTERN);
  const timestamp = tsMatch ? tsMatch[0] : null;

  let message = raw;
  if (levelMatch) {
    message = normalizeMessage(raw, levelMatch[0], timestamp);
  } else {
    message = raw.trim();
  }

  return { raw, lineNumber, level, timestamp, message };
}

export function analyzeLog(content: string, fileName: string): AnalysisResult {
  const lines = content.split(/\r?\n/);
  const levelCounts: Record<string, number> = {};
  const groups = new Map<string, ErrorGroup>();
  let blankOrUnparsedLines = 0;
  let totalLines = 0;

  lines.forEach((raw, idx) => {
    if (!raw.trim()) {
      blankOrUnparsedLines++;
      return;
    }
    totalLines++;
    const parsed = parseLine(raw, idx + 1);
    if (!parsed) {
      blankOrUnparsedLines++;
      return;
    }

    levelCounts[parsed.level] = (levelCounts[parsed.level] || 0) + 1;

    const isErrorLike =
      parsed.level === "ERROR" ||
      parsed.level === "CRITICAL" ||
      parsed.level === "FATAL";

    if (!isErrorLike) return;

    const key = `${parsed.level}::${parsed.message.toLowerCase()}`;
    const severity = classifySeverity(parsed.level, parsed.message);
    const existing = groups.get(key);

    if (existing) {
      existing.occurrences++;
      if (parsed.timestamp) {
        existing.lastOccurrence = parsed.timestamp;
        if (!existing.firstOccurrence) existing.firstOccurrence = parsed.timestamp;
      }
    } else {
      groups.set(key, {
        message: parsed.message || "(unlabeled error)",
        level: parsed.level,
        severity,
        occurrences: 1,
        firstOccurrence: parsed.timestamp,
        lastOccurrence: parsed.timestamp,
        firstLine: parsed.lineNumber,
        sampleRaw: parsed.raw.trim(),
      });
    }
  });

  const errors = Array.from(groups.values()).sort(
    (a, b) => b.occurrences - a.occurrences || a.firstLine - b.firstLine
  );

  const errorCount =
    (levelCounts["ERROR"] || 0) +
    (levelCounts["CRITICAL"] || 0) +
    (levelCounts["FATAL"] || 0);
  const criticalCount =
    (levelCounts["CRITICAL"] || 0) + (levelCounts["FATAL"] || 0);
  const warningCount = levelCounts["WARN"] || 0;

  return {
    fileName,
    totalLines,
    blankOrUnparsedLines,
    levelCounts,
    errorCount,
    criticalCount,
    warningCount,
    uniqueErrorCount: errors.length,
    errors,
    processedAt: new Date().toISOString(),
  };
}
