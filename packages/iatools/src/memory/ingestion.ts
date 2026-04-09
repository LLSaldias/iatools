/**
 * Ingestion module for the SDD Memory System.
 * Provides functions to build LLM extraction prompts and process
 * extraction results into validated knowledge graph nodes and edges.
 */

import { nanoid } from 'nanoid';
import { MemoryDB } from './database';
import type {
  MemoryNode,
  ExtractionResult,
  NodeLabel,
} from './types';
import { NODE_PREFIX } from './types';

/** Maximum number of nodes per ingestion */
const MAX_NODES = 3;

/** Maximum number of edges per ingestion */
const MAX_EDGES = 5;

/**
 * Build a structured extraction prompt for the LLM.
 * Requests exactly up to 3 key Decision/Rule/Feature nodes from a proposal,
 * and suggests connections to existing nodes in the graph.
 *
 * @param {string} proposalContent - Full Markdown content of the approved proposal.
 * @param {MemoryNode[]} existingNodes - Current nodes in the graph for context.
 * @returns {string} System prompt string to send to the LLM.
 */
export function buildExtractionPrompt(
  proposalContent: string,
  existingNodes: MemoryNode[]
): string {
  const existingNodesList =
    existingNodes.length > 0
      ? existingNodes
          .map((n) => `- [${n.id}] ${n.label}: ${n.title}`)
          .join('\n')
      : '(none)';

  return `You are a knowledge extraction assistant for the SDD Framework.

Analyze the following approved proposal and extract the key architectural knowledge.

## Rules
- Extract exactly up to ${MAX_NODES} key points, each classified as one of: Decision, Rule, or Feature.
- For each, provide a short title and a concise Markdown description.
- Suggest edges connecting to existing nodes if relevant. Only reference existing node IDs.
- Maximum ${MAX_EDGES} edges total.
- Output ONLY valid JSON, no markdown fences.

## Existing Nodes in the Knowledge Graph
${existingNodesList}

## Approved Proposal
${proposalContent}

## Required Output Format
{
  "nodes": [
    {
      "label": "Decision" | "Rule" | "Feature",
      "title": "Short descriptive title",
      "content": "Concise Markdown description of the decision/rule/feature and its rationale."
    }
  ],
  "edges": [
    {
      "source_title": "Title of the new node (from nodes above)",
      "target_id": "existing_node_id",
      "relation_type": "DECIDED_IN" | "CONSTRAINS" | "DEPENDS_ON" | "SUPERSEDES"
    }
  ]
}`;
}

/**
 * Process and validate an LLM extraction result, inserting nodes and edges
 * into the memory database within a single transaction.
 *
 * Validates:
 * - Node count does not exceed the maximum.
 * - Edge count does not exceed the maximum.
 * - All edge target IDs reference existing nodes in the database.
 * - Node labels are valid.
 *
 * @param {MemoryDB} db - Open memory database instance.
 * @param {ExtractionResult} raw - Raw extraction result parsed from LLM JSON output.
 * @param {string} changeName - Name of the originating change (stored as node source).
 * @returns {{ nodesCreated: number; edgesCreated: number }} Count of inserted nodes and edges.
 */
export function processExtractionResult(
  db: MemoryDB,
  raw: ExtractionResult,
  changeName: string
): { nodesCreated: number; edgesCreated: number } {
  const validLabels: NodeLabel[] = ['Decision', 'Rule', 'Feature'];

  const validNodes = raw.nodes
    .filter((n) => validLabels.includes(n.label))
    .slice(0, MAX_NODES);

  const validEdges = raw.edges.slice(0, MAX_EDGES);

  let nodesCreated = 0;
  let edgesCreated = 0;

  db.transaction(() => {
    const titleToId = new Map<string, string>();

    for (const node of validNodes) {
      const prefix = NODE_PREFIX[node.label];
      const id = `${prefix}_${nanoid(7)}`;
      db.insertNode({
        id,
        label: node.label,
        title: node.title,
        content: node.content,
        source: changeName,
      });
      titleToId.set(node.title, id);
      nodesCreated++;
    }

    for (const edge of validEdges) {
      const sourceId = titleToId.get(edge.source_title);
      if (!sourceId) continue;

      let targetId = edge.target_id;

      if (!targetId && edge.target_title) {
        targetId = titleToId.get(edge.target_title) ?? undefined;
      }

      if (!targetId) continue;

      if (!db.nodeExists(targetId)) continue;

      try {
        db.insertEdge({
          source_id: sourceId,
          target_id: targetId,
          relation_type: edge.relation_type,
        });
        edgesCreated++;
      } catch {
        /* skip duplicate edges or FK violations */
      }
    }
  });

  return { nodesCreated, edgesCreated };
}
