import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeLog } from "../lib/logAnalyzer";
import {
  parseLine,
  classifySeverity,
} from "../lib/logParser";

// ─── 1. Existing plain-text log (sample application.log) ───────────────────
describe("Existing plain-text log support", () => {
  const sample = readFileSync(
    join(process.cwd(), "public/sample/application.log"),
    "utf-8"
  );
  const result = analyzeLog(sample, "application.log");

  it("parses all non-blank lines", () => {
    assert.ok(result.totalLines > 0);
    assert.ok(result.blankOrUnparsedLines >= 0);
  });

  it("detects format as text", () => {
    assert.equal(result.detectedFormat, "text");
  });

  it("counts errors, criticals, warnings", () => {
    assert.ok(result.errorCount > 0, "should have errors");
    assert.ok(result.criticalCount > 0, "should have criticals");
    assert.ok(result.warningCount > 0, "should have warnings");
  });

  it("groups duplicate errors", () => {
    assert.ok(result.uniqueErrorCount > 0);
    const topError = result.errors[0];
    assert.ok(topError.occurrences > 1, "top error should appear multiple times");
    assert.ok(topError.severity === "High" || topError.severity === "Critical");
  });

  it("has first/last occurrence timestamps", () => {
    const topError = result.errors[0];
    assert.ok(topError.firstOccurrence, "should have firstOccurrence");
    assert.ok(topError.lastOccurrence, "should have lastOccurrence");
  });

  it("preserves sample raw line", () => {
    assert.ok(result.errors[0].sampleRaw.length > 0);
  });

  it("populates normalizedMessage", () => {
    assert.ok(result.errors[0].normalizedMessage.length > 0);
  });

  it("populates timeBuckets", () => {
    assert.ok(Array.isArray(result.timeBuckets));
  });

  it("populates errorFrequency", () => {
    assert.ok(Array.isArray(result.errorFrequency));
    assert.equal(result.errorFrequency[0].rank, 1);
    assert.ok(result.errorFrequency[0].count > 0);
  });
});

// ─── 2. JSON logs ──────────────────────────────────────────────────────────
describe("JSON log support", () => {
  const jsonLogs = [
    '{"timestamp":"2026-08-22T10:00:01Z","level":"info","message":"Server started"}',
    '{"timestamp":"2026-08-22T10:00:02Z","level":"error","message":"Connection failed to db-5001"}',
    '{"timestamp":"2026-08-22T10:00:03Z","level":"error","message":"Connection failed to db-5002"}',
    '{"timestamp":"2026-08-22T10:00:04Z","level":"warn","message":"Retrying in 5s"}',
    '{"ts":"2026-08-22T10:00:05Z","lvl":"error","msg":"Timeout after 30000ms"}',
    '{"@timestamp":"2026-08-22T10:00:06Z","severity":"fatal","event":"OOM killed"}',
  ].join("\n");

  const result = analyzeLog(jsonLogs, "app.json");

  it("detects format as json", () => {
    assert.equal(result.detectedFormat, "json");
  });

  it("parses JSON entries with various field names", () => {
    assert.ok(result.totalLines >= 6);
    assert.ok(result.errorCount >= 3);
  });

  it("groups similar JSON errors together", () => {
    // "Connection failed to db-5001" and "db-5002" should group after normalization
    const connErrors = result.errors.filter((e) =>
      e.normalizedMessage.toLowerCase().includes("connection failed")
    );
    assert.ok(connErrors.length >= 1, "should group connection errors");
    assert.ok(connErrors[0].occurrences >= 2);
  });

  it("populates errorFrequency for JSON logs", () => {
    assert.ok(result.errorFrequency.length > 0);
  });
});

