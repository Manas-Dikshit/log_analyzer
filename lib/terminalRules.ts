// Terminal Error Pattern Library — Rule-based patterns & category classification.
// No AI. Pure pattern matching and extraction functions.

import type { Severity } from "./logParser";

export type TerminalCategory =
  | "Runtime Error"
  | "Build / Compile"
  | "Package Manager"
  | "Python"
  | "Java / Maven / Gradle"
  | "Git"
  | "Next.js / React"
  | "Docker / Container"
  | "Database / Connection"
  | "Permission / Access"
  | "Network / API"
  | "Dependency / Module"
  | "Port / Process"
  | "Warning / Deprecation"
  | "General Error";

export interface CategoryPatternRule {
  id: string;
  category: TerminalCategory;
  pattern: RegExp;
  severity: Severity;
  kind: "error" | "warning";
  extractErrorType?: (match: RegExpMatchArray, line: string) => string | null;
}

export const TERMINAL_CATEGORY_RULES: CategoryPatternRule[] = [
  // 1. Next.js / React Errors
  {
    id: "next-react-hydration",
    category: "Next.js / React",
    pattern: /Hydration failed|Text content does not match server-rendered HTML|initial UI does not match/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "HydrationError",
  },
  {
    id: "next-react-invalid-hook",
    category: "Next.js / React",
    pattern: /Invalid hook call|Hooks can only be called inside of the body of a function component/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "InvalidHookCall",
  },
  {
    id: "next-react-fast-refresh",
    category: "Next.js / React",
    pattern: /Fast Refresh had to perform a full reload|\[\s*Fast Refresh\s*\]\s*rebuilding/i,
    severity: "Medium",
    kind: "warning",
    extractErrorType: () => "FastRefreshWarning",
  },
  {
    id: "next-react-chunk-load",
    category: "Next.js / React",
    pattern: /ChunkLoadError|Loading chunk \d+ failed/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "ChunkLoadError",
  },
  {
    id: "next-react-general",
    category: "Next.js / React",
    pattern: /Unhandled Runtime Error|Next\.js server error|Server Error in '\/[^']*'/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "NextRuntimeError",
  },

  // 2. Python Errors & Tracebacks
  {
    id: "python-traceback-start",
    category: "Python",
    pattern: /^Traceback \(most recent call last\):/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "Traceback",
  },
  {
    id: "python-module-not-found",
    category: "Python",
    pattern: /ModuleNotFoundError:\s*No module named ['"]([^'"]+)['"]/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => `ModuleNotFoundError: ${m[1] || ""}`.trim(),
  },
  {
    id: "python-import-error",
    category: "Python",
    pattern: /ImportError:\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => `ImportError: ${m[1] || ""}`.trim(),
  },
  {
    id: "python-syntax-indentation",
    category: "Python",
    pattern: /\b(IndentationError|SyntaxError|TabError):\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1] || "SyntaxError",
  },
  {
    id: "python-common-exceptions",
    category: "Python",
    pattern: /\b(NameError|AttributeError|ValueError|KeyError|IndexError|TypeError|ZeroDivisionError|RuntimeError|FileNotFoundError|PermissionError):\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1] || "PythonException",
  },

  // 3. Java / Maven / Gradle Errors
  {
    id: "java-thread-exception",
    category: "Java / Maven / Gradle",
    pattern: /Exception in thread "[^"]*"\s+([\w\.$]+Error|[\w\.$]+Exception):\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1]?.split(".").pop() || "JavaException",
  },
  {
    id: "java-class-not-found",
    category: "Java / Maven / Gradle",
    pattern: /\b(ClassNotFoundException|NoClassDefFoundError|NoSuchMethodError|NoSuchFieldError):\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1] || "ClassNotFound",
  },
  {
    id: "java-general-exception",
    category: "Java / Maven / Gradle",
    pattern: /\b(java\.\w+\.[\w\$]+(?:Exception|Error)):\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1]?.split(".").pop() || "JavaException",
  },
  {
    id: "gradle-maven-build-failed",
    category: "Java / Maven / Gradle",
    pattern: /BUILD FAILED in|\[ERROR\] Failed to execute goal|Gradle build failed/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "BuildFailed",
  },

  // 4. Docker / Container Errors
  {
    id: "docker-daemon-not-running",
    category: "Docker / Container",
    pattern: /Cannot connect to the Docker daemon|Is the docker daemon running/i,
    severity: "Critical",
    kind: "error",
    extractErrorType: () => "DockerDaemonOffline",
  },
  {
    id: "docker-error-response",
    category: "Docker / Container",
    pattern: /Error response from daemon:|docker:\s*Error response/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "DockerDaemonError",
  },
  {
    id: "docker-build-failed",
    category: "Docker / Container",
    pattern: /failed to solve:\s*process\s*".*?"\s*did not complete successfully:\s*exit code/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "DockerBuildFailed",
  },
  {
    id: "docker-container-exited",
    category: "Docker / Container",
    pattern: /container .*? exited with code \d+/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "ContainerExited",
  },

  // 5. Git Errors
  {
    id: "git-fatal",
    category: "Git",
    pattern: /^fatal:\s*(not a git repository|destination path .*? already exists|pathspec .*? did not match|could not read from remote|refusing to merge)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => `GitFatal: ${m[1] || ""}`.trim(),
  },
  {
    id: "git-push-failed",
    category: "Git",
    pattern: /^error:\s*failed to push some refs to|updates were rejected because/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "GitPushFailed",
  },
  {
    id: "git-merge-conflict",
    category: "Git",
    pattern: /CONFLICT \((?:content|modify\/delete|add\/add)\):|Automatic merge failed; fix conflicts/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "GitMergeConflict",
  },

  // 6. Database / Connection Errors
  {
    id: "db-conn-refused",
    category: "Database / Connection",
    pattern: /ECONNREFUSED|connect ECONNREFUSED|Connection refused/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "ECONNREFUSED",
  },
  {
    id: "db-conn-reset",
    category: "Database / Connection",
    pattern: /ECONNRESET|Connection reset by peer/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "ECONNRESET",
  },
  {
    id: "db-specific-drivers",
    category: "Database / Connection",
    pattern: /\b(MongoNetworkError|SequelizeConnectionError|MongoServerSelectionError|RedisConnectionError|OperationalError:\s*\(2003|sqlite3\.OperationalError|KnoxConnectionError|PrismaClientInitializationError)\b/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1] || "DatabaseError",
  },

  // 7. Port / Process Errors
  {
    id: "port-in-use",
    category: "Port / Process",
    pattern: /EADDRINUSE|address already in use|port \d+ is already in use/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "EADDRINUSE",
  },
  {
    id: "out-of-memory",
    category: "Port / Process",
    pattern: /heap out of memory|FATAL ERROR: Reached heap limit|JavaScript heap out of memory|Out of memory: Kill process/i,
    severity: "Critical",
    kind: "error",
    extractErrorType: () => "OutOfMemory",
  },
  {
    id: "segfault",
    category: "Port / Process",
    pattern: /Segmentation fault|core dumped|SIGSEGV|SIGKILL|panic:\s*runtime error/i,
    severity: "Critical",
    kind: "error",
    extractErrorType: () => "SegmentationFault",
  },

  // 8. Permission / Access Errors
  {
    id: "permission-eacces-eperm",
    category: "Permission / Access",
    pattern: /\b(EACCES|EPERM)\b|permission denied|operation not permitted|Access denied for user|sudo:\s*a password is required/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => (m[1] ? m[1].toUpperCase() : "PermissionDenied"),
  },

  // 9. Network / API Errors
  {
    id: "network-timeout-dns",
    category: "Network / API",
    pattern: /\b(ETIMEDOUT|ENOTFOUND|getaddrinfo ENOTFOUND|502 Bad Gateway|504 Gateway Timeout|500 Internal Server Error|fetch failed|CORS header 'Access-Control-Allow-Origin' missing)\b/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1] || "NetworkError",
  },

  // 10. Dependency / Module Not Found Errors
  {
    id: "module-not-found",
    category: "Dependency / Module",
    pattern: /Cannot find module ['"]([^'"]+)['"]|Module not found:\s*Can't resolve ['"]([^'"]+)['"]|Could not find a declaration file for module ['"]([^'"]+)['"]/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => `ModuleNotFound: ${m[1] || m[2] || m[3] || ""}`.trim(),
  },

  // 11. Package Manager Errors (npm / yarn / pnpm)
  {
    id: "pkg-npm-err",
    category: "Package Manager",
    pattern: /^npm ERR!|^yarn error|^ERR_PNPM_/i,
    severity: "High",
    kind: "error",
    extractErrorType: (_m, line) => {
      const match = line.match(/npm ERR! code (\S+)|ERR_PNPM_(\S+)|^yarn error\s+(\S+)/);
      if (match) return match[1] || match[2] || match[3] || "PackageManagerError";
      return "PackageManagerError";
    },
  },
  {
    id: "pkg-eresolve",
    category: "Package Manager",
    pattern: /ERESOLVE unable to resolve dependency tree|peer dependency conflict/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "ERESOLVE",
  },
  {
    id: "pkg-elifecycles",
    category: "Package Manager",
    pattern: /ELIFECYCLE|Failed at the .*? script/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "ELIFECYCLE",
  },

  // 12. Build / Compile Errors
  {
    id: "build-tsc-error",
    category: "Build / Compile",
    pattern: /\b(TS\d{4,5}):\s*(.*)/,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1] || "TypeScriptError",
  },
  {
    id: "build-gcc-clang",
    category: "Build / Compile",
    pattern: /:\s*(fatal error|error):\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => (m[1]?.toLowerCase().includes("fatal") ? "FatalCompileError" : "CompileError"),
  },
  {
    id: "build-rust-error",
    category: "Build / Compile",
    pattern: /^error\[E\d{4}\]:\s*(.*)/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[0].split(":")[0] || "RustCompilerError",
  },
  {
    id: "build-general-failed",
    category: "Build / Compile",
    pattern: /\b(BUILD FAILED|Compilation failed|Failed to compile|Syntax error: Unexpected token)\b/i,
    severity: "High",
    kind: "error",
    extractErrorType: () => "BuildFailed",
  },

  // 13. Runtime Errors (General JS / Other)
  {
    id: "runtime-js-exceptions",
    category: "Runtime Error",
    pattern: /\b(TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|AggregateError|UnhandledPromiseRejection|Uncaught Exception)\b/i,
    severity: "High",
    kind: "error",
    extractErrorType: (m) => m[1] || "RuntimeError",
  },

  // 14. Warnings & Deprecations
  {
    id: "warning-deprecation",
    category: "Warning / Deprecation",
    pattern: /\b(DeprecationWarning|ExperimentalWarning)\b|^npm WARN|^Warning:|\b(WARNING|WARN)\b/i,
    severity: "Medium",
    kind: "warning",
    extractErrorType: (m) => (m[0].toLowerCase().includes("deprecat") ? "DeprecationWarning" : "Warning"),
  },
];

