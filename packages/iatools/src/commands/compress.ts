/**
 * CLI command: `iatools compress`
 * Compresses .md artifacts to .cave format with token savings report.
 */

import { compress, serializeCave } from '@/pipeline/caveman/compressor';
import type { CaveHeader } from '@/pipeline/caveman/profiles';
import { logger } from '@/utils/logger';
import * as fs from 'fs-extra';
import * as path from 'path';

/** Known SDD phases that can be compressed */
const KNOWN_PHASES: CaveHeader['_phase'][] = ['proposal', 'specs', 'design', 'tasks'];

/**
 * Rough token count estimate (~4 chars per token for English text).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Compress markdown artifacts to .cave format.
 *
 * @param options.change - Change name (subdirectory under openspec/changes/).
 * @param options.phase - Optional specific phase to compress. If omitted, compresses all found .md files.
 * @param options.dir - Project root directory.
 */
export async function runCompress(options: {
  change: string;
  phase?: string | undefined;
  dir: string;
}): Promise<void> {
  const changeDir = path.join(options.dir, 'openspec', 'changes', options.change);

  if (!(await fs.pathExists(changeDir))) {
    logger.error(`Change directory not found: ${changeDir}`);
    return;
  }

  const phases: CaveHeader['_phase'][] = options.phase
    ? [options.phase as CaveHeader['_phase']]
    : KNOWN_PHASES;

  const results: Array<{
    phase: string;
    originalTokens: number;
    compressedTokens: number;
  }> = [];

  for (const phase of phases) {
    const mdPath = path.join(changeDir, `${phase}.md`);
    if (!(await fs.pathExists(mdPath))) {
      continue;
    }

    const mdContent = await fs.readFile(mdPath, 'utf8');
    const artifact = compress(mdContent, phase, options.change);
    const caveContent = serializeCave(artifact);

    const cavePath = path.join(changeDir, `${phase}.cave`);
    await fs.outputFile(cavePath, caveContent, 'utf8');

    const originalTokens = estimateTokens(mdContent);
    const compressedTokens = estimateTokens(caveContent);

    results.push({ phase, originalTokens, compressedTokens });
  }

  if (results.length === 0) {
    logger.info('No .md files found to compress.');
    return;
  }

  // Display results table
  logger.header('Compression Results');
  logger.newline();
  const header = `  ${'Phase'.padEnd(12)} ${'Original'.padStart(10)} ${'Compressed'.padStart(12)} ${'Savings'.padStart(10)}`;
  console.log(header);
  console.log('  ' + '─'.repeat(48));

  for (const r of results) {
    const savings = r.originalTokens > 0
      ? ((1 - r.compressedTokens / r.originalTokens) * 100).toFixed(1)
      : '0.0';
    console.log(
      `  ${r.phase.padEnd(12)} ${String(r.originalTokens).padStart(10)} ${String(r.compressedTokens).padStart(12)} ${(savings + '%').padStart(10)}`
    );
  }

  logger.newline();
  logger.success(`Compressed ${results.length} artifact(s) for change '${options.change}'.`);
}
