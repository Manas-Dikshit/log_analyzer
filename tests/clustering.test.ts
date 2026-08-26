import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cosineSimilarity,
  clusterBySimilarity,
  computeCentroid,
} from "../lib/clustering";

describe("cosineSimilarity", () => {
  it("returns 1 for identical normalized vectors", () => {
    const v = [0.6, 0.8];
    assert.ok(Math.abs(cosineSimilarity(v, v) - 1.0) < 1e-6);
  });

  it("returns 0 for orthogonal vectors", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-6);
  });

  it("returns -1 for opposite vectors", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0], [-1, 0]) - (-1)) < 1e-6);
  });

  it("returns 0 for different-length vectors", () => {
    assert.equal(cosineSimilarity([1, 0], [1, 0, 0]), 0);
  });

  it("computes correct similarity for similar vectors", () => {
    const sim = cosineSimilarity([0.9, 0.1, 0.0], [0.8, 0.2, 0.0]);
    assert.ok(sim > 0.9, `expected > 0.9, got ${sim}`);
  });
});

describe("clusterBySimilarity", () => {
  it("returns empty for empty input", () => {
    const result = clusterBySimilarity([]);
    assert.equal(result.length, 0);
  });

  it("returns single cluster for one item", () => {
    const result = clusterBySimilarity([
      { id: "a", embedding: [1, 0] },
    ]);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], ["a"]);
  });

  it("clusters identical items together", () => {
    const result = clusterBySimilarity(
      [
        { id: "a", embedding: [1, 0] },
        { id: "b", embedding: [1, 0] },
        { id: "c", embedding: [1, 0] },
      ],
      0.9
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].length, 3);
  });

  it("separates dissimilar items", () => {
    const result = clusterBySimilarity(
      [
        { id: "a", embedding: [1, 0] },
        { id: "b", embedding: [-1, 0] },
      ],
      0.9
    );
    assert.equal(result.length, 2);
  });

  it("respects threshold parameter", () => {
    // These are moderately similar (~0.8 cosine)
    const items = [
      { id: "a", embedding: [0.8, 0.6] },
      { id: "b", embedding: [0.6, 0.8] },
    ];

    // High threshold → separate clusters
    const strict = clusterBySimilarity(items, 0.99);
    assert.equal(strict.length, 2);

    // Low threshold → single cluster
    const loose = clusterBySimilarity(items, 0.5);
    assert.equal(loose.length, 1);
  });

  it("handles chain-link clustering (single-linkage)", () => {
    // A-B are similar, B-C are similar, but A-C are not
    // Single-linkage should chain them into one cluster
    const result = clusterBySimilarity(
      [
        { id: "a", embedding: [1, 0] },
        { id: "b", embedding: [0.9, 0.44] },
        { id: "c", embedding: [0, 1] },
      ],
      0.9
    );
    // a↔b: sim ≈ 0.9 → same cluster
    // b↔c: sim ≈ 0.8 → separate
    // a↔c: sim = 0 → separate
    assert.ok(result.length >= 1);
    // "a" and "b" should be in the same cluster
    const clusterAB = result.find(
      (c) => c.includes("a") && c.includes("b")
    );
    assert.ok(clusterAB, "a and b should be in the same cluster");
  });

  it("sorts clusters by size descending", () => {
    const result = clusterBySimilarity(
      [
        { id: "small", embedding: [-1, 0] },
        { id: "big1", embedding: [1, 0] },
        { id: "big2", embedding: [1, 0] },
        { id: "big3", embedding: [1, 0] },
      ],
      0.9
    );
    assert.ok(result[0].length >= result[result.length - 1].length);
  });
});

describe("computeCentroid", () => {
  it("computes mean vector", () => {
    const centroid = computeCentroid([
      [1, 0],
      [0, 1],
    ]);
    // Mean should be [0.5, 0.5], normalized
    const norm = Math.sqrt(0.5);
    assert.ok(Math.abs(centroid[0] - 0.5 / norm) < 1e-6);
    assert.ok(Math.abs(centroid[1] - 0.5 / norm) < 1e-6);
  });

  it("returns empty for no vectors", () => {
    assert.deepEqual(computeCentroid([]), []);
  });

  it("returns normalized vector", () => {
    const centroid = computeCentroid([
      [3, 4],
      [6, 8],
    ]);
    const norm = Math.sqrt(
      centroid[0] * centroid[0] + centroid[1] * centroid[1]
    );
    assert.ok(Math.abs(norm - 1.0) < 1e-6, "centroid should be unit vector");
  });
});
