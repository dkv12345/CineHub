import { describe, expect, it } from 'vitest';
import { SHOWTIMES_ROUTES } from '../src/index';

describe('SHOWTIMES_ROUTES', () => {
  it('defines showtimes route', () => {
    expect(SHOWTIMES_ROUTES[0]?.path).toBe('showtimes');
  });
});
