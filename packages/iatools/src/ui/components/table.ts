import { panel, theme } from '@/ui/theme';
import Table from 'cli-table3';

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown) => string;
}

export interface TableOptions {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  title?: string;
  highlightRow?: number;
}

export function renderTable(options: TableOptions): string {
  const { columns, rows, title, highlightRow } = options;

  const table = new Table({
    head: columns.map((c) => theme.colors.accent(c.header)),
    colWidths: columns.map((c) => c.width ?? undefined) as any,
    colAligns: columns.map((c) => c.align ?? 'left') as any,
    style: { head: [], border: ['gray'] },
  });

  rows.forEach((row, idx) => {
    const cells = columns.map((col) => {
      const raw = row[col.key];
      const formatted = col.format ? col.format(raw) : String(raw ?? '');
      return highlightRow === idx ? theme.colors.highlight(formatted) : formatted;
    });
    table.push(cells);
  });

  const rendered = table.toString();
  return title ? panel(rendered, { title }) : rendered;
}
