import { THEME } from '@/tui/theme';

describe('tui/theme', () => {
  it('has correct primary color', () => {
    expect(THEME.colors.primary).toBe('#a855f7');
  });

  it('has correct success color', () => {
    expect(THEME.colors.success).toBe('#22c55e');
  });

  it('has correct warning color', () => {
    expect(THEME.colors.warning).toBe('#eab308');
  });

  it('has correct error color', () => {
    expect(THEME.colors.error).toBe('#ef4444');
  });

  it('has correct muted color', () => {
    expect(THEME.colors.muted).toBe('#6b7280');
  });

  it('has correct accent color', () => {
    expect(THEME.colors.accent).toBe('#06b6d4');
  });

  it('has correct highlight color', () => {
    expect(THEME.colors.highlight).toBe('#ffffff');
  });

  it('has all icon keys', () => {
    expect(THEME.icons).toHaveProperty('success');
    expect(THEME.icons).toHaveProperty('error');
    expect(THEME.icons).toHaveProperty('arrow');
    expect(THEME.icons).toHaveProperty('warning');
    expect(THEME.icons).toHaveProperty('bullet');
    expect(THEME.icons).toHaveProperty('pointer');
    expect(THEME.icons).toHaveProperty('star');
    expect(THEME.icons).toHaveProperty('brain');
    expect(THEME.icons).toHaveProperty('shield');
    expect(THEME.icons).toHaveProperty('trace');
  });

  it('has rounded border style', () => {
    expect(THEME.border.style).toBe('rounded');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(THEME)).toBe(true);
    expect(Object.isFrozen(THEME.colors)).toBe(true);
    expect(Object.isFrozen(THEME.icons)).toBe(true);
    expect(Object.isFrozen(THEME.border)).toBe(true);
  });
});
