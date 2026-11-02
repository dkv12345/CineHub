import { describe, expect, it } from 'vitest';
import { AppComponent } from '../src/app/app.component';
import { appRoutes } from '../src/app/app.routes';

describe('CineHub Angular Web App', () => {
  it('defines standalone root AppComponent and shell routes', () => {
    expect(AppComponent).toBeDefined();
    expect(Array.isArray(appRoutes)).toBe(true);
    expect(appRoutes.length).toBeGreaterThan(0);
  });
});
