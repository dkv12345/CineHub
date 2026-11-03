import { describe, expect, it } from 'vitest';
import { TICKETS_ROUTES } from '../src/index';

describe('TICKETS_ROUTES', () => {
  it('defines my-tickets route', () => {
    expect(TICKETS_ROUTES[0]?.path).toBe('my-tickets');
  });
});
