import { describe, expect, it } from 'vitest';
import { TicketsStore } from '../src/index';

describe('TicketsStore', () => {
  it('defines TicketsStore signal store', () => {
    expect(TicketsStore).toBeDefined();
  });
});