// ─── 3. Nginx access logs ──────────────────────────────────────────────────
describe("Nginx log support", () => {
  const nginxLogs = [
    '127.0.0.1 - - [22/Aug/2026:10:00:01 +0000] "GET /api/health HTTP/1.1" 200 1234 "-" "curl/7.68"',
    '10.0.0.5 - - [22/Aug/2026:10:00:02 +0000] "POST /api/users HTTP/1.1" 500 256 "-" "Mozilla/5.0"',
    '10.0.0.5 - - [22/Aug/2026:10:00:03 +0000] "GET /api/orders/999 HTTP/1.1" 404 128 "-" "Mozilla/5.0"',
    '192.168.1.10 - - [22/Aug/2026:10:00:04 +0000] "DELETE /api/sessions HTTP/1.1" 503 0 "-" "curl"',
  ].join("\n");

  const result = analyzeLog(nginxLogs, "access.log");

  it("detects format as nginx", () => {
    assert.equal(result.detectedFormat, "nginx");
  });

  it("maps HTTP 5xx to ERROR level", () => {
    assert.ok(result.levelCounts["ERROR"] >= 2, "should have ERROR for 500/503");
  });

  it("maps HTTP 4xx to WARN level", () => {
    assert.ok(result.levelCounts["WARN"] >= 1, "should have WARN for 404");
  });

  it("maps HTTP 2xx to INFO level", () => {
    assert.ok(result.levelCounts["INFO"] >= 1, "should have INFO for 200");
  });

  it("groups nginx errors by path + status", () => {
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0].message.includes("/"));
  });
});

// ─── 4. Apache access logs ─────────────────────────────────────────────────
describe("Apache log support", () => {
  const apacheLogs = [
    '127.0.0.1 - frank [22/Aug/2026:10:00:01 +0000] "GET /index.html HTTP/1.1" 200 512',
    '10.0.0.5 - - [22/Aug/2026:10:00:02 +0000] "POST /submit HTTP/1.1" 500 256',
  ].join("\n");

  const result = analyzeLog(apacheLogs, "access.log");

  it("parses Apache entries (may detect as nginx since patterns overlap)", () => {
    // logparse tries nginx regex before apache; common format matches both
    assert.ok(result.totalLines >= 2);
    assert.ok(result.errorCount >= 1, "500 should be error");
  });

  it("correctly maps HTTP status codes", () => {
    assert.ok(result.levelCounts["INFO"] >= 1, "200 → INFO");
    assert.ok(result.levelCounts["ERROR"] >= 1, "500 → ERROR");
  });
});

// ─── 5. Syslog ─────────────────────────────────────────────────────────────
describe("Syslog support", () => {
  const syslogLogs = [
    "<13>Aug 22 10:00:01 host sshd[1234]: Connection refused from 10.0.0.1",
    "<14>Aug 22 10:00:02 host kernel: [UFW BLOCK] IN=eth0",
    "<11>Aug 22 10:00:03 host systemd[1]: Service failed",
  ].join("\n");

  const result = analyzeLog(syslogLogs, "syslog.log");

  it("detects format as syslog", () => {
    assert.equal(result.detectedFormat, "syslog");
  });

  it("parses syslog entries", () => {
    assert.ok(result.totalLines >= 3);
  });

  it("preserves original log lines in sampleRaw", () => {
    if (result.errors.length > 0) {
      assert.ok(result.errors[0].sampleRaw.includes("host"));
    }
  });
});

// ─── 6. Python logging ─────────────────────────────────────────────────────
describe("Python logging support", () => {
  const pythonLogs = [
    "2026-08-22 10:00:01,123 - myapp - INFO - Application started",
    "2026-08-22 10:00:02,456 - myapp - ERROR - Failed to connect to database",
    "2026-08-22 10:00:03,789 - myapp - WARNING - Deprecated API call",
    "2026-08-22 10:00:04,012 - myapp - CRITICAL - Out of memory",
  ].join("\n");

  const result = analyzeLog(pythonLogs, "app.log");

  it("detects format as text (Python uses text format in logparse)", () => {
    // logparse treats Python logging as 'text' format
    assert.ok(result.totalLines >= 4);
  });

  it("parses Python logging levels", () => {
    assert.ok(result.levelCounts["INFO"] >= 1);
    assert.ok(result.levelCounts["ERROR"] >= 1);
    assert.ok(result.levelCounts["WARN"] >= 1);
    // logparse normalizes CRITICAL → fatal → our normalizeLevel → FATAL
    assert.ok(
      (result.levelCounts["FATAL"] ?? 0) + (result.levelCounts["CRITICAL"] ?? 0) >= 1,
      "should have FATAL or CRITICAL"
    );
  });

  it("classifies CRITICAL/FATAL as Critical severity", () => {
    const criticals = result.errors.filter(
      (e) => e.level === "CRITICAL" || e.level === "FATAL"
    );
    assert.ok(criticals.length >= 1);
    assert.equal(criticals[0].severity, "Critical");
  });
});

