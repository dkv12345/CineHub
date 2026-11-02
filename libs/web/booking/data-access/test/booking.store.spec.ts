import { describe, expect, it } from 'vitest';
import { BookingStore } from '../src/index';

describe('BookingStore', () => {
  it('defines BookingStore signal store', () => {
    expect(BookingStore).toBeDefined();
  });
});
