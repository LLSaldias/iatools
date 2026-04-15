/**
 * Static output screen — non-interactive content display with "press key to exit".
 * (spec TUI-11)
 */

import {
    BoxRenderable,
    ScrollBoxRenderable,
    TextRenderable,
    type CliRenderer,
    type Renderable
} from '@opentui/core';
import { createBanner } from '../components/banner';
import { THEME } from '../theme';

export interface StaticOutputOptions {
  title?: string;
  version?: string;
}

export interface StaticOutputHandle {
  setContent(content: string | Renderable[]): void;
  setProgress(current: number, total: number, label: string): void;
  waitForExit(): Promise<void>;
}

export function createStaticOutput(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  opts: StaticOutputOptions,
): StaticOutputHandle {
  // Banner at top
  if (opts.version) {
    createBanner(renderer, root, { ...(opts.title ? { title: opts.title } : {}), version: opts.version });
  }

  // Scrollable content area
  const contentScroll = new ScrollBoxRenderable(renderer, {
    id: 'static-content',
    flexGrow: 1,
    width: '100%',
  });
  root.add(contentScroll);

  // Progress bar area (hidden by default)
  const progressContainer = new BoxRenderable(renderer, {
    id: 'static-progress',
    flexDirection: 'row',
    width: '100%',
    gap: 1,
  });
  (progressContainer as any).display = 'none';
  const progressBg = new BoxRenderable(renderer, {
    id: 'static-progress-bg',
    width: Math.max(renderer.width - 30, 20),
    height: 1,
    backgroundColor: THEME.colors.muted,
  });
  const progressFill = new BoxRenderable(renderer, {
    id: 'static-progress-fill',
    width: 0,
    height: 1,
    backgroundColor: THEME.colors.success,
  });
  progressBg.add(progressFill);
  const progressLabel = new TextRenderable(renderer, {
    id: 'static-progress-label',
    content: '',
    fg: THEME.colors.highlight,
  });
  progressContainer.add(progressBg);
  progressContainer.add(progressLabel);
  root.add(progressContainer);

  // Status bar at bottom
  const statusBar = new BoxRenderable(renderer, {
    id: 'status-bar',
    border: true,
    borderStyle: 'rounded',
    borderColor: THEME.colors.muted,
    width: '100%',
    padding: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  });
  const statusText = new TextRenderable(renderer, {
    id: 'status-text',
    content: 'Rendering...',
    fg: THEME.colors.muted,
  });
  const elapsedText = new TextRenderable(renderer, {
    id: 'elapsed-text',
    content: '',
    fg: THEME.colors.muted,
  });
  statusBar.add(statusText);
  statusBar.add(elapsedText);
  root.add(statusBar);

  const startTime = Date.now();
  let contentRendered = false;

  return {
    setContent(content: string | Renderable[]): void {
      if (typeof content === 'string') {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          contentScroll.add(new TextRenderable(renderer, {
            id: `content-line-${i}`,
            content: lines[i]!,
            fg: THEME.colors.highlight,
          }));
        }
      } else {
        for (const renderable of content) {
          contentScroll.add(renderable);
        }
      }

      contentRendered = true;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      (statusText as any).content = 'Press any key to exit';
      (elapsedText as any).content = `${elapsed}s`;
      contentScroll.focus();
      renderer.requestRender();
    },

    setProgress(current: number, total: number, label: string): void {
      (progressContainer as any).display = 'flex';
      const barWidth = Math.max(renderer.width - 30, 20);
      const fillWidth = total > 0 ? Math.round((current / total) * barWidth) : 0;
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      (progressFill as any).width = Math.max(fillWidth, 0);
      (progressLabel as any).content = `${label} ${current}/${total} (${pct}%)`;
      renderer.requestRender();
    },

    waitForExit(): Promise<void> {
      return new Promise((resolve) => {
        const handler = () => {
          if (contentRendered) {
            renderer.keyInput.off('keypress', handler);
            resolve();
          }
        };
        renderer.keyInput.on('keypress', handler);
      });
    },
  };
}
