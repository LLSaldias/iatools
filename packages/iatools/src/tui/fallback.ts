/**
 * Non-TTY fallback TuiContext implementation.
 * Uses console.log/console.error for output.
 * Interactive methods print error to stderr and exit with code 1 (spec TUI-13.5).
 */

import type { TuiContext, TuiContextOptions } from './context';

export function createFallbackContext(_opts?: TuiContextOptions): TuiContext {
  return {
    banner(version: string): void {
      console.log(`iatools v${version} - Spec-Driven Development`);
    },

    table(opts): void {
      if (opts.title) console.log(`\n  ${opts.title}`);
      // Header row
      const headers = opts.columns.map((c) => c.header);
      console.log(`  ${headers.join('  |  ')}`);
      console.log(`  ${'─'.repeat(headers.join('  |  ').length)}`);
      // Data rows
      for (const row of opts.rows) {
        const cells = opts.columns.map((c) => String(row[c.key] ?? ''));
        console.log(`  ${cells.join('  |  ')}`);
      }
    },

    progress(opts): { update(current: number, total: number, label: string): void } {
      const pct = opts.total > 0 ? Math.round((opts.current / opts.total) * 100) : 0;
      console.log(`  ${opts.label} ${opts.current}/${opts.total} (${pct}%)`);
      return {
        update(current: number, total: number, label: string): void {
          const p = total > 0 ? Math.round((current / total) * 100) : 0;
          console.log(`  ${label} ${current}/${total} (${p}%)`);
        },
      };
    },

    diffView(opts): void {
      if (opts.filePath) console.log(`\n  --- ${opts.filePath} ---`);
      for (const line of opts.lines) {
        if (line.startsWith('+')) {
          console.log(`  ${line}`);
        } else if (line.startsWith('-')) {
          console.log(`  ${line}`);
        } else if (line.startsWith('@@')) {
          console.log(`  ${line}`);
        } else {
          console.log(`  ${line}`);
        }
      }
    },

    log: {
      info(msg: string): void {
        console.log(`  [INFO] ${msg}`);
      },
      success(msg: string): void {
        console.log(`  [OK] ${msg}`);
      },
      warn(msg: string): void {
        console.log(`  [WARN] ${msg}`);
      },
      error(msg: string): void {
        console.error(`  [ERROR] ${msg}`);
      },
    },

    async destroy(): Promise<void> {
      // No-op for fallback
    },
  };
}

/**
 * Exits with an error for interactive commands in non-TTY mode.
 */
export function requireTTY(commandName: string): never {
  process.stderr.write(`Interactive mode requires a TTY terminal (command: ${commandName})\n`);
  process.exit(1);
}
