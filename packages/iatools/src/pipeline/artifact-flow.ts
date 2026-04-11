/**
 * @module pipeline/artifact-flow
 * Main pipeline: markdown → cave artifact → persisted files.
 */

import { compress, serializeCave } from '@/pipeline/caveman/compressor';
import { decompress } from '@/pipeline/caveman/decompressor';
import { extractPreserved } from '@/pipeline/caveman/preservers';
import type { CaveArtifact, CaveHeader } from '@/pipeline/caveman/profiles';
import { countTokens, stampMetadata } from '@/pipeline/traceability/metadata';
import * as fs from 'fs';
import * as path from 'path';

/** Options for the artifact flow pipeline. */
export interface ArtifactFlowOptions {
  changeDir: string;
  changeName: string;
  phase: CaveHeader['_phase'];
  markdownContent: string;
  parent?: string | string[] | null;
}

/**
 * Process markdown through the full pipeline:
 * extract preserved → compress → stamp metadata → serialize → decompress → write files.
 */
export async function processArtifact(options: ArtifactFlowOptions): Promise<{
  caveFile: string;
  mdFile: string;
  artifact: CaveArtifact;
  tokenSavings: number;
}> {
  const { changeDir, changeName, phase, markdownContent, parent } = options;

  // 1. Extract preserved blocks
  const { cleaned } = extractPreserved(markdownContent);

  // 2. Compress markdown → CaveArtifact
  const artifact = compress(cleaned, phase, changeName, parent);

  // 3. Stamp metadata
  const meta = stampMetadata(phase);
  meta.token_count = countTokens(markdownContent);
  artifact._meta = {
    created_by: meta.created_by,
    created_at: meta.created_at,
    token_count: meta.token_count,
  };

  // 4. Serialize to YAML and write .cave file
  const caveContent = serializeCave(artifact);
  const caveFileName = `${phase}.cave`;
  const caveFilePath = path.join(changeDir, caveFileName);

  if (!fs.existsSync(changeDir)) {
    fs.mkdirSync(changeDir, { recursive: true });
  }
  fs.writeFileSync(caveFilePath, caveContent, 'utf-8');

  // 5. Decompress back to .md and write
  const mdContent = decompress(artifact);
  const mdFileName = `${phase}.md`;
  const mdFilePath = path.join(changeDir, mdFileName);
  fs.writeFileSync(mdFilePath, mdContent, 'utf-8');

  // 6. Calculate token savings
  const originalTokens = countTokens(markdownContent);
  const caveTokens = countTokens(caveContent);
  const tokenSavings = originalTokens > 0
    ? Math.round(((originalTokens - caveTokens) / originalTokens) * 100)
    : 0;

  return {
    caveFile: caveFilePath,
    mdFile: mdFilePath,
    artifact,
    tokenSavings,
  };
}
