// Error Log Analyzer — rule-based parsing engine.
// No AI. Pattern matching, regular expressions, and predefined rules only.
// Enhanced with @v0idd0/logparse for format detection and structured parsing.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logparse = require("@v0idd0/logparse/src/parser");

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

export type LogFormat =
  | "json"
  | "nginx"
  | "apache"
  | "syslog"
  | "text"
  | "unknown";

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
  normalizedMessage: string;
  level: LogLevel;
  severity: Severity;
  occurrences: number;
  firstOccurrence: string | null;
  lastOccurrence: string | null;
  firstLine: number;
  sampleRaw: string;
}

export interface TimeBucket {
  start: string;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  totalCount: number;
}

export interface ErrorFrequency {
  rank: number;
  message: string;
  normalizedMessage: string;
  count: number;
  percentage: number;
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
  detectedFormat: LogFormat;
  timeBuckets: TimeBucket[];
  errorFrequency: ErrorFrequency[];
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
function normalizeMessageLocal(
  line: string,
  level: string,
  timestamp: string | null
): string {
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
    } else if (
      haystack.toLowerCase().includes(rule.pattern.toLowerCase())
    ) {
      return rule.severity;
    }
  }
  if (level === "WARN") return "Medium";
  if (level === "ERROR") return "High";
  return "Low";
}

// Original parseLine — kept as fallback for unsupported formats
export function parseLine(raw: string, lineNumber: number): ParsedLine | null {
  if (!raw.trim()) return null;

  const levelMatch = raw.match(LOG_LEVEL_PATTERN);
  const level = normalizeLevel(levelMatch?.[0]);

  const tsMatch = raw.match(TIMESTAMP_PATTERN);
  const timestamp = tsMatch ? tsMatch[0] : null;

  let message = raw;
  if (levelMatch) {
    message = normalizeMessageLocal(raw, levelMatch[0], timestamp);
  } else {
    message = raw.trim();
  }

  return { raw, lineNumber, level, timestamp, message };
}

function buildTimeBuckets(
  entries: { timestamp: string | null; level: string }[],
  bucketMs: number
): TimeBucket[] {
  const buckets = new Map<
    number,
    { errorCount: number; warnCount: number; infoCount: number; totalCount: number }
  >();

  for (const e of entries) {
    if (!e.timestamp) continue;
    const d = new Date(e.timestamp);
    if (isNaN(d.getTime())) continue;
    const key = Math.floor(d.getTime() / bucketMs) * bucketMs;
    const rec = buckets.get(key) ?? {
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      totalCount: 0,
    };
    rec.totalCount++;
    const lvl = e.level.toLowerCase();
    if (lvl === "error" || lvl === "fatal" || lvl === "critical") rec.errorCount++;
    else if (lvl === "warn" || lvl === "warning") rec.warnCount++;
    else rec.infoCount++;
    buckets.set(key, rec);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, rec]) => ({
      start: new Date(ts).toISOString(),
      ...rec,
    }));
}

// Detect the dominant format from a sample of lines
function detectFormat(content: string): LogFormat {
  const sample = content.split(/\r?\n/).slice(0, 50);
  const formatCounts: Record<string, number> = {};

  for (const line of sample) {
    if (!line.trim()) continue;
    const entry = logparse.parseLine(line);
    if (entry && entry.format) {
      formatCounts[entry.format] = (formatCounts[entry.format] || 0) + 1;
    }
  }

  let best: LogFormat = "unknown";
  let bestCount = 0;
  for (const [fmt, count] of Object.entries(formatCounts)) {
    if (count > bestCount) {
      bestCount = count;
      best = fmt as LogFormat;
    }
  }
  return best;
}

