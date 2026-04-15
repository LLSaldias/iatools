/**
 * Log panel component — scrollable log with auto-scroll to latest entry.
 * (spec TUI-07)
 */

import {
    ScrollBoxRenderable,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { THEME } from '../theme';

export interface LogPanelHandle {
  container: ScrollBoxRenderable;
  info(msg: string): void;
  success(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

let logCounter = 0;

export function createLogPanel(
  renderer: CliRenderer,
  root: CliRenderer['root'],
): LogPanelHandle {
  const scroll = new ScrollBoxRenderable(renderer, {
    id: 'log-panel',
    flexGrow: 1,
    width: '100%',
  });

  root.add(scroll);

  function appendLog(icon: string, msg: string, fg: string): void {
    logCounter++;
    scroll.add(new TextRenderable(renderer, {
      id: `log-${logCounter}`,
      content: `  ${icon} ${msg}`,
      fg,
    }));
    renderer.requestRender();
  }

  return {
    container: scroll,
    info(msg: string): void {
      appendLog(THEME.icons.arrow, msg, THEME.colors.accent);
    },
    success(msg: string): void {
      appendLog(THEME.icons.success, msg, THEME.colors.success);
    },
    warn(msg: string): void {
      appendLog(THEME.icons.warning, msg, THEME.colors.warning);
    },
    error(msg: string): void {
      appendLog(THEME.icons.error, msg, THEME.colors.error);
    },
    debug(msg: string): void {
      appendLog(THEME.icons.bullet, msg, THEME.colors.muted);
    },
  };
}
