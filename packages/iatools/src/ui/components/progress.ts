import { theme } from '@/ui/theme';

export interface ProgressOptions {
  current: number;
  total: number;
  label?: string;
  width?: number;
}

export function renderProgress(options: ProgressOptions): string {
  const { current, total, label, width = 30 } = options;
  const ratio = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const pct = Math.round(ratio * 100);

  const bar = theme.colors.primary('█'.repeat(filled)) + theme.colors.muted('░'.repeat(empty));
  const counter = theme.colors.muted(`${current}/${total}`);
  const percent = theme.colors.highlight(`(${pct}%)`);
  const prefix = label ? `  ${label} ` : '  ';

  return `${prefix}${bar}  ${counter} ${percent}`;
}