export function analyzeLog(
  content: string,
  fileName: string
): AnalysisResult {
  const lines = content.split(/\r?\n/);
  const levelCounts: Record<string, number> = {};
  const groups = new Map<string, ErrorGroup>();
  let blankOrUnparsedLines = 0;
  let totalLines = 0;

  // Detect format from first 50 lines
  const detectedFormat = detectFormat(content);

  // Parse all lines through @v0idd0/logparse, fall back to our parser
  const parsedEntries: {
    raw: string;
    lineNumber: number;
    level: LogLevel;
    timestamp: string | null;
    message: string;
    normalizedMessage: string;
    format: string;
  }[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (!raw.trim()) {
      blankOrUnparsedLines++;
      continue;
    }
    totalLines++;

    // Try @v0idd0/logparse first
    const lpEntry = logparse.parseLine(raw);

    let level: LogLevel;
    let timestamp: string | null;
    let message: string;
    let normalizedMessage: string;
    let format: string;

    if (lpEntry && !lpEntry.raw) {
      // logparse recognized the format
      level = normalizeLevel(lpEntry.level);
      timestamp = lpEntry.timestamp || null;

      // For nginx/apache, build a descriptive message from extra fields
      if (
        (lpEntry.format === "nginx" || lpEntry.format === "apache") &&
        lpEntry.extra
      ) {
        const extra = lpEntry.extra;
        message = `${extra.method || "UNKNOWN"} ${extra.path || "/"} — ${extra.status || "?"}`;
        // Override severity-relevant level based on HTTP status
        const status = parseInt(extra.status, 10);
        if (status >= 500) level = "ERROR";
        else if (status >= 400) level = "WARN";
        else level = "INFO";
      } else {
        message = lpEntry.message || raw.trim();
      }

      // Use logparse's normalizeMessage for superior grouping
      normalizedMessage = logparse.normalizeMessage(message);
      format = lpEntry.format;
    } else {
      // Fallback to our parser
      const parsed = parseLine(raw, idx + 1);
      if (!parsed) {
        blankOrUnparsedLines++;
        continue;
      }
      level = parsed.level;
      timestamp = parsed.timestamp;
      message = parsed.message;
      normalizedMessage = message.toLowerCase();
      format = "text";
    }

    parsedEntries.push({
      raw,
      lineNumber: idx + 1,
      level,
      timestamp,
      message,
      normalizedMessage,
      format,
    });
  }

  // Grouping + severity classification
  for (const entry of parsedEntries) {
    levelCounts[entry.level] = (levelCounts[entry.level] || 0) + 1;

    const isErrorLike =
      entry.level === "ERROR" ||
      entry.level === "CRITICAL" ||
      entry.level === "FATAL";

    if (!isErrorLike) continue;

    // Use normalized message for grouping — IDs, UUIDs, IPs collapse
    const groupKey = `${entry.level}::${entry.normalizedMessage.toLowerCase()}`;
    const severity = classifySeverity(entry.level, entry.message);
    const existing = groups.get(groupKey);

    if (existing) {
      existing.occurrences++;
      if (entry.timestamp) {
        if (!existing.firstOccurrence || entry.timestamp < existing.firstOccurrence) {
          existing.firstOccurrence = entry.timestamp;
        }
        if (!existing.lastOccurrence || entry.timestamp > existing.lastOccurrence) {
          existing.lastOccurrence = entry.timestamp;
        }
      }
    } else {
      groups.set(groupKey, {
        message: entry.message || "(unlabeled error)",
        normalizedMessage: entry.normalizedMessage,
        level: entry.level,
        severity,
        occurrences: 1,
        firstOccurrence: entry.timestamp,
        lastOccurrence: entry.timestamp,
        firstLine: entry.lineNumber,
        sampleRaw: entry.raw.trim(),
      });
    }
  }

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

  // Time buckets — use 1-hour buckets
  const timeBuckets = buildTimeBuckets(
    parsedEntries.map((e) => ({ timestamp: e.timestamp, level: e.level })),
    3600000
  );

  // Error frequency ranking
  const errorFrequency: ErrorFrequency[] = errors.map((err, i) => ({
    rank: i + 1,
    message: err.message,
    normalizedMessage: err.normalizedMessage,
    count: err.occurrences,
    percentage:
      errorCount > 0
        ? Math.round((err.occurrences / errorCount) * 1000) / 10
        : 0,
  }));

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
    detectedFormat,
    timeBuckets,
    errorFrequency,
    processedAt: new Date().toISOString(),
  };
}
