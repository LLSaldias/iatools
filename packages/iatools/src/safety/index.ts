/**
 * Barrel export for the Safety Layer module.
 * Re-exports patterns, scanner, redactor, and audit submodules.
 */

export { BUILTIN_PATTERNS } from './patterns';
export type { PatternRule } from './patterns';

export { loadConfig, scan } from './scanner';
export type { RedactionCandidate, SanitizeConfig } from './scanner';

export { apply } from './redactor';

export { hashMatch, logDecisions } from './audit';
export type { AuditEntry } from './audit';

