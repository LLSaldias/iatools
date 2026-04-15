/**
 * TuiContext — unified interface for TUI operations.
 * Factory returns OpenTUI-backed context when TTY, fallback otherwise.
 */

export interface TableOpts {
  title?: string;
  columns: Array<{ header: string; key: string; width?: number; align?: 'left' | 'right' | 'center' }>;
  rows: Array<Record<string, string | number>>;
}

export interface ProgressOpts {
  current: number;
  total: number;
  label: string;
}

export interface DiffViewOpts {
  filePath?: string;
  lines: string[];
}

export interface TuiContext {
  banner(version: string): void;
  table(opts: TableOpts): void;
  progress(opts: ProgressOpts): { update(current: number, total: number, label: string): void };
  diffView(opts: DiffViewOpts): void;
  log: {
    info(msg: string): void;
    success(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
  destroy(): Promise<void>;
}

export interface TuiContextOptions {
  interactive?: boolean;
}

export async function createTuiContext(opts?: TuiContextOptions): Promise<TuiContext> {
  if (process.stdout.isTTY) {
    const { createLiveTuiContext } = await import('./live-context');
    return createLiveTuiContext(opts);
  }
  const { createFallbackContext } = await import('./fallback');
  return createFallbackContext(opts);
}
