/**
 * @module pipeline/traceability/chain
 * Cross-reference tracing across cave artifacts in a change directory.
 */

import { parseCave } from '@/pipeline/caveman/compressor';
import type { CaveArtifact, CaveDesign, CaveSpec, CaveTasks } from '@/pipeline/caveman/profiles';
import * as fs from 'fs';
import * as path from 'path';

/** A single trace link in the chain. */
export interface TraceLink {
  artifactId: string;
  itemId: string;
  itemTitle: string;
  refs: string[];
}

/** Result of tracing an item back to its roots. */
export interface TraceResult {
  root: TraceLink;
  chain: TraceLink[][];
}

/**
 * Trace a single item (e.g. T1 in tasks.cave) back through its cross-references.
 */
export function traceItem(changeDir: string, artifactId: string, itemId: string): TraceResult | null {
  const artifacts = loadArtifacts(changeDir);
  const artifact = artifacts.get(artifactId);
  if (!artifact) return null;

  const rootLink = findItem(artifact, artifactId, itemId);
  if (!rootLink) return null;

  const chains: TraceLink[][] = [];
  for (const ref of rootLink.refs) {
    const chain = followRef(artifacts, ref, [rootLink]);
    chains.push(chain);
  }

  return { root: rootLink, chain: chains };
}

/**
 * Trace all items in all artifacts within a change directory.
 */
export function traceChange(changeDir: string): TraceResult[] {
  const artifacts = loadArtifacts(changeDir);
  const results: TraceResult[] = [];

  for (const [artifactId, artifact] of artifacts) {
    const items = extractItems(artifact, artifactId);
    for (const item of items) {
      const chains: TraceLink[][] = [];
      for (const ref of item.refs) {
        const chain = followRef(artifacts, ref, [item]);
        chains.push(chain);
      }
      if (item.refs.length > 0) {
        results.push({ root: item, chain: chains });
      }
    }
  }

  return results;
}

function loadArtifacts(changeDir: string): Map<string, CaveArtifact> {
  const map = new Map<string, CaveArtifact>();
  if (!fs.existsSync(changeDir)) return map;

  const files = fs.readdirSync(changeDir).filter(f => f.endsWith('.cave'));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(changeDir, file), 'utf-8');
      const artifact = parseCave(content);
      map.set(file, artifact);
    } catch {
      // Skip unparseable files
    }
  }

  return map;
}

function findItem(artifact: CaveArtifact, artifactId: string, itemId: string): TraceLink | null {
  const items = extractItems(artifact, artifactId);
  return items.find(i => i.itemId === itemId) ?? null;
}

function extractItems(artifact: CaveArtifact, artifactId: string): TraceLink[] {
  const items: TraceLink[] = [];

  switch (artifact._phase) {
    case 'tasks': {
      const a = artifact as CaveTasks;
      for (const t of a.tasks) {
        items.push({ artifactId, itemId: t.id, itemTitle: t.title, refs: t.refs });
      }
      break;
    }
    case 'design': {
      const a = artifact as CaveDesign;
      for (const d of a.decisions) {
        items.push({
          artifactId,
          itemId: d.id,
          itemTitle: d.question,
          refs: d.refs ?? [],
        });
      }
      break;
    }
    case 'specs': {
      const a = artifact as CaveSpec;
      for (const r of a.requirements) {
        items.push({ artifactId, itemId: r.id, itemTitle: r.desc, refs: [] });
      }
      for (const s of a.scenarios) {
        items.push({
          artifactId,
          itemId: s.id,
          itemTitle: `${s.given} → ${s.then}`,
          refs: s.refs ?? [],
        });
      }
      break;
    }
    case 'proposal':
      // Proposals are leaf nodes — they have no refs to trace further
      break;
  }

  return items;
}

function followRef(
  artifacts: Map<string, CaveArtifact>,
  refId: string,
  currentChain: TraceLink[],
  visited: Set<string> = new Set(),
): TraceLink[] {
  if (visited.has(refId)) return currentChain;
  visited.add(refId);

  // Find the ref in any artifact
  for (const [artifactId, artifact] of artifacts) {
    const items = extractItems(artifact, artifactId);
    const match = items.find(i => i.itemId === refId);
    if (match) {
      const newChain = [...currentChain, match];
      // Recursively follow the match's refs
      if (match.refs.length > 0) {
        for (const nextRef of match.refs) {
          return followRef(artifacts, nextRef, newChain, visited);
        }
      }
      return newChain;
    }
  }

  return currentChain;
}
