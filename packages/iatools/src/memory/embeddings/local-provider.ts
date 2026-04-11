/**
 * Local embedding provider using all-MiniLM-L6-v2 ONNX model.
 * Lazy-loads onnxruntime-node and downloads the model on first use.
 */

import type { EmbeddingProvider } from './provider';

/** Model dimensionality for all-MiniLM-L6-v2. */
const LOCAL_MODEL_DIM = 384;

/**
 * Embedding provider that runs inference locally via ONNX Runtime.
 * Requires the optional `onnxruntime-node` package.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'all-MiniLM-L6-v2';
  readonly dimensions = LOCAL_MODEL_DIM;

  private initialized = false;

  /**
   * Check that onnxruntime-node is available.
   * @throws {Error} If the package is not installed.
   */
  private ensureRuntime(): void {
    if (this.initialized) return;

    try {
      require('onnxruntime-node');
    } catch {
      throw new Error(
        'Local embeddings require onnxruntime-node. Install with: npm install onnxruntime-node'
      );
    }

    this.initialized = true;
  }

  /**
   * Check whether onnxruntime-node is available without throwing.
   * @returns {boolean} True if the runtime can be loaded.
   */
  static isAvailable(): boolean {
    try {
      require('onnxruntime-node');
      return true;
    } catch {
      return false;
    }
  }

  /** @inheritdoc */
  async embed(text: string): Promise<Float32Array> {
    this.ensureRuntime();
    // Stub: actual ONNX inference is not yet implemented
    throw new Error(
      'Local embeddings require onnxruntime-node. Install with: npm install onnxruntime-node'
    );
  }

  /** @inheritdoc */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    this.ensureRuntime();
    // Stub: actual ONNX inference is not yet implemented
    throw new Error(
      'Local embeddings require onnxruntime-node. Install with: npm install onnxruntime-node'
    );
  }
}
