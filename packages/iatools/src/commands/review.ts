/**
 * CLI command: `iatools review <phase>`
 * Decompresses and displays a .cave artifact as human-readable markdown.
 */

import { parseCave } from '@/pipeline/caveman/compressor';
import { decompress } from '@/pipeline/caveman/decompressor';
import { createTuiContext } from '@/tui/context';
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

  const tui = await createTuiContext();

  if (!(await fs.pathExists(cavePath))) {
    tui.log.error(`Cave file not found: ${cavePath}`);
    await tui.destroy();
    return;
  }

  const caveContent = await fs.readFile(cavePath, 'utf8');
  const artifact = parseCave(caveContent);
  const markdown = decompress(artifact);

  tui.banner('2.0.0');
  tui.log.info(`📖 ${options.phase} — ${options.change}`);
  tui.log.info(markdown);

  // Write the .md file alongside the .cave file
  const mdPath = path.join(
    options.dir,
    'openspec',
    'changes',
    options.change,
    `${options.phase}.md`,
  );
  await fs.outputFile(mdPath, markdown, 'utf8');
  tui.log.success(`Markdown written to ${mdPath}`);
  await tui.destroy();
}
