import { describe, expect, it } from 'vitest';
import { ConcessionsStore } from '../src/index';

describe('ConcessionsStore', () => {
  it('defines ConcessionsStore signal store', () => {
    expect(ConcessionsStore).toBeDefined();
  });
});
