import { THEME } from '@/tui/theme';

const mockAdd = jest.fn();
const mockRequestRender = jest.fn();

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
  ScrollBoxRenderable: createMockCtor(),
  TextRenderable: createMockCtor(),
  RGBA: { fromHex: jest.fn() },
}));

import { createLogPanel } from '@/tui/components/log-panel';
import { ScrollBoxRenderable, TextRenderable } from '@opentui/core';

describe('tui/components/log-panel', () => {
  const mockRenderer = { width: 80, requestRender: mockRequestRender } as any;
  const mockRoot = { add: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a ScrollBoxRenderable container', () => {
    createLogPanel(mockRenderer, mockRoot);

    const scrollCalls = (ScrollBoxRenderable as unknown as jest.Mock).mock.calls;
    const panel = scrollCalls.find((c: any) => c[1]?.id === 'log-panel');
    expect(panel).toBeDefined();
    expect(panel![1].flexGrow).toBe(1);
    expect(panel![1].width).toBe('100%');
  });

  it('adds container to root', () => {
    createLogPanel(mockRenderer, mockRoot);
    expect(mockRoot.add).toHaveBeenCalledTimes(1);
  });

  it('info() appends a text entry with arrow icon and accent color', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);
    handle.info('Loading config');

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const last = textCalls[textCalls.length - 1];
    expect(last[1].content).toContain(THEME.icons.arrow);
    expect(last[1].content).toContain('Loading config');
    expect(last[1].fg).toBe(THEME.colors.accent);
  });

  it('success() appends with success icon and success color', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);
    handle.success('All tests passed');

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const last = textCalls[textCalls.length - 1];
    expect(last[1].content).toContain(THEME.icons.success);
    expect(last[1].content).toContain('All tests passed');
    expect(last[1].fg).toBe(THEME.colors.success);
  });

  it('warn() appends with warning icon and warning color', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);
    handle.warn('Deprecated API');

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const last = textCalls[textCalls.length - 1];
    expect(last[1].content).toContain(THEME.icons.warning);
    expect(last[1].content).toContain('Deprecated API');
    expect(last[1].fg).toBe(THEME.colors.warning);
  });

  it('error() appends with error icon and error color', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);
    handle.error('Connection failed');

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const last = textCalls[textCalls.length - 1];
    expect(last[1].content).toContain(THEME.icons.error);
    expect(last[1].content).toContain('Connection failed');
    expect(last[1].fg).toBe(THEME.colors.error);
  });

  it('debug() appends with bullet icon and muted color', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);
    handle.debug('Trace data');

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const last = textCalls[textCalls.length - 1];
    expect(last[1].content).toContain(THEME.icons.bullet);
    expect(last[1].content).toContain('Trace data');
    expect(last[1].fg).toBe(THEME.colors.muted);
  });

  it('each log call triggers requestRender', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);
    handle.info('one');
    handle.success('two');
    handle.warn('three');

    expect(mockRequestRender).toHaveBeenCalledTimes(3);
  });

  it('appends entries to the scroll container via add()', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);
    handle.info('first');
    handle.error('second');
    handle.debug('third');

    // mockAdd is shared: once for root.add(scroll), then 3 log entries
    // Each appendLog calls scroll.add(textRenderable)
    expect(mockAdd).toHaveBeenCalledTimes(3);
  });

  it('returns a handle with all 5 log methods and container', () => {
    const handle = createLogPanel(mockRenderer, mockRoot);

    expect(handle.container).toBeDefined();
    expect(handle.container.id).toBe('log-panel');
    expect(typeof handle.info).toBe('function');
    expect(typeof handle.success).toBe('function');
    expect(typeof handle.warn).toBe('function');
    expect(typeof handle.error).toBe('function');
    expect(typeof handle.debug).toBe('function');
  });
});
