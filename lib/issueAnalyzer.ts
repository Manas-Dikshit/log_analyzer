// Semantic Issue Analyzer — the core intelligence layer.
// Fingerprint → Embedding → Cluster → Issue Model.
// No cloud AI. No paid API. Local embeddings via @huggingface/transformers.

import type { ErrorGroup, Issue, SemanticAnalysisResult, Severity } from "./logParser";
import { generateFingerprint } from "./fingerprint";
import { embedBatch, isEmbedderReady } from "./embeddings";
import { clusterBySimilarity, cosineSimilarity } from "./clustering";

// Category title generation: maps internal category + services to a readable title
function generateTitle(
  category: string,
  services: string[],
  representativeMessage: string
): string {
  const serviceStr = services.length > 0 ? services[0] : "";

  // Map known categories to human-readable titles
  const categoryTitles: Record<string, string> = {
    Connection: serviceStr ? `${serviceStr} Connection Failure` : "Connection Failure",
    Timeout: serviceStr ? `${serviceStr} Timeout` : "Timeout Error",
    "Out of Memory": "Out of Memory",
    Deadlock: "Deadlock Detected",
    Permission: "Permission / Access Denied",
    "Not Found": "Resource Not Found",
    Authentication: "Authentication Failure",
    Authorization: "Authorization / Access Denied",
    Failure: serviceStr ? `${serviceStr} Operation Failure` : "Operation Failure",
    "Processing Error": "Processing Error",
    Crash: "Application Crash",
    Retry: "Transient Error (Retrying)",
    "Data Integrity": "Data Integrity Error",
    Disk: "Disk / Storage Error",
    "Rate Limit": "Rate Limiting",
  };

  let title = categoryTitles[category] ?? `${category} Error`;

  // Add secondary service if available
  if (services.length > 1) {
    title += ` [${services.join(", ")}]`;
  }

  return title;
}

/**
 * Analyze error groups and produce semantically clustered Issues.
 * Falls back to fingerprint-only grouping if embeddings are unavailable.
 */
