/**
 * CLI command: `iatools review <phase>`
 * Decompresses and displays a .cave artifact as human-readable markdown.
 */

import { parseCave } from '@/pipeline/caveman/compressor';
import { decompress } from '@/pipeline/caveman/decompressor';
import { panel } from '@/ui/theme';
import { logger } from '@/utils/logger';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Decompress and review a .cave artifact.
 *
 * @param options.phase - Phase name (proposal, specs, design, tasks).
 * @param options.change - Change name (subdirectory under openspec/changes/).
 * @param options.dir - Project root directory.
 */
export async function runReview(options: {
  phase: string;
  change: string;
  dir: string;
}): Promise<void> {
  const cavePath = path.join(
    options.dir,
    'openspec',
    'changes',
    options.change,
    `${options.phase}.cave`,
  );

  if (!(await fs.pathExists(cavePath))) {
    logger.error(`Cave file not found: ${cavePath}`);
    return;
  }

  const caveContent = await fs.readFile(cavePath, 'utf8');
  const artifact = parseCave(caveContent);
  const markdown = decompress(artifact);

  const title = `📖 ${options.phase} — ${options.change}`;
  console.log(panel(markdown, { title }));

  // Write the .md file alongside the .cave file
  const mdPath = path.join(
    options.dir,
    'openspec',
    'changes',
    options.change,
    `${options.phase}.md`,
  );
  await fs.outputFile(mdPath, markdown, 'utf8');
  logger.success(`Markdown written to ${mdPath}`);
}
