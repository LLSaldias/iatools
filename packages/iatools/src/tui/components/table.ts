/**
 * Table component — BoxRenderable grid with ScrollBoxRenderable for overflow.
 * (spec TUI-04)
 */

import {
    BoxRenderable,
    ScrollBoxRenderable,
    TextAttributes,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { THEME } from '../theme';

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export interface TableComponentOptions {
  title?: string;
  columns: TableColumn[];
  rows: Array<Record<string, string | number>>;
}

export function createTable(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  opts: TableComponentOptions,
): BoxRenderable {
  const container = new BoxRenderable(renderer, {
    id: 'table-box',
    border: true,
    borderStyle: 'rounded',
    borderColor: THEME.colors.muted,
    flexDirection: 'column',
    width: '100%',
    ...(opts.title ? { title: opts.title } : {}),
  });

  // Header row
  const headerRow = new BoxRenderable(renderer, {
    id: 'table-header-row',
    flexDirection: 'row',
    width: '100%',
    gap: 1,
  });
  for (const col of opts.columns) {
    headerRow.add(new TextRenderable(renderer, {
      id: `th-${col.key}`,
      content: col.header,
      fg: THEME.colors.primary,
      attributes: TextAttributes.BOLD,
      ...(col.width ? { width: col.width } : { flexGrow: 1 }),
    }));
  }
  container.add(headerRow);

  // Data rows in scrollable area
  const scroll = new ScrollBoxRenderable(renderer, {
    id: 'table-scroll',
    flexGrow: 1,
    width: '100%',
  });

  for (let i = 0; i < opts.rows.length; i++) {
    const row = opts.rows[i]!;
    const rowBox = new BoxRenderable(renderer, {
      id: `tr-${i}`,
      flexDirection: 'row',
      width: '100%',
      gap: 1,
    });
    for (const col of opts.columns) {
      rowBox.add(new TextRenderable(renderer, {
        id: `td-${i}-${col.key}`,
        content: String(row[col.key] ?? ''),
        fg: THEME.colors.highlight,
        ...(col.width ? { width: col.width } : { flexGrow: 1 }),
      }));
    }
    scroll.add(rowBox);
  }

  container.add(scroll);
  root.add(container);

  return container;
}
