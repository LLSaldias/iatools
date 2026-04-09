import { interpolate } from '../../src/utils/file-writer';
import { ROLES } from '../../src/roles/index';
import { getIdeAdapter, IDE_ADAPTERS } from '../../src/ides/index';
import * as path from 'path';

jest.mock('fs-extra');
jest.mock('@/memory/database');
jest.mock('@/memory/ingestion');
jest.mock('ora', () => {
  const spinnerMock = { start: jest.fn(), succeed: jest.fn(), fail: jest.fn() };
  spinnerMock.start.mockReturnValue(spinnerMock);
  return jest.fn(() => spinnerMock);
});

describe('interpolate', () => {
  it('should replace all known placeholders', () => {
    const template = 'Project: {{PROJECT_NAME}}, Role: {{ROLES}}, IDE: {{IDE}}';
    const result = interpolate(template, {
      PROJECT_NAME: 'my-project',
      ROLES: 'backend',
      IDE: 'Cursor',
    });
    expect(result).toBe('Project: my-project, Role: backend, IDE: Cursor');
  });

  it('should leave unknown placeholders intact', () => {
    const template = 'Hello {{UNKNOWN}}!';
    const result = interpolate(template, { PROJECT_NAME: 'test' });
    expect(result).toBe('Hello {{UNKNOWN}}!');
  });

  it('should replace multiple occurrences of the same placeholder', () => {
    const template = '{{X}} and {{X}}';
    const result = interpolate(template, { X: 'value' });
    expect(result).toBe('value and value');
  });
});

