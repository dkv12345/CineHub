import { describe, expect, it } from 'vitest';
import { ACCOUNT_ROUTES } from '../src/index';

describe('ACCOUNT_ROUTES', () => {
  it('defines profile route', () => {
    expect(ACCOUNT_ROUTES[0]?.path).toBe('profile');
  });
});
