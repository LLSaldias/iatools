/**
 * @module pipeline/traceability
 * Barrel exports for the traceability system.
 */

export { traceChange, traceItem, type TraceLink, type TraceResult } from '@/pipeline/traceability/chain';
export { resolveParent, validateLineage, type LineageLink } from '@/pipeline/traceability/lineage';
export { countTokens, stampMetadata, type PhaseMetadata } from '@/pipeline/traceability/metadata';

