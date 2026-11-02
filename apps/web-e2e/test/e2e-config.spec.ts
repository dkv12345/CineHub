import { describe, expect, it } from 'vitest';
import playwrightConfig from '../playwright.config';

describe('web-e2e playwright configuration', () => {
  it('targets localhost:4200 and defines chromium project', () => {
    expect(playwrightConfig.use?.baseURL).toBe('http://localhost:4200');
    expect(playwrightConfig.projects?.[0]?.name).toBe('chromium');
  });
});
