import { THEME } from '@/tui/theme';

const mockAdd = jest.fn();
const mockRequestRender = jest.fn();

function createMockCtor() {
  return jest.fn().mockImplementation(function (this: any, _renderer: any, options: any) {
    this.id = options?.id || '';
    this.options = options;
    this.children = [];
    this.width = options?.width;
    this.content = options?.content;
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
  RGBA: { fromHex: jest.fn() },
}));

import { createProgressBar } from '@/tui/components/progress';
import { BoxRenderable, TextRenderable } from '@opentui/core';

describe('tui/components/progress', () => {
  const mockRenderer = { width: 80, requestRender: mockRequestRender } as any;
  const mockRoot = { add: jest.fn() } as any;
  const expectedBarWidth = Math.max(80 - 30, 20); // 50

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a container row with correct layout', () => {
    createProgressBar(mockRenderer, mockRoot, { current: 0, total: 10, label: 'Test' });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const container = boxCalls.find((c: any) => c[1]?.id === 'progress-container');
    expect(container).toBeDefined();
    expect(container![1].flexDirection).toBe('row');
    expect(container![1].alignItems).toBe('center');
  });

  it('creates a background bar with muted color', () => {
    createProgressBar(mockRenderer, mockRoot, { current: 0, total: 10, label: 'Test' });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const bg = boxCalls.find((c: any) => c[1]?.id === 'progress-bg');
    expect(bg).toBeDefined();
    expect(bg![1].width).toBe(expectedBarWidth);
    expect(bg![1].backgroundColor).toBe(THEME.colors.muted);
  });

  it('creates fill bar at 0% with width 0', () => {
    createProgressBar(mockRenderer, mockRoot, { current: 0, total: 10, label: 'Test' });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const fill = boxCalls.find((c: any) => c[1]?.id === 'progress-fill');
    expect(fill).toBeDefined();
    expect(fill![1].width).toBe(0);
    expect(fill![1].backgroundColor).toBe(THEME.colors.success);
  });

  it('creates fill bar at 50% with half width', () => {
    createProgressBar(mockRenderer, mockRoot, { current: 5, total: 10, label: 'Tasks' });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const fill = boxCalls.find((c: any) => c[1]?.id === 'progress-fill');
    expect(fill![1].width).toBe(Math.round(expectedBarWidth / 2));
  });

  it('creates fill bar at 100% with full width', () => {
    createProgressBar(mockRenderer, mockRoot, { current: 10, total: 10, label: 'Done' });

    const boxCalls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const fill = boxCalls.find((c: any) => c[1]?.id === 'progress-fill');
    expect(fill![1].width).toBe(expectedBarWidth);
  });

  it('shows label with percentage text', () => {
    createProgressBar(mockRenderer, mockRoot, { current: 3, total: 10, label: 'Building' });

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const label = textCalls.find((c: any) => c[1]?.id === 'progress-label');
    expect(label).toBeDefined();
    expect(label![1].content).toBe('Building 3/10 (30%)');
    expect(label![1].fg).toBe(THEME.colors.highlight);
  });

  it('update() changes fill width and label, then calls requestRender', () => {
    const handle = createProgressBar(mockRenderer, mockRoot, {
      current: 0,
      total: 10,
      label: 'Start',
    });

    handle.update(5, 10, 'Half');
    expect(mockRequestRender).toHaveBeenCalled();

    handle.update(10, 10, 'Complete');
    expect(mockRequestRender).toHaveBeenCalledTimes(2);
  });

  it('returns a handle with container and update function', () => {
    const handle = createProgressBar(mockRenderer, mockRoot, {
      current: 0,
      total: 10,
      label: 'Init',
    });

    expect(handle.container).toBeDefined();
    expect(handle.container.id).toBe('progress-container');
    expect(typeof handle.update).toBe('function');
  });

  it('adds container to root', () => {
    createProgressBar(mockRenderer, mockRoot, { current: 0, total: 10, label: 'Test' });
    expect(mockRoot.add).toHaveBeenCalledTimes(1);
  });
});
