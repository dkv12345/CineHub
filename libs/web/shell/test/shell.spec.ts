import { describe, expect, it } from 'vitest';
import { SHELL_ROUTES, ShellLayoutComponent } from '../src/index';

describe('shell', () => {
  it('exports ShellLayoutComponent and SHELL_ROUTES', () => {
    expect(ShellLayoutComponent).toBeDefined();
    expect(SHELL_ROUTES.length).toBeGreaterThan(0);
  });
});
