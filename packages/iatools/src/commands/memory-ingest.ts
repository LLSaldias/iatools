/**
 * CLI command: `iatools memory ingest`
 * Drives the SDD Memory System ingestion loop.
 *
 * Two modes:
 * - Prompt Generation: reads an approved proposal and emits an LLM extraction prompt.
 * - JSON Ingestion: consumes an LLM extraction result JSON and commits it to .sdd/memory.db.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import ora from 'ora';
import { MemoryDB } from '@/memory/database';
import { buildExtractionPrompt, processExtractionResult } from '@/memory/ingestion';
import type { ExtractionResult } from '@/memory/types';
import { logger } from '@/utils/logger';

/** Options accepted by the memory ingest command */
export interface MemoryIngestOptions {
  change: string;
  dir: string;
  from?: string;
  dryRun: boolean;
  all: boolean;
}

/**
 * Entry point for the `iatools memory ingest` command.
 * Dispatches to prompt-generation mode or JSON-ingestion mode
 * depending on whether `options.from` is provided.
 *
 * @param {MemoryIngestOptions} options - Parsed CLI options.
 */
export async function runMemoryIngest(options: MemoryIngestOptions): Promise<void> {
  if (options.all && options.change) {
    logger.error('--all and --change are mutually exclusive. Use one or the other.');
    process.exit(1);
  }
  if (options.all) {
    await runBatchMode(options);
  } else if (options.from) {
    await runIngestionMode(options);
  } else {
    await runPromptMode(options);
  }
}

/**
 * Prompt Generation Mode.
 * Reads the approved proposal for the given change, queries all existing nodes,
 * builds an LLM extraction prompt, prints it to stdout, and saves it to a file.
 *
 * @param {MemoryIngestOptions} options - Parsed CLI options.
 */
async function runPromptMode(options: MemoryIngestOptions): Promise<void> {
  const proposalPath = path.join(
    options.dir,
    'openspec',
    'changes',
    options.change,
    'proposal.md'
  );
  const dbPath = path.join(options.dir, '.sdd', 'memory.db');
  const promptOutPath = path.join(options.dir, '.sdd', `extraction-${options.change}.prompt.txt`);

  if (!(await fs.pathExists(proposalPath))) {
    logger.error(
      `No proposal found for change '${options.change}'. Expected: openspec/changes/${options.change}/proposal.md`
    );
    process.exit(1);
  }

  if (!(await fs.pathExists(dbPath))) {
    logger.error('No memory database found. Run `iatools init` first.');
    process.exit(1);
  }

  const proposalContent = await fs.readFile(proposalPath, 'utf8');

  const db = new MemoryDB(dbPath);
  const existingNodes = db.getAllNodes();
  db.close();

  const prompt = buildExtractionPrompt(proposalContent, existingNodes);

  console.log('\n' + '─'.repeat(72));
  console.log(prompt);
  console.log('─'.repeat(72) + '\n');

  await fs.outputFile(promptOutPath, prompt, 'utf8');

  logger.success(`Extraction prompt saved to .sdd/extraction-${options.change}.prompt.txt`);
  logger.newline();
  logger.info('Next steps:');
  logger.label('  1. Send the prompt above to an LLM (ChatGPT, Claude, etc.).');
  logger.label('  2. Save the JSON response to a file, e.g. extraction.json');
  logger.label(`  3. Run: iatools memory ingest --change ${options.change} --from extraction.json`);
  logger.newline();
}

/**
 * JSON Ingestion Mode.
 * Reads and validates an LLM extraction result JSON file, then commits the
 * nodes and edges to .sdd/memory.db. Supports --dry-run for preview without writes.
 *
 * @param {MemoryIngestOptions} options - Parsed CLI options (options.from is defined).
 */
