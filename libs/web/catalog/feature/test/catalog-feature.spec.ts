import { describe, expect, it } from 'vitest';
import { CATALOG_ROUTES } from '../src/index';

describe('CATALOG_ROUTES', () => {
  it('defines home, movie/:id, and cinema-corner routes', () => {
    expect(CATALOG_ROUTES.map((r) => r.path)).toEqual([
      '',
      'movie/:id',
      'cinema-corner',
      'cinema-corner/:slug',
    ]);
  });
});
