/**
 * CLI command: `iatools memory ingest`
 * Drives the SDD Memory System ingestion loop.
 *
 * Two modes:
 * - Prompt Generation: reads an approved proposal and emits an LLM extraction prompt.
 * - JSON Ingestion: consumes an LLM extraction result JSON and commits it to .sdd/memory.db.
 */

import { MemoryDB } from '@/memory/database';
import { buildExtractionPrompt, processExtractionResult } from '@/memory/ingestion';
import type { ExtractionResult } from '@/memory/types';
import type { AuditEntry } from '@/safety/audit';
import { logDecisions } from '@/safety/audit';
import { apply } from '@/safety/redactor';
import { scan } from '@/safety/scanner';
import { createTuiContext, type TuiContext } from '@/tui/context';
import { createAppRenderer } from '@/tui/renderer';
import { createSanitizeReview } from '@/tui/screens/sanitize-review';
import * as fs from 'fs-extra';
import * as path from 'path';

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
  const tui = await createTuiContext();
  if (options.all && options.change) {
    tui.log.error('--all and --change are mutually exclusive. Use one or the other.');
    await tui.destroy();
    process.exit(1);
  }
  if (options.all) {
    await runBatchMode(options, tui);
  } else if (options.from) {
    await runIngestionMode(options, tui);
  } else {
    await runPromptMode(options, tui);
  }
  await tui.destroy();
}

/**
 * Prompt Generation Mode.
 * Reads the approved proposal for the given change, queries all existing nodes,
 * builds an LLM extraction prompt, prints it to stdout, and saves it to a file.
 *
 * @param {MemoryIngestOptions} options - Parsed CLI options.
 */
export async function runPromptMode(options: MemoryIngestOptions, tui: TuiContext): Promise<void> {
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
    tui.log.error(
      `No proposal found for change '${options.change}'. Expected: openspec/changes/${options.change}/proposal.md`
    );
    await tui.destroy();
    process.exit(1);
  }

  if (!(await fs.pathExists(dbPath))) {
    tui.log.error('No memory database found. Run `iatools init` first.');
    await tui.destroy();
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

  tui.log.success(`Extraction prompt saved to .sdd/extraction-${options.change}.prompt.txt`);
  tui.log.info('');
  tui.log.info('Next steps:');
  tui.log.info('  1. Send the prompt above to an LLM (ChatGPT, Claude, etc.).');
  tui.log.info('  2. Save the JSON response to a file, e.g. extraction.json');
  tui.log.info(`  3. Run: iatools memory ingest --change ${options.change} --from extraction.json`);
  tui.log.info('');
}

/**
 * JSON Ingestion Mode.
 * Reads and validates an LLM extraction result JSON file, then commits the
 * nodes and edges to .sdd/memory.db. Supports --dry-run for preview without writes.
 *
 * @param {MemoryIngestOptions} options - Parsed CLI options (options.from is defined).
 */
