import type { ArchivedChange, ChangelogEntry } from '../../src/commands/changelog';
import {
  categorizeChange,
  formatChangelog,
  parseProposal,
  runChangelog,
  scanArchive,
  suggestBump,
} from '../../src/commands/changelog';

jest.mock('fs-extra');

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fs = require('fs-extra') as any;

let mockTui: any;
beforeEach(async () => {
  jest.clearAllMocks();
  const { createTuiContext } = require('@/tui/context');
  mockTui = await createTuiContext();
});

// --- parseProposal ---

describe('parseProposal', () => {
  it('extracts Intent and Scope from a well-formed proposal', () => {
    const content = `# Proposal
## Intent
Add a new changelog command to automate release notes.

### In Scope
- CLI command implementation
- Test coverage
`;
    const result = parseProposal(content, '2026-04-12-changelog');
    expect(result).not.toBeNull();
    expect(result!.dirName).toBe('2026-04-12-changelog');
    expect(result!.intent).toContain('changelog command');
    expect(result!.scope).toContain('CLI command implementation');
  });

  it('returns null when proposal is missing ## Intent heading', () => {
    const content = `# Proposal
### In Scope
- Something
`;
    const result = parseProposal(content, 'no-intent');
    expect(result).toBeNull();
  });

  it('returns empty scope when ### In Scope is missing', () => {
    const content = `# Proposal
## Intent
Fix a bug.
`;
    const result = parseProposal(content, 'no-scope');
    expect(result).not.toBeNull();
    expect(result!.scope).toBe('');
  });
});

// --- categorizeChange ---

describe('categorizeChange', () => {
  it('maps "add"/"new" keywords to Added category', () => {
    const change: ArchivedChange = {
      dirName: 'test',
      intent: 'Add new feature for users',
      scope: '',
    };
    const entries = categorizeChange(change);
    expect(entries.some((e) => e.category === 'Added')).toBe(true);
  });

  it('maps "remove"/"delete" keywords to Removed category', () => {
    const change: ArchivedChange = {
      dirName: 'test',
      intent: 'Remove legacy API endpoint',
      scope: '',
    };
    const entries = categorizeChange(change);
    expect(entries.some((e) => e.category === 'Removed')).toBe(true);
  });

  it('maps "fix"/"bug" keywords to Fixed category', () => {
    const change: ArchivedChange = {
      dirName: 'test',
      intent: 'Fix login bug when session expires',
      scope: '',
    };
    const entries = categorizeChange(change);
    expect(entries.some((e) => e.category === 'Fixed')).toBe(true);
  });

  it('defaults to Changed when no keywords match', () => {
    const change: ArchivedChange = {
      dirName: 'test',
      intent: 'Refactor the pipeline module',
      scope: '',
    };
    const entries = categorizeChange(change);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe('Changed');
  });

  it('detects keywords in scope text too', () => {
    const change: ArchivedChange = {
      dirName: 'test',
      intent: 'Update configuration',
      scope: 'Create new settings module',
    };
    const entries = categorizeChange(change);
    expect(entries.some((e) => e.category === 'Added')).toBe(true);
  });
});

// --- suggestBump ---

describe('suggestBump', () => {
  it('returns major when Removed entries are present', () => {
    const entries: ChangelogEntry[] = [
      { category: 'Removed', description: 'Dropped old API' },
      { category: 'Added', description: 'New API' },
    ];
    expect(suggestBump(entries).level).toBe('major');
  });

  it('returns minor when Added entries are present (no Removed)', () => {
    const entries: ChangelogEntry[] = [
      { category: 'Added', description: 'New feature' },
      { category: 'Fixed', description: 'Bug fix' },
    ];
    expect(suggestBump(entries).level).toBe('minor');
  });

  it('returns patch when only Changed/Fixed entries are present', () => {
    const entries: ChangelogEntry[] = [
      { category: 'Changed', description: 'Refactored module' },
      { category: 'Fixed', description: 'Patched issue' },
    ];
    expect(suggestBump(entries).level).toBe('patch');
  });
});

