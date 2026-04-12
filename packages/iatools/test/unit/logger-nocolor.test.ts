describe('NO_COLOR support in logger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sets chalk.level to 0 when NO_COLOR=1', () => {
    process.env.NO_COLOR = '1';
    const chalk = require('chalk');
    // Force re-evaluation of logger module
    require('../../src/ui/logger');
    expect(chalk.level).toBe(0);
  });

  it('preserves default chalk behavior when NO_COLOR is undefined', () => {
    delete process.env.NO_COLOR;
    const chalk = require('chalk');
    const defaultLevel = chalk.level;
    require('../../src/ui/logger');
    // Level should remain unchanged (not forced to 0)
    expect(chalk.level).toBe(defaultLevel);
  });

  it('preserves chalk level when NO_COLOR is empty string', () => {
    process.env.NO_COLOR = '';
    const chalk = require('chalk');
    const defaultLevel = chalk.level;
    require('../../src/ui/logger');
    // Empty string is falsy, so NO_COLOR should not activate
    expect(chalk.level).toBe(defaultLevel);
  });

  it('logger.banner() output has no ANSI escapes when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    jest.resetModules();
    const { logger } = require('../../src/ui/logger');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    logger.banner('2.0.0');

    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    // ANSI escape sequences start with \x1b[
    expect(output).not.toMatch(/\x1b\[/);
    consoleSpy.mockRestore();
  });
});
