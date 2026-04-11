/**
 * Vector storage and similarity search for the SDD Memory System.
 * Operates on Float32Array embeddings stored in the SQLite vectors table.
 */

import type { MemoryDB } from './database';

/** A node with its rank position and similarity score. */
export interface RankedNode {
  nodeId: string;
  rank: number;
  score: number;
}

/**
 * Compute cosine similarity between two vectors.
 * @param {Float32Array} a - First vector.
 * @param {Float32Array} b - Second vector.
 * @returns {number} Cosine similarity in [-1, 1].
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}

/**
 * Search stored vectors by cosine similarity to a query embedding.
 * @param {MemoryDB} db - Open memory database.
 * @param {Float32Array} queryEmbedding - Query vector.
 * @param {number} [topK=10] - Maximum results to return.
 * @returns {RankedNode[]} Ranked results sorted by similarity descending.
 */
export function searchVectors(
  db: MemoryDB,
  queryEmbedding: Float32Array,
  topK: number = 10
): RankedNode[] {
  const allVectors = db.getAllVectors();

  const scored = allVectors.map((row) => {
    const stored = deserializeEmbedding(row.embedding, row.dim);
    return {
      nodeId: row.node_id,
      score: cosineSimilarity(queryEmbedding, stored),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map((item, idx) => ({
    nodeId: item.nodeId,
    rank: idx + 1,
    score: item.score,
  }));
}

/**
 * Store a Float32Array embedding in the database.
 * @param {MemoryDB} db - Open memory database.
 * @param {string} nodeId - Node ID to attach the embedding to.
 * @param {Float32Array} embedding - Embedding vector.
 * @param {string} model - Model name that produced the embedding.
 */
export function storeEmbedding(
  db: MemoryDB,
  nodeId: string,
  embedding: Float32Array,
  model: string
): void {
  const buffer = serializeEmbedding(embedding);
  db.storeVector(nodeId, buffer, model, embedding.length);
}

/**
 * Serialize a Float32Array to a Buffer for SQLite storage.
 * @param {Float32Array} embedding - Vector to serialize.
 * @returns {Buffer} Buffer containing the raw float32 bytes.
 */
function serializeEmbedding(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
}

/**
 * Deserialize a Buffer back to a Float32Array.
 * @param {Buffer} buffer - Raw bytes from SQLite.
 * @param {number} dim - Expected dimensionality.
 * @returns {Float32Array} Reconstructed vector.
 */
function deserializeEmbedding(buffer: Buffer, dim: number): Float32Array {
  const ab = new ArrayBuffer(dim * 4);
  const view = new Uint8Array(ab);
  view.set(buffer);
  return new Float32Array(ab);
}
