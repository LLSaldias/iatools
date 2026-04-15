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
}));

import { createDiffView } from '@/tui/components/diff-view';
import { BoxRenderable, ScrollBoxRenderable, TextRenderable } from '@opentui/core';

const sampleLines = [
  '@@ -1,5 +1,6 @@',
  ' context line 1',
  '-removed line',
  '+added line',
  ' context line 2',
  '+another added',
];

describe('tui/components/diff-view', () => {
  const mockRenderer = { width: 80, requestRender: jest.fn() } as any;
  const mockRoot = { add: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a bordered container with rounded border and muted color', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const container = boxCalls.find((c: any) => c[1]?.id === 'diff-box');
    expect(container).toBeDefined();

    const opts = container![1];
    expect(opts.border).toBe(true);
    expect(opts.borderStyle).toBe('rounded');
    expect(opts.borderColor).toBe(THEME.colors.muted);
    expect(opts.flexDirection).toBe('column');
  });

  it('creates a ScrollBoxRenderable for content', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const scrollCalls = (ScrollBoxRenderable as unknown as jest.Mock).mock.calls;
    const scroll = scrollCalls.find((c: any) => c[1]?.id === 'diff-scroll');
    expect(scroll).toBeDefined();
    expect(scroll![1].flexGrow).toBe(1);
  });

  it('creates one TextRenderable per line', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const diffLines = textCalls.filter((c: any) => c[1]?.id?.startsWith('diff-line-'));
    expect(diffLines).toHaveLength(sampleLines.length);
  });

  it('colors @@ lines with accent color', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const hhLine = textCalls.find((c: any) => c[1]?.id === 'diff-line-0');
    expect(hhLine![1].content).toBe('@@ -1,5 +1,6 @@');
    expect(hhLine![1].fg).toBe(THEME.colors.accent);
  });

  it('colors + lines with success color', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const addedLine = textCalls.find((c: any) => c[1]?.id === 'diff-line-3');
    expect(addedLine![1].content).toBe('+added line');
    expect(addedLine![1].fg).toBe(THEME.colors.success);
  });

  it('colors - lines with error color', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const removedLine = textCalls.find((c: any) => c[1]?.id === 'diff-line-2');
    expect(removedLine![1].content).toBe('-removed line');
    expect(removedLine![1].fg).toBe(THEME.colors.error);
  });

  it('colors context lines with muted color', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const ctxLine = textCalls.find((c: any) => c[1]?.id === 'diff-line-1');
    expect(ctxLine![1].content).toBe(' context line 1');
    expect(ctxLine![1].fg).toBe(THEME.colors.muted);
  });

  it('sets title from filePath when provided', () => {
    createDiffView(mockRenderer, mockRoot, {
      filePath: 'src/index.ts',
      lines: sampleLines,
    });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const container = boxCalls.find((c: any) => c[1]?.id === 'diff-box');
    expect(container![1].title).toBe('src/index.ts');
  });

  it('does not set title when filePath is omitted', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const container = boxCalls.find((c: any) => c[1]?.id === 'diff-box');
    expect(container![1].title).toBeUndefined();
  });

  it('adds container to root', () => {
    createDiffView(mockRenderer, mockRoot, { lines: sampleLines });
    expect(mockRoot.add).toHaveBeenCalledTimes(1);
  });
});
