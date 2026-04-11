/**
 * Tests for the Memory Embeddings layer (v2).
 * Covers vector store, hybrid retrieval, embedding providers, and DB migration.
 */

import { MemoryDB } from '@/memory/database';
import { ApiEmbeddingProvider } from '@/memory/embeddings/api-provider';
import { getProvider } from '@/memory/embeddings/fallback';
import { fuseResults } from '@/memory/hybrid-retrieval';
import type { RankedNode } from '@/memory/vector-store';
import { cosineSimilarity, searchVectors, storeEmbedding } from '@/memory/vector-store';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Create a temporary DB for testing. Returns { db, cleanup }. */
function createTempDB(): { db: MemoryDB; cleanup: () => void } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-mem-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const db = new MemoryDB(dbPath);
  const cleanup = () => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  };
  return { db, cleanup };
}

/** Helper to insert a test node. */
function insertTestNode(db: MemoryDB, id: string, title: string, content: string): void {
  db.insertNode({ id, label: 'Decision', title, content, source: 'test' });
}

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const v = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  it('returns -1.0 for opposite vectors', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([-1, -2, -3]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });
});

describe('storeEmbedding + searchVectors', () => {
  let db: MemoryDB;
  let cleanup: () => void;

  beforeEach(() => {
    ({ db, cleanup } = createTempDB());
    insertTestNode(db, 'dec_a', 'Auth Decision', 'User authentication strategy');
    insertTestNode(db, 'dec_b', 'Cache Decision', 'Caching strategy with Redis');
    insertTestNode(db, 'dec_c', 'API Decision', 'REST API design patterns');
  });

  afterEach(() => cleanup());

  it('stores 3 vectors and returns ranked results on search', () => {
    const vA = new Float32Array([1, 0, 0, 0]);
    const vB = new Float32Array([0, 1, 0, 0]);
    const vC = new Float32Array([0.9, 0.1, 0, 0]);

    storeEmbedding(db, 'dec_a', vA, 'test-model');
    storeEmbedding(db, 'dec_b', vB, 'test-model');
    storeEmbedding(db, 'dec_c', vC, 'test-model');

    // Query close to vA
    const query = new Float32Array([1, 0, 0, 0]);
    const results = searchVectors(db, query, 3);

    expect(results).toHaveLength(3);
    expect(results[0]!.nodeId).toBe('dec_a'); // exact match
    expect(results[0]!.score).toBeCloseTo(1.0, 5);
    expect(results[1]!.nodeId).toBe('dec_c'); // close second
    expect(results[1]!.rank).toBe(2);
  });
});

describe('fuseResults', () => {
  it('ranks nodes in multiple channels higher than single-channel', () => {
    const fts: RankedNode[] = [
      { nodeId: 'dec_a', rank: 1, score: 1 },
      { nodeId: 'dec_b', rank: 2, score: 1 },
    ];
    const vector: RankedNode[] = [
      { nodeId: 'dec_a', rank: 1, score: 0.95 },
      { nodeId: 'dec_c', rank: 2, score: 0.8 },
    ];
    const graph: RankedNode[] = [
      { nodeId: 'dec_a', rank: 1, score: 1 },
    ];

    const fused = fuseResults(fts, vector, graph);

    // dec_a appears in all 3 channels → highest score
    expect(fused[0]!.nodeId).toBe('dec_a');
    // dec_a score > dec_b score and > dec_c score
    const scoreA = fused.find((s) => s.nodeId === 'dec_a')!.score;
    const scoreB = fused.find((s) => s.nodeId === 'dec_b')!.score;
    const scoreC = fused.find((s) => s.nodeId === 'dec_c')!.score;
    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreA).toBeGreaterThan(scoreC);
  });

  it('handles empty channels gracefully', () => {
    const fts: RankedNode[] = [{ nodeId: 'dec_a', rank: 1, score: 1 }];
    const fused = fuseResults(fts, [], []);

    expect(fused).toHaveLength(1);
    expect(fused[0]!.nodeId).toBe('dec_a');
  });

  it('handles all channels empty', () => {
    const fused = fuseResults([], [], []);
    expect(fused).toHaveLength(0);
  });
});

describe('getProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns ApiEmbeddingProvider when OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key-12345';
    const provider = await getProvider();
    expect(provider).toBeInstanceOf(ApiEmbeddingProvider);
    expect(provider!.model).toBe('text-embedding-3-small');
  });

  it('returns null without any keys and no onnxruntime-node', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.VERTEX_API_KEY;
    const provider = await getProvider();
    expect(provider).toBeNull();
  });
});

describe('Database migration', () => {
  let db: MemoryDB;
  let cleanup: () => void;

  beforeEach(() => {
    ({ db, cleanup } = createTempDB());
  });

  afterEach(() => cleanup());

  it('vectors table exists after MemoryDB construction', () => {
    // Query SQLite master table for the vectors table
    const result = (db as any).db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vectors'")
      .get();
    expect(result).toBeDefined();
    expect(result.name).toBe('vectors');
  });
});

describe('storeVector + getVector round-trip', () => {
  let db: MemoryDB;
  let cleanup: () => void;

  beforeEach(() => {
    ({ db, cleanup } = createTempDB());
    insertTestNode(db, 'dec_rt', 'Round Trip', 'Testing round-trip storage');
  });

  afterEach(() => cleanup());

  it('stores and retrieves a vector correctly', () => {
    const embedding = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);

    db.storeVector('dec_rt', buf, 'test-model', 4);

    const retrieved = db.getVector('dec_rt');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.model).toBe('test-model');
    expect(retrieved!.dim).toBe(4);

    // Verify the actual float values round-trip
    const float32 = new Float32Array(
      retrieved!.embedding.buffer,
      retrieved!.embedding.byteOffset,
      retrieved!.dim
    );
    expect(float32[0]).toBeCloseTo(0.1, 5);
    expect(float32[1]).toBeCloseTo(0.2, 5);
    expect(float32[2]).toBeCloseTo(0.3, 5);
    expect(float32[3]).toBeCloseTo(0.4, 5);
  });

  it('returns null for non-existent node', () => {
    expect(db.getVector('dec_nonexistent')).toBeNull();
  });

  it('deleteVector removes the vector', () => {
    const embedding = new Float32Array([1, 2, 3]);
    const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
    db.storeVector('dec_rt', buf, 'model', 3);

    db.deleteVector('dec_rt');
    expect(db.getVector('dec_rt')).toBeNull();
  });
});
