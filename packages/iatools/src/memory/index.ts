/**
 * Barrel export for the SDD Memory System module.
 * Re-exports database, types, retrieval, and ingestion submodules.
 */

export { MemoryDB } from './database';
export type {
  NodeLabel,
  MemoryNode,
  MemoryEdge,
  ExtractionResult,
  MemoryContext,
  MemoryExport,
} from './types';
export { NODE_PREFIX } from './types';
export { retrieveContext } from './retrieval';
export { buildExtractionPrompt, processExtractionResult } from './ingestion';

