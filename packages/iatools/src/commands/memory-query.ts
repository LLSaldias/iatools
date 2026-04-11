/**
 * CLI command: `iatools memory query <text>`
 * Searches the SDD memory graph using hybrid retrieval (FTS + vector + graph).
 */

import { MemoryDB } from '@/memory/database';
import { getProvider } from '@/memory/embeddings/fallback';
import { hybridRetrieve } from '@/memory/hybrid-retrieval';
import type { QueryResult } from '@/ui/screens/query-results';
import { renderQueryResults } from '@/ui/screens/query-results';
import { logger } from '@/utils/logger';
import * as path from 'path';

/**
 * Run a hybrid retrieval query against the memory graph.
 *
 * @param options.query - Natural language query text.
 * @param options.dir - Project root directory.
 * @param options.maxResults - Maximum number of results to return.
 */
export async function runMemoryQuery(options: {
  query: string;
  dir: string;
  maxResults?: number;
}): Promise<void> {
  const dbPath = path.join(options.dir, '.sdd', 'memory.db');

  let db: MemoryDB;
  try {
    db = new MemoryDB(dbPath);
  } catch {
    logger.error('No memory database found. Run `iatools init` first.');
    return;
  }

  try {
    const provider = await getProvider();
    const context = await hybridRetrieve(db, options.query, {
      maxNodes: options.maxResults ?? 20,
      provider,
    });

    if (context.nodes.length === 0) {
      logger.info('No matching nodes found.');
      return;
    }

    const results: QueryResult[] = context.nodes.map((node) => ({
      node,
      score: 1,
    }));

    const selectedIds = await renderQueryResults(options.query, results);

    if (selectedIds.length > 0) {
      logger.newline();
      logger.info('Selected node IDs:');
      for (const id of selectedIds) {
        logger.label(`  ${id}`);
      }
    }
  } finally {
    db.close();
  }
}
