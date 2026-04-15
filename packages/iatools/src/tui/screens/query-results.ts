/**
 * Query results screen — interactive SelectRenderable list with detail pane.
 * (spec TUI-09)
 */

import {
    BoxRenderable,
    ScrollBoxRenderable,
    SelectRenderable,
    SelectRenderableEvents,
    TextAttributes,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { THEME } from '../theme';

export interface QueryResultItem {
  id: string;
  score: number;
  type: string;
  title: string;
  source?: string;
  content?: string;
  metadata?: Record<string, string>;
}

export interface QueryResultsScreenResult {
  selected: string[];
}

export function createQueryResultsScreen(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  query: string,
  results: QueryResultItem[],
): Promise<QueryResultsScreenResult> {
  return new Promise((resolve) => {
    if (results.length === 0) {
      const msg = new TextRenderable(renderer, {
        id: 'no-results',
        content: '  No results found',
        fg: THEME.colors.muted,
      });
      root.add(msg);
      renderer.requestRender();

      renderer.keyInput.on('keypress', () => {
        resolve({ selected: [] });
      });
      return;
    }

    const toggledSet = new Set<number>();
    let detailPaneVisible = false;

    // Title
    const titleBar = new TextRenderable(renderer, {
      id: 'query-title',
      content: `  ${THEME.icons.brain} Query: "${query}" — ${results.length} results`,
      fg: THEME.colors.primary,
      attributes: TextAttributes.BOLD,
    });
    root.add(titleBar);

    // Results list
    const select = new SelectRenderable(renderer, {
      id: 'query-select',
      width: renderer.width - 4,
      height: Math.min(results.length + 2, renderer.height - 8),
      options: results.map((r, i) => ({
        name: `${r.score.toFixed(2)}  ${r.type.padEnd(10)}  ${r.title}`,
        description: r.source ?? '',
        value: r.id,
      })),
      selectedIndex: 0,
    });
    root.add(select);

    // Detail pane (hidden initially)
    const detailBox = new BoxRenderable(renderer, {
      id: 'detail-pane',
      border: true,
      borderStyle: 'rounded',
      borderColor: THEME.colors.accent,
      width: '100%',
      padding: 1,
    });
    (detailBox as any).display = 'none';
    const detailScroll = new ScrollBoxRenderable(renderer, {
      id: 'detail-scroll',
      width: '100%',
      height: 10,
    });
    detailBox.add(detailScroll);
    root.add(detailBox);

    // Key hints
    const hintsText = new TextRenderable(renderer, {
      id: 'query-hints',
      content: '[↑↓] Navigate  [Enter] Details  [Space] Select  [e] Export  [ESC] Exit',
      fg: THEME.colors.muted,
    });
    root.add(hintsText);

    function showDetail(index: number): void {
      const item = results[index]!;
      // Clear previous detail content
      while ((detailScroll as any).children?.length > 0) {
        const child = (detailScroll as any).children[0];
        if (child) detailScroll.remove(child.id);
        else break;
      }

      detailScroll.add(new TextRenderable(renderer, {
        id: 'detail-title',
        content: item.title,
        fg: THEME.colors.highlight,
        attributes: TextAttributes.BOLD,
      }));
      detailScroll.add(new TextRenderable(renderer, {
        id: 'detail-type',
        content: `Type: ${item.type}  |  Score: ${item.score.toFixed(2)}`,
        fg: THEME.colors.accent,
      }));
      if (item.source) {
        detailScroll.add(new TextRenderable(renderer, {
          id: 'detail-source',
          content: `Source: ${item.source}`,
          fg: THEME.colors.muted,
        }));
      }
      if (item.content) {
        detailScroll.add(new TextRenderable(renderer, {
          id: 'detail-content',
          content: item.content,
          fg: THEME.colors.highlight,
        }));
      }

      (detailBox as any).display = 'flex';
      detailPaneVisible = true;
      (hintsText as any).content = '[ESC] Close  [↑↓] Scroll';
      detailScroll.focus();
      renderer.requestRender();
    }

    function hideDetail(): void {
      (detailBox as any).display = 'none';
      detailPaneVisible = false;
      (hintsText as any).content = '[↑↓] Navigate  [Enter] Details  [Space] Select  [e] Export  [ESC] Exit';
      select.focus();
      renderer.requestRender();
    }

    // Enter opens detail
    select.on(SelectRenderableEvents.ITEM_SELECTED, (index: number) => {
      showDetail(index);
    });

    // Keyboard: Space toggles, e exports, ESC
    renderer.keyInput.on('keypress', (key: { name?: string; sequence?: string }) => {
      if (key.name === 'escape') {
        if (detailPaneVisible) {
          hideDetail();
        } else {
          resolve({ selected: Array.from(toggledSet).map((i) => results[i]!.id) });
        }
        return;
      }

      if (key.name === 'space' && !detailPaneVisible) {
        // Toggle current selection — get selectedIndex from select
        const idx = (select as any).selectedIndex ?? 0;
        if (toggledSet.has(idx)) {
          toggledSet.delete(idx);
        } else {
          toggledSet.add(idx);
        }
        // Update display to show checkmark
        const marker = toggledSet.has(idx) ? '✔ ' : '  ';
        const r = results[idx]!;
        (select as any).options[idx].name = `${marker}${r.score.toFixed(2)}  ${r.type.padEnd(10)}  ${r.title}`;
        renderer.requestRender();
        return;
      }

      if (key.sequence === 'e' && !detailPaneVisible && toggledSet.size > 0) {
        resolve({ selected: Array.from(toggledSet).map((i) => results[i]!.id) });
        return;
      }
    });

    select.focus();
  });
}
