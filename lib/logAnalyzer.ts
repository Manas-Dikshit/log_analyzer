// Enhanced log analyzer using @v0idd0/logparse for format detection
// and structured parsing. Server-only — imports a CJS module with `fs`.
// Falls back to the existing parser for unsupported formats.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logparse = require("@v0idd0/logparse/src/parser");

import {
  type LogLevel,
  type LogFormat,
  type ErrorGroup,
  type TimeBucket,
  type ErrorFrequency,
  type AnalysisResult,
  normalizeLevel,
  normalizeMessageLocal,
  classifySeverity,
  parseLine,
} from "./logParser";

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

  const detectedFormat = detectFormat(content);

  const parsedEntries: {
    raw: string;
    lineNumber: number;
    level: LogLevel;
    timestamp: string | null;
    message: string;
    normalizedMessage: string;
  }[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (!raw.trim()) {
      blankOrUnparsedLines++;
      continue;
    }
    totalLines++;

    const lpEntry = logparse.parseLine(raw);

    let level: LogLevel;
    let timestamp: string | null;
    let message: string;
    let normalizedMessage: string;

    if (lpEntry && !lpEntry.raw) {
      level = normalizeLevel(lpEntry.level);
      timestamp = lpEntry.timestamp || null;

      if (
        (lpEntry.format === "nginx" || lpEntry.format === "apache") &&
        lpEntry.extra
      ) {
        const extra = lpEntry.extra;
        message = `${extra.method || "UNKNOWN"} ${extra.path || "/"} — ${extra.status || "?"}`;
        const status = parseInt(extra.status, 10);
        if (status >= 500) level = "ERROR";
        else if (status >= 400) level = "WARN";
        else level = "INFO";
      } else {
        message = lpEntry.message || raw.trim();
      }

      normalizedMessage = logparse.normalizeMessage(message);
    } else {
      const parsed = parseLine(raw, idx + 1);
      if (!parsed) {
        blankOrUnparsedLines++;
        continue;
      }
      level = parsed.level;
      timestamp = parsed.timestamp;
      message = parsed.message;
      normalizedMessage = message.toLowerCase();
    }

    parsedEntries.push({
      raw,
      lineNumber: idx + 1,
      level,
      timestamp,
      message,
      normalizedMessage,
    });
  }

  for (const entry of parsedEntries) {
    levelCounts[entry.level] = (levelCounts[entry.level] || 0) + 1;

    const isErrorLike =
      entry.level === "ERROR" ||
      entry.level === "CRITICAL" ||
      entry.level === "FATAL";

    if (!isErrorLike) continue;

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

  const timeBuckets = buildTimeBuckets(
    parsedEntries.map((e) => ({ timestamp: e.timestamp, level: e.level })),
    3600000
  );

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
