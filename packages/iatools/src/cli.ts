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
import { THEME } from '@/tui/theme';
import { Command } from 'commander';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require('../package.json') as { version: string };

/* ── ANSI helpers ─────────────────────────────────────────────── */
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}
const RST = '\x1b[0m';
const BLD = '\x1b[1m';
const DIM = '\x1b[2m';
const c = {
  primary: hexToAnsi(THEME.colors.primary),
  success: hexToAnsi(THEME.colors.success),
  warning: hexToAnsi(THEME.colors.warning),
  muted: hexToAnsi(THEME.colors.muted),
  accent: hexToAnsi(THEME.colors.accent),
  highlight: hexToAnsi(THEME.colors.highlight),
};

/* ── Custom styled help ───────────────────────────────────────── */
function printStyledHelp(): void {
  // Banner
  const w = 52;
  console.log(c.primary + '╭' + '─'.repeat(w) + '╮' + RST);
  console.log(c.primary + '│' + RST + c.primary + BLD + '  iatools' + RST + ' '.repeat(w - 9) + c.primary + '│' + RST);
  console.log(c.primary + '│' + RST + c.muted + `  v${version} · Spec-Driven Development` + RST + ' '.repeat(Math.max(0, w - 4 - version.length - 28)) + c.primary + '│' + RST);
  console.log(c.primary + '╰' + '─'.repeat(w) + '╯' + RST);
  console.log();

  // Commands section
  console.log(c.primary + BLD + '  Commands' + RST);
  console.log(c.muted + '  ' + '─'.repeat(w) + RST);

  const cmds: Array<[string, string, string]> = [
    ['🪄', 'init',             'Interactive wizard: set up the SDD framework'],
    ['🔄', 'update',           'Refresh SDD skills and workflows'],
    ['📋', 'changelog',        'Generate changelog from archived changes'],
    ['🔗', 'trace',            'Trace decision lineage for a change'],
    ['📖', 'review <phase>',   'Decompress and review a .cave artifact'],
    ['📦', 'compress',         'Compress .md artifacts to .cave format'],
  ];

  for (const [icon, name, desc] of cmds) {
    const padName = name.padEnd(20);
    console.log(`  ${icon} ${c.accent}${BLD}${padName}${RST} ${c.muted}${desc}${RST}`);
  }
  console.log();

  // Memory subcommands
  console.log(c.primary + BLD + '  🧠  Memory' + RST);
  console.log(c.muted + '  ' + '─'.repeat(w) + RST);

  const memCmds: Array<[string, string]> = [
    ['memory query <text>', 'Search memory with hybrid retrieval'],
    ['memory ingest',       'Ingest extraction JSON into memory graph'],
    ['memory export',       'Export memory graph to JSON'],
  ];
  for (const [name, desc] of memCmds) {
    const padName = name.padEnd(22);
    console.log(`    ${c.accent}${padName}${RST} ${c.muted}${desc}${RST}`);
  }
  console.log();

  // SDD Flows
  console.log(c.primary + BLD + '  🚀  SDD Flows (Slash Commands)' + RST);
  console.log(c.muted + '  ' + '─'.repeat(w) + RST);

  const flows: Array<[string, string]> = [
    ['/sdd-new <name>',      'Start a new SDD change'],
    ['/sdd-ff [name]',       'Fast-forward: generate all planning artifacts'],
    ['/sdd-apply [name]',    'Implement tasks one by one'],
    ['/sdd-verify [name]',   'Validate implementation against specs'],
    ['/sdd-archive [name]',  'Archive a completed change'],
    ['/sdd-explore [topic]', 'Explore ideas before committing'],
  ];
  for (const [name, desc] of flows) {
    const padName = name.padEnd(22);
    console.log(`    ${c.success}${padName}${RST} ${c.muted}${desc}${RST}`);
  }
  console.log();

  // Options
  console.log(c.primary + BLD + '  Options' + RST);
  console.log(c.muted + '  ' + '─'.repeat(w) + RST);
  console.log(`    ${c.accent}-V, --version${RST}         ${c.muted}Output the version number${RST}`);
  console.log(`    ${c.accent}-h, --help${RST}            ${c.muted}Display this help${RST}`);
  console.log(`    ${DIM}${c.muted}<command> --help${RST}       ${c.muted}Help for a specific command${RST}`);
  console.log();
}

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

program.addHelpText('beforeAll', '');
program.configureHelp({
  formatHelp: (cmd, helper) => {
    // Only override the top-level help; subcommands use default
    if (cmd.name() === 'iatools') {
      printStyledHelp();
      return '';
    }
    // For subcommands, use default Commander formatting with color
    const defaultHelp = Command.prototype.helpInformation.call(cmd);
    return defaultHelp;
  },
});
