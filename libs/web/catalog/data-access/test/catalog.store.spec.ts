import { describe, expect, it } from 'vitest';
import { CatalogStore } from '../src/index';

describe('CatalogStore', () => {
  it('defines CatalogStore signal store', () => {
    expect(CatalogStore).toBeDefined();
  });
});
