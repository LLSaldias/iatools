import { AuditEntry, hashMatch, logDecisions } from '@/safety/audit';
import { BUILTIN_PATTERNS, PatternRule } from '@/safety/patterns';
import { apply } from '@/safety/redactor';
import { loadConfig, SanitizeConfig, scan } from '@/safety/scanner';
import * as crypto from 'crypto';
import * as path from 'path';

jest.mock('fs-extra');

const fsExtra = require('fs-extra') as {
  existsSync: jest.Mock;
  readFileSync: jest.Mock;
  ensureDirSync: jest.Mock;
  appendFileSync: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Pattern Detection ───────────────────────────────────────────────

describe('BUILTIN_PATTERNS', () => {
  it('should define exactly 9 patterns', () => {
    expect(BUILTIN_PATTERNS).toHaveLength(9);
  });

  it('should have unique ids', () => {
    const ids = BUILTIN_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Pattern detection — true positives', () => {
  it('detects AWS Access Key ID', () => {
    const text = 'key: AKIAIOSFODNN7EXAMPLE';
    const candidates = scan(text);
    expect(candidates.some((c) => c.patternId === 'aws_key')).toBe(true);
    expect(candidates.find((c) => c.patternId === 'aws_key')?.match).toBe(
      'AKIAIOSFODNN7EXAMPLE'
    );
  });

  it('detects JWT token', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const text = `Bearer ${jwt}`;
    const candidates = scan(text);
    expect(candidates.some((c) => c.patternId === 'jwt')).toBe(true);
    expect(candidates.find((c) => c.patternId === 'jwt')?.severity).toBe('critical');
  });

  it('detects database connection string', () => {
    const text = 'DATABASE_URL=postgres://admin:s3cret@db.internal:5432/myapp';
    const candidates = scan(text);
    expect(candidates.some((c) => c.patternId === 'connection_str')).toBe(true);
    expect(candidates.find((c) => c.patternId === 'connection_str')?.match).toContain(
      'postgres://'
    );
  });

  it('detects private key header', () => {
    const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...';
    const candidates = scan(text);
    expect(candidates.some((c) => c.patternId === 'private_key')).toBe(true);
    expect(candidates.find((c) => c.patternId === 'private_key')?.severity).toBe(
      'critical'
    );
  });

  it('detects generic secret / API key', () => {
    const text = 'api_key = "sk-1234567890abcdef1234"';
    const candidates = scan(text);
    expect(candidates.some((c) => c.patternId === 'generic_key')).toBe(true);
  });

  it('detects email address as warning', () => {
    const text = 'contact user@example.com for help';
    const candidates = scan(text);
    const email = candidates.find((c) => c.patternId === 'email');
    expect(email).toBeDefined();
    expect(email?.severity).toBe('warning');
    expect(email?.match).toBe('user@example.com');
  });

  it('detects IPv4 address as warning', () => {
    const text = 'server at 192.168.1.100 is down';
    const candidates = scan(text);
    const ip = candidates.find((c) => c.patternId === 'ipv4');
    expect(ip).toBeDefined();
    expect(ip?.severity).toBe('warning');
    expect(ip?.match).toBe('192.168.1.100');
  });

  it('detects AWS ARN', () => {
    const text = 'resource arn:aws:s3:::my-bucket/path is accessible';
    const candidates = scan(text);
    expect(candidates.some((c) => c.patternId === 'arn')).toBe(true);
  });
});

describe('Pattern detection — true negatives', () => {
  it('returns no candidates for normal text', () => {
    const text =
      'This is a perfectly normal paragraph about software development. ' +
      'No secrets, no keys, no tokens here.';
    const candidates = scan(text);
    expect(candidates).toHaveLength(0);
  });

  it('does not flag EC private key header as DSA', () => {
    const text = '-----BEGIN EC PRIVATE KEY-----';
    const candidates = scan(text);
    const match = candidates.find((c) => c.patternId === 'private_key');
    expect(match).toBeDefined();
    expect(match?.match).toBe('-----BEGIN EC PRIVATE KEY-----');
  });
});

// ─── Scanner sorting and context ─────────────────────────────────────

describe('Scanner sorting', () => {
  it('sorts critical before warning', () => {
    const text = 'user@example.com AKIAIOSFODNN7EXAMPLE';
    const candidates = scan(text);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const criticalIdx = candidates.findIndex((c) => c.severity === 'critical');
    const warningIdx = candidates.findIndex((c) => c.severity === 'warning');
    if (criticalIdx >= 0 && warningIdx >= 0) {
      expect(criticalIdx).toBeLessThan(warningIdx);
    }
  });

  it('extracts context around matches', () => {
    const prefix = 'A'.repeat(50);
    const suffix = 'B'.repeat(50);
    const text = `${prefix}AKIAIOSFODNN7EXAMPLE${suffix}`;
    const candidates = scan(text);
    const aws = candidates.find((c) => c.patternId === 'aws_key');
    expect(aws).toBeDefined();
    // Context should include up to 40 chars before and after
    expect(aws!.context.length).toBeLessThanOrEqual(40 + 20 + 40);
    expect(aws!.context).toContain('AKIAIOSFODNN7EXAMPLE');
  });
});

// ─── Scanner with config ─────────────────────────────────────────────

describe('Scanner with custom config', () => {
  it('detects custom pattern', () => {
    const customPattern: PatternRule = {
      id: 'custom_token',
      regex: /CUSTOM_TOKEN_[A-Z0-9]{8}/g,
      label: 'Custom Token',
      severity: 'warning',
      replacement: '[CUSTOM_REDACTED]',
    };
    const config: SanitizeConfig = { patterns: [customPattern] };
    const text = 'auth: CUSTOM_TOKEN_ABCD1234';
    const candidates = scan(text, config);
    expect(candidates.some((c) => c.patternId === 'custom_token')).toBe(true);
  });

  it('ignores excluded pattern', () => {
    const config: SanitizeConfig = { ignore: ['email'] };
    const text = 'contact user@example.com';
    const candidates = scan(text, config);
    expect(candidates.some((c) => c.patternId === 'email')).toBe(false);
  });

  it('ignores multiple excluded patterns', () => {
    const config: SanitizeConfig = { ignore: ['email', 'ipv4'] };
    const text = 'server 192.168.1.1 contact admin@test.org';
    const candidates = scan(text, config);
    expect(candidates.some((c) => c.patternId === 'email')).toBe(false);
    expect(candidates.some((c) => c.patternId === 'ipv4')).toBe(false);
  });
});

describe('loadConfig', () => {
  it('returns empty config when file does not exist', () => {
    fsExtra.existsSync.mockReturnValue(false);
    const config = loadConfig('/project');
    expect(config).toEqual({});
    expect(fsExtra.existsSync).toHaveBeenCalledWith(
      path.join('/project', '.sdd', 'sanitize.yaml')
    );
  });

  it('parses JSON config from file', () => {
    fsExtra.existsSync.mockReturnValue(true);
    fsExtra.readFileSync.mockReturnValue(
      JSON.stringify({ ignore: ['email', 'ipv4'] })
    );
    const config = loadConfig('/project');
    expect(config.ignore).toEqual(['email', 'ipv4']);
  });

  it('parses simple YAML ignore list', () => {
    fsExtra.existsSync.mockReturnValue(true);
    fsExtra.readFileSync.mockReturnValue('ignore:\n  - email\n  - ipv4\n');
    const config = loadConfig('/project');
    expect(config.ignore).toEqual(['email', 'ipv4']);
  });
});

// ─── Redactor ────────────────────────────────────────────────────────

describe('Redactor', () => {
  it('replaces a single candidate', () => {
    const text = 'key: AKIAIOSFODNN7EXAMPLE rest';
    const candidates = scan(text);
    const aws = candidates.filter((c) => c.patternId === 'aws_key');
    const result = apply(text, aws);
    expect(result).toContain('[AWS_KEY_REDACTED]');
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  it('replaces multiple candidates without shifting positions', () => {
    const text = 'first AKIAIOSFODNN7EXAMPLE then user@example.com end';
    const candidates = scan(text);
    const result = apply(text, candidates);
    expect(result).toContain('[AWS_KEY_REDACTED]');
    expect(result).toContain('[EMAIL_REDACTED]');
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result).not.toContain('user@example.com');
  });

  it('preserves text outside matched spans', () => {
    const text = 'prefix AKIAIOSFODNN7EXAMPLE suffix';
    const candidates = scan(text).filter((c) => c.patternId === 'aws_key');
    const result = apply(text, candidates);
    expect(result).toMatch(/^prefix .+ suffix$/);
  });

  it('handles empty candidates array', () => {
    const text = 'nothing to redact here';
    const result = apply(text, []);
    expect(result).toBe(text);
  });

  it('processes end-to-start to preserve positions', () => {
    const text = 'A AKIAIOSFODNN7EXAMPLE B AKIAIOSFODNN7EXAMPLE C';
    const candidates = scan(text).filter((c) => c.patternId === 'aws_key');
    expect(candidates).toHaveLength(2);
    const result = apply(text, candidates);
    expect(result).toBe('A [AWS_KEY_REDACTED] B [AWS_KEY_REDACTED] C');
  });
});

// ─── Audit ───────────────────────────────────────────────────────────

describe('Audit — hashMatch', () => {
  it('returns SHA-256 hex of the input', () => {
    const input = 'AKIAIOSFODNN7EXAMPLE';
    const expected = crypto.createHash('sha256').update(input).digest('hex');
    expect(hashMatch(input)).toBe(expected);
  });

  it('returns a 64-character hex string', () => {
    const hash = hashMatch('test');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashMatch('secret1')).not.toBe(hashMatch('secret2'));
  });
});

describe('Audit — logDecisions', () => {
  it('writes JSONL lines to file', () => {
    const entries: AuditEntry[] = [
      {
        ts: '2026-04-11T00:00:00Z',
        change: 'test-change',
        patternId: 'aws_key',
        matchHash: hashMatch('AKIAIOSFODNN7EXAMPLE'),
        decision: 'redact',
        user: 'auto',
      },
    ];

    logDecisions('/tmp/audit.jsonl', entries);

    expect(fsExtra.ensureDirSync).toHaveBeenCalledWith('/tmp');
    expect(fsExtra.appendFileSync).toHaveBeenCalledWith(
      '/tmp/audit.jsonl',
      expect.any(String),
      'utf-8'
    );

    const written = fsExtra.appendFileSync.mock.calls[0][1] as string;
    const parsed = JSON.parse(written.trim());
    expect(parsed.patternId).toBe('aws_key');
    expect(parsed.decision).toBe('redact');
  });

  it('does not include cleartext match in output', () => {
    const secret = 'AKIAIOSFODNN7EXAMPLE';
    const entries: AuditEntry[] = [
      {
        ts: '2026-04-11T00:00:00Z',
        change: 'test-change',
        patternId: 'aws_key',
        matchHash: hashMatch(secret),
        decision: 'redact',
        user: 'interactive',
      },
    ];

    logDecisions('/tmp/audit.jsonl', entries);

    const written = fsExtra.appendFileSync.mock.calls[0][1] as string;
    expect(written).not.toContain(secret);
  });

  it('writes multiple entries as separate JSONL lines', () => {
    const entries: AuditEntry[] = [
      {
        ts: '2026-04-11T00:00:00Z',
        change: 'test',
        patternId: 'aws_key',
        matchHash: hashMatch('key1'),
        decision: 'redact',
        user: 'auto',
      },
      {
        ts: '2026-04-11T00:00:01Z',
        change: 'test',
        patternId: 'email',
        matchHash: hashMatch('user@test.com'),
        decision: 'keep',
        user: 'interactive',
      },
    ];

    logDecisions('/tmp/audit.jsonl', entries);

    const written = fsExtra.appendFileSync.mock.calls[0][1] as string;
    const lines = written.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] as string).patternId).toBe('aws_key');
    expect(JSON.parse(lines[1] as string).patternId).toBe('email');
  });
});
