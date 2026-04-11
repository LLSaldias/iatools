/**
 * Audit module for the Safety Layer.
 * Logs redaction decisions to a JSONL audit trail and provides
 * secure hashing of matched text to avoid storing cleartext secrets.
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';

/** A single audit log entry recording a redaction decision */
export interface AuditEntry {
  /** ISO-8601 timestamp of the decision */
  ts: string;
  /** Name or identifier of the change being processed */
  change: string;
  /** ID of the pattern that matched */
  patternId: string;
  /** SHA-256 hex hash of the matched text (no cleartext stored) */
  matchHash: string;
  /** Whether the match was redacted or kept */
  decision: 'redact' | 'keep';
  /** Whether the decision was made interactively or automatically */
  user: 'interactive' | 'auto';
}

/**
 * Compute SHA-256 hex hash of a matched text string.
 * Used to record matches in the audit log without storing cleartext secrets.
 *
 * @param match - The matched text to hash.
 * @returns Lowercase hex string of the SHA-256 hash.
 */
export function hashMatch(match: string): string {
  return crypto.createHash('sha256').update(match).digest('hex');
}

/**
 * Append audit entries to a JSONL file.
 * Each entry is written as a single JSON line. The directory is created if needed.
 *
 * @param auditPath - Absolute path to the audit log file.
 * @param entries - Array of audit entries to append.
 */
export function logDecisions(auditPath: string, entries: AuditEntry[]): void {
  fs.ensureDirSync(require('path').dirname(auditPath));
  const lines = entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
  fs.appendFileSync(auditPath, lines, 'utf-8');
}