// Helper RegExp definitions for line parsing
export const TIMESTAMP_PATTERN =
  /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?)|(\d{2}:\d{2}:\d{2})/;

export const COMMAND_PROMPT_PATTERN =
  /^(?:\$\s+|❯\s*|PS [^>]*>\s*|[A-Za-z]:\\[^>]*>\s*|\w+@[\w.-]+:[^\s$]*\$\s+)/;

export const STACK_FRAME_PATTERNS = [
  /^\s+at\s+.*(?:\(|@|\.js|\.ts)/, // JS/TS stack frame: at function (file:line:col)
  /^\s*File "[^"]+", line \d+/, // Python traceback frame
  /^\s+at\s+[\w\.$_]+\([\w\.$_]+\.java:\d+\)/, // Java stack frame
  /^\s+[\w\.$_]+\.[\w\.$_]+\([\w\.$_]+\.java:\d+\)/, // Java stack frame without leading "at"
  /^\s*#\d+\s+0x[\da-fA-F]+\s+in\s+/, // C/C++/GDB frame
  /^\s+\d+:\s+0x[\da-fA-F]+ - /, // Rust panic frame
  /^\s*goroutine \d+ \[.*\]:/, // Go panic header/frame
  /^\s+\/.*\.go:\d+/, // Go source line
];