async function runIngestionMode(options: MemoryIngestOptions, tui: TuiContext): Promise<void> {
  const dbPath = path.join(options.dir, '.sdd', 'memory.db');
  const fromPath = path.resolve(options.dir, options.from!);

  if (!(await fs.pathExists(dbPath))) {
    tui.log.error('No memory database found. Run `iatools init` first.');
    await tui.destroy();
    process.exit(1);
  }

  let rawContent: string;
  try {
    rawContent = await fs.readFile(fromPath, 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    tui.log.error(`Failed to read extraction file: ${msg}`);
    await tui.destroy();
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    tui.log.error(`Failed to parse extraction JSON: ${msg}`);
    await tui.destroy();
    process.exit(1);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).nodes) ||
    !Array.isArray((parsed as Record<string, unknown>).edges)
  ) {
    tui.log.error(
      'Invalid extraction JSON: expected an object with "nodes" and "edges" arrays.'
    );
    await tui.destroy();
    process.exit(1);
  }

  const rawResult = parsed as ExtractionResult;

  if (options.dryRun) {
    tui.log.info('Dry-run preview — nothing will be written to the database');
    tui.log.info('');
    tui.log.info(`Nodes to insert (up to 3):`);
    for (const node of rawResult.nodes.slice(0, 3)) {
      tui.log.info(`  [${node.label}] ${node.title}`);
    }
    tui.log.info('');
    tui.log.info(`Edges to insert (up to 5):`);
    for (const edge of rawResult.edges.slice(0, 5)) {
      const target = edge.target_id ?? edge.target_title ?? '(unknown)';
      tui.log.info(`  "${edge.source_title}" -[${edge.relation_type}]→ ${target}`);
    }
    tui.log.info('');
    return;
  }

  // Safety: scan all node content for secrets before ingestion
  const allContent = rawResult.nodes.map(n => n.content).join('\n---\n');
  const scanCandidates = scan(allContent);
  let activeTui: TuiContext = tui;

  if (scanCandidates.length > 0) {
    // Teardown current context for interactive sanitize review
    await tui.destroy();

    const sanitizeCandidates = scanCandidates.map((c, i) => ({
      id: String(i),
      severity: (c.severity === 'critical' ? 'high' : 'medium') as 'high' | 'medium',
      label: c.label,
      match: c.match,
      context: c.context,
      replacement: c.replacement,
      patternId: c.patternId,
    }));

    const app = await createAppRenderer();
    const tuiDecisions = await createSanitizeReview(app.renderer, app.root, sanitizeCandidates);
    await app.destroy();

    const approved = tuiDecisions
      .filter(d => d.decision === 'redact')
      .map(d => scanCandidates[parseInt(d.candidateId)]!);

    if (approved.length > 0) {
      for (const node of rawResult.nodes) {
        const nodeCandidates = approved.filter(c => node.content.includes(c.match));
        if (nodeCandidates.length > 0) {
          node.content = apply(node.content, nodeCandidates);
        }
      }
    }

    // Log audit decisions
    const auditPath = path.join(options.dir, '.sdd', 'sanitize-audit.jsonl');
    const crypto = await import('crypto');
    const auditEntries: AuditEntry[] = tuiDecisions.map(d => ({
      ts: new Date().toISOString(),
      change: options.change,
      patternId: scanCandidates[parseInt(d.candidateId)]!.patternId,
      matchHash: crypto.createHash('sha256').update(scanCandidates[parseInt(d.candidateId)]!.match).digest('hex'),
      decision: d.decision,
      user: 'interactive',
    }));
    logDecisions(auditPath, auditEntries);

    // Recreate tui for remaining output (original was destroyed for sanitize review)
    activeTui = await createTuiContext();
  }

  activeTui.log.info('Ingesting into memory graph...');

  try {
    const db = new MemoryDB(dbPath);
    const { nodesCreated, edgesCreated } = processExtractionResult(db, rawResult, options.change);
    db.close();

    activeTui.log.success(
      `Ingested ${nodesCreated} nodes and ${edgesCreated} edges for change '${options.change}'.`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    activeTui.log.error(`Ingestion failed: ${msg}`);
  }

  // Clean up recreated context if sanitize review occurred
  if (activeTui !== tui) {
    await activeTui.destroy();
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
async function runBatchMode(options: MemoryIngestOptions, tui: TuiContext): Promise<void> {
  const dbPath = path.join(options.dir, '.sdd', 'memory.db');
  const changesDir = path.join(options.dir, 'openspec', 'changes');

  if (!(await fs.pathExists(dbPath))) {
    tui.log.error('No memory database found. Run `iatools init` first.');
    await tui.destroy();
    process.exit(1);
  }

  const entries = await fs.readdir(changesDir, { withFileTypes: true });
  const dirCandidates = entries.filter(
    (e) => e.isDirectory() && e.name !== 'archive'
  );

  if (dirCandidates.length === 0) {
    tui.log.info('No changes with a proposal found in openspec/changes/.');
    return;
  }

  const results: BatchResult[] = [];

  for (const entry of dirCandidates) {
    const name = entry.name;
    const proposalPath = path.join(changesDir, name, 'proposal.md');

    if (!(await fs.pathExists(proposalPath))) {
      results.push({ name, status: 'skipped', reason: 'no proposal.md' });
      continue;
    }

    try {
      await runPromptMode({ ...options, change: name }, tui);
      results.push({ name, status: 'done' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name, status: 'error', reason: msg });
    }
  }

  printBatchSummary(results, tui);
}

/**
 * Print a summary table of batch ingest results.
 *
 * @param {BatchResult[]} results - Array of per-change results.
 */
function printBatchSummary(results: BatchResult[], tui: TuiContext): void {
  const done = results.filter((r) => r.status === 'done').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;

  tui.log.info('');
  tui.log.info(`Batch complete: ${done} processed, ${skipped} skipped, ${errors} errors`);
  tui.log.info('  ' + '─'.repeat(50));
  for (const r of results) {
    if (r.status === 'done') {
      tui.log.success(r.name);
    } else if (r.status === 'skipped') {
      tui.log.warn(`${r.name.padEnd(30)} (${r.reason ?? 'skipped'})`);
    } else {
      tui.log.error(`${r.name.padEnd(30)} (${r.reason ?? 'unknown error'})`);
    }
  }
  tui.log.info('');
}

/**
 * Pre-archive hook: attempt to generate an extraction prompt for a change.
 * Never throws — logs a warning on any failure so the archive can continue.
 *
 * @param changeName - The name of the change being archived.
 * @param dir - Project root directory.
 */
export async function tryGenerateExtractionPrompt(changeName: string, dir: string): Promise<void> {
  const dbPath = path.join(dir, '.sdd', 'memory.db');
  const tui = await createTuiContext();

  if (!(await fs.pathExists(dbPath))) {
    tui.log.warn('Memory database not found. Skipping prompt generation.');
    await tui.destroy();
    return;
  }

  try {
    await runPromptMode({ change: changeName, dir, dryRun: false, all: false }, tui);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    tui.log.warn(`Prompt generation failed: ${msg}. Continuing with archive.`);
  }
  tui.log.info('');
  await tui.destroy();
}