export async function analyzeIssues(
  errorGroups: ErrorGroup[]
): Promise<SemanticAnalysisResult> {
  if (errorGroups.length === 0) {
    return {
      issues: [],
      embeddingAvailable: false,
      fingerprintCount: 0,
      clusterCount: 0,
    };
  }

  // Step 1: Generate fingerprints for all error groups
  const fingerprints = errorGroups.map((eg) =>
    generateFingerprint(eg.message)
  );

  // Step 2: Build fingerprint → ErrorGroup mapping for exact-match grouping
  const fpGroups = new Map<
    string,
    {
      groups: ErrorGroup[];
      services: Set<string>;
      category: string;
      cleanMessage: string;
    }
  >();

  for (let i = 0; i < errorGroups.length; i++) {
    const fp = fingerprints[i].fingerprint;
    const existing = fpGroups.get(fp);
    if (existing) {
      existing.groups.push(errorGroups[i]);
      for (const s of fingerprints[i].services) existing.services.add(s);
    } else {
      fpGroups.set(fp, {
        groups: [errorGroups[i]],
        services: new Set(fingerprints[i].services),
        category: fingerprints[i].category,
        cleanMessage: fingerprints[i].cleanMessage,
      });
    }
  }

  const uniqueFps = Array.from(fpGroups.entries());

  // Step 3: Try semantic clustering with embeddings
  let embeddingAvailable = isEmbedderReady();
  let clusters: string[][];

  try {
    const cleanMessages = uniqueFps.map(([, data]) => data.cleanMessage);
    const embeddings = await embedBatch(cleanMessages);
    embeddingAvailable = true;

    // Build cluster items
    const items = uniqueFps.map(([fp], i) => ({
      id: fp,
      embedding: embeddings[i],
    }));

    // Cluster by similarity (threshold 0.72 — balances precision/recall for error messages)
    clusters = clusterBySimilarity(items, 0.72);
  } catch {
    // Embeddings unavailable — fall back to fingerprint-only grouping
    // (each unique fingerprint becomes its own cluster)
    clusters = uniqueFps.map(([fp]) => [fp]);
    embeddingAvailable = false;
  }

  // Step 4: Build Issue objects from clusters
  const issues: Issue[] = [];

  for (const cluster of clusters) {
    // Collect all ErrorGroups in this cluster
    const clusterGroups: ErrorGroup[] = [];
    const allServices = new Set<string>();
    let primaryCategory = "General";
    let primaryCleanMsg = "";

    for (const fp of cluster) {
      const data = fpGroups.get(fp);
      if (!data) continue;
      clusterGroups.push(...data.groups);
      for (const s of data.services) allServices.add(s);
      if (primaryCategory === "General" && data.category !== "General") {
        primaryCategory = data.category;
      }
      if (!primaryCleanMsg || data.groups.length > (fpGroups.get(primaryCleanMsg)?.groups.length ?? 0)) {
        primaryCleanMsg = data.cleanMessage;
      }
    }

    // Sort by occurrences to find representative
    clusterGroups.sort((a, b) => b.occurrences - a.occurrences);
    const representative = clusterGroups[0];

    // Compute confidence based on cluster cohesion
    let confidence: number;
    if (cluster.length === 1) {
      confidence = 1.0; // Single fingerprint = high confidence it's its own thing
    } else if (embeddingAvailable) {
      // Average pairwise similarity within cluster
      const groupFps = cluster.map((fp) => fpGroups.get(fp)!);
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < groupFps.length; i++) {
        for (let j = i + 1; j < groupFps.length; j++) {
          totalSim += cosineSimilarity(
            groupFps[i] as unknown as number[],
            groupFps[j] as unknown as number[]
          );
          pairs++;
        }
      }
      confidence = pairs > 0 ? totalSim / pairs : 0.5;
    } else {
      // Without embeddings, confidence is based on message similarity
      confidence = 0.6;
    }

    // Clamp confidence
    confidence = Math.max(0, Math.min(1, confidence));

    // Aggregate timestamps
    let firstSeen: string | null = null;
    let lastSeen: string | null = null;
    for (const g of clusterGroups) {
      if (g.firstOccurrence) {
        if (!firstSeen || g.firstOccurrence < firstSeen) firstSeen = g.firstOccurrence;
      }
      if (g.lastOccurrence) {
        if (!lastSeen || g.lastOccurrence > lastSeen) lastSeen = g.lastOccurrence;
      }
    }

    // Severity: take the worst severity across the cluster
    const sevRank: Record<Severity, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    let worstSeverity: Severity = "Low";
    for (const g of clusterGroups) {
      if (sevRank[g.severity] < sevRank[worstSeverity]) {
        worstSeverity = g.severity;
      }
    }

    const totalOccurrences = clusterGroups.reduce(
      (sum, g) => sum + g.occurrences,
      0
    );

    const title = generateTitle(
      primaryCategory,
      Array.from(allServices),
      representative.message
    );

    // Build a human-readable description
    const descParts: string[] = [];
    descParts.push(representative.message);
    if (clusterGroups.length > 1) {
      descParts.push(
        `(${clusterGroups.length} related error variants, ${totalOccurrences.toLocaleString()} total occurrences)`
      );
    }

    issues.push({
      title,
      category: primaryCategory,
      severity: worstSeverity,
      message: descParts.join(" "),
      occurrences: totalOccurrences,
      firstSeen,
      lastSeen,
      affectedServices: Array.from(allServices),
      representativeError: representative,
      relatedErrors: clusterGroups,
      rawSamples: clusterGroups.map((g) => g.sampleRaw),
      confidence,
      isHighConfidence: confidence >= 0.7,
      fingerprint: cluster[0],
    });
  }

  // Sort issues: severity first, then occurrences, then confidence
  const sevRank: Record<Severity, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  };
  issues.sort((a, b) => {
    const sevDiff = sevRank[a.severity] - sevRank[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const occDiff = b.occurrences - a.occurrences;
    if (occDiff !== 0) return occDiff;
    return b.confidence - a.confidence;
  });

  return {
    issues,
    embeddingAvailable,
    fingerprintCount: uniqueFps.length,
    clusterCount: clusters.length,
  };
}
