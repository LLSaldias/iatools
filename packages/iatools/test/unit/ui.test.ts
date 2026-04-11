import { renderBanner } from '@/ui/components/banner';
import { renderDiffView } from '@/ui/components/diff-view';
import { renderProgress } from '@/ui/components/progress';
import { renderTable } from '@/ui/components/table';
import { logger } from '@/ui/logger';
import { renderQueryResults } from '@/ui/screens/query-results';
import { runSanitizeReview } from '@/ui/screens/sanitize-review';
import { header, keyHint, panel, statusBadge } from '@/ui/theme';

describe('UI Layer', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('theme', () => {
    it('panel() returns boxen output with border characters', () => {
      const result = panel('Hello world');
      expect(result).toContain('Hello world');
      expect(result).toContain('╭');
      expect(result).toContain('╰');
    });

    it('panel() includes title when provided', () => {
      const result = panel('Content', { title: 'My Title' });
      expect(result).toContain('Content');
      expect(result).toContain('My Title');
    });

    it('statusBadge() returns colored text for each type', () => {
      const success = statusBadge('ok', 'success');
      expect(success).toContain('OK');

      const warn = statusBadge('check', 'warning');
      expect(warn).toContain('CHECK');

      const err = statusBadge('fail', 'error');
      expect(err).toContain('FAIL');

      const info = statusBadge('note', 'info');
      expect(info).toContain('NOTE');
    });

    it('header() returns styled text with optional icon', () => {
      const h = header('Section');
      expect(h).toContain('Section');

      const hIcon = header('Section', '🔧');
      expect(hIcon).toContain('🔧');
      expect(hIcon).toContain('Section');
    });

    it('keyHint() formats key-label pairs', () => {
      const hint = keyHint([
        { key: 'Enter', label: 'Confirm' },
        { key: 'q', label: 'Quit' },
      ]);
      expect(hint).toContain('Enter');
      expect(hint).toContain('Confirm');
      expect(hint).toContain('q');
      expect(hint).toContain('Quit');
    });
  });

  describe('renderTable', () => {
    it('renders correct column count and includes headers and data', () => {
      const result = renderTable({
        columns: [
          { header: 'Name', key: 'name' },
          { header: 'Value', key: 'value' },
        ],
        rows: [
          { name: 'foo', value: '42' },
          { name: 'bar', value: '99' },
        ],
      });
      expect(result).toContain('Name');
      expect(result).toContain('Value');
      expect(result).toContain('foo');
      expect(result).toContain('42');
      expect(result).toContain('bar');
      expect(result).toContain('99');
    });

    it('uses custom format function', () => {
      const result = renderTable({
        columns: [
          { header: 'Score', key: 'score', format: (v) => Number(v).toFixed(1) },
        ],
        rows: [{ score: 3.14159 }],
      });
      expect(result).toContain('3.1');
    });
  });

  describe('renderDiffView', () => {
    it('renders before/after lines with label and severity', () => {
      const before = 'secret key is AKIAIOSFODNN7EXAMPLE here';
      const after = 'secret key is [REDACTED] here';
      const result = renderDiffView({
        before,
        after,
        matchStart: 14,
        matchEnd: 34,
        label: 'AWS Key',
        severity: 'critical',
      });
      expect(result).toContain('Before');
      expect(result).toContain('After');
      expect(result).toContain('AWS Key');
      expect(result).toContain('CRITICAL');
    });

    it('defaults to warning severity', () => {
      const result = renderDiffView({
        before: 'test secret here',
        after: 'test [REDACTED] here',
        matchStart: 5,
        matchEnd: 11,
      });
      expect(result).toContain('WARNING');
    });
  });

  describe('renderProgress', () => {
    it('shows correct percentage', () => {
      const result = renderProgress({ current: 8, total: 20 });
      expect(result).toContain('40%');
      expect(result).toContain('8/20');
    });

    it('includes bar characters', () => {
      const result = renderProgress({ current: 5, total: 10 });
      expect(result).toContain('█');
      expect(result).toContain('░');
    });

    it('includes label when provided', () => {
      const result = renderProgress({ current: 1, total: 10, label: 'Processing' });
      expect(result).toContain('Processing');
    });

    it('handles 0 total gracefully', () => {
      const result = renderProgress({ current: 0, total: 0 });
      expect(result).toContain('0%');
    });
  });

  describe('renderBanner', () => {
    it('contains version string', () => {
      const result = renderBanner('2.0.0');
      expect(result).toContain('2.0.0');
    });

    it('has boxen borders', () => {
      const result = renderBanner('1.0.0');
      expect(result).toContain('╭');
      expect(result).toContain('╰');
    });

    it('contains branding text', () => {
      const result = renderBanner('2.0.0');
      expect(result).toContain('iatools');
      expect(result).toContain('Spec-Driven Development');
    });
  });

  describe('logger', () => {
    it('all basic methods callable without error', () => {
      expect(() => logger.success('ok')).not.toThrow();
      expect(() => logger.info('info')).not.toThrow();
      expect(() => logger.warn('warn')).not.toThrow();
      expect(() => logger.error('err')).not.toThrow();
      expect(() => logger.header('head')).not.toThrow();
      expect(() => logger.label('lbl')).not.toThrow();
      expect(() => logger.newline()).not.toThrow();
    });

    it('banner method works', () => {
      expect(() => logger.banner('2.0.0')).not.toThrow();
    });

    it('panel method works', () => {
      expect(() => logger.panel('content', { title: 'test' })).not.toThrow();
    });

    it('table method works', () => {
      expect(() =>
        logger.table({
          columns: [{ header: 'A', key: 'a' }],
          rows: [{ a: '1' }],
        })
      ).not.toThrow();
    });

    it('progress method works', () => {
      expect(() =>
        logger.progress({ current: 5, total: 10 })
      ).not.toThrow();
    });

    it('keyHint method works', () => {
      expect(() =>
        logger.keyHint([{ key: 'q', label: 'Quit' }])
      ).not.toThrow();
    });
  });

  describe('screens (export tests)', () => {
    it('runSanitizeReview is an async function', () => {
      expect(typeof runSanitizeReview).toBe('function');
    });

    it('renderQueryResults is an async function', () => {
      expect(typeof renderQueryResults).toBe('function');
    });
  });
});
