import { describe, expect, it } from 'vitest';
import { CONCESSIONS_ROUTES } from '../src/index';

describe('CONCESSIONS_ROUTES', () => {
  it('defines concessions route', () => {
    expect(CONCESSIONS_ROUTES[0]?.path).toBe('concessions');
  });
});
