/**
 * CLI command: `iatools compress`
 * Compresses .md artifacts to .cave format with token savings report.
 */

import { compress, serializeCave } from '@/pipeline/caveman/compressor';
import type { CaveHeader } from '@/pipeline/caveman/profiles';
import { createTuiContext } from '@/tui/context';
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
  const tui = await createTuiContext();
  const changeDir = path.join(options.dir, 'openspec', 'changes', options.change);

  if (!(await fs.pathExists(changeDir))) {
    tui.log.error(`Change directory not found: ${changeDir}`);
    await tui.destroy();
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
    tui.log.info('No .md files found to compress.');
    await tui.destroy();
    return;
  }

  // Display results table
  tui.table({
    title: 'Compression Results',
    columns: [
      { header: 'Phase', key: 'phase', width: 12 },
      { header: 'Original', key: 'original', width: 10, align: 'right' },
      { header: 'Compressed', key: 'compressed', width: 12, align: 'right' },
      { header: 'Savings', key: 'savings', width: 10, align: 'right' },
    ],
    rows: results.map((r) => {
      const savings = r.originalTokens > 0
        ? ((1 - r.compressedTokens / r.originalTokens) * 100).toFixed(1) + '%'
        : '0.0%';
      return {
        phase: r.phase,
        original: String(r.originalTokens),
        compressed: String(r.compressedTokens),
        savings,
      };
    }),
  });

  tui.log.success(`Compressed ${results.length} artifact(s) for change '${options.change}'.`);
  await tui.destroy();
}
