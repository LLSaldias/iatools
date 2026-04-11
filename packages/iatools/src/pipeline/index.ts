/**
 * @module pipeline
 * Barrel exports for the pipeline layer.
 */

export {
    compress, decompress, extractPreserved, parseCave, restorePreserved, serializeCave, validateCave, type CaveArtifact, type CaveDesign, type CaveHeader,
    type CaveMeta,
    type CaveProposal,
    type CaveSpec, type CaveTasks, type PreservedBlock
} from '@/pipeline/caveman';

export {
    countTokens, resolveParent, stampMetadata, traceChange, traceItem, validateLineage, type LineageLink, type PhaseMetadata, type TraceLink,
    type TraceResult
} from '@/pipeline/traceability';

export { processArtifact, type ArtifactFlowOptions } from '@/pipeline/artifact-flow';

