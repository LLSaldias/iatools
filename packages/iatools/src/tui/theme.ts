/**
 * TUI Theme — frozen constant with hex colors, icon literals, and border config.
 * No runtime dependencies (spec TUI-02.6).
 */

export interface TuiTheme {
  colors: Record<'primary' | 'success' | 'warning' | 'error' | 'muted' | 'accent' | 'highlight', string>;
  icons: Record<'success' | 'error' | 'arrow' | 'warning' | 'bullet' | 'pointer' | 'star' | 'brain' | 'shield' | 'trace', string>;
  border: { style: 'rounded' };
}

export const THEME: TuiTheme = Object.freeze({
  colors: Object.freeze({
    primary: '#a855f7',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    muted: '#6b7280',
    accent: '#06b6d4',
    highlight: '#ffffff',
  }),
  icons: Object.freeze({
    success: '✔',
    error: '✖',
    arrow: '→',
    warning: '⚠',
    bullet: '●',
    pointer: '▸',
    star: '🪄',
    brain: '🧠',
    shield: '🛡️',
    trace: '🔗',
  }),
  border: Object.freeze({ style: 'rounded' as const }),
});
