import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeTerminalOutput, stripAnsi } from "../lib/terminalParser";

const ANSI_RED = "\x1b[31m";
const ANSI_RESET = "\x1b[0m";

test("stripAnsi removes SGR color codes and keeps visible text", () => {
  assert.equal(stripAnsi(`${ANSI_RED}hello${ANSI_RESET} world`), "hello world");
});

test("stripAnsi removes OSC sequences and cursor movement", () => {
  assert.equal(stripAnsi("\x1b]0;title\x07done\x1b[2J\x1b[Hok"), "doneok");
});

test("stripAnsi preserves plain text untouched", () => {
  const s = "$ npm run build\r\nerror TS2321: boom";
  assert.equal(stripAnsi(s), s);
});

test("ANSI-colored unknown command is detected with original + normalized lines", () => {
  const result = analyzeTerminalOutput(`$ npm rui\n${ANSI_RED}Unknown command: "rui"${ANSI_RESET}`);
  assert.equal(result.issues.length, 1);
  const issue = result.issues[0];
  assert.equal(issue.category, "Command Error");
  assert.equal(issue.severity, "High");
  assert.equal(issue.errorType, "UnknownCommand");
  // Original line preserved verbatim (escape codes intact)...
  assert.ok(issue.rawLines[0].includes("\x1b[31m"));
  // ...alongside the normalized counterpart used for detection.
  assert.equal(issue.normalizedLines[0], 'Unknown command: "rui"');
});

test("JavaScript stack trace is parsed into structured frames", () => {
  const result = analyzeTerminalOutput(
    [
      "TypeError: Cannot read properties of undefined",
      "    at Dashboard (src/components/Dashboard.tsx:42:19)",
      "    at renderWithHooks (node_modules/react-dom/index.js:1:2)",
    ].join("\n")
  );
  assert.equal(result.issues.length, 1);
  const issue = result.issues[0];
  assert.equal(issue.stackFrames, 2);
  assert.ok(issue.parsedStack.length >= 2);
  const first = issue.parsedStack.find((f) => f.fileName?.includes("Dashboard.tsx"));
  assert.ok(first, "expected a parsed frame for Dashboard.tsx");
  assert.equal(first!.lineNumber, 42);
  assert.equal(first!.columnNumber, 19);
  assert.equal(first!.functionName, "Dashboard");
});

test("normal errors are still detected (npm ELIFECYCLE)", () => {
  const result = analyzeTerminalOutput('npm ERR! code ELIFECYCLE\nnpm ERR! Exit status 1');
  assert.equal(result.errorCount, 2); // each npm ERR! line is its own detection
  assert.ok(result.issues.every((i) => i.category === "Package Manager" && i.severity === "High"));
});

test("warnings are classified as warnings", () => {
  const result = analyzeTerminalOutput("npm WARN deprecated request@2.88.2: request has been deprecated");
  assert.equal(result.warningCount, 1);
  assert.equal(result.issues[0].kind, "warning");
  assert.equal(result.issues[0].category, "Warning / Deprecation");
});

test("unknown commands across shells are detected", () => {
  const cases: [string, string][] = [
    ["bash: rui: command not found", "Command Error"],
    ["rui : The term 'rui' is not recognized as the name of a cmdlet", "Command Error"],
    ["'rui' is not recognized as an internal or external command", "Command Error"],
    ['npm ERR! Unknown command: "rui"', "Command Error"],
    ["git: 'puhs' is not a git command.", "Command Error"],
  ];
  for (const [input, category] of cases) {
    const result = analyzeTerminalOutput(input);
    assert.equal(result.issues.length, 1, `no issue for: ${input}`);
    assert.equal(result.issues[0].category, category, `wrong category for: ${input}`);
    assert.equal(result.issues[0].severity, "High");
  }
});

test("mixed terminal output: commands, ANSI error, permission denied, python traceback", () => {
  const output = [
    "$ docker compose up -d",
    `${ANSI_RED}Error response from daemon: pull access denied${ANSI_RESET}`,
    "",
    "PS C:\\proj> pnpm rui",
    "Unknown command: \"rui\"",
    "",
    "$ ls /root/secret",
    "ls: cannot access '/root/secret': Permission denied",
    "",
    "$ python app.py",
    "Traceback (most recent call last):",
    '  File "app.py", line 3, in <module>',
    "NameError: name 'x' is not defined",
  ].join("\n");
  const result = analyzeTerminalOutput(output);

  assert.equal(result.commandCount, 4);
  assert.ok(result.uniqueIssueCount >= 4);
  const categories = result.issues.map((i) => i.category);
  assert.ok(categories.includes("Docker / Container"));
  assert.ok(categories.includes("Command Error"));
  assert.ok(categories.includes("Permission / Access"));
  assert.ok(categories.includes("Python"));

  const cmdErr = result.issues.find((i) => i.category === "Command Error")!;
  assert.equal(cmdErr.explanation, "The entered command is not a valid npm command.");
  // ANSI-colored raw lines survive normalization side-by-side
  const dockerIssue = result.issues.find((i) => i.category === "Docker / Container")!;
  assert.notEqual(dockerIssue.rawLines.join(""), dockerIssue.normalizedLines.join(""));
  assert.equal(dockerIssue.normalizedLines.join("").includes("Error response from daemon"), true);
});

test("clean output yields zero issues", () => {
  const result = analyzeTerminalOutput("$ npm install\nadded 128 packages in 12s\n$ git status\nOn branch main");
  assert.equal(result.uniqueIssueCount, 0);
  assert.equal(result.commandCount, 2);
});
