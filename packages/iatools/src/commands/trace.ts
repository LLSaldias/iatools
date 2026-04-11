/**
 * CLI command: `iatools trace`
 * Traces decision lineage across cave artifacts in a change directory.
 */

import type { TraceResult } from '@/pipeline/traceability/chain';
import { traceChange, traceItem } from '@/pipeline/traceability/chain';
import { panel } from '@/ui/theme';
import { logger } from '@/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Run traceability analysis for a change or specific item.
 *
 * @param options.change - Change name (subdirectory under openspec/changes/).
 * @param options.item - Optional specific item ID to trace.
 * @param options.dir - Project root directory.
 */
export async function runTrace(options: {
  change: string;
  item?: string | undefined;
  dir: string;
}): Promise<void> {
  const changeDir = path.join(options.dir, 'openspec', 'changes', options.change);

  if (!fs.existsSync(changeDir)) {
    logger.error(`Change directory not found: ${changeDir}`);
    return;
  }

  if (options.item) {
    // Trace a single item — find its artifact by scanning
    const result = findAndTraceItem(changeDir, options.item);
    if (!result) {
      logger.info('No trace found.');
      return;
    }
    console.log(panel(formatTraceResult(result), { title: `🔗 Trace: ${options.item}` }));
  } else {
    const results = traceChange(changeDir);
    if (results.length === 0) {
      logger.info('No trace found.');
      return;
    }
    for (const result of results) {
      console.log(panel(formatTraceResult(result), { title: `🔗 Trace: ${result.root.itemId}` }));
      console.log('');
    }
  }
}

/**
 * Find the artifact containing an item and trace it.
 */
function findAndTraceItem(changeDir: string, itemId: string): TraceResult | null {
  const files = fs.readdirSync(changeDir).filter(f => f.endsWith('.cave'));
  for (const file of files) {
    const result = traceItem(changeDir, file, itemId);
    if (result) return result;
  }
  return null;
}

/**
 * Format a TraceResult as an indented tree string.
 */
function formatTraceResult(result: TraceResult): string {
  const lines: string[] = [];
  lines.push(`${result.root.itemId}: ${result.root.itemTitle}`);

  for (let ci = 0; ci < result.chain.length; ci++) {
    const chain = result.chain[ci]!;
    const isLastChain = ci === result.chain.length - 1;

    for (let li = 1; li < chain.length; li++) {
      const link = chain[li]!;
      const isLast = li === chain.length - 1;
      const connector = isLast && isLastChain ? '└── ' : '├── ';
      const indent = '│   '.repeat(li - 1);
      lines.push(`${indent}${connector}${link.itemId}: ${link.itemTitle}`);
      if (link.artifactId) {
        const subIndent = '│   '.repeat(li);
        const subConnector = isLast && isLastChain ? '    └── ' : '│   └── ';
        lines.push(`${subIndent}${subConnector}${link.artifactId}`);
      }
    }
  }

  return lines.join('\n');
}
