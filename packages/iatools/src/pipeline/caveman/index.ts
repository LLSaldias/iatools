/**
 * @module pipeline/caveman
 * Barrel exports for the caveman compression system.
 */

export { compress, parseCave, serializeCave } from '@/pipeline/caveman/compressor';
export { decompress } from '@/pipeline/caveman/decompressor';
export { extractPreserved, restorePreserved, type PreservedBlock } from '@/pipeline/caveman/preservers';
export { validateCave, type CaveArtifact, type CaveDesign, type CaveHeader, type CaveMeta, type CaveProposal, type CaveSpec, type CaveTasks } from '@/pipeline/caveman/profiles';

