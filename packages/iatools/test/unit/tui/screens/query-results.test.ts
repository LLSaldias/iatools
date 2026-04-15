jest.mock('@opentui/core', () => {
  const mockRenderable = (_: any, opts: any) => ({
    id: opts.id,
    add: jest.fn(),
    remove: jest.fn(),
    destroy: jest.fn(),
    focus: jest.fn(),
    on: jest.fn(),
    children: [],
  });

  return {
    BoxRenderable: jest.fn().mockImplementation(mockRenderable),
    TextRenderable: jest.fn().mockImplementation(mockRenderable),
    SelectRenderable: jest.fn().mockImplementation(mockRenderable),
    ScrollBoxRenderable: jest.fn().mockImplementation(mockRenderable),
    TextAttributes: { BOLD: 1 },
    SelectRenderableEvents: { ITEM_SELECTED: 'item-selected' },
  };
});

import {
  BoxRenderable,
  ScrollBoxRenderable,
  SelectRenderable,
  TextRenderable,
} from '@opentui/core';
import { createQueryResultsScreen } from '@/tui/screens/query-results';

const sampleResults = [
  { id: 'r1', score: 0.95, type: 'memory', title: 'Test Result 1', source: 'file.md', content: 'content1' },
  { id: 'r2', score: 0.80, type: 'spec', title: 'Test Result 2', content: 'content2' },
];

function buildMockRenderer() {
  const keypressHandlers: Function[] = [];
  return {
    root: { add: jest.fn(), remove: jest.fn() },
    requestRender: jest.fn(),
    keyInput: {
      on: jest.fn((event: string, handler: Function) => {
        if (event === 'keypress') keypressHandlers.push(handler);
      }),
      off: jest.fn(),
    },
    width: 80,
    height: 24,
    _keypressHandlers: keypressHandlers,
  };
}

describe('tui/screens/query-results', () => {
  let mockRenderer: ReturnType<typeof buildMockRenderer>;
  let selectHandlers: Record<string, Function>;
  let mockSelectInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderer = buildMockRenderer();
    selectHandlers = {};

    (SelectRenderable as unknown as jest.Mock).mockImplementation((_, opts) => {
      mockSelectInstance = {
        id: opts.id,
        add: jest.fn(),
        remove: jest.fn(),
        destroy: jest.fn(),
        focus: jest.fn(),
        on: jest.fn(),
        children: [],
        selectedIndex: opts.selectedIndex ?? 0,
        options: opts.options ? [...opts.options] : [],
      };
      mockSelectInstance.on.mockImplementation((event: string, handler: Function) => {
        selectHandlers[event] = handler;
      });
      return mockSelectInstance;
    });
  });

  it('shows "no results" message when results are empty', async () => {
    const promise = createQueryResultsScreen(
      mockRenderer as any,
      mockRenderer.root as any,
      'test query',
      [],
    );

    // A keypress handler is registered for "any key to exit"
    const handler = mockRenderer._keypressHandlers[0]!;
    handler({ name: 'return' });

    const result = await promise;
    expect(result).toEqual({ selected: [] });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const noResultCall = textCalls.find(
      ([, opts]: any) => opts.content.includes('No results'),
    );
    expect(noResultCall).toBeDefined();
  });

  it('creates title bar and select list with results', () => {
    createQueryResultsScreen(
      mockRenderer as any,
      mockRenderer.root as any,
      'test query',
      sampleResults,
    );

    // Title text includes query
    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const titleCall = textCalls.find(
      ([, opts]: any) => opts.id === 'query-title',
    );
    expect(titleCall).toBeDefined();
    expect(titleCall![1].content).toContain('test query');

    // SelectRenderable created with mapped options
    expect(SelectRenderable).toHaveBeenCalled();
    const selectOpts = (SelectRenderable as unknown as jest.Mock).mock.calls[0]![1];
    expect(selectOpts.options).toHaveLength(2);
    expect(selectOpts.options[0].value).toBe('r1');
    expect(selectOpts.options[1].value).toBe('r2');
  });

  it('Enter opens detail pane', () => {
    createQueryResultsScreen(
      mockRenderer as any,
      mockRenderer.root as any,
      'test query',
      sampleResults,
    );

    // Fire ITEM_SELECTED on select (Enter)
    const itemHandler = selectHandlers['item-selected']!;
    itemHandler(0);

    // Detail content TextRenderables should be created
    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const detailTitle = textCalls.find(
      ([, opts]: any) => opts.id === 'detail-title',
    );
    expect(detailTitle).toBeDefined();
    expect(detailTitle![1].content).toBe('Test Result 1');
  });

  it('ESC with no detail visible resolves with selected items', async () => {
    const promise = createQueryResultsScreen(
      mockRenderer as any,
      mockRenderer.root as any,
      'test query',
      sampleResults,
    );

    // Keypress handler (for non-empty results) is the first one
    const handler = mockRenderer._keypressHandlers[0]!;
    handler({ name: 'escape' });

    const result = await promise;
    expect(result).toEqual({ selected: [] });
  });

  it('space toggles selection', async () => {
    const promise = createQueryResultsScreen(
      mockRenderer as any,
      mockRenderer.root as any,
      'test query',
      sampleResults,
    );

    // Set selectedIndex on mock instance
    mockSelectInstance.selectedIndex = 0;

    const handler = mockRenderer._keypressHandlers[0]!;
    // Toggle space to select item 0
    handler({ name: 'space' });

    // Now ESC to resolve
    handler({ name: 'escape' });

    const result = await promise;
    expect(result).toEqual({ selected: ['r1'] });
  });

  it('e key exports when items are selected', async () => {
    const promise = createQueryResultsScreen(
      mockRenderer as any,
      mockRenderer.root as any,
      'test query',
      sampleResults,
    );

    mockSelectInstance.selectedIndex = 0;

    const handler = mockRenderer._keypressHandlers[0]!;
    // Toggle space to select item 0
    handler({ name: 'space' });
    // Press 'e' to export
    handler({ sequence: 'e' });

    const result = await promise;
    expect(result).toEqual({ selected: ['r1'] });
  });
});
