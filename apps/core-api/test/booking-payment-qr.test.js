import { describe, expect, it } from 'vitest';
import {
  acquireSeatLeases,
  releaseSeatLeases,
  forceDeleteSeatLeases,
} from '../src/platform/cache/seat-lease.js';
import { buildQr, verifyQr } from '../src/platform/utils/qr.js';
import { checkOrphanSeatGap, generateBookingCode } from '../src/modules/booking/index.js';

describe('WS2 & WS13: Atomic Seat Lease Concurrency (N=100) & Orphan Seat Rule', () => {
  it('allows exactly 1 winner when N=100 concurrent users lock seat F7 simultaneously', async () => {
    const showtimeId = `st-concurrency-${Date.now()}`;
    await forceDeleteSeatLeases({ showtimeId, seatIds: ['F7'] });

    const requests = Array.from({ length: 100 }, (_, idx) =>
      acquireSeatLeases({
        showtimeId,
        seatIds: ['F7'],
        userId: `user-${idx + 1}`,
        ttlSeconds: 60,
      }),
    );

    const results = await Promise.all(requests);
    const winners = results.filter((r) => r.acquired);
    const losers = results.filter((r) => !r.acquired);

    expect(winners.length).toBe(1);
    expect(losers.length).toBe(99);

    const winnerUserId = `user-${results.findIndex((r) => r.acquired) + 1}`;

    // Non-owner cannot release the seat
    await releaseSeatLeases({
      showtimeId,
      seatIds: ['F7'],
      userId: 'other-user',
    });

    const retryWhileLocked = await acquireSeatLeases({
      showtimeId,
      seatIds: ['F7'],
      userId: 'other-user',
      ttlSeconds: 60,
    });
    expect(retryWhileLocked.acquired).toBe(false);

    // Winner releases the seat -> immediately available for another user
    await releaseSeatLeases({
      showtimeId,
      seatIds: ['F7'],
      userId: winnerUserId,
    });

    const acquireAfterRelease = await acquireSeatLeases({
      showtimeId,
      seatIds: ['F7'],
      userId: 'user-b',
      ttlSeconds: 60,
    });
    expect(acquireAfterRelease.acquired).toBe(true);

    await forceDeleteSeatLeases({ showtimeId, seatIds: ['F7'] });
  });

  it('detects single-seat orphan gap (BR-09) accurately', () => {
    const mockRowSeats = [1, 2, 3, 4, 5, 6, 7].map((col) => ({
      id: `ss-F${col}`,
      status: 'AVAILABLE',
      heldUntil: null,
      heldByBooking: null,
      seat: {
        rowLabel: 'F',
        colNumber: col,
        colSpan: 1,
        posX: (col - 1) * 40,
        label: `F${col}`,
      },
    }));

    // Selecting F2 leaves F1 as an isolated 1-seat gap against the left wall
    const edgeGap = checkOrphanSeatGap(mockRowSeats, ['F2'], 'user-a');
    expect(edgeGap.hasOrphan).toBe(true);
    expect(edgeGap.orphanSeatLabel).toBe('F1');

    // Selecting F1 and F2 leaves no 1-seat gap
    const contiguous = checkOrphanSeatGap(mockRowSeats, ['F1', 'F2'], 'user-a');
    expect(contiguous.hasOrphan).toBe(false);

    // Selecting F1, F2 and F4 leaves F3 as an isolated 1-seat gap between selected seats
    const middleGap = checkOrphanSeatGap(mockRowSeats, ['F1', 'F2', 'F4'], 'user-a');
    expect(middleGap.hasOrphan).toBe(true);
    expect(middleGap.orphanSeatLabel).toBe('F3');
  });

  it('signs and verifies HMAC-SHA256 QR payload and rejects tampered or old qrVersion', () => {
    const ticketId = 'tkt-demo-2026-001';
    const qrV1 = buildQr(ticketId, 1);

    expect(verifyQr(qrV1, 1)).toBe(ticketId);
    // After refund increments qrVersion to 2, old QR v1 is rejected
    expect(verifyQr(qrV1, 2)).toBeNull();
    // Tampered signature is rejected
    expect(verifyQr(`${ticketId}.0000000000000000`, 1)).toBeNull();
  });

  it('generates human-readable booking codes in CHyymmddXXXXXX format', () => {
    const code = generateBookingCode(new Date('2026-04-17T10:00:00Z'));
    expect(code).toMatch(/^CH260417[A-Z0-9]{6}$/);
  });
});
