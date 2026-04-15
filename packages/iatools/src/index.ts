#!/usr/bin/env bun

// Bun runtime check (spec TUI-14.2) — fallback for when invoked via node
declare const Bun: unknown;
if (typeof Bun === 'undefined') {
  process.stderr.write('iatools requires Bun runtime. Install from https://bun.sh\n');
  process.exit(1);
}

import { program } from '@/cli';

async function main(): Promise<void> {
  const hasCommand = process.argv.length > 2;

  // No arguments + TTY → show interactive command menu
  if (!hasCommand && process.stdout.isTTY) {
    const { createAppRenderer } = await import('@/tui/renderer');
    const { createCommandMenu } = await import('@/tui/screens/command-menu');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { version } = require('../package.json') as { version: string };

    const app = await createAppRenderer();
    const selected = await createCommandMenu(app.renderer, app.root, version);
    await app.destroy();

    if (selected) {
      // Re-parse with the selected command injected
      const args = ['node', 'iatools', ...selected.split(' ')];
      program.parse(args);
    }
    return;
  }

  program.parse(process.argv);
}

main();
