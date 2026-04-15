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

jest.mock('@/tui/components/banner', () => ({
  createBanner: jest.fn(),
}));

import {
  BoxRenderable,
  SelectRenderable,
  TextRenderable,
} from '@opentui/core';
import { createBanner } from '@/tui/components/banner';
import { createInitWizard } from '@/tui/screens/init-wizard';

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

describe('tui/screens/init-wizard', () => {
  let mockRenderer: ReturnType<typeof buildMockRenderer>;
  let selectHandlers: Record<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderer = buildMockRenderer();
    selectHandlers = {};

    (SelectRenderable as unknown as jest.Mock).mockImplementation((_, opts) => {
      const instance = {
        id: opts.id,
        add: jest.fn(),
        remove: jest.fn(),
        destroy: jest.fn(),
        focus: jest.fn(),
        on: jest.fn(),
        children: [],
        selectedIndex: opts.selectedIndex ?? 0,
      };
      instance.on.mockImplementation((event: string, handler: Function) => {
        selectHandlers[event] = handler;
      });
      return instance;
    });
  });

  it('creates banner and step indicator', () => {
    createInitWizard(mockRenderer as any, mockRenderer.root as any, '1.0.0');

    expect(createBanner).toHaveBeenCalledWith(
      mockRenderer,
      mockRenderer.root,
      { version: '1.0.0' },
    );

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const stepCall = textCalls.find(
      ([, opts]: any) => opts.id === 'step-indicator',
    );
    expect(stepCall).toBeDefined();
    expect(stepCall![1].content).toContain('Step 1');
  });

  it('renders first step with IDE options', () => {
    createInitWizard(mockRenderer as any, mockRenderer.root as any, '1.0.0');

    const selectCalls = (SelectRenderable as unknown as jest.Mock).mock.calls;
    expect(selectCalls.length).toBeGreaterThanOrEqual(1);

    const firstSelect = selectCalls[0]![1];
    expect(firstSelect.options).toHaveLength(4);
    expect(firstSelect.options[0].value).toBe('vscode');

    // focus() should be called on the instance
    const instance = (SelectRenderable as unknown as jest.Mock).mock.results[0]!.value;
    expect(instance.focus).toHaveBeenCalled();
  });

  it('ESC resolves null', async () => {
    const promise = createInitWizard(
      mockRenderer as any,
      mockRenderer.root as any,
      '1.0.0',
    );

    // The first keypress handler registered is the ESC handler
    const escHandler = mockRenderer._keypressHandlers[0]!;
    escHandler({ name: 'escape' });

    const result = await promise;
    expect(result).toBeNull();
  });

  it('advancing through steps and confirming resolves result', async () => {
    const promise = createInitWizard(
      mockRenderer as any,
      mockRenderer.root as any,
      '1.0.0',
    );

    // Step 1 (IDE): fire ITEM_SELECTED
    const step1Handler = selectHandlers['item-selected']!;
    step1Handler(0, { value: 'vscode', name: 'VS Code / Copilot' });

    // Step 2 (Roles): new SelectRenderable created, selectHandlers overwritten
    const step2Handler = selectHandlers['item-selected']!;
    step2Handler(0, { value: 'explorer', name: 'Explorer' });

    // Confirmation step: a new keypress handler is registered
    // It's the second handler (first is ESC, second is confirm)
    const confirmHandler = mockRenderer._keypressHandlers[1]!;
    confirmHandler({ name: 'return' });

    const result = await promise;
    expect(result).toEqual({
      ides: ['vscode'],
      roles: ['explorer'],
    });
  });
});
