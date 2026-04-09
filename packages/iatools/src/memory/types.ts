/**
 * Type definitions for the SDD Memory System knowledge graph.
 * Defines node and edge types stored in the SQLite-backed memory database.
 */

/** Valid node label types for the knowledge graph */
export type NodeLabel = 'Decision' | 'Rule' | 'Feature';

/** ID prefix mapping for each node label */
export const NODE_PREFIX: Record<NodeLabel, string> = {
  Decision: 'dec',
  Rule: 'rul',
  Feature: 'fea',
};

/** A knowledge graph node representing a Decision, Rule, or Feature */
export interface MemoryNode {
  id: string;
  label: NodeLabel;
  title: string;
  content: string;
  source: string | null;
  created_at: string;
}

/** A directed edge connecting two nodes in the knowledge graph */
export interface MemoryEdge {
  source_id: string;
  target_id: string;
  relation_type: 'DECIDED_IN' | 'CONSTRAINS' | 'DEPENDS_ON' | 'SUPERSEDES';
  created_at: string;
}

/** Raw extraction result from LLM, before validation */
export interface ExtractionResult {
  nodes: Array<{
    label: NodeLabel;
    title: string;
    content: string;
  }>;
  edges: Array<{
    source_title: string;
    target_id?: string;
    target_title?: string;
    relation_type: MemoryEdge['relation_type'];
  }>;
}

/** Retrieval result with ranked nodes, their edges, and pre-rendered context */
export interface MemoryContext {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  formatted: string;
}

/** JSON export structure for Git-friendly snapshots */
export interface MemoryExport {
  exportedAt: string;
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}