// --- formatChangelog ---

describe('formatChangelog', () => {
  it('produces valid KAC block with header and categorized subsections', () => {
    const entries: ChangelogEntry[] = [
      { category: 'Added', description: 'New changelog command' },
      { category: 'Fixed', description: 'Logger color support' },
      { category: 'Removed', description: 'Old deprecated API' },
    ];
    const output = formatChangelog('1.5.0', '2026-04-12', entries);
    expect(output).toContain('## [1.5.0] - 2026-04-12');
    expect(output).toContain('### Added');
    expect(output).toContain('### Fixed');
    expect(output).toContain('### Removed');
    expect(output).toContain('- New changelog command');
    expect(output).toContain('- Logger color support');
    expect(output).toContain('- Old deprecated API');
  });

  it('omits empty categories', () => {
    const entries: ChangelogEntry[] = [
      { category: 'Changed', description: 'Updated docs' },
    ];
    const output = formatChangelog('0.1.0', '2026-04-12', entries);
    expect(output).toContain('### Changed');
    expect(output).not.toContain('### Added');
    expect(output).not.toContain('### Removed');
    expect(output).not.toContain('### Fixed');
  });
});

// --- scanArchive ---

describe('scanArchive', () => {
  it('reads directories and parses proposals', async () => {
    fs.pathExists.mockImplementation(async (p: string) => {
      if (p.endsWith('archive')) return true;
      if (p.endsWith('proposal.md')) return true;
      return false;
    });
    fs.readdir.mockResolvedValue(['2026-01-01-feature'] as any);
    fs.readFile.mockResolvedValue(`## Intent\nAdd a feature.\n\n### In Scope\n- Thing\n`);

    const changes = await scanArchive('/project/openspec/changes/archive');
    expect(changes).toHaveLength(1);
    expect(changes[0]!.dirName).toBe('2026-01-01-feature');
    expect(changes[0]!.intent).toContain('Add a feature');
  });

  it('skips directories without proposal.md with warning', async () => {
    fs.pathExists.mockImplementation(async (p: string) => {
      if (p.endsWith('archive')) return true;
      if (p.endsWith('proposal.md')) return false;
      return false;
    });
    fs.readdir.mockResolvedValue(['no-proposal-dir'] as any);

    const changes = await scanArchive('/project/openspec/changes/archive', mockTui);
    expect(changes).toHaveLength(0);
    expect(mockTui.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('no-proposal-dir')
    );
  });

  it('returns empty array when archive dir does not exist', async () => {
    fs.pathExists.mockResolvedValue(false);
    const changes = await scanArchive('/nonexistent/archive');
    expect(changes).toHaveLength(0);
  });
});

// --- runChangelog ---

describe('runChangelog', () => {
  const mockArchiveDir = '/project/openspec/changes/archive';

  beforeEach(() => {
    fs.pathExists.mockImplementation(async (p: string) => {
      if (p.endsWith('archive')) return true;
      if (p.endsWith('proposal.md')) return true;
      if (p.endsWith('CHANGELOG.md')) return false;
      return false;
    });
    fs.readdir.mockResolvedValue(['2026-01-01-feature'] as any);
    fs.readFile.mockResolvedValue(`## Intent\nAdd a new feature.\n\n### In Scope\n- Implementation\n`);
    fs.writeFile.mockResolvedValue(undefined);
  });

  it('with --dry-run prints to tui and does not write any file', async () => {
    await runChangelog({ dryRun: true, dir: '/project' });

    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(mockTui.log.info).toHaveBeenCalled();
  });

  it('without --dry-run writes to CHANGELOG.md', async () => {
    await runChangelog({ dryRun: false, dir: '/project', version: '1.0.0' });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('CHANGELOG.md'),
      expect.stringContaining('## [1.0.0]'),
      'utf-8'
    );
  });

  it('with empty archive prints warning and exits cleanly', async () => {
    fs.pathExists.mockResolvedValue(false);

    await runChangelog({ dryRun: false, dir: '/project' });

    expect(mockTui.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('No archived changes found')
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
