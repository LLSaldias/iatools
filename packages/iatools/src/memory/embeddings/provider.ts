/**
 * Embedding provider interface for the SDD Memory System.
 * Defines the contract for vector embedding generation.
 */

/** Contract for embedding providers (API-based or local). */
export interface EmbeddingProvider {
  /** Model identifier (e.g. "text-embedding-3-small"). */
  readonly model: string;
  /** Output vector dimensionality. */
  readonly dimensions: number;
  /** Generate an embedding for a single text. */
  embed(text: string): Promise<Float32Array>;
  /** Generate embeddings for multiple texts. */
  embedBatch(texts: string[]): Promise<Float32Array[]>;
}
