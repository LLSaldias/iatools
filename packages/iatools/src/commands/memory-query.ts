/**
 * CLI command: `iatools memory query <text>`
 * Searches the SDD memory graph using hybrid retrieval (FTS + vector + graph).
 */

import { MemoryDB } from '@/memory/database';
import { getProvider } from '@/memory/embeddings/fallback';
import { hybridRetrieve } from '@/memory/hybrid-retrieval';
import { createTuiContext } from '@/tui/context';
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
  const tui = await createTuiContext();

  let db: MemoryDB;
  try {
    db = new MemoryDB(dbPath);
  } catch {
    tui.log.error('No memory database found. Run `iatools init` first.');
    await tui.destroy();
    return;
  }

  try {
    const provider = await getProvider();
    const context = await hybridRetrieve(db, options.query, {
      maxNodes: options.maxResults ?? 20,
      provider,
    });

    if (context.nodes.length === 0) {
      tui.log.info('No matching nodes found.');
      await tui.destroy();
      return;
    }

    if (process.stdout.isTTY) {
      const { createAppRenderer } = await import('@/tui/renderer');
      const { createQueryResultsScreen } = await import('@/tui/screens/query-results');
      const app = await createAppRenderer();
      const items = context.nodes.map((node) => ({
        id: node.id,
        score: 1,
        type: node.label,
        title: node.title,
        ...(node.source ? { source: node.source } : {}),
        content: node.content,
      }));
      const result = await createQueryResultsScreen(app.renderer, app.root, options.query, items);
      await app.destroy();

      if (result.selected.length > 0) {
        tui.log.info('Selected node IDs:');
        for (const id of result.selected) {
          tui.log.info(`  ${id}`);
        }
      }
    } else {
      // Non-TTY fallback: just print results
      tui.table({
        title: `Query: "${options.query}"`,
        columns: [
          { header: '#', key: 'idx', width: 5 },
          { header: 'Type', key: 'type', width: 12 },
          { header: 'Title', key: 'title', width: 30 },
        ],
        rows: context.nodes.map((node, i) => ({
          idx: String(i + 1),
          type: node.label,
          title: node.title,
        })),
      });
    }
  } finally {
    db.close();
  }
  await tui.destroy();
}
