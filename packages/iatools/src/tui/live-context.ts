/**
 * Live TuiContext — ANSI-colored console output for TTY environments.
 * Does NOT create a CliRenderer; interactive screens handle that themselves.
 */

import type { TuiContext, TuiContextOptions } from './context';
import { THEME } from './theme';

/** Convert hex color to ANSI 256-color escape sequence */
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const C = {
  primary: hexToAnsi(THEME.colors.primary),
  success: hexToAnsi(THEME.colors.success),
  warning: hexToAnsi(THEME.colors.warning),
  error: hexToAnsi(THEME.colors.error),
  muted: hexToAnsi(THEME.colors.muted),
  accent: hexToAnsi(THEME.colors.accent),
  highlight: hexToAnsi(THEME.colors.highlight),
};

export function createLiveTuiContext(_opts?: TuiContextOptions): TuiContext {
  return {
    banner(version: string): void {
      const border = C.primary + '╭' + '─'.repeat(40) + '╮' + RESET;
      const bottom = C.primary + '╰' + '─'.repeat(40) + '╯' + RESET;
      const title = C.primary + BOLD + '│  iatools' + RESET + C.primary + ' '.repeat(31) + '│' + RESET;
      const sub = C.muted + '│  v' + version + ' · Spec-Driven Development' + RESET;
      const padded = sub + ' '.repeat(Math.max(0, 43 - version.length - 30)) + C.primary + '│' + RESET;
      console.log(border);
      console.log(title);
      console.log(padded);
      console.log(bottom);
    },

    table(opts): void {
      if (opts.title) console.log(`\n  ${C.primary}${BOLD}${opts.title}${RESET}`);
      const headers = opts.columns.map((c) => c.header);
      console.log(`  ${C.primary}${BOLD}${headers.join('  │  ')}${RESET}`);
      console.log(`  ${C.muted}${'─'.repeat(headers.join('  │  ').length)}${RESET}`);
      for (const row of opts.rows) {
        const cells = opts.columns.map((c) => String(row[c.key] ?? ''));
        console.log(`  ${C.highlight}${cells.join('  │  ')}${RESET}`);
      }
    },

    progress(opts): { update(current: number, total: number, label: string): void } {
      const barWidth = Math.min(process.stdout.columns ?? 80, 80) - 20;
      function render(current: number, total: number, label: string): void {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        const filled = total > 0 ? Math.round((current / total) * barWidth) : 0;
        const bar = C.success + '█'.repeat(filled) + C.muted + '░'.repeat(barWidth - filled) + RESET;
        process.stdout.write(`\r  ${bar} ${C.highlight}${label} ${pct}%${RESET}`);
        if (current >= total) process.stdout.write('\n');
      }
      render(opts.current, opts.total, opts.label);
      return {
        update(current: number, total: number, label: string): void {
          render(current, total, label);
        },
      };
    },

    diffView(opts): void {
      if (opts.filePath) console.log(`\n  ${C.muted}--- ${opts.filePath} ---${RESET}`);
      for (const line of opts.lines) {
        if (line.startsWith('+')) console.log(`  ${C.success}${line}${RESET}`);
        else if (line.startsWith('-')) console.log(`  ${C.error}${line}${RESET}`);
        else if (line.startsWith('@@')) console.log(`  ${C.accent}${line}${RESET}`);
        else console.log(`  ${C.muted}${line}${RESET}`);
      }
    },

    log: {
      info(msg: string): void {
        console.log(`  ${C.accent}${THEME.icons.arrow} ${msg}${RESET}`);
      },
      success(msg: string): void {
        console.log(`  ${C.success}${THEME.icons.success} ${msg}${RESET}`);
      },
      warn(msg: string): void {
        console.log(`  ${C.warning}${THEME.icons.warning} ${msg}${RESET}`);
      },
      error(msg: string): void {
        console.error(`  ${C.error}${THEME.icons.error} ${msg}${RESET}`);
      },
    },

    async destroy(): Promise<void> {
      // No renderer to destroy — context is console-based
    },
  };
}