describe('Roles registry', () => {
  it('should define all 5 expected roles', () => {
    const expectedRoles = ['frontend', 'backend', 'qa', 'architect', 'product'];
    expect(Object.keys(ROLES)).toEqual(expect.arrayContaining(expectedRoles));
  });

  it('each role should have bundled SDD skills', () => {
    for (const role of Object.values(ROLES)) {
      expect(role.bundledSkills).toContain('sdd-new.md');
      expect(role.bundledSkills).toContain('sdd-apply.md');
      expect(role.bundledSkills).toContain('sdd-verify.md');
    }
  });

  it('each role should have a non-empty persona and focus areas', () => {
    for (const role of Object.values(ROLES)) {
      expect(role.persona.length).toBeGreaterThan(10);
      expect(role.focusAreas.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('IDE adapters', () => {
  const root = '/tmp/test-project';

  it('should define all 4 expected IDEs', () => {
    const expectedIdes = ['cursor', 'copilot', 'gemini', 'generic'];
    expect(Object.keys(IDE_ADAPTERS)).toEqual(
      expect.arrayContaining(expectedIdes)
    );
  });

  it('cursor should place agents in .cursor/rules', () => {
    const adapter = getIdeAdapter('cursor');
    expect(adapter.agentDir(root)).toBe(path.join(root, '.cursor', 'rules'));
  });

  it('gemini should place agents in .agent/rules', () => {
    const adapter = getIdeAdapter('gemini');
    expect(adapter.agentDir(root)).toBe(path.join(root, '.agent', 'rules'));
  });

  it('all adapters (except gemini) should place skills in .agents/skills', () => {
    for (const adapter of Object.values(IDE_ADAPTERS)) {
      if (adapter.id === 'gemini') continue;
      expect(adapter.skillsDir(root)).toBe(
        path.join(root, '.agents', 'skills')
      );
    }
  });

  it('gemini adapter should place skills in .agent/skills', () => {
    const adapter = getIdeAdapter('gemini');
    expect(adapter.skillsDir(root)).toBe(path.join(root, '.agent', 'skills'));
  });

  it('all adapters (except gemini) should place workflows in .agents/workflows', () => {
    for (const adapter of Object.values(IDE_ADAPTERS)) {
      if (adapter.id === 'gemini') continue;
      expect(adapter.workflowsDir(root)).toBe(
        path.join(root, '.agents', 'workflows')
      );
    }
  });

  it('gemini adapter should place workflows in .agent/workflows', () => {
    const adapter = getIdeAdapter('gemini');
    expect(adapter.workflowsDir(root)).toBe(
      path.join(root, '.agent', 'workflows')
    );
  });
});

describe('memory ingest', () => {
  const fsMock = jest.requireMock('fs-extra') as {
    pathExists: jest.Mock;
    readFile: jest.Mock;
    outputFile: jest.Mock;
    readdir: jest.Mock;
  };
  const ingestionMock = jest.requireMock('@/memory/ingestion') as {
    buildExtractionPrompt: jest.Mock;
    processExtractionResult: jest.Mock;
  };
  const dbMock = jest.requireMock('@/memory/database') as {
    MemoryDB: jest.Mock;
  };

  const PROJECT_ROOT = '/fake/root';

  let exitSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    dbMock.MemoryDB.mockImplementation(() => ({
      getAllNodes: jest.fn().mockReturnValue([]),
      close: jest.fn(),
    }));
    ingestionMock.buildExtractionPrompt.mockReturnValue(
      'EXTRACTION PROMPT CONTENT'
    );
    ingestionMock.processExtractionResult.mockReturnValue({
      nodesCreated: 2,
      edgesCreated: 1,
    });
    fsMock.pathExists.mockResolvedValue(true);
    fsMock.readFile.mockResolvedValue('# Proposal content');
    fsMock.outputFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('T-07a: prompt generation reads proposal, calls buildExtractionPrompt, writes prompt file', async () => {
    const { runMemoryIngest } =
      await import('../../src/commands/memory-ingest');
    await runMemoryIngest({
      change: 'my-change',
      dir: PROJECT_ROOT,
      dryRun: false,
      all: false,
    });

    expect(ingestionMock.buildExtractionPrompt).toHaveBeenCalledWith(
      '# Proposal content',
      []
    );
    expect(fsMock.outputFile).toHaveBeenCalledWith(
      path.join(PROJECT_ROOT, '.sdd', 'extraction-my-change.prompt.txt'),
      'EXTRACTION PROMPT CONTENT',
      'utf8'
    );
  });

  it('T-07b: JSON ingestion calls processExtractionResult with correct args', async () => {
    const validJson = JSON.stringify({
      nodes: [
        { label: 'Decision', title: 'Some decision', content: 'Because X' },
      ],
      edges: [],
    });
    fsMock.readFile.mockResolvedValueOnce(validJson);

    const { runMemoryIngest } =
      await import('../../src/commands/memory-ingest');
    await runMemoryIngest({
      change: 'my-change',
      dir: PROJECT_ROOT,
      from: path.join(PROJECT_ROOT, 'extraction.json'),
      dryRun: false,
      all: false,
    });

    expect(ingestionMock.processExtractionResult).toHaveBeenCalledWith(
      expect.anything(),
      {
        nodes: [
          { label: 'Decision', title: 'Some decision', content: 'Because X' },
        ],
        edges: [],
      },
      'my-change'
    );
  });

  it('T-07c: dry-run does NOT call processExtractionResult', async () => {
    const validJson = JSON.stringify({ nodes: [], edges: [] });
    fsMock.readFile.mockResolvedValueOnce(validJson);

    const { runMemoryIngest } =
      await import('../../src/commands/memory-ingest');
    await runMemoryIngest({
      change: 'my-change',
      dir: PROJECT_ROOT,
      from: path.join(PROJECT_ROOT, 'extraction.json'),
      dryRun: true,
      all: false,
    });

    expect(ingestionMock.processExtractionResult).not.toHaveBeenCalled();
  });

  it('T-07d: exits with error when proposal is missing', async () => {
    fsMock.pathExists.mockImplementation((p: string) =>
      Promise.resolve(!p.includes('proposal.md'))
    );

    const { runMemoryIngest } =
      await import('../../src/commands/memory-ingest');
    await expect(
      runMemoryIngest({ change: 'unknown', dir: PROJECT_ROOT, dryRun: false, all: false })
    ).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('T-07e: exits with error when memory.db is missing', async () => {
    fsMock.pathExists.mockImplementation((p: string) =>
      Promise.resolve(!p.includes('memory.db'))
    );

    const { runMemoryIngest } =
      await import('../../src/commands/memory-ingest');
    await expect(
      runMemoryIngest({ change: 'my-change', dir: PROJECT_ROOT, dryRun: false, all: false })
    ).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('T-07f: exits with error when JSON file is malformed', async () => {
    fsMock.readFile.mockResolvedValueOnce('not json at all');

    const { runMemoryIngest } =
      await import('../../src/commands/memory-ingest');
    await expect(
      runMemoryIngest({
        change: 'my-change',
        dir: PROJECT_ROOT,
        from: path.join(PROJECT_ROOT, 'bad.json'),
        dryRun: false,
        all: false,
      })
    ).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  describe('--all flag', () => {
    const makeDir = (name: string, isDirectory = true) => ({
      name,
      isDirectory: () => isDirectory,
    });

    beforeEach(() => {
      fsMock.readdir = jest.fn();
    });

    it('T-08a: processes all changes that have a proposal.md', async () => {
      (fsMock.readdir as jest.Mock).mockResolvedValue([
        makeDir('change-a'),
        makeDir('change-b'),
      ]);
      fsMock.pathExists.mockResolvedValue(true);

      const { runMemoryIngest } = await import('../../src/commands/memory-ingest');
      await runMemoryIngest({ change: '', dir: PROJECT_ROOT, dryRun: false, all: true });

      expect(ingestionMock.buildExtractionPrompt).toHaveBeenCalledTimes(2);
    });

    it('T-08b: skips change with no proposal.md, processes the other', async () => {
      (fsMock.readdir as jest.Mock).mockResolvedValue([
        makeDir('no-proposal'),
        makeDir('has-proposal'),
      ]);
      fsMock.pathExists.mockImplementation((p: string) =>
        Promise.resolve(!p.includes('no-proposal'))
      );

      const { runMemoryIngest } = await import('../../src/commands/memory-ingest');
      await runMemoryIngest({ change: '', dir: PROJECT_ROOT, dryRun: false, all: true });

      expect(ingestionMock.buildExtractionPrompt).toHaveBeenCalledTimes(1);
    });

    it('T-08c: excludes archive/ directory', async () => {
      (fsMock.readdir as jest.Mock).mockResolvedValue([
        makeDir('archive'),
        makeDir('active-change'),
      ]);
      fsMock.pathExists.mockResolvedValue(true);

      const { runMemoryIngest } = await import('../../src/commands/memory-ingest');
      await runMemoryIngest({ change: '', dir: PROJECT_ROOT, dryRun: false, all: true });

      expect(ingestionMock.buildExtractionPrompt).toHaveBeenCalledTimes(1);
    });

    it('T-08d: exits when --all and --change are both provided', async () => {
      const { runMemoryIngest } = await import('../../src/commands/memory-ingest');
      await expect(
        runMemoryIngest({ change: 'some-change', dir: PROJECT_ROOT, dryRun: false, all: true })
      ).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('T-08e: exits when memory.db is missing before scanning', async () => {
      fsMock.pathExists.mockResolvedValue(false);

      const { runMemoryIngest } = await import('../../src/commands/memory-ingest');
      await expect(
        runMemoryIngest({ change: '', dir: PROJECT_ROOT, dryRun: false, all: true })
      ).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('T-08f: batch continues when one change throws', async () => {
      (fsMock.readdir as jest.Mock).mockResolvedValue([
        makeDir('failing-change'),
        makeDir('good-change'),
      ]);
      fsMock.pathExists.mockResolvedValue(true);
      ingestionMock.buildExtractionPrompt
        .mockImplementationOnce(() => { throw new Error('disk error'); })
        .mockReturnValueOnce('PROMPT');

      const { runMemoryIngest } = await import('../../src/commands/memory-ingest');
      await runMemoryIngest({ change: '', dir: PROJECT_ROOT, dryRun: false, all: true });

      expect(ingestionMock.buildExtractionPrompt).toHaveBeenCalledTimes(2);
    });
  });
});
