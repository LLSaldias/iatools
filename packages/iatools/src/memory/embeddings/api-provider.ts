/**
 * API-based embedding provider using OpenAI or Vertex AI.
 * Reads API keys from environment variables and uses native fetch().
 */

import type { EmbeddingProvider } from './provider';

/** Supported API embedding backends. */
type ApiBackend = 'openai' | 'vertex';

/** Configuration for each supported backend. */
const BACKEND_CONFIG: Record<ApiBackend, { model: string; dimensions: number }> = {
  openai: { model: 'text-embedding-3-small', dimensions: 1536 },
  vertex: { model: 'text-embedding-004', dimensions: 768 },
};

/** Maximum texts per batch request. */
const BATCH_CHUNK_SIZE = 100;

/**
 * Embedding provider that delegates to OpenAI or Vertex AI HTTP APIs.
 * Automatically detects backend from available environment variables.
 */
export class ApiEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;

  private readonly backend: ApiBackend;
  private readonly apiKey: string;

  /**
   * Create an API embedding provider.
   * @param {ApiBackend} [backend] - Force a specific backend. Auto-detected if omitted.
   * @throws {Error} If no API key is found in the environment.
   */
  constructor(backend?: ApiBackend) {
    if (backend) {
      this.backend = backend;
    } else if (process.env.OPENAI_API_KEY) {
      this.backend = 'openai';
    } else if (process.env.VERTEX_API_KEY) {
      this.backend = 'vertex';
    } else {
      throw new Error(
        'ApiEmbeddingProvider requires OPENAI_API_KEY or VERTEX_API_KEY in environment.'
      );
    }

    const envKey = this.backend === 'openai' ? 'OPENAI_API_KEY' : 'VERTEX_API_KEY';
    const key = process.env[envKey];
    if (!key) {
      throw new Error(`ApiEmbeddingProvider: missing ${envKey} environment variable.`);
    }
    this.apiKey = key;

    const config = BACKEND_CONFIG[this.backend];
    this.model = config.model;
    this.dimensions = config.dimensions;
  }

  /** @inheritdoc */
  async embed(text: string): Promise<Float32Array> {
    const results = await this.embedBatch([text]);
    return results[0]!;
  }

  /** @inheritdoc */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];

    for (let i = 0; i < texts.length; i += BATCH_CHUNK_SIZE) {
      const chunk = texts.slice(i, i + BATCH_CHUNK_SIZE);
      const chunkResults = await this.requestChunk(chunk);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Send a chunk of texts to the appropriate API endpoint.
   * @param {string[]} texts - Texts to embed (max BATCH_CHUNK_SIZE).
   * @returns {Promise<Float32Array[]>} Embeddings for each text.
   */
  private async requestChunk(texts: string[]): Promise<Float32Array[]> {
    if (this.backend === 'openai') {
      return this.requestOpenAI(texts);
    }
    return this.requestVertex(texts);
  }

  /**
   * Call the OpenAI embeddings API.
   * @param {string[]} texts - Input texts.
   * @returns {Promise<Float32Array[]>} Embedding vectors.
   */
  private async requestOpenAI(texts: string[]): Promise<Float32Array[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: this.model }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI embeddings API error (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    // Sort by index to preserve input order
    const sorted = json.data.sort((a, b) => a.index - b.index);
    return sorted.map((item) => new Float32Array(item.embedding));
  }

  /**
   * Call the Vertex AI (Generative Language) embeddings API.
   * @param {string[]} texts - Input texts.
   * @returns {Promise<Float32Array[]>} Embedding vectors.
   */
  private async requestVertex(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];

    // Vertex embedContent API processes one text at a time
    for (const text of texts) {
      const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:embedContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Vertex embeddings API error (${response.status}): ${body}`);
      }

      const json = (await response.json()) as {
        embedding: { values: number[] };
      };
      results.push(new Float32Array(json.embedding.values));
    }

    return results;
  }
}
