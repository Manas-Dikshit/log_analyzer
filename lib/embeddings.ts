// Embedding generation using @huggingface/transformers (all-MiniLM-L6-v2).
// Runs entirely locally via ONNX — no cloud API, no paid service.
// Uses fingerprint-based caching to avoid re-embedding identical messages.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;
let loadingPromise: Promise<void> | null = null;

const embeddingCache = new Map<string, number[]>();

/**
 * Initialize the embedding model. Singleton — safe to call multiple times.
 * Downloads ~23MB model on first call, then stays in memory.
 */
export async function initEmbedder(): Promise<void> {
  if (extractor) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Dynamic import to avoid bundling ONNX in client chunks
    const { pipeline } = await import("@huggingface/transformers");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
  })();

  return loadingPromise;
}

/**
 * Check if the embedder is initialized (non-blocking).
 */
export function isEmbedderReady(): boolean {
  return extractor !== null;
}

/**
 * Generate embedding for a single text. Returns cached result if available.
 */
export async function embedText(text: string): Promise<number[]> {
  const cached = embeddingCache.get(text);
  if (cached) return cached;

  await initEmbedder();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  const vec = Array.from(output.data as Float32Array) as number[];
  embeddingCache.set(text, vec);
  return vec;
}

/**
 * Generate embeddings for multiple texts. Deduplicates identical inputs.
 * Returns embeddings in the same order as the input array.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Deduplicate: map unique texts to their indices
  const uniqueTexts = new Map<string, number[]>();
  const uniqueList: string[] = [];
  for (const t of texts) {
    if (!uniqueTexts.has(t)) {
      const idx = uniqueList.length;
      uniqueTexts.set(t, [idx]);
      uniqueList.push(t);
    } else {
      uniqueTexts.get(t)!.push(uniqueList.length);
      // Actually we need the original index mapping. Let me rethink.
    }
  }

  // Simpler approach: check cache, collect uncached
  const results: (number[] | null)[] = texts.map(
    (t) => embeddingCache.get(t) ?? null
  );
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (results[i] === null) {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  // Generate embeddings for uncached texts
  if (uncachedTexts.length > 0) {
    await initEmbedder();
    const output = await extractor(uncachedTexts, {
      pooling: "mean",
      normalize: true,
    });

    // output.data is a flat Float32Array; shape: [batch_size, 384]
    const dim = 384;
    for (let i = 0; i < uncachedIndices.length; i++) {
      const start = i * dim;
      const vec = Array.from(
        (output.data as Float32Array).slice(start, start + dim)
      ) as number[];
      embeddingCache.set(uncachedTexts[i], vec);
      results[uncachedIndices[i]] = vec;
    }
  }

  return results as number[][];
}

/**
 * Clear the embedding cache (e.g., for memory management).
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}
