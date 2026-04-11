/**
 * Fallback provider selection for embeddings.
 * Attempts API providers first, then local, falls back to null (BM25-only).
 */

import { ApiEmbeddingProvider } from './api-provider';
import { LocalEmbeddingProvider } from './local-provider';
import type { EmbeddingProvider } from './provider';

/** Tracks whether the "no provider" warning has been emitted. */
let warned = false;

/**
 * Resolve the best available embedding provider.
 *
 * Priority:
 * 1. API provider (OPENAI_API_KEY or VERTEX_API_KEY in env)
 * 2. Local ONNX provider (onnxruntime-node installed)
 * 3. null — BM25-only mode with a one-time warning
 *
 * @returns {Promise<EmbeddingProvider | null>} Provider instance or null.
 */
export async function getProvider(): Promise<EmbeddingProvider | null> {
  // 1. Try API provider
  if (process.env.OPENAI_API_KEY || process.env.VERTEX_API_KEY) {
    return new ApiEmbeddingProvider();
  }

  // 2. Try local ONNX provider
  if (LocalEmbeddingProvider.isAvailable()) {
    return new LocalEmbeddingProvider();
  }

  // 3. No provider available — BM25-only
  if (!warned) {
    console.warn(
      '[sdd-memory] No embedding provider available. Using BM25-only retrieval. ' +
        'Set OPENAI_API_KEY or install onnxruntime-node for vector search.'
    );
    warned = true;
  }

  return null;
}