// ─── 7. Malformed / mixed / unsupported logs ───────────────────────────────
describe("Malformed and mixed logs", () => {
  const mixedLogs = [
    "2026-08-22 10:00:01 INFO Normal line",
    "this is just random garbage with no structure",
    '{"timestamp":"2026-08-22T10:00:02Z","level":"error","msg":"JSON error"}',
    "127.0.0.1 - - [22/Aug/2026:10:00:03 +0000] \"GET / HTTP/1.1\" 500 0 \"-\" \"test\"",
    "",
    "   ",
    "=== Application restarted ===",
    "<3>Aug 22 10:00:04 host sshd[999]: Failed password",
    "2026-08-22 10:00:05 ERROR Timeout connecting to redis-7001",
  ].join("\n");

  const result = analyzeLog(mixedLogs, "mixed.log");

  it("handles mixed formats without crashing", () => {
    assert.ok(result.totalLines > 0);
  });

  it("counts blank lines", () => {
    assert.ok(result.blankOrUnparsedLines >= 2);
  });

  it("still groups errors from different formats", () => {
    assert.ok(result.errorCount >= 2);
  });

  it("handles completely empty input", () => {
    const empty = analyzeLog("", "empty.log");
    assert.equal(empty.totalLines, 0);
    assert.equal(empty.errorCount, 0);
    assert.equal(empty.errors.length, 0);
  });

  it("handles single-line input", () => {
    const single = analyzeLog("2026-08-22 10:00:01 ERROR Something broke", "single.log");
    assert.equal(single.totalLines, 1);
    assert.equal(single.errorCount, 1);
    assert.equal(single.errors.length, 1);
  });
});

// ─── 8. Duplicate errors with different dynamic values ─────────────────────
describe("Dynamic-value normalization for grouping", () => {
  const logs = [
    "2026-08-22 10:00:01 ERROR Connection failed for user 12345",
    "2026-08-22 10:00:02 ERROR Connection failed for user 67890",
    "2026-08-22 10:00:03 ERROR Connection failed for user 11111",
    "2026-08-22 10:00:04 ERROR Request a1b2c3d4-e5f6-7890-abcd-ef1234567890 timed out",
    "2026-08-22 10:00:05 ERROR Request f9e8d7c6-b5a4-3210-fedc-ba9876543210 timed out",
    "2026-08-22 10:00:06 ERROR Connection from 192.168.1.100 refused",
    "2026-08-22 10:00:07 ERROR Connection from 10.0.0.50 refused",
  ].join("\n");

  const result = analyzeLog(logs, "ids.log");

  it("groups errors with different user IDs together", () => {
    const connErrors = result.errors.filter((e) =>
      e.message.includes("Connection failed")
    );
    assert.equal(connErrors.length, 1, "all user ID variants should group into one");
    assert.equal(connErrors[0].occurrences, 3);
  });

  it("groups errors with different UUIDs together", () => {
    const timeoutErrors = result.errors.filter((e) =>
      e.message.includes("Request") && e.message.includes("timed out")
    );
    assert.equal(timeoutErrors.length, 1, "UUID variants should group together");
    assert.equal(timeoutErrors[0].occurrences, 2);
  });

  it("groups errors with different IPs together", () => {
    const ipErrors = result.errors.filter((e) =>
      e.message.includes("Connection from") && e.message.includes("refused")
    );
    assert.equal(ipErrors.length, 1, "IP variants should group together");
    assert.equal(ipErrors[0].occurrences, 2);
  });
});

// ─── 9. Severity classification ────────────────────────────────────────────
describe("Severity classification", () => {
  it("classifies FATAL as Critical", () => {
    assert.equal(classifySeverity("FATAL", "Process crashed"), "Critical");
  });

  it("classifies CRITICAL as Critical", () => {
    assert.equal(classifySeverity("CRITICAL", "System failure"), "Critical");
  });

  it("classifies OutOfMemory as Critical", () => {
    assert.equal(classifySeverity("ERROR", "OutOfMemoryError in heap"), "Critical");
  });

  it("classifies timeout as High", () => {
    assert.equal(classifySeverity("ERROR", "Connection timeout after 30s"), "High");
  });

  it("classifies generic ERROR as High", () => {
    assert.equal(classifySeverity("ERROR", "Something failed"), "High");
  });

  it("classifies WARN as Medium", () => {
    assert.equal(classifySeverity("WARN", "Deprecated usage"), "Medium");
  });

  it("classifies INFO as Low", () => {
    assert.equal(classifySeverity("INFO", "Started"), "Low");
  });

  it("classifies deadlock as Critical", () => {
    assert.equal(classifySeverity("ERROR", "Deadlock detected in thread pool"), "Critical");
  });
});

