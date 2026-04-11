import boxen from 'boxen';
import chalk from 'chalk';
import figures from 'figures';

export const theme = {
  colors: {
    primary: chalk.magenta,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    muted: chalk.gray,
    accent: chalk.cyan,
    highlight: chalk.bold.white,
  },
  icons: {
    success: figures.tick,
    error: figures.cross,
    arrow: figures.arrowRight,
    warning: figures.warning,
    bullet: figures.bullet,
    pointer: figures.pointer,
    star: '🪄',
    brain: '🧠',
    shield: '🛡️',
    trace: '🔗',
  },
  box: {
    borderStyle: 'round' as const,
    padding: { top: 0, bottom: 0, left: 1, right: 1 } as const,
  },
};

export function panel(content: string, options?: { title?: string; borderColor?: string }): string {
  const boxOpts: Record<string, unknown> = {
    borderStyle: theme.box.borderStyle,
    padding: theme.box.padding,
    borderColor: options?.borderColor ?? 'magenta',
    titleAlignment: 'left',
  };
  if (options?.title) {
    boxOpts.title = options.title;
  }
  return boxen(content, boxOpts as any);
}

export function statusBadge(text: string, type: 'success' | 'warning' | 'error' | 'info'): string {
  const colorMap = {
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.accent,
  };
  const color = colorMap[type];
  return color(`[${text.toUpperCase()}]`);
}

export function header(text: string, icon?: string): string {
  const prefix = icon ? `${icon}  ` : '';
  return theme.colors.highlight(`${prefix}${text}`);
}

export function keyHint(keys: Array<{ key: string; label: string }>): string {
  return keys
    .map((k) => `${theme.colors.muted('[')}${theme.colors.highlight(k.key)}${theme.colors.muted(']')} ${theme.colors.muted(k.label)}`)
    .join('  ');
}
