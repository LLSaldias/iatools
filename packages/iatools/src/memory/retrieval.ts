/**
 * Retrieval module for the SDD Memory System.
 * Queries the knowledge graph using FTS5 keyword search followed by
 * 1-hop radial expansion, returning a formatted context block for LLM injection.
 */

import { MemoryDB } from './database';
import type { MemoryNode, MemoryEdge, MemoryContext } from './types';

/**
 * Retrieve relevant memory context from the knowledge graph.
 *
 * Uses a 2-step search strategy:
 * 1. FTS5 keyword search over node titles and content.
 * 2. 1-hop radial expansion to include neighboring nodes.
 *
 * Results are deduplicated, capped, and formatted as Markdown for prompt injection.
 *
 * @param {MemoryDB} db - Open memory database instance.
 * @param {string[]} keywords - Search terms extracted from the change name or user input.
 * @param {number} [maxNodes=20] - Maximum total nodes to return (direct + neighbors).
 * @returns {MemoryContext} Nodes, edges, and pre-rendered Markdown context.
 */
export function retrieveContext(
  db: MemoryDB,
  keywords: string[],
  maxNodes: number = 20
): MemoryContext {
  if (keywords.length === 0) {
    return { nodes: [], edges: [], formatted: '' };
  }

  const ftsQuery = keywords
    .map((kw) => kw.replace(/[^\w\s]/g, ''))
    .filter((kw) => kw.trim().length > 0)
    .join(' OR ');

  if (!ftsQuery) {
    return { nodes: [], edges: [], formatted: '' };
  }

  let directHits: MemoryNode[];
  try {
    directHits = db.findByFTS(ftsQuery, 10);
  } catch {
    return { nodes: [], edges: [], formatted: '' };
  }

  const nodeMap = new Map<string, MemoryNode>();
  for (const node of directHits) {
    nodeMap.set(node.id, node);
  }

  for (const hit of directHits) {
    if (nodeMap.size >= maxNodes) break;
    const neighbors = db.getNeighbors(hit.id);
    for (const neighbor of neighbors) {
      if (nodeMap.size >= maxNodes) break;
      if (!nodeMap.has(neighbor.id)) {
        nodeMap.set(neighbor.id, neighbor);
      }
    }
  }

  const nodes = Array.from(nodeMap.values()).slice(0, maxNodes);

  const allEdges: MemoryEdge[] = [];
  const edgeSet = new Set<string>();
  for (const node of nodes) {
    const edges = db.getEdgesForNode(node.id);
    for (const edge of edges) {
      const key = `${edge.source_id}:${edge.target_id}:${edge.relation_type}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        allEdges.push(edge);
      }
    }
  }

  const formatted = formatContext(nodes, allEdges, nodeMap);

  return { nodes, edges: allEdges, formatted };
}

/**
 * Format retrieved nodes and edges as a Markdown context block.
 * @param {MemoryNode[]} nodes - Retrieved nodes.
 * @param {MemoryEdge[]} edges - Edges connecting the nodes.
 * @param {Map<string, MemoryNode>} nodeMap - Lookup map for node titles.
 * @returns {string} Formatted Markdown string.
 */
function formatContext(
  nodes: MemoryNode[],
  edges: MemoryEdge[],
  nodeMap: Map<string, MemoryNode>
): string {
  if (nodes.length === 0) return '';

  const lines: string[] = [
    `## Memory Context (${nodes.length} nodes retrieved)`,
    '',
  ];

  for (const node of nodes) {
    lines.push(`### ${node.label}: ${node.title} [${node.id}]`);
    lines.push(node.content);

    const nodeEdges = edges.filter(
      (e) => e.source_id === node.id || e.target_id === node.id
    );
    for (const edge of nodeEdges) {
      const connectedId =
        edge.source_id === node.id ? edge.target_id : edge.source_id;
      const connected = nodeMap.get(connectedId);
      const connectedLabel = connected
        ? `${connected.label}: ${connected.title}`
        : connectedId;
      lines.push(`↳ ${edge.relation_type} → ${connectedLabel}`);
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
