import { THEME } from '@/tui/theme';

const mockAdd = jest.fn();

function createMockCtor() {
  return jest.fn().mockImplementation(function (this: any, _renderer: any, options: any) {
    this.id = options?.id || '';
    this.options = options;
    this.children = [];
    this.add = mockAdd;
    this.remove = jest.fn();
    this.destroy = jest.fn();
    this.focus = jest.fn();
    this.on = jest.fn();
  });
}

jest.mock('@opentui/core', () => ({
  BoxRenderable: createMockCtor(),
  TextRenderable: createMockCtor(),
  ScrollBoxRenderable: createMockCtor(),
  RGBA: { fromHex: jest.fn() },
  TextAttributes: { BOLD: 1 },
}));

import { createTable } from '@/tui/components/table';
import { BoxRenderable, ScrollBoxRenderable, TextRenderable } from '@opentui/core';

const sampleColumns = [
  { header: 'Name', key: 'name', width: 20 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Score', key: 'score' },
];

const sampleRows = [
  { name: 'Alice', status: 'ok', score: 95 },
  { name: 'Bob', status: 'warn', score: 72 },
  { name: 'Carol', status: 'ok', score: 88 },
  { name: 'Dan', status: 'err', score: 43 },
  { name: 'Eve', status: 'ok', score: 91 },
];

describe('tui/components/table', () => {
  const mockRenderer = { width: 80, requestRender: jest.fn() } as any;
  const mockRoot = { add: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a bordered container with rounded border', () => {
    createTable(mockRenderer, mockRoot, { columns: sampleColumns, rows: sampleRows });

    const calls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const containerCall = calls.find((c: any) => c[1]?.id === 'table-box');
    expect(containerCall).toBeDefined();

    const opts = containerCall![1];
    expect(opts.border).toBe(true);
    expect(opts.borderStyle).toBe('rounded');
    expect(opts.borderColor).toBe(THEME.colors.muted);
    expect(opts.flexDirection).toBe('column');
    expect(opts.width).toBe('100%');
  });

  it('creates header row with bold text for each column', () => {
    createTable(mockRenderer, mockRoot, { columns: sampleColumns, rows: sampleRows });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    for (const col of sampleColumns) {
      const headerCall = textCalls.find((c: any) => c[1]?.id === `th-${col.key}`);
      expect(headerCall).toBeDefined();
      expect(headerCall![1].content).toBe(col.header);
      expect(headerCall![1].fg).toBe(THEME.colors.primary);
      expect(headerCall![1].attributes).toBe(1); // TextAttributes.BOLD
    }
  });

  it('applies explicit width on columns that have it, flexGrow on others', () => {
    createTable(mockRenderer, mockRoot, { columns: sampleColumns, rows: sampleRows });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const nameHeader = textCalls.find((c: any) => c[1]?.id === 'th-name');
    expect(nameHeader![1].width).toBe(20);

    const scoreHeader = textCalls.find((c: any) => c[1]?.id === 'th-score');
    expect(scoreHeader![1].flexGrow).toBe(1);
    expect(scoreHeader![1].width).toBeUndefined();
  });

  it('creates a ScrollBoxRenderable for the data rows', () => {
    createTable(mockRenderer, mockRoot, { columns: sampleColumns, rows: sampleRows });

    const scrollCalls = (ScrollBoxRenderable as unknown as jest.Mock).mock.calls;
    const scrollCall = scrollCalls.find((c: any) => c[1]?.id === 'table-scroll');
    expect(scrollCall).toBeDefined();
    expect(scrollCall![1].flexGrow).toBe(1);
  });

  it('creates the correct number of data rows (5)', () => {
    createTable(mockRenderer, mockRoot, { columns: sampleColumns, rows: sampleRows });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const rowCalls = boxCalls.filter((c: any) => c[1]?.id?.startsWith('tr-'));
    expect(rowCalls).toHaveLength(5);
  });

  it('creates data cells with correct content and highlight color', () => {
    createTable(mockRenderer, mockRoot, { columns: sampleColumns, rows: sampleRows });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const cell = textCalls.find((c: any) => c[1]?.id === 'td-0-name');
    expect(cell).toBeDefined();
    expect(cell![1].content).toBe('Alice');
    expect(cell![1].fg).toBe(THEME.colors.highlight);

    const scoreCell = textCalls.find((c: any) => c[1]?.id === 'td-2-score');
    expect(scoreCell![1].content).toBe('88');
  });

  it('sets title on container when provided', () => {
    createTable(mockRenderer, mockRoot, {
      title: 'Results',
      columns: sampleColumns,
      rows: sampleRows,
    });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const containerCall = boxCalls.find((c: any) => c[1]?.id === 'table-box');
    expect(containerCall![1].title).toBe('Results');
  });

  it('adds container to root', () => {
    createTable(mockRenderer, mockRoot, { columns: sampleColumns, rows: sampleRows });
    expect(mockRoot.add).toHaveBeenCalledTimes(1);
  });
});
