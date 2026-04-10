/**
 * Commander.js program definition for the iatools CLI.
 * Registers all top-level commands and subcommands.
 */

import { runInit } from '@/commands/init';
import { runMemoryExport } from '@/commands/memory-export';
import { runMemoryIngest } from '@/commands/memory-ingest';
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
`
);
