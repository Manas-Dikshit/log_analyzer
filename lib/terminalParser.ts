// Terminal Error Analyzer — rule-based parsing engine.
// No AI. Pattern matching, regular expressions, and predefined rules only.

import { parse as parseAnsi } from "@ansi-tools/parser";
import ErrorStackParser from "error-stack-parser";
import type { Severity } from "./logParser";
import {
  type TerminalCategory,
  TERMINAL_CATEGORY_RULES,
  COMMAND_PROMPT_PATTERN,
  TIMESTAMP_PATTERN,
  FILE_PATH_PATTERN,
  extractTimestamp,
  extractFilePath,
  extractLineNumber,
  isStackFrameLine,
  isCodeFrameLine,
} from "./terminalRules";

export type { TerminalCategory };

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

export interface TerminalIssue {
  category: TerminalCategory;
  kind: "error" | "warning";
  message: string;
  severity: Severity;
  errorType: string | null;
  explanation: string | null;
  filePath: string | null;
  lineNumber: number | null;
  command: string | null;
  timestamp: string | null;
  occurrences: number;
  firstLine: number;
  lastLine: number;
  stackFrames: number;
  stackTrace: string[];
  rawLines: string[];
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

function matchRule(line: string) {
  for (const rule of TERMINAL_CATEGORY_RULES) {
    const match = line.match(rule.pattern);
    if (match) {
      return { rule, match };
    }
  }
  return null;
}

export function analyzeTerminalOutput(content: string): TerminalAnalysisResult {
  const lines = content.split(/\r?\n/);
  const issuesMap = new Map<string, TerminalIssue>();
  const commandsMap = new Map<string, TerminalCommand>();

  let totalLines = 0;
  let commandCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let stackFrameCount = 0;
  let activeCommand: string | null = null;

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const lineNumber = i + 1;

    if (!raw.trim()) {
      i++;
      continue;
    }
    totalLines++;

    // 1. Check for command prompt lines ($ / ❯ / PS> / CMD>)
    const promptMatch = raw.match(COMMAND_PROMPT_PATTERN);
    if (promptMatch) {
      const commandText = raw.slice(promptMatch[0].length).trim();
      if (commandText) {
        commandCount++;
        activeCommand = commandText;
        const existingCmd = commandsMap.get(commandText);
        if (existingCmd) {
          existingCmd.occurrences++;
        } else {
          commandsMap.set(commandText, { command: commandText, occurrences: 1 });
        }
        i++;
        continue;
      }
    }

    // 2. Check for matching error / warning pattern
    const ruleMatch = matchRule(raw);
    if (ruleMatch) {
      const { rule, match } = ruleMatch;
      const blockRawLines: string[] = [raw];
      const blockStackTrace: string[] = [];
      let blockFilePath = extractFilePath(raw);
      let blockLineNumber = extractLineNumber(raw);
      const blockTimestamp = extractTimestamp(raw);
      let blockErrorType = rule.extractErrorType ? rule.extractErrorType(match, raw) : null;
      let primaryMessage = raw.trim();

      // Look ahead to capture multi-line context, stack traces, and code frames
      let j = i + 1;
      while (j < lines.length) {
        const nextRaw = lines[j];
        if (!nextRaw.trim()) {
          // Allow single blank line inside stack trace if next line continues stack frame
          if (j + 1 < lines.length && (isStackFrameLine(lines[j + 1]) || isCodeFrameLine(lines[j + 1]))) {
            blockRawLines.push(nextRaw);
            j++;
            continue;
          }
          break;
        }

        // Stop if a new command or another error header is encountered
        if (nextRaw.match(COMMAND_PROMPT_PATTERN)) break;
        if (matchRule(nextRaw) && !isStackFrameLine(nextRaw) && !isCodeFrameLine(nextRaw)) {
          // If Python Traceback started, allow continuing until the final Exception line
          if (rule.category === "Python" && rule.id === "python-traceback-start") {
            const excMatch = nextRaw.match(/^[A-Za-z_]\w*(?:Error|Exception|Warning):\s*(.*)/);
            if (excMatch) {
              blockRawLines.push(nextRaw);
              primaryMessage = nextRaw.trim();
              if (!blockErrorType || blockErrorType === "Traceback") {
                blockErrorType = nextRaw.split(":")[0].trim();
              }
              j++;
              break;
            }
          } else {
            break;
          }
        }

        if (isStackFrameLine(nextRaw)) {
          stackFrameCount++;
          blockStackTrace.push(nextRaw.trim());
          blockRawLines.push(nextRaw);
          if (!blockFilePath) blockFilePath = extractFilePath(nextRaw);
          if (blockLineNumber === null) blockLineNumber = extractLineNumber(nextRaw);
          j++;
        } else if (isCodeFrameLine(nextRaw)) {
          blockRawLines.push(nextRaw);
          if (!blockFilePath) blockFilePath = extractFilePath(nextRaw);
          if (blockLineNumber === null) blockLineNumber = extractLineNumber(nextRaw);
          j++;
        } else if (
          nextRaw.startsWith(" ") ||
          nextRaw.startsWith("\t") ||
          nextRaw.startsWith("|") ||
          nextRaw.startsWith(">") ||
          nextRaw.includes("Caused by:") ||
          nextRaw.includes("npm ERR!") ||
          nextRaw.includes("yarn error")
        ) {
          // Multi-line continuation of error message or details
          blockRawLines.push(nextRaw);
          if (!blockFilePath) blockFilePath = extractFilePath(nextRaw);
          if (blockLineNumber === null) blockLineNumber = extractLineNumber(nextRaw);
          j++;
        } else {
          break;
        }
      }

      if (rule.kind === "error") {
        errorCount++;
      } else {
        warningCount++;
      }

      const normalizedMsg = normalizeLine(primaryMessage);
      const groupKey = `${rule.category}::${rule.kind}::${blockErrorType || ""}::${normalizedMsg.toLowerCase()}`;

      const existingIssue = issuesMap.get(groupKey);
      if (existingIssue) {
        existingIssue.occurrences++;
        existingIssue.lastLine = j;
        if (!existingIssue.timestamp && blockTimestamp) {
          existingIssue.timestamp = blockTimestamp;
        }
        if (!existingIssue.filePath && blockFilePath) {
          existingIssue.filePath = blockFilePath;
        }
        if (existingIssue.lineNumber === null && blockLineNumber !== null) {
          existingIssue.lineNumber = blockLineNumber;
        }
        if (blockStackTrace.length > existingIssue.stackTrace.length) {
          existingIssue.stackTrace = blockStackTrace;
          existingIssue.stackFrames = blockStackTrace.length;
        }
        if (blockRawLines.length > existingIssue.rawLines.length) {
          existingIssue.rawLines = blockRawLines;
          existingIssue.sampleRaw = blockRawLines.join("\n");
        }
      } else {
        issuesMap.set(groupKey, {
          category: rule.category,
          kind: rule.kind,
          message: primaryMessage,
          severity: rule.severity,
          errorType: blockErrorType,
          explanation: rule.explanation ?? null,
          filePath: blockFilePath,
          lineNumber: blockLineNumber,
          command: activeCommand,
          timestamp: blockTimestamp,
          occurrences: 1,
          firstLine: lineNumber,
          lastLine: j,
          stackFrames: blockStackTrace.length,
          stackTrace: blockStackTrace,
          rawLines: blockRawLines,
          sampleRaw: blockRawLines.join("\n"),
        });
      }

      i = j; // Advance loop past processed block
      continue;
    }

    // 3. Line is not a command and not a matching error/warning start line
    if (isStackFrameLine(raw)) {
      stackFrameCount++;
      // Attach lone stack frame to previous issue if available
      const latestIssue = Array.from(issuesMap.values()).pop();
      if (latestIssue) {
        latestIssue.stackFrames++;
        latestIssue.stackTrace.push(raw.trim());
        latestIssue.rawLines.push(raw);
        latestIssue.sampleRaw = latestIssue.rawLines.join("\n");
        if (!latestIssue.filePath) latestIssue.filePath = extractFilePath(raw);
        if (latestIssue.lineNumber === null) latestIssue.lineNumber = extractLineNumber(raw);
      }
    }

    i++;
  }

  const sortedIssues = Array.from(issuesMap.values()).sort((a, b) => {
    const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const occDiff = b.occurrences - a.occurrences;
    if (occDiff !== 0) return occDiff;
    return a.firstLine - b.firstLine;
  });

  const sortedCommands = Array.from(commandsMap.values()).sort(
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
