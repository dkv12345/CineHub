import { describe, expect, it } from 'vitest';
import { ShowtimesStore } from '../src/index';

describe('ShowtimesStore', () => {
  it('defines ShowtimesStore signal store', () => {
    expect(ShowtimesStore).toBeDefined();
  });
});