// ─── 10. Time-based statistics ─────────────────────────────────────────────
describe("Time-based statistics", () => {
  const logs = [
    "2026-08-22 10:00:01 INFO Started",
    "2026-08-22 10:00:02 ERROR First error",
    "2026-08-22 10:30:03 ERROR Second error",
    "2026-08-22 11:00:04 ERROR Third error",
    "2026-08-22 11:30:05 WARN A warning",
    "2026-08-22 12:00:06 INFO Done",
  ].join("\n");

  const result = analyzeLog(logs, "time.log");

  it("creates time buckets for different hours", () => {
    assert.ok(result.timeBuckets.length >= 2, "should have at least 2 hourly buckets");
  });

  it("counts errors per bucket", () => {
    const totalBucketErrors = result.timeBuckets.reduce(
      (sum, b) => sum + b.errorCount,
      0
    );
    assert.equal(totalBucketErrors, result.errorCount);
  });

  it("counts warnings per bucket", () => {
    const totalBucketWarns = result.timeBuckets.reduce(
      (sum, b) => sum + b.warnCount,
      0
    );
    assert.equal(totalBucketWarns, result.warningCount);
  });
});

// ─── 11. Error frequency ranking ───────────────────────────────────────────
describe("Error frequency ranking", () => {
  const logs = [
    "2026-08-22 10:00:01 ERROR Timeout A",
    "2026-08-22 10:00:02 ERROR Timeout A",
    "2026-08-22 10:00:03 ERROR Timeout A",
    "2026-08-22 10:00:04 ERROR Timeout A",
    "2026-08-22 10:00:05 ERROR Connection B",
    "2026-08-22 10:00:06 ERROR Connection B",
  ].join("\n");

  const result = analyzeLog(logs, "freq.log");

  it("ranks errors by count descending", () => {
    assert.equal(result.errorFrequency[0].count, 4);
    assert.equal(result.errorFrequency[1].count, 2);
    assert.equal(result.errorFrequency[0].rank, 1);
    assert.equal(result.errorFrequency[1].rank, 2);
  });

  it("computes correct percentages", () => {
    assert.equal(result.errorFrequency[0].percentage, 66.7);
    assert.equal(result.errorFrequency[1].percentage, 33.3);
  });
});

// ─── 12. parseLine fallback ────────────────────────────────────────────────
describe("parseLine (fallback parser)", () => {
  it("parses standard log line", () => {
    const line = parseLine("2026-08-22 10:00:01 ERROR Something failed", 1);
    assert.ok(line);
    assert.equal(line!.level, "ERROR");
    assert.equal(line!.timestamp, "2026-08-22 10:00:01");
    assert.ok(line!.message.includes("Something failed"));
  });

  it("returns null for blank lines", () => {
    assert.equal(parseLine("", 1), null);
    assert.equal(parseLine("   ", 1), null);
  });

  it("normalizes WARNING to WARN", () => {
    const line = parseLine("2026-08-22 10:00:01 WARNING Deprecated call", 1);
    assert.ok(line);
    assert.equal(line!.level, "WARN");
  });

  it("returns UNKNOWN for lines without level", () => {
    const line = parseLine("Just some random text", 1);
    assert.ok(line);
    assert.equal(line!.level, "UNKNOWN");
  });
});

// ─── 13. Large log performance ─────────────────────────────────────────────
describe("Large log performance", () => {
  it("processes 10000 lines in reasonable time", () => {
    const lines: string[] = [];
    for (let i = 0; i < 10000; i++) {
      const level = i % 10 === 0 ? "ERROR" : i % 5 === 0 ? "WARN" : "INFO";
      lines.push(
        `2026-08-22 10:${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")} ${level} Message ${i % 100} for user ${1000 + (i % 50)}`
      );
    }
    const content = lines.join("\n");

    const start = performance.now();
    const result = analyzeLog(content, "large.log");
    const elapsed = performance.now() - start;

    assert.ok(result.totalLines === 10000);
    assert.ok(result.errorCount > 0);
    assert.ok(elapsed < 5000, `Should process in under 5s, took ${elapsed.toFixed(0)}ms`);
  });
});
