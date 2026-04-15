/**
 * Progress bar component — fill-ratio BoxRenderable bar.
 * (spec TUI-05)
 */

import {
    BoxRenderable,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { THEME } from '../theme';

export interface ProgressBarOptions {
  current: number;
  total: number;
  label: string;
}

export interface ProgressBarHandle {
  container: BoxRenderable;
  update(current: number, total: number, label: string): void;
}

export function createProgressBar(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  opts: ProgressBarOptions,
): ProgressBarHandle {
  const barWidth = Math.max(renderer.width - 30, 20);

  const container = new BoxRenderable(renderer, {
    id: 'progress-container',
    flexDirection: 'row',
    width: '100%',
    gap: 1,
    alignItems: 'center',
  });

  const barBg = new BoxRenderable(renderer, {
    id: 'progress-bg',
    width: barWidth,
    height: 1,
    backgroundColor: THEME.colors.muted,
  });

  const fillWidth = opts.total > 0 ? Math.round((opts.current / opts.total) * barWidth) : 0;
  const barFill = new BoxRenderable(renderer, {
    id: 'progress-fill',
    width: Math.max(fillWidth, 0),
    height: 1,
    backgroundColor: THEME.colors.success,
  });
  barBg.add(barFill);

  const pct = opts.total > 0 ? Math.round((opts.current / opts.total) * 100) : 0;
  const label = new TextRenderable(renderer, {
    id: 'progress-label',
    content: `${opts.label} ${opts.current}/${opts.total} (${pct}%)`,
    fg: THEME.colors.highlight,
  });

  container.add(barBg);
  container.add(label);
  root.add(container);

  return {
    container,
    update(current: number, total: number, newLabel: string): void {
      const newFill = total > 0 ? Math.round((current / total) * barWidth) : 0;
      const newPct = total > 0 ? Math.round((current / total) * 100) : 0;
      (barFill as any).width = Math.max(newFill, 0);
      (label as any).content = `${newLabel} ${current}/${total} (${newPct}%)`;
      renderer.requestRender();
    },
  };
}
