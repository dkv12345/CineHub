import { describe, expect, it } from 'vitest';
import { AccountStore } from '../src/index';

describe('AccountStore', () => {
  it('defines AccountStore signal store', () => {
    expect(AccountStore).toBeDefined();
  });
});
