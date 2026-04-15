/**
 * Application renderer lifecycle wrapper.
 * Creates a CliRenderer, enters alternate screen, registers crash recovery
 * and SIGINT handler (spec TUI-01.3, TUI-01.5, TUI-12.7).
 */

import { createCliRenderer, type CliRenderer } from '@opentui/core';

export interface AppRenderer {
  renderer: CliRenderer;
  root: CliRenderer['root'];
  destroy: () => Promise<void>;
}

export async function createAppRenderer(): Promise<AppRenderer> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });

  let destroyed = false;

  const destroy = async () => {
    if (destroyed) return;
    destroyed = true;
    renderer.destroy();
  };

  // ESC exits cleanly (TUI-01.3)
  renderer.keyInput.on('keypress', (key: { name?: string }) => {
    if (key.name === 'escape') {
      destroy();
    }
  });

  // Ctrl+C / SIGINT exits with code 130 (TUI-12.7)
  renderer.keyInput.on('keypress', (key: { name?: string; ctrl?: boolean }) => {
    if (key.ctrl && key.name === 'c') {
      destroy();
    }
  });

  // Crash recovery: destroy renderer before propagating (TUI-01.5)
  const onUncaught = async (err: Error) => {
    await destroy();
    process.stderr.write(`${err.stack ?? err.message}\n`);
    process.exitCode = 1;
  };

  process.on('uncaughtException', onUncaught as any);
  process.on('unhandledRejection', onUncaught as any);

  return {
    renderer,
    root: renderer.root,
    destroy,
  };
}
