describe('tui/fallback', () => {
  let createFallbackContext: typeof import('@/tui/fallback').createFallbackContext;
  let requireTTY: typeof import('@/tui/fallback').requireTTY;

  beforeAll(async () => {
    const mod = await import('@/tui/fallback');
    createFallbackContext = mod.createFallbackContext;
    requireTTY = mod.requireTTY;
  });

  describe('createFallbackContext', () => {
    it('returns a valid TuiContext with all methods', () => {
      const ctx = createFallbackContext();
      expect(typeof ctx.banner).toBe('function');
      expect(typeof ctx.table).toBe('function');
      expect(typeof ctx.progress).toBe('function');
      expect(typeof ctx.diffView).toBe('function');
      expect(typeof ctx.log.info).toBe('function');
      expect(typeof ctx.log.success).toBe('function');
      expect(typeof ctx.log.warn).toBe('function');
      expect(typeof ctx.log.error).toBe('function');
      expect(typeof ctx.destroy).toBe('function');
    });

    it('log.info writes to stdout', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const ctx = createFallbackContext();
      ctx.log.info('test message');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('test message'));
      spy.mockRestore();
    });

    it('log.success writes to stdout', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const ctx = createFallbackContext();
      ctx.log.success('success message');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('success message'));
      spy.mockRestore();
    });

    it('log.warn writes to stdout', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const ctx = createFallbackContext();
      ctx.log.warn('warning message');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('warning message'));
      spy.mockRestore();
    });

    it('log.error writes to stderr', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const ctx = createFallbackContext();
      ctx.log.error('error message');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('error message'));
      spy.mockRestore();
    });

    it('banner writes version to stdout', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const ctx = createFallbackContext();
      ctx.banner('1.0.0');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('1.0.0'));
      spy.mockRestore();
    });

    it('table writes headers and rows to stdout', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const ctx = createFallbackContext();
      ctx.table({
        columns: [{ header: 'Name', key: 'name' }, { header: 'Score', key: 'score' }],
        rows: [{ name: 'Alpha', score: 99 }],
      });
      expect(spy).toHaveBeenCalled();
      const allOutput = spy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('Name');
      expect(allOutput).toContain('Alpha');
      spy.mockRestore();
    });

    it('progress returns an updatable handle', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const ctx = createFallbackContext();
      const handle = ctx.progress({ current: 0, total: 10, label: 'Processing' });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Processing'));
      handle.update(5, 10, 'Halfway');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Halfway'));
      spy.mockRestore();
    });

    it('destroy is a no-op', async () => {
      const ctx = createFallbackContext();
      await expect(ctx.destroy()).resolves.toBeUndefined();
    });
  });

  describe('requireTTY', () => {
    it('writes error to stderr and exits with code 1', () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT'); });

      expect(() => requireTTY('test-command')).toThrow('EXIT');
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('test-command'));
      expect(exitSpy).toHaveBeenCalledWith(1);

      stderrSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
