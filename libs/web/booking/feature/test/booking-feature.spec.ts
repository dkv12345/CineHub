import { describe, expect, it } from 'vitest';
import { BOOKING_ROUTES } from '../src/index';

describe('BOOKING_ROUTES', () => {
  it('defines seats, checkout, and result routes', () => {
    expect(BOOKING_ROUTES.map((r) => r.path)).toEqual([
      'seats/:showtimeId',
      'checkout',
      'result/:ticketId',
    ]);
  });
});
