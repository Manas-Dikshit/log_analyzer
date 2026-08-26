// Clustering engine: Union-Find with cosine similarity threshold.
// No external dependencies — pure TypeScript.

/**
 * Cosine similarity between two vectors (assumed same length, L2-normalized).
 * For normalized vectors, this equals the dot product.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

// Union-Find data structure
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    // union by rank
    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry;
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx;
    } else {
      this.parent[ry] = rx;
      this.rank[rx]++;
    }
  }

  clusters(): Map<number, number[]> {
    const groups = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      const arr = groups.get(root) ?? [];
      arr.push(i);
      groups.set(root, arr);
    }
    return groups;
  }
}

export interface ClusterItem {
  id: string;
  embedding: number[];
}

/**
 * Cluster items by cosine similarity using single-linkage Union-Find.
 * Returns an array of clusters, each cluster is an array of IDs.
 *
 * @param items - Items with embeddings
 * @param threshold - Minimum similarity to merge (0-1). Higher = stricter.
 *   0.7 is a good default for semantic grouping of error messages.
 */
export function clusterBySimilarity(
  items: ClusterItem[],
  threshold: number = 0.7
): string[][] {
  if (items.length === 0) return [];
  if (items.length === 1) return [[items[0].id]];

  const uf = new UnionFind(items.length);

  // Compare all pairs — O(n²) but error group counts are typically small (< 1000)
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sim = cosineSimilarity(items[i].embedding, items[j].embedding);
      if (sim >= threshold) {
        uf.union(i, j);
      }
    }
  }

  // Extract clusters
  const clusterMap = uf.clusters();
  const clusters: string[][] = [];
  for (const indices of clusterMap.values()) {
    clusters.push(indices.map((i) => items[i].id));
  }

  // Sort clusters by size descending, then by first ID
  clusters.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

  return clusters;
}

/**
 * Compute the centroid (mean vector) of a set of normalized vectors.
 */
export function computeCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const centroid = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += v[i];
    }
  }
  const n = vectors.length;
  for (let i = 0; i < dim; i++) {
    centroid[i] /= n;
  }
  // Re-normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += centroid[i] * centroid[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) centroid[i] /= norm;
  }
  return centroid;
}
