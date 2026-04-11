/**
 * @module pipeline/traceability/metadata
 * Phase metadata stamping and token counting utilities.
 */

/** Metadata for a phase artifact. */
export interface PhaseMetadata {
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  token_count?: number;
}

/**
 * Stamp metadata onto a phase artifact.
 * Uses the current timestamp and 'iatools' as creator.
 */
export function stampMetadata(phase: string): PhaseMetadata {
  return {
    created_by: 'iatools',
    created_at: new Date().toISOString(),
  };
}

/**
 * Approximate token count for a text string.
 * Uses whitespace splitting with a 1.33x multiplier (rough BPE approximation).
 */
export function countTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.33);
}
