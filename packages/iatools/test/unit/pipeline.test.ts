import { processArtifact } from '@/pipeline/artifact-flow';
import { compress, parseCave, serializeCave } from '@/pipeline/caveman/compressor';
import { decompress } from '@/pipeline/caveman/decompressor';
import { extractPreserved, restorePreserved } from '@/pipeline/caveman/preservers';
import type { CaveDesign, CaveProposal, CaveSpec, CaveTasks } from '@/pipeline/caveman/profiles';
import { validateCave } from '@/pipeline/caveman/profiles';
import { traceChange, traceItem } from '@/pipeline/traceability/chain';
import { validateLineage } from '@/pipeline/traceability/lineage';
import { countTokens, stampMetadata } from '@/pipeline/traceability/metadata';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const SAMPLE_PROPOSAL_MD = `# Proposal: rate-limiting

## Intent

Add rate limiting to all public API endpoints to prevent abuse and ensure fair usage.

## Scope

### In Scope
- API gateway middleware
- Redis-backed token bucket
- Per-tenant configuration

### Out of Scope
- Authentication service changes
- Frontend modifications

## Constraints
- Must not exceed 2ms latency overhead per request
- Redis cluster already provisioned
- Must be backward compatible with existing API clients

## Success Criteria
- 429 responses returned when rate limits exceeded
- Per-tenant configurable thresholds via admin API
- X-RateLimit headers on all responses

## Risks

| ID | Description | Decision |
|----|-------------|----------|
| R1 | Redis failover behavior — fail-open or fail-closed? | Pending |
| R2 | Rate limit state sync across multiple gateway instances | Pending |
`;

// ─── Profiles ────────────────────────────────────────────────

