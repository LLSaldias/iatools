import { panel, theme } from '@/ui/theme';

export interface DiffViewOptions {
  before: string;
  after: string;
  matchStart: number;
  matchEnd: number;
  contextChars?: number;
  label?: string;
  severity?: 'critical' | 'warning';
}

export function renderDiffView(options: DiffViewOptions): string {
  const {
    before,
    after,
    matchStart,
    matchEnd,
    contextChars = 40,
    label,
    severity = 'warning',
  } = options;

  const ctxStart = Math.max(0, matchStart - contextChars);
  const ctxEnd = Math.min(before.length, matchEnd + contextChars);

  const prefix = before.slice(ctxStart, matchStart);
  const match = before.slice(matchStart, matchEnd);
  const suffix = before.slice(matchEnd, ctxEnd);

  const ellipsisBefore = ctxStart > 0 ? '...' : '';
  const ellipsisAfter = ctxEnd < before.length ? '...' : '';

  const beforeLine = `${ellipsisBefore}${prefix}${theme.colors.error(match)}${suffix}${ellipsisAfter}`;

  const replacementLen = matchEnd - matchStart;
  const afterMatchEnd = Math.min(after.length, matchStart + (after.length - before.length + replacementLen));
  const afterCtxStart = Math.max(0, matchStart - contextChars);
  const afterCtxEnd = Math.min(after.length, afterMatchEnd + contextChars);

  const afterPrefix = after.slice(afterCtxStart, matchStart);
  const afterMatch = after.slice(matchStart, afterMatchEnd);
  const afterSuffix = after.slice(afterMatchEnd, afterCtxEnd);

  const afterEllipsisBefore = afterCtxStart > 0 ? '...' : '';
  const afterEllipsisAfter = afterCtxEnd < after.length ? '...' : '';

  const afterLine = `${afterEllipsisBefore}${afterPrefix}${theme.colors.accent(afterMatch)}${afterSuffix}${afterEllipsisAfter}`;

  const severityColor = severity === 'critical' ? theme.colors.error : theme.colors.warning;
  const severityLabel = severity.toUpperCase();
  const titleParts = [severityColor(severityLabel)];
  if (label) titleParts.push(theme.colors.highlight(label));
  const titleText = titleParts.join(` ${theme.colors.muted('·')} `);

  const content = [
    `  ${theme.colors.muted('Before:')} ${beforeLine}`,
    `  ${theme.colors.muted('After:')}  ${afterLine}`,
  ].join('\n');

  return panel(content, { title: titleText, borderColor: severity === 'critical' ? 'red' : 'yellow' });
}
