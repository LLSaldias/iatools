/**
 * Tests for CLI integration — Phase 5 commands.
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

// Mock tui context for all tests
jest.mock('@/tui/context', () => ({
  createTuiContext: jest.fn().mockResolvedValue({
    banner: jest.fn(),
    table: jest.fn(),
    progress: jest.fn(() => ({ update: jest.fn() })),
    diffView: jest.fn(),
    log: { info: jest.fn(), success: jest.fn(), warn: jest.fn(), error: jest.fn() },
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock tui renderer and screens for interactive commands
jest.mock('@/tui/renderer', () => ({
  createAppRenderer: jest.fn().mockResolvedValue({
    renderer: { keyInput: { on: jest.fn() }, root: { add: jest.fn() }, requestRender: jest.fn(), destroy: jest.fn() },
    root: { add: jest.fn() },
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('@/tui/screens/query-results', () => ({
  createQueryResultsScreen: jest.fn().mockResolvedValue({ selected: [] }),
}));
jest.mock('@/tui/screens/sanitize-review', () => ({
  createSanitizeReview: jest.fn().mockResolvedValue([]),
}));

// Mock memory DB
jest.mock('@/memory/database');

// Mock memory ingestion
jest.mock('@/memory/ingestion');

// Mock embeddings
jest.mock('@/memory/embeddings/fallback', () => ({
  getProvider: jest.fn().mockResolvedValue(null),
}));

// Mock hybrid retrieval
jest.mock('@/memory/hybrid-retrieval', () => ({
  hybridRetrieve: jest.fn().mockResolvedValue({ nodes: [], edges: [], formatted: '' }),
}));

// Mock traceability
jest.mock('@/pipeline/traceability/chain', () => ({
  traceItem: jest.fn().mockReturnValue(null),
  traceChange: jest.fn().mockReturnValue([]),
}));

// Mock compressor — need parseCave, compress, serializeCave
jest.mock('@/pipeline/caveman/compressor', () => ({
  compress: jest.fn().mockReturnValue({
    _v: 1,
    _phase: 'proposal',
    _change: 'test-change',
    _parent: null,
    _ts: '2026-04-11T00:00:00.000Z',
    intent: 'Test intent',
    scope: { in: [], out: [] },
    constraints: [],
    success: [],
    risks: [],
  }),
  serializeCave: jest.fn().mockReturnValue('_v: 1\n_phase: proposal\n_change: test-change\n'),
  parseCave: jest.fn().mockReturnValue({
    _v: 1,
    _phase: 'proposal',
    _change: 'test-change',
    _parent: null,
    _ts: '2026-04-11T00:00:00.000Z',
    intent: 'Test intent',
    scope: { in: [], out: [] },
    constraints: [],
    success: [],
    risks: [],
  }),
}));

// Mock decompressor
jest.mock('@/pipeline/caveman/decompressor', () => ({
  decompress: jest.fn().mockReturnValue('# Proposal: test-change\n\n## Intent\n\nTest intent\n'),
}));

// Mock safety modules
jest.mock('@/safety/scanner', () => ({
  scan: jest.fn().mockReturnValue([]),
  loadConfig: jest.fn().mockReturnValue({}),
}));

jest.mock('@/safety/redactor', () => ({
  apply: jest.fn((text: string) => text),
}));

jest.mock('@/safety/audit', () => ({
  logDecisions: jest.fn(),
  hashMatch: jest.fn().mockReturnValue('abc123'),
}));

// mockTui is resolved from the mock in tests
let mockTui: any;

beforeEach(async () => {
  jest.clearAllMocks();
  const { createTuiContext } = require('@/tui/context');
  mockTui = await createTuiContext();
});

describe('memory-query command', () => {
  const { runMemoryQuery } = require('@/commands/memory-query');
  const { hybridRetrieve } = require('@/memory/hybrid-retrieval');
  const { MemoryDB } = require('@/memory/database');

  beforeEach(() => {
    jest.clearAllMocks();
    MemoryDB.mockImplementation(() => ({
      close: jest.fn(),
      getAllNodes: jest.fn().mockReturnValue([]),
      findByFTS: jest.fn().mockReturnValue([]),
    }));
  });

  it('logs "No matching nodes found." with empty DB', async () => {
    hybridRetrieve.mockResolvedValue({ nodes: [], edges: [], formatted: '' });
    await runMemoryQuery({ query: 'test', dir: '/tmp/test-project' });
    expect(mockTui.log.info).toHaveBeenCalledWith('No matching nodes found.');
  });
});

describe('trace command', () => {
  const { runTrace } = require('@/commands/trace');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs error with nonexistent change dir', async () => {
    await runTrace({ change: 'nonexistent-change', dir: '/tmp/no-such-project' });
    expect(mockTui.log.error).toHaveBeenCalledWith(
      expect.stringContaining('Change directory not found')
    );
  });
});

describe('review command', () => {
  const { runReview } = require('@/commands/review');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs error with nonexistent .cave file', async () => {
    await runReview({ phase: 'proposal', change: 'no-change', dir: '/tmp/no-project' });
    expect(mockTui.log.error).toHaveBeenCalledWith(
      expect.stringContaining('Cave file not found')
    );
  });
});

describe('compress command', () => {
  const { runCompress } = require('@/commands/compress');
  const { compress, serializeCave } = require('@/pipeline/caveman/compressor');

  let tmpDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    tmpDir = path.join(os.tmpdir(), `iatools-test-compress-${Date.now()}`);
    const changeDir = path.join(tmpDir, 'openspec', 'changes', 'test-change');
    await fs.ensureDir(changeDir);
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '# Proposal\n\n## Intent\n\nBuild a test feature.\n\n## Scope\n\n### In Scope\n- Feature A\n\n### Out of Scope\n- Feature B\n\n## Constraints\n- Must be fast\n\n## Success Criteria\n- All tests pass\n\n## Risks\n\n| ID | Description | Decision |\n|----|-------------|----------|\n| R1 | Risk one | Mitigate |\n',
      'utf8'
    );
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('produces a .cave file from a sample .md file', async () => {
    serializeCave.mockReturnValue('_v: 1\n_phase: proposal\n_change: test-change\n_parent: null\n_ts: "2026-04-11"\nintent: "Build a test feature."\n');

    await runCompress({ change: 'test-change', dir: tmpDir });

    expect(compress).toHaveBeenCalled();
    expect(serializeCave).toHaveBeenCalled();

    const cavePath = path.join(tmpDir, 'openspec', 'changes', 'test-change', 'proposal.cave');
    expect(await fs.pathExists(cavePath)).toBe(true);

    const content = await fs.readFile(cavePath, 'utf8');
    expect(content).toContain('_v:');
    expect(content).toContain('_phase:');
  });
});

describe('CLI registration', () => {
  it('registers all new commands (trace, review, compress, memory query)', () => {
    let program: any;
    try {
      program = require('@/cli').program;
    } catch (err) {
      // If cli.ts fails to load (e.g. boxen ESM), skip gracefully
      console.error('Failed to load cli module:', err);
      throw err;
    }
    const commandNames = program.commands.map((c: any) => c.name());
    expect(commandNames).toContain('trace');
    expect(commandNames).toContain('review');
    expect(commandNames).toContain('compress');
    expect(commandNames).toContain('memory');

    // Check memory subcommand has query
    const memCmd = program.commands.find((c: any) => c.name() === 'memory');
    const memSubNames = memCmd.commands.map((c: any) => c.name());
    expect(memSubNames).toContain('query');
  });
});