describe('Profiles — validateCave', () => {
  const validProposal: CaveProposal = {
    _v: 1,
    _phase: 'proposal',
    _change: 'rate-limiting',
    _parent: null,
    _ts: new Date().toISOString(),
    intent: 'Add rate limiting',
    scope: { in: ['gateway'], out: ['auth'] },
    constraints: ['< 2ms'],
    success: ['429 returned'],
    risks: [{ id: 'R1', desc: 'Failover', decision: 'Pending' }],
  };

  const validSpec: CaveSpec = {
    _v: 1,
    _phase: 'specs',
    _change: 'rate-limiting',
    _parent: 'proposal.cave',
    _ts: new Date().toISOString(),
    requirements: [{ id: 'REQ-1', desc: 'Rate limit', acceptance: ['429 returned'] }],
    scenarios: [{ id: 'SC-1', given: 'a client', when: 'exceeds limit', then: '429' }],
  };

  const validDesign: CaveDesign = {
    _v: 1,
    _phase: 'design',
    _change: 'rate-limiting',
    _parent: 'specs.cave',
    _ts: new Date().toISOString(),
    approach: 'Token bucket',
    components: [{ name: 'RateLimiter', type: 'middleware', deps: ['redis'], interface: 'check(req)' }],
    decisions: [{ id: 'D1', question: 'Algorithm?', choice: 'Token bucket', reason: 'Proven' }],
  };

  const validTasks: CaveTasks = {
    _v: 1,
    _phase: 'tasks',
    _change: 'rate-limiting',
    _parent: 'design.cave',
    _ts: new Date().toISOString(),
    tasks: [{ id: 'T1', title: 'Implement middleware', refs: ['REQ-1', 'D1'] }],
  };

  it('accepts a valid proposal', () => {
    const result = validateCave(validProposal);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a valid spec', () => {
    expect(validateCave(validSpec).valid).toBe(true);
  });

  it('accepts a valid design', () => {
    expect(validateCave(validDesign).valid).toBe(true);
  });

  it('accepts a valid tasks', () => {
    expect(validateCave(validTasks).valid).toBe(true);
  });

  it('rejects missing _phase', () => {
    const { _phase, ...bad } = validProposal;
    const result = validateCave(bad);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required header field: _phase');
  });

  it('rejects missing _v', () => {
    const { _v, ...bad } = validProposal;
    const result = validateCave(bad);
    expect(result.valid).toBe(false);
  });

  it('rejects unknown phase', () => {
    const result = validateCave({ ...validProposal, _phase: 'oops' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Unknown _phase/);
  });

  it('rejects missing phase-specific fields', () => {
    const { intent, ...bad } = validProposal;
    const result = validateCave(bad);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required field for phase 'proposal': intent");
  });

  it('rejects null input', () => {
    expect(validateCave(null).valid).toBe(false);
  });
});

// ─── Preservers ──────────────────────────────────────────────

describe('Preservers', () => {
  it('extracts and restores code blocks', () => {
    const text = 'Before\n```js\nconsole.log("hi")\n```\nAfter';
    const { cleaned, blocks } = extractPreserved(text);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(cleaned).not.toContain('console.log');
    const restored = restorePreserved(cleaned, blocks);
    expect(restored).toContain('console.log("hi")');
  });

  it('extracts URLs', () => {
    const text = 'Visit https://example.com/path?q=1 for details';
    const { cleaned, blocks } = extractPreserved(text);
    expect(blocks.some(b => b.original.includes('https://example.com'))).toBe(true);
    expect(restorePreserved(cleaned, blocks)).toContain('https://example.com');
  });

  it('extracts file paths', () => {
    const text = 'Edit ./src/index.ts and /usr/local/bin';
    const { cleaned, blocks } = extractPreserved(text);
    expect(blocks.some(b => b.original.includes('./src/index.ts'))).toBe(true);
    expect(restorePreserved(cleaned, blocks)).toContain('./src/index.ts');
  });

  it('extracts inline code', () => {
    const text = 'Use `myFunction()` to call it';
    const { cleaned, blocks } = extractPreserved(text);
    expect(blocks.some(b => b.original === '`myFunction()`')).toBe(true);
    expect(restorePreserved(cleaned, blocks)).toContain('`myFunction()`');
  });

  it('extracts shell commands', () => {
    const text = 'Run this:\n$ npm install\nDone';
    const { cleaned, blocks } = extractPreserved(text);
    expect(blocks.some(b => b.original.includes('$ npm install'))).toBe(true);
    expect(restorePreserved(cleaned, blocks)).toContain('$ npm install');
  });
});

// ─── Compressor ──────────────────────────────────────────────

describe('Compressor', () => {
  it('compresses a proposal markdown into structured CaveProposal', () => {
    const artifact = compress(SAMPLE_PROPOSAL_MD, 'proposal', 'rate-limiting');
    expect(artifact._phase).toBe('proposal');
    expect(artifact._change).toBe('rate-limiting');

    const p = artifact as CaveProposal;
    expect(p.intent).toContain('rate limiting');
    expect(p.scope.in).toContain('API gateway middleware');
    expect(p.scope.out).toContain('Frontend modifications');
    expect(p.constraints.length).toBe(3);
    expect(p.success.length).toBe(3);
    expect(p.risks.length).toBe(2);
    expect(p.risks[0]!.id).toBe('R1');
    expect(p.risks[1]!.id).toBe('R2');
  });

  it('round-trips compress → serialize → parse → decompress', () => {
    const artifact = compress(SAMPLE_PROPOSAL_MD, 'proposal', 'rate-limiting');
    const yaml = serializeCave(artifact);
    const parsed = parseCave(yaml);
    const md = decompress(parsed);

    // All key content present in decompressed output
    expect(md).toContain('rate-limiting');
    expect(md).toContain('Intent');
    expect(md).toContain('In Scope');
    expect(md).toContain('Out of Scope');
    expect(md).toContain('Constraints');
    expect(md).toContain('Success Criteria');
    expect(md).toContain('Risks');
    expect(md).toContain('R1');
    expect(md).toContain('R2');
  });

  it('token count of .cave is less than original markdown token count', () => {
    // The cave format stores structured data; for small documents the YAML keys may
    // add bytes, but the *token count* (which is what matters for LLM context) should
    // be lower because we strip markdown formatting, table chrome, whitespace, etc.
    const artifact = compress(SAMPLE_PROPOSAL_MD, 'proposal', 'rate-limiting');
    const yaml = serializeCave(artifact);
    const originalTokens = countTokens(SAMPLE_PROPOSAL_MD);
    const caveTokens = countTokens(yaml);
    // Cave tokens should be fewer than original markdown tokens
    expect(caveTokens).toBeLessThanOrEqual(originalTokens);
  });
});

// ─── Decompressor ─────────────────────────────────────────────

describe('Decompressor', () => {
  it('CaveProposal → markdown has all sections', () => {
    const proposal: CaveProposal = {
      _v: 1,
      _phase: 'proposal',
      _change: 'test-change',
      _parent: null,
      _ts: new Date().toISOString(),
      intent: 'Test the pipeline',
      scope: { in: ['module A'], out: ['module B'] },
      constraints: ['fast'],
      success: ['works'],
      risks: [{ id: 'R1', desc: 'failure', decision: 'mitigate' }],
    };

    const md = decompress(proposal);
    expect(md).toContain('# Proposal: test-change');
    expect(md).toContain('## Intent');
    expect(md).toContain('Test the pipeline');
    expect(md).toContain('### In Scope');
    expect(md).toContain('- module A');
    expect(md).toContain('### Out of Scope');
    expect(md).toContain('- module B');
    expect(md).toContain('## Constraints');
    expect(md).toContain('- fast');
    expect(md).toContain('## Success Criteria');
    expect(md).toContain('- works');
    expect(md).toContain('## Risks');
    expect(md).toContain('| R1 | failure | mitigate |');
  });
});

// ─── Metadata ─────────────────────────────────────────────────

describe('Metadata', () => {
  it('stampMetadata returns valid timestamps', () => {
    const meta = stampMetadata('proposal');
    expect(meta.created_by).toBe('iatools');
    expect(new Date(meta.created_at).getTime()).not.toBeNaN();
  });

  it('countTokens approximates correctly', () => {
    const text = 'one two three four five six seven eight nine ten';
    const count = countTokens(text);
    // 10 words * 1.33 ≈ 14
    expect(count).toBeGreaterThanOrEqual(13);
    expect(count).toBeLessThanOrEqual(14);
  });
});

// ─── Lineage ────────────────────────────────────────────────

describe('Lineage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cave-lineage-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validateLineage detects missing parent references', () => {
    // Create a specs.cave that references proposal.cave which doesn't exist
    const artifact = compress('## Requirements\n- Rate limit\n## Scenarios\n', 'specs', 'test', 'proposal.cave');
    const yaml = serializeCave(artifact);
    fs.writeFileSync(path.join(tmpDir, 'specs.cave'), yaml);

    const result = validateLineage(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('proposal.cave'))).toBe(true);
  });

  it('validateLineage passes when parent exists', () => {
    // Create proposal.cave (no parent)
    const proposal = compress(SAMPLE_PROPOSAL_MD, 'proposal', 'test');
    fs.writeFileSync(path.join(tmpDir, 'proposal.cave'), serializeCave(proposal));

    // Create specs.cave referencing proposal.cave
    const specs = compress('## Requirements\n- Rate limit\n## Scenarios\n', 'specs', 'test', 'proposal.cave');
    fs.writeFileSync(path.join(tmpDir, 'specs.cave'), serializeCave(specs));

    const result = validateLineage(tmpDir);
    expect(result.valid).toBe(true);
  });
});

