/**
 * @module pipeline/traceability/lineage
 * Parent-child lineage validation for cave artifacts.
 */

import { parseCave } from '@/pipeline/caveman/compressor';
import type { CaveArtifact } from '@/pipeline/caveman/profiles';
import * as fs from 'fs';
import * as path from 'path';

/** A parent-child link between artifacts. */
export interface LineageLink {
  child: string;
  parent: string;
}

/**
 * Resolve parent references from an artifact to actual files in the change directory.
 */
export function resolveParent(changeDir: string, artifact: CaveArtifact): LineageLink[] {
  const links: LineageLink[] = [];
  const childFile = `${artifact._phase}.cave`;

  if (artifact._parent === null) return links;

  const parents = Array.isArray(artifact._parent) ? artifact._parent : [artifact._parent];

  for (const p of parents) {
    const parentPath = path.resolve(changeDir, p);
    links.push({ child: childFile, parent: p });
    if (!fs.existsSync(parentPath)) {
      // Link exists but target doesn't — still return the link for validation
    }
  }

  return links;
}

/**
 * Validate that all _parent references in .cave files within a change directory resolve.
 */
export function validateLineage(changeDir: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!fs.existsSync(changeDir)) {
    return { valid: false, errors: [`Change directory does not exist: ${changeDir}`] };
  }

  const files = fs.readdirSync(changeDir).filter(f => f.endsWith('.cave'));

  for (const file of files) {
    const filePath = path.join(changeDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    let artifact: CaveArtifact;
    try {
      artifact = parseCave(content);
    } catch {
      errors.push(`Failed to parse ${file}`);
      continue;
    }

    if (artifact._parent === null) continue;

    const parents = Array.isArray(artifact._parent) ? artifact._parent : [artifact._parent];
    for (const p of parents) {
      const parentPath = path.resolve(changeDir, p);
      if (!fs.existsSync(parentPath)) {
        errors.push(`${file}: parent reference '${p}' not found`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
