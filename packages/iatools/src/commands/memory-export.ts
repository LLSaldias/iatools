/**
 * CLI command: `iatools memory export`
 * Exports the knowledge graph from .sdd/memory.db to .sdd/memory.json
 * for Git-friendly version control.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import ora from 'ora';
import { MemoryDB } from '@/memory/database';
import type { MemoryExport } from '@/memory/types';
import { logger } from '@/utils/logger';

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

  if (!(await fs.pathExists(dbPath))) {
    logger.warn(
      'No memory database found. Run `iatools init` first to create .sdd/memory.db'
    );
    return;
  }

  const spinner = ora({ text: 'Exporting memory graph...', color: 'magenta' }).start();

  try {
    const db = new MemoryDB(dbPath);
    const nodes = db.getAllNodes();
    const edges = db.getAllEdges();
    db.close();

    const exportData: MemoryExport = {
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
    };

    await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2), 'utf8');

    spinner.succeed(
      `Exported ${nodes.length} nodes and ${edges.length} edges to .sdd/memory.json`
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    spinner.fail(`Export failed: ${msg}`);
  }
}
