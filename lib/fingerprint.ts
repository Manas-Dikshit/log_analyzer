// Fingerprinting: advanced normalization that strips dynamic values
// while preserving the semantic meaning of error messages.

// Matches UUIDs
const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

// Matches IPv4 addresses (with optional port)
const IPV4_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b/g;

// Matches IPv6 addresses
const IPV6_RE =
  /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi;

// Matches hex addresses (0x...)
const HEX_RE = /\b0x[0-9a-f]+\b/gi;

// Matches timestamps (ISO, common log formats)
const TIMESTAMP_RE =
  /\b\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g;

// Matches time-only patterns HH:MM:SS
const TIME_ONLY_RE = /\b\d{2}:\d{2}:\d{2}\b/g;

// Matches file paths (Unix/Windows style)
const UNIX_PATH_RE = /(?:\/[\w.@+-]+){2,}/g;
const WIN_PATH_RE = /(?:[A-Z]:)?(?:\\[\w.@+-]+){2,}/gi;

// Matches port numbers after : or on :port
const PORT_RE = /(?::|port\s*)(\d{2,5})\b/gi;

// Matches large numbers (5+ digits) that are likely IDs
const LARGE_NUM_RE = /\b\d{5,}\b/g;

// Matches small numbers that appear in request/response context
const CONTEXT_NUM_RE = /\b(?:request|response|item|record|row|page|offset|limit|id|code|status|attempt|retry|count|size|total|index)\s*[:#=\s]\s*\d+\b/gi;

// Service name patterns that indicate infrastructure components
const SERVICE_PATTERNS: [RegExp, string][] = [
  [/\bpostgres(?:ql)?\b/i, "PostgreSQL"],
  [/\bmysql\b/i, "MySQL"],
  [/\bmongo(?:db|Client)?\b/i, "MongoDB"],
  [/\bredis\b/i, "Redis"],
  [/\bmemcache(?:d)?\b/i, "Memcached"],
  [/\belasticsearch\b/i, "Elasticsearch"],
  [/\brabbitmq\b/i, "RabbitMQ"],
  [/\bkafka\b/i, "Kafka"],
  [/\bnginx\b/i, "Nginx"],
  [/\bapache\b/i, "Apache"],
  [/\bdocker\b/i, "Docker"],
  [/\bkubernetes\b|\bk8s\b/i, "Kubernetes"],
  [/\baws\b/i, "AWS"],
  [/\bgcp\b|\bgoogle cloud\b/i, "GCP"],
  [/\bazure\b/i, "Azure"],
  [/\bcloudflare\b/i, "Cloudflare"],
  [/\bauth(?:entication)?\b/i, "Authentication"],
  [/\bauthoriz(?:ation|e)\b/i, "Authorization"],
  [/\bpayment\b/i, "Payment"],
  [/\border\b/i, "Order"],
  [/\binventory\b/i, "Inventory"],
  [/\buser\b/i, "User"],
  [/\bsession\b/i, "Session"],
  [/\bcache\b/i, "Cache"],
  [/\bqueue\b/i, "Queue"],
  [/\bworker\b/i, "Worker"],
  [/\bscheduler\b/i, "Scheduler"],
  [/\bgateway\b/i, "Gateway"],
  [/\bloadbalancer\b|\blb\b/i, "Load Balancer"],
  [/\bdatabase\b|\bdb\b/i, "Database"],
  [/\bapi\b/i, "API"],
];

// Error category patterns
const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/\bconnection\s+(?:refused|failed|reset|timeout|error|closed|lost|terminated|unavailable|timed)\b/i, "Connection"],
  [/\bconnect(?:ion)?\s+(?:to\s+)?(?:\w+\s+)?(?:failed|error|refused|timeout|timed)\b/i, "Connection"],
  [/\btimeout\b|\btimed?\s*out\b/i, "Timeout"],
  [/\bout\s+of\s+memory\b|\boom(?:k)?\b|\bheap\s+(?:out\s+of\s+)?memory\b/i, "Out of Memory"],
  [/\bdeadlock\b/i, "Deadlock"],
  [/\bpermission\s+denied\b|\baccess\s+denied\b|\bEACCES\b|\bEPERM\b/i, "Permission"],
  [/\bnot\s+found\b|\bENOTFOUND\b|\b404\b/i, "Not Found"],
  [/\bauthentication\b|\bauth\b.*\b(?:fail|error|invalid|expired|token)\b|\bunauthorized\b|\b401\b/i, "Authentication"],
  [/\bauthoriz(?:ation|ed)\b.*\b(?:fail|error|denied|forbidden)\b|\bforbidden\b|\b403\b/i, "Authorization"],
  [/\bfailed\s+to\s+(?:connect|load|parse|read|write|open|fetch|send|execute|start|initialize)\b/i, "Failure"],
  [/\berror\b.*\b(?:parsing|reading|writing|processing|handling|executing)\b/i, "Processing Error"],
  [/\bcrash\b|\bsegfault\b|\bsegmentation\s+fault\b|\bSIGSEGV\b/i, "Crash"],
  [/\bretry\b|\bretries\b|\bretrying\b/i, "Retry"],
  [/\bcorrupt(?:ed)?\b|\bintegrity\b.*\b(?:error|violation|check)\b/i, "Data Integrity"],
  [/\b disk\s+(?:full|space|error)\b|\bno\s+space\b/i, "Disk"],
  [/\bratelimit\b|\brate\s+limit\b|\bthrottl/i, "Rate Limit"],
];

export interface FingerprintResult {
  /** The normalized fingerprint string used for exact-match grouping */
  fingerprint: string;
  /** Extracted service names */
  services: string[];
  /** Detected error category */
  category: string;
  /** Clean message with dynamic values replaced by placeholders */
  cleanMessage: string;
}

/**
 * Generate a fingerprint for an error message.
 * Strips dynamic values (IDs, UUIDs, IPs, paths, timestamps)
 * while preserving semantic meaning for embedding.
 */
export function generateFingerprint(message: string): FingerprintResult {
  let clean = message;

  // Strip dynamic values in order of specificity
  clean = clean.replace(UUID_RE, "<id>");
  clean = clean.replace(IPV4_RE, "<ip>");
  clean = clean.replace(IPV6_RE, "<ip>");
  clean = clean.replace(HEX_RE, "<addr>");
  clean = clean.replace(TIMESTAMP_RE, "<ts>");
  clean = clean.replace(TIME_ONLY_RE, "<ts>");
  clean = clean.replace(UNIX_PATH_RE, "<path>");
  clean = clean.replace(WIN_PATH_RE, "<path>");

  // Replace large numbers (likely IDs, request IDs, etc.)
  clean = clean.replace(LARGE_NUM_RE, "<n>");

  // Replace context-specific numbers
  clean = clean.replace(CONTEXT_NUM_RE, (match) =>
    match.replace(/\d+/, "<n>")
  );

  // Replace port numbers
  clean = clean.replace(PORT_RE, (match) =>
    match.replace(/\d{2,5}/, "<port>")
  );

  // Normalize whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  // Extract services
  const services: string[] = [];
  for (const [pattern, name] of SERVICE_PATTERNS) {
    if (pattern.test(message)) {
      services.push(name);
    }
  }

  // Detect category
  let category = "General";
  for (const [pattern, cat] of CATEGORY_PATTERNS) {
    if (pattern.test(message)) {
      category = cat;
      break;
    }
  }

  // Build fingerprint: lowercase, stripped, for exact-match grouping
  const fingerprint = clean.toLowerCase();

  return { fingerprint, services, category, cleanMessage: clean };
}
