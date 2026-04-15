/**
 * Diff view component — colored TextRenderables in a bordered ScrollBoxRenderable.
 * (spec TUI-06)
 */

import {
    BoxRenderable,
    ScrollBoxRenderable,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { THEME } from '../theme';

export interface DiffViewComponentOptions {
  filePath?: string;
  lines: string[];
}

export function createDiffView(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  opts: DiffViewComponentOptions,
): BoxRenderable {
  const container = new BoxRenderable(renderer, {
    id: 'diff-box',
    border: true,
    borderStyle: 'rounded',
    borderColor: THEME.colors.muted,
    flexDirection: 'column',
    width: '100%',
    ...(opts.filePath ? { title: opts.filePath } : {}),
  });

  const scroll = new ScrollBoxRenderable(renderer, {
    id: 'diff-scroll',
    flexGrow: 1,
    width: '100%',
  });

  for (let i = 0; i < opts.lines.length; i++) {
    const line = opts.lines[i]!;
    let fg = THEME.colors.muted;
    if (line.startsWith('+')) fg = THEME.colors.success;
    else if (line.startsWith('-')) fg = THEME.colors.error;
    else if (line.startsWith('@@')) fg = THEME.colors.accent;

    scroll.add(new TextRenderable(renderer, {
      id: `diff-line-${i}`,
      content: line,
      fg,
    }));
  }

  container.add(scroll);
  root.add(container);

  return container;
}
