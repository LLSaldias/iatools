/**
 * Hybrid retrieval combining FTS5, vector similarity, and graph walk.
 * Uses Reciprocal Rank Fusion (RRF) to merge results from multiple channels.
 */

import type { MemoryDB } from './database';
import type { EmbeddingProvider } from './embeddings/provider';
import type { MemoryContext, MemoryEdge, MemoryNode } from './types';
import type { RankedNode } from './vector-store';
import { searchVectors } from './vector-store';

/** A node with its fused retrieval score. */
export interface ScoredNode {
  nodeId: string;
  score: number;
}

/** Default RRF smoothing constant. */
const RRF_K = 60;

/**
 * Fuse ranked result lists using Reciprocal Rank Fusion.
 *
 * RRF score for a document d = Σ 1 / (k + rank_i(d)) across all channels.
 *
 * @param {RankedNode[]} ftsResults - Results from FTS5 keyword search.
 * @param {RankedNode[]} vectorResults - Results from vector similarity search.
 * @param {RankedNode[]} graphResults - Results from graph walk expansion.
 * @param {number} [k=60] - RRF smoothing constant.
 * @returns {ScoredNode[]} Fused results sorted by score descending.
 */
export function fuseResults(
  ftsResults: RankedNode[],
  vectorResults: RankedNode[],
  graphResults: RankedNode[],
  k: number = RRF_K
): ScoredNode[] {
  const scores = new Map<string, number>();

  const addChannel = (results: RankedNode[]) => {
    for (const r of results) {
      const prev = scores.get(r.nodeId) ?? 0;
      scores.set(r.nodeId, prev + 1 / (k + r.rank));
    }
  };

  addChannel(ftsResults);
  addChannel(vectorResults);
  addChannel(graphResults);

  const fused: ScoredNode[] = [];
  for (const [nodeId, score] of scores) {
    fused.push({ nodeId, score });
  }

  fused.sort((a, b) => b.score - a.score);
  return fused;
}

/**
 * Perform hybrid retrieval combining FTS, vector search, and graph walk.
 *
 * @param {MemoryDB} db - Open memory database.
 * @param {string} query - Natural language query string.
 * @param {object} [options] - Retrieval options.
 * @param {number} [options.maxNodes=20] - Maximum nodes to return.
 * @param {EmbeddingProvider | null} [options.provider=null] - Embedding provider (null = skip vector search).
 * @returns {Promise<MemoryContext>} Retrieved context with nodes, edges, and formatted text.
 */
export async function hybridRetrieve(
  db: MemoryDB,
  query: string,
  options?: { maxNodes?: number; provider?: EmbeddingProvider | null }
): Promise<MemoryContext> {
  const maxNodes = options?.maxNodes ?? 20;
  const provider = options?.provider ?? null;

  // 1. FTS search
  const ftsQuery = query
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .join(' OR ');

  let ftsNodes: MemoryNode[] = [];
  if (ftsQuery) {
    try {
      ftsNodes = db.findByFTS(ftsQuery, maxNodes);
    } catch {
      // FTS query syntax error — skip FTS channel
    }
  }

  const ftsRanked: RankedNode[] = ftsNodes.map((n, i) => ({
    nodeId: n.id,
    rank: i + 1,
    score: 1, // FTS rank is positional
  }));

  // 2. Vector search (if provider available)
  let vectorRanked: RankedNode[] = [];
  if (provider) {
    try {
      const queryEmbedding = await provider.embed(query);
      vectorRanked = searchVectors(db, queryEmbedding, maxNodes);
    } catch {
      // Vector search failed — skip vector channel
    }
  }

  // 3. Graph walk — expand from FTS hits
  const graphNodeMap = new Map<string, number>();
  let graphRank = 1;
  for (const hit of ftsNodes.slice(0, 5)) {
    const neighbors = db.getNeighbors(hit.id);
    for (const neighbor of neighbors) {
      if (!graphNodeMap.has(neighbor.id)) {
        graphNodeMap.set(neighbor.id, graphRank++);
      }
    }
  }

  const graphRanked: RankedNode[] = [];
  for (const [nodeId, rank] of graphNodeMap) {
    graphRanked.push({ nodeId, rank, score: 1 });
  }

  // 4. Fuse results
  const fused = fuseResults(ftsRanked, vectorRanked, graphRanked);
  const topIds = fused.slice(0, maxNodes).map((s) => s.nodeId);

  // 5. Fetch full nodes
  const nodeMap = new Map<string, MemoryNode>();
  // Include nodes we already have from FTS
  for (const n of ftsNodes) {
    nodeMap.set(n.id, n);
  }
  // Fetch any missing nodes from the DB
  const allNodes = topIds.length > 0 ? db.getAllNodes() : [];
  for (const n of allNodes) {
    if (!nodeMap.has(n.id)) {
      nodeMap.set(n.id, n);
    }
  }

  const resultNodes: MemoryNode[] = [];
  for (const id of topIds) {
    const node = nodeMap.get(id);
    if (node) resultNodes.push(node);
  }

  // 6. Collect edges between result nodes
  const resultNodeIds = new Set(resultNodes.map((n) => n.id));
  const allEdges: MemoryEdge[] = [];
  const edgeSet = new Set<string>();

  for (const node of resultNodes) {
    const edges = db.getEdgesForNode(node.id);
    for (const edge of edges) {
      if (resultNodeIds.has(edge.source_id) && resultNodeIds.has(edge.target_id)) {
        const key = `${edge.source_id}:${edge.target_id}:${edge.relation_type}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          allEdges.push(edge);
        }
      }
    }
  }

  // 7. Format context
  const formatted = formatHybridContext(resultNodes, allEdges);

  return { nodes: resultNodes, edges: allEdges, formatted };
}

/**
 * Format hybrid retrieval results as Markdown.
 * @param {MemoryNode[]} nodes - Retrieved nodes.
 * @param {MemoryEdge[]} edges - Edges between retrieved nodes.
 * @returns {string} Formatted Markdown context block.
 */
function formatHybridContext(nodes: MemoryNode[], edges: MemoryEdge[]): string {
  if (nodes.length === 0) return '';

  const lines: string[] = [`## Memory Context (${nodes.length} nodes, hybrid retrieval)`, ''];

  for (const node of nodes) {
    lines.push(`### [${node.label}] ${node.title}`);
    lines.push(node.content);
    lines.push('');
  }

  if (edges.length > 0) {
    lines.push('### Relationships');
    for (const edge of edges) {
      lines.push(`- ${edge.source_id} —[${edge.relation_type}]→ ${edge.target_id}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