async function runIngestionMode(options: MemoryIngestOptions): Promise<void> {
  const dbPath = path.join(options.dir, '.sdd', 'memory.db');
  const fromPath = path.resolve(options.dir, options.from!);

  if (!(await fs.pathExists(dbPath))) {
    logger.error('No memory database found. Run `iatools init` first.');
    process.exit(1);
  }

  let rawContent: string;
  try {
    rawContent = await fs.readFile(fromPath, 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`Failed to read extraction file: ${msg}`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`Failed to parse extraction JSON: ${msg}`);
    process.exit(1);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).nodes) ||
    !Array.isArray((parsed as Record<string, unknown>).edges)
  ) {
    logger.error(
      'Invalid extraction JSON: expected an object with "nodes" and "edges" arrays.'
    );
    process.exit(1);
  }

  const rawResult = parsed as ExtractionResult;

  if (options.dryRun) {
    logger.header('Dry-run preview — nothing will be written to the database');
    logger.newline();
    logger.info(`Nodes to insert (up to 3):`);
    for (const node of rawResult.nodes.slice(0, 3)) {
      logger.label(`  [${node.label}] ${node.title}`);
    }
    logger.newline();
    logger.info(`Edges to insert (up to 5):`);
    for (const edge of rawResult.edges.slice(0, 5)) {
      const target = edge.target_id ?? edge.target_title ?? '(unknown)';
      logger.label(`  "${edge.source_title}" -[${edge.relation_type}]→ ${target}`);
    }
    logger.newline();
    return;
  }

  const spinner = ora({ text: 'Ingesting into memory graph...', color: 'magenta' }).start();

  try {
    const db = new MemoryDB(dbPath);
    const { nodesCreated, edgesCreated } = processExtractionResult(db, rawResult, options.change);
    db.close();

    spinner.succeed(
      `Ingested ${nodesCreated} nodes and ${edgesCreated} edges for change '${options.change}'.`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    spinner.fail(`Ingestion failed: ${msg}`);
  }
}

/** Result of processing a single change in batch mode */
interface BatchResult {
  name: string;
  status: 'done' | 'skipped' | 'error';
  reason?: string;
}

/**
 * Batch Mode.
 * Scans `openspec/changes/` for all direct subdirectories (excluding `archive/`),
 * and runs prompt generation for each that contains a `proposal.md`.
 * Errors for individual changes are caught and reported — the batch never aborts early.
 *
 * @param {MemoryIngestOptions} options - Parsed CLI options.
 */
async function runBatchMode(options: MemoryIngestOptions): Promise<void> {
  const dbPath = path.join(options.dir, '.sdd', 'memory.db');
  const changesDir = path.join(options.dir, 'openspec', 'changes');

  if (!(await fs.pathExists(dbPath))) {
    logger.error('No memory database found. Run `iatools init` first.');
    process.exit(1);
  }

  const entries = await fs.readdir(changesDir, { withFileTypes: true });
  const candidates = entries.filter(
    (e) => e.isDirectory() && e.name !== 'archive'
  );

  if (candidates.length === 0) {
    logger.info('No changes with a proposal found in openspec/changes/.');
    return;
  }

  const results: BatchResult[] = [];

  for (const entry of candidates) {
    const name = entry.name;
    const proposalPath = path.join(changesDir, name, 'proposal.md');

    if (!(await fs.pathExists(proposalPath))) {
      results.push({ name, status: 'skipped', reason: 'no proposal.md' });
      continue;
    }

    try {
      await runPromptMode({ ...options, change: name });
      results.push({ name, status: 'done' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name, status: 'error', reason: msg });
    }
  }

  printBatchSummary(results);
}

/**
 * Print a summary table of batch ingest results.
 *
 * @param {BatchResult[]} results - Array of per-change results.
 */
function printBatchSummary(results: BatchResult[]): void {
  const done = results.filter((r) => r.status === 'done').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;

  logger.newline();
  logger.header(`Batch complete: ${done} processed, ${skipped} skipped, ${errors} errors`);
  console.log('  ' + '─'.repeat(50));
  for (const r of results) {
    if (r.status === 'done') {
      logger.success(r.name);
    } else if (r.status === 'skipped') {
      logger.warn(`${r.name.padEnd(30)} (${r.reason ?? 'skipped'})`);
    } else {
      logger.error(`${r.name.padEnd(30)} (${r.reason ?? 'unknown error'})`);
    }
  }
  logger.newline();
}