export const CODE_FRAME_PATTERN =
  /^\s*>?\s*\d+\s*\|\s*/; // Next.js / tsc / babel code snippet frame e.g. " > 42 |  const x = y;"

export const FILE_PATH_PATTERN =
  /(?:[A-Za-z]:)?(?:[\\/][\w.@+-]+)+\.(?:ts|tsx|js|jsx|mjs|cjs|json|py|go|rb|java|php|cpp|c|h|rs|css|scss|html|yml|yaml|dockerfile|log|txt|sh|sql)\b/gi;

export const PATH_LINENO_PATTERN =
  /\.(?:ts|tsx|js|jsx|mjs|cjs|json|py|go|rb|java|php|cpp|c|h|rs|css|scss|html|yml|yaml|dockerfile|log|txt|sh|sql)[:](\d+)(?::(\d+))?/i;

export const PYTHON_LINENO_PATTERN = /File "[^"]+", line (\d+)/;
export const ON_LINE_NUMBER_PATTERN = /\bon line (\d+)\b/i;

export function extractTimestamp(line: string): string | null {
  return line.match(TIMESTAMP_PATTERN)?.[0] ?? null;
}

export function extractFilePath(line: string): string | null {
  const matches = line.match(FILE_PATH_PATTERN);
  if (matches && matches.length > 0) {
    // Prefer shortest valid source file path matching relative/src patterns if possible
    return matches.sort((a, b) => a.length - b.length)[0];
  }
  return null;
}

export function extractLineNumber(line: string): number | null {
  const pathMatch = line.match(PATH_LINENO_PATTERN);
  if (pathMatch) return parseInt(pathMatch[1], 10);
  const pyMatch = line.match(PYTHON_LINENO_PATTERN);
  if (pyMatch) return parseInt(pyMatch[1], 10);
  const onLineMatch = line.match(ON_LINE_NUMBER_PATTERN);
  if (onLineMatch) return parseInt(onLineMatch[1], 10);
  return null;
}

export function isStackFrameLine(line: string): boolean {
  return STACK_FRAME_PATTERNS.some((p) => p.test(line));
}

export function isCodeFrameLine(line: string): boolean {
  return CODE_FRAME_PATTERN.test(line);
}
