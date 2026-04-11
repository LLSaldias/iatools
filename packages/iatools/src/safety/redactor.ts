/**
 * Redactor module for the Safety Layer.
 * Applies approved redaction candidates to text, replacing matched spans
 * with their designated replacement strings.
 */

import type { RedactionCandidate } from '@/safety/scanner';

/**
 * Apply approved redaction candidates to text.
 * Processes replacements from end-to-start to preserve earlier positions.
 *
 * @param text - The original text to redact.
 * @param approved - Array of approved redaction candidates to apply.
 * @returns The text with all approved matches replaced.
 */
export function apply(text: string, approved: RedactionCandidate[]): string {
  const sorted = [...approved].sort((a, b) => b.start - a.start);

  let result = text;
  for (const candidate of sorted) {
    result =
      result.slice(0, candidate.start) +
      candidate.replacement +
      result.slice(candidate.end);
  }

  return result;
}
