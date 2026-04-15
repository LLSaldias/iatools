/**
 * CLI command: `iatools memory export`
 * Exports the knowledge graph from .sdd/memory.db to .sdd/memory.json
 * for Git-friendly version control.
 */

import { MemoryDB } from '@/memory/database';
import type { MemoryExport } from '@/memory/types';
import { createTuiContext } from '@/tui/context';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Export the memory database to a JSON file.
 * Reads all nodes and edges from .sdd/memory.db and serializes them
 * to .sdd/memory.json with a timestamp.
 *
 * @param {string} projectRoot - Absolute path to the target project root.
 */
export async function runMemoryExport(projectRoot: string): Promise<void> {
  const dbPath = path.join(projectRoot, '.sdd', 'memory.db');
  const jsonPath = path.join(projectRoot, '.sdd', 'memory.json');
  const tui = await createTuiContext();

  if (!(await fs.pathExists(dbPath))) {
    tui.log.warn(
      'No memory database found. Run `iatools init` first to create .sdd/memory.db'
    );
    await tui.destroy();
    return;
  }

  const progress = tui.progress({ current: 0, total: 2, label: 'Exporting memory graph...' });

  try {
    const db = new MemoryDB(dbPath);
    progress.update(1, 2, 'Reading nodes and edges...');
    const nodes = db.getAllNodes();
    const edges = db.getAllEdges();
    db.close();

    const exportData: MemoryExport = {
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
    };

    await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2), 'utf8');
    progress.update(2, 2, 'Done');

    tui.log.success(
      `Exported ${nodes.length} nodes and ${edges.length} edges to .sdd/memory.json`
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    tui.log.error(`Export failed: ${msg}`);
  }
  await tui.destroy();
}
