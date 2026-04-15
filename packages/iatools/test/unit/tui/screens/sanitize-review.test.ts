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
  TextRenderable,
} from '@opentui/core';
import { createSanitizeReview } from '@/tui/screens/sanitize-review';

const candidates = [
  { id: 'c1', severity: 'high' as const, label: 'API Key', match: 'sk-123', context: 'key=sk-123 found', replacement: '[REDACTED]', patternId: 'p1' },
  { id: 'c2', severity: 'low' as const, label: 'Email', match: 'a@b.com', context: 'email a@b.com here', replacement: '[EMAIL]', patternId: 'p2' },
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

describe('tui/screens/sanitize-review', () => {
  let mockRenderer: ReturnType<typeof buildMockRenderer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderer = buildMockRenderer();
  });

  it('resolves immediately with empty array when no candidates', async () => {
    const result = await createSanitizeReview(
      mockRenderer as any,
      mockRenderer.root as any,
      [],
    );
    expect(result).toEqual([]);
  });

  it('renders first candidate with severity badge and context', () => {
    createSanitizeReview(
      mockRenderer as any,
      mockRenderer.root as any,
      candidates,
    );

    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;

    // Severity badge
    const badgeCall = textCalls.find(
      ([, opts]: any) => opts.id === 'severity-badge',
    );
    expect(badgeCall).toBeDefined();
    expect(badgeCall![1].content).toContain('HIGH');

    // Label
    const labelCall = textCalls.find(
      ([, opts]: any) => opts.id === 'candidate-label',
    );
    expect(labelCall).toBeDefined();
    expect(labelCall![1].content).toBe('API Key');

    // Context match highlight
    const matchCall = textCalls.find(
      ([, opts]: any) => opts.id === 'ctx-match',
    );
    expect(matchCall).toBeDefined();
    expect(matchCall![1].content).toBe('sk-123');
  });

  it('a key approves (redact) and advances', async () => {
    const promise = createSanitizeReview(
      mockRenderer as any,
      mockRenderer.root as any,
      candidates,
    );

    const keyHandler = mockRenderer._keypressHandlers[0]!;
    // Approve first candidate
    keyHandler({ sequence: 'a' });
    // Approve second candidate
    keyHandler({ sequence: 'a' });

    // After all candidates, showSummary registers a new handler — fire it
    const exitHandler = mockRenderer._keypressHandlers[1]!;
    exitHandler({ name: 'return' });

    const result = await promise;
    expect(result).toEqual([
      { candidateId: 'c1', decision: 'redact' },
      { candidateId: 'c2', decision: 'redact' },
    ]);
  });

  it('r key rejects (keep) and advances', async () => {
    const promise = createSanitizeReview(
      mockRenderer as any,
      mockRenderer.root as any,
      candidates,
    );

    const keyHandler = mockRenderer._keypressHandlers[0]!;
    keyHandler({ sequence: 'r' });
    keyHandler({ sequence: 'r' });

    const exitHandler = mockRenderer._keypressHandlers[1]!;
    exitHandler({ name: 'return' });

    const result = await promise;
    expect(result).toEqual([
      { candidateId: 'c1', decision: 'keep' },
      { candidateId: 'c2', decision: 'keep' },
    ]);
  });

  it('Enter also approves', async () => {
    const promise = createSanitizeReview(
      mockRenderer as any,
      mockRenderer.root as any,
      candidates,
    );

    const keyHandler = mockRenderer._keypressHandlers[0]!;
    // Enter approves first
    keyHandler({ name: 'return' });
    // Approve second to finish
    keyHandler({ name: 'return' });

    const exitHandler = mockRenderer._keypressHandlers[1]!;
    exitHandler({ name: 'return' });

    const result = await promise;
    expect(result[0]).toEqual({ candidateId: 'c1', decision: 'redact' });
  });

  it('ESC aborts and returns partial decisions', async () => {
    const promise = createSanitizeReview(
      mockRenderer as any,
      mockRenderer.root as any,
      candidates,
    );

    const keyHandler = mockRenderer._keypressHandlers[0]!;
    // Approve first
    keyHandler({ sequence: 'a' });
    // ESC to abort
    keyHandler({ name: 'escape' });

    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ candidateId: 'c1', decision: 'redact' });
  });

  it('shows summary after all candidates reviewed', async () => {
    const promise = createSanitizeReview(
      mockRenderer as any,
      mockRenderer.root as any,
      candidates,
    );

    const keyHandler = mockRenderer._keypressHandlers[0]!;
    keyHandler({ sequence: 'a' });
    keyHandler({ sequence: 'r' });

    // Summary TextRenderables should now exist
    const textCalls = (TextRenderable as unknown as jest.Mock).mock.calls;
    const summaryApproved = textCalls.find(
      ([, opts]: any) => opts.id === 'summary-approved',
    );
    expect(summaryApproved).toBeDefined();
    expect(summaryApproved![1].content).toContain('1');

    const summaryRejected = textCalls.find(
      ([, opts]: any) => opts.id === 'summary-rejected',
    );
    expect(summaryRejected).toBeDefined();
    expect(summaryRejected![1].content).toContain('1');

    // Fire the exit handler to resolve
    const exitHandler = mockRenderer._keypressHandlers[1]!;
    exitHandler({ name: 'return' });

    await promise;
  });
});
