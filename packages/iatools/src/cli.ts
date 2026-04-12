/**
 * Commander.js program definition for the iatools CLI.
 * Registers all top-level commands and subcommands.
 */

import { runCompress } from '@/commands/compress';
import { runInit } from '@/commands/init';
import { runMemoryExport } from '@/commands/memory-export';
import { runMemoryIngest } from '@/commands/memory-ingest';
import { runMemoryQuery } from '@/commands/memory-query';
import { runReview } from '@/commands/review';
import { runTrace } from '@/commands/trace';
import { runUpdate } from '@/commands/update';
import { Command } from 'commander';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require('../package.json') as { version: string };

export const program = new Command();

program
  .name('iatools')
  .description(
    '@lsframework/iatools — Spec-Driven Development framework bootstrapper'
  )
  .version(version);

program
  .command('init')
  .alias('--init')
  .description(
    '🪄  Interactive wizard: set up the SDD framework in your project'
  )
  .option(
    '--dir <path>',
    'target project directory (default: current directory)',
    process.cwd()
  )
  .option('--force', 'overwrite existing files', false)
  .action(async (options: { dir: string; force: boolean }) => {
    const projectRoot = path.resolve(options.dir);
    await runInit(projectRoot, options.force);
  });

program
  .command('update')
  .alias('--update')
  .description('🔄  Refresh SDD skills and workflows from the latest templates')
  .option(
    '--dir <path>',
    'target project directory (default: current directory)',
    process.cwd()
  )
  .option('--force', 'also overwrite the constitution file', false)
  .action(async (options: { dir: string; force: boolean }) => {
    const projectRoot = path.resolve(options.dir);
    await runUpdate(projectRoot, options.force);
  });

const memoryCmd = program
  .command('memory')
  .description('🧠  Manage SDD project memory');

memoryCmd
  .command('export')
  .description('📤  Export memory graph to .sdd/memory.json for Git')
  .option(
    '--dir <path>',
    'target project directory (default: current directory)',
    process.cwd()
  )
  .action(async (options: { dir: string }) => {
    const projectRoot = path.resolve(options.dir);
    await runMemoryExport(projectRoot);
  });

memoryCmd
  .command('ingest')
  .description('📥  Ingest an approved proposal into the memory graph')
  .option('--change <name>', 'change name matching openspec/changes/<name>/', '')
  .option('--all', 'generate prompts for all changes in openspec/changes/', false)
  .option('--dir <path>', 'target project directory (default: current directory)', process.cwd())
  .option('--from <path>', 'path to LLM extraction JSON file')
  .option('--dry-run', 'validate and preview without writing to DB', false)
  .action(async (options: { change: string; all: boolean; dir: string; from?: string; dryRun: boolean }) => {
    await runMemoryIngest({
      change: options.change,
      all: options.all,
      dir: path.resolve(options.dir),
      ...(options.from !== undefined ? { from: options.from } : {}),
      dryRun: options.dryRun,
    });
  });

memoryCmd
  .command('query <text>')
  .description('🔍  Search memory with hybrid retrieval')
  .option('--dir <path>', 'target project directory', process.cwd())
  .option('--max <n>', 'max results', '20')
  .action(async (text: string, options: { dir: string; max: string }) => {
    await runMemoryQuery({
      query: text,
      dir: path.resolve(options.dir),
      maxResults: parseInt(options.max, 10),
    });
  });

program
  .command('trace')
  .description('🔗  Trace decision lineage for a change')
  .requiredOption('--change <name>', 'change name')
  .option('--item <id>', 'specific item ID to trace')
  .option('--dir <path>', 'target project directory', process.cwd())
  .action(async (options: { change: string; item?: string; dir: string }) => {
    await runTrace({
      change: options.change,
      item: options.item,
      dir: path.resolve(options.dir),
    });
  });

program
  .command('review <phase>')
  .description('📖  Decompress and review a .cave artifact')
  .requiredOption('--change <name>', 'change name')
  .option('--dir <path>', 'target project directory', process.cwd())
  .action(async (phase: string, options: { change: string; dir: string }) => {
    await runReview({
      phase,
      change: options.change,
      dir: path.resolve(options.dir),
    });
  });

program
  .command('compress')
  .description('📦  Compress .md artifacts to .cave format')
  .requiredOption('--change <name>', 'change name')
  .option('--phase <phase>', 'specific phase to compress')
  .option('--dir <path>', 'target project directory', process.cwd())
  .action(async (options: { change: string; phase?: string; dir: string }) => {
    await runCompress({
      change: options.change,
      phase: options.phase,
      dir: path.resolve(options.dir),
    });
  });

program
  .command('changelog')
  .description('📋  Generate changelog entries from archived SDD changes')
  .option('--version <semver>', 'stamp this version on the entry')
  .option('--dry-run', 'preview to stdout without writing', false)
  .option('--dir <path>', 'target project directory', process.cwd())
  .action(async (options: { version?: string; dryRun: boolean; dir: string }) => {
    const { runChangelog } = await import('./commands/changelog');
    await runChangelog({ ...options, dir: path.resolve(options.dir) });
  });

program.addHelpText(
  'after',
  `
🚀  SDD Flows (Slash Commands):
  /sdd-new <name>      Start a new SDD change
                       Example: /sdd-new user-auth
  /sdd-ff [name]       Fast-forward: generate all planning artifacts
                       Example: /sdd-ff
  /sdd-apply [name]    Implement tasks one by one
                       Example: /sdd-apply
  /sdd-verify [name]   Validate implementation against specs
                       Example: /sdd-verify
  /sdd-archive [name]  Archive a completed change
                       Example: /sdd-archive
  /sdd-explore [topic] Explore ideas before committing
                       Example: /sdd-explore refactoring-db

🛠️  Pipeline Commands:
  trace                Trace decision lineage across .cave artifacts
                       Example: iatools trace --change my-feature --item T1
  review <phase>       Decompress and display a .cave artifact
                       Example: iatools review proposal --change my-feature
  compress             Compress .md artifacts to .cave format
                       Example: iatools compress --change my-feature

🧠  Memory Commands:
  memory query <text>  Search memory with hybrid retrieval
                       Example: iatools memory query "authentication flow"
  memory ingest        Ingest extraction JSON into memory graph
  memory export        Export memory graph to JSON
`
);