// ─── Chain ──────────────────────────────────────────────────

describe('Chain', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cave-chain-'));

    // Create specs.cave with requirements
    const specsArtifact: CaveSpec = {
      _v: 1,
      _phase: 'specs',
      _change: 'test',
      _parent: null,
      _ts: new Date().toISOString(),
      requirements: [{ id: 'REQ-1', desc: 'Rate limit', acceptance: ['429 returned'] }],
      scenarios: [],
    };
    fs.writeFileSync(path.join(tmpDir, 'specs.cave'), serializeCave(specsArtifact));

    // Create design.cave with decisions referencing REQ-1
    const designArtifact: CaveDesign = {
      _v: 1,
      _phase: 'design',
      _change: 'test',
      _parent: 'specs.cave',
      _ts: new Date().toISOString(),
      approach: 'Token bucket',
      components: [],
      decisions: [{ id: 'D1', question: 'Algorithm?', choice: 'Token bucket', reason: 'Proven', refs: ['REQ-1'] }],
    };
    fs.writeFileSync(path.join(tmpDir, 'design.cave'), serializeCave(designArtifact));

    // Create tasks.cave with T1 referencing D1 and REQ-1
    const tasksArtifact: CaveTasks = {
      _v: 1,
      _phase: 'tasks',
      _change: 'test',
      _parent: 'design.cave',
      _ts: new Date().toISOString(),
      tasks: [{ id: 'T1', title: 'Implement middleware', refs: ['REQ-1', 'D1'] }],
    };
    fs.writeFileSync(path.join(tmpDir, 'tasks.cave'), serializeCave(tasksArtifact));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('traceItem follows refs across artifacts', () => {
    const result = traceItem(tmpDir, 'tasks.cave', 'T1');
    expect(result).not.toBeNull();
    expect(result!.root.itemId).toBe('T1');
    expect(result!.chain.length).toBeGreaterThan(0);
    // Should have followed REQ-1 and D1 refs
    const allIds = result!.chain.flat().map(l => l.itemId);
    expect(allIds).toContain('REQ-1');
  });

  it('traceChange returns results for all items with refs', () => {
    const results = traceChange(tmpDir);
    expect(results.length).toBeGreaterThan(0);
    // T1 and D1 both have refs
    const rootIds = results.map(r => r.root.itemId);
    expect(rootIds).toContain('T1');
    expect(rootIds).toContain('D1');
  });
});

// ─── Artifact Flow (integration) ─────────────────────────────

describe('Artifact Flow', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cave-flow-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('processArtifact creates .cave and .md files', async () => {
    const result = await processArtifact({
      changeDir: tmpDir,
      changeName: 'rate-limiting',
      phase: 'proposal',
      markdownContent: SAMPLE_PROPOSAL_MD,
    });

    expect(fs.existsSync(result.caveFile)).toBe(true);
    expect(fs.existsSync(result.mdFile)).toBe(true);
    expect(result.artifact._phase).toBe('proposal');
    expect(typeof result.tokenSavings).toBe('number');
  });
});
