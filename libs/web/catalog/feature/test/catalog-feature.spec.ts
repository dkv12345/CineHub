import { describe, expect, it } from 'vitest';
import { CATALOG_ROUTES } from '../src/index';

describe('CATALOG_ROUTES', () => {
  it('defines home and movie/:id routes', () => {
    expect(CATALOG_ROUTES.map((r) => r.path)).toEqual(['', 'movie/:id']);
  });
});
