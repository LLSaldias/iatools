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
  BoxRenderable: createMockCtor(),
  TextRenderable: createMockCtor(),
  ASCIIFontRenderable: createMockCtor(),
  ScrollBoxRenderable: createMockCtor(),
  RGBA: { fromHex: jest.fn((hex: string) => ({ hex })) },
  TextAttributes: { BOLD: 1 },
}));

import { createBanner } from '@/tui/components/banner';
import { ASCIIFontRenderable, BoxRenderable, RGBA, TextRenderable } from '@opentui/core';

describe('tui/components/banner', () => {
  const mockRenderer = { width: 80, requestRender: mockRequestRender } as any;
  const mockRoot = { add: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a BoxRenderable container with rounded border and primary borderColor', () => {
    createBanner(mockRenderer, mockRoot, { version: '2.0.0' });

    const calls = (BoxRenderable as unknown as jest.Mock).mock.calls;
    const containerCall = calls.find((c: any) => c[1]?.id === 'banner');
    expect(containerCall).toBeDefined();

    const opts = containerCall![1];
    expect(opts.border).toBe(true);
    expect(opts.borderStyle).toBe('rounded');
    expect(opts.borderColor).toBe(THEME.colors.primary);
    expect(opts.padding).toBe(1);
    expect(opts.flexDirection).toBe('column');
    expect(opts.alignItems).toBe('center');
    expect(opts.width).toBe('100%');
  });

  it('creates ASCIIFontRenderable with default title "iatools" and tiny font', () => {
    createBanner(mockRenderer, mockRoot, { version: '2.0.0' });

    const calls = (ASCIIFontRenderable as unknown as jest.Mock).mock.calls;
    const asciiCall = calls.find((c: any) => c[1]?.id === 'banner-ascii');
    expect(asciiCall).toBeDefined();

    const opts = asciiCall![1];
    expect(opts.text).toBe('iatools');
    expect(opts.font).toBe('tiny');
    expect(RGBA.fromHex).toHaveBeenCalledWith(THEME.colors.primary);
  });

  it('uses custom title when provided', () => {
    createBanner(mockRenderer, mockRoot, { title: 'MyTool', version: '1.0.0' });

    const calls = (ASCIIFontRenderable as unknown as jest.Mock).mock.calls;
    const asciiCall = calls.find((c: any) => c[1]?.id === 'banner-ascii');
    expect(asciiCall![1].text).toBe('MyTool');
  });

  it('creates subtitle TextRenderable with version string', () => {
    createBanner(mockRenderer, mockRoot, { version: '2.0.0' });

    const calls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const subtitleCall = calls.find((c: any) => c[1]?.id === 'banner-subtitle');
    expect(subtitleCall).toBeDefined();

    const opts = subtitleCall![1];
    expect(opts.content).toBe('v2.0.0 · Spec-Driven Development');
    expect(opts.fg).toBe(THEME.colors.muted);
  });

  it('adds ASCIIFont and subtitle to container, then container to root', () => {
    createBanner(mockRenderer, mockRoot, { version: '2.0.0' });

    // container.add called for title and subtitle
    expect(mockAdd).toHaveBeenCalledTimes(2);
    // root.add called for container
    expect(mockRoot.add).toHaveBeenCalledTimes(1);
  });

  it('returns the container BoxRenderable', () => {
    const result = createBanner(mockRenderer, mockRoot, { version: '2.0.0' });
    expect(result).toBeDefined();
    expect(result.id).toBe('banner');
  });
});
