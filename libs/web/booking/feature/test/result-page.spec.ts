import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ResultPageComponent } from '../src/index';

describe('ResultPageComponent', () => {
  it('calls POST /payments/refresh when gateway returns query params, without trusting resultCode', () => {
    const post = vi.fn().mockReturnValue(of({ data: { status: 'CONFIRMED' } }));
    const get = vi.fn().mockReturnValue(of({ data: { status: 'CONFIRMED' } }));

    const component = Object.create(ResultPageComponent.prototype);
    component.http = { post, get };
    component.route = {
      snapshot: {
        paramMap: { get: () => 'booking-999' },
        queryParamMap: { get: () => null },
        queryParams: { resultCode: '0', orderId: 'MOMO-123' },
      },
    };
    component.bookingId = () => 'booking-999';
    component.ticketId = () => '';
    component.bookingState = { set: vi.fn() };
    component.isLoading = { set: vi.fn() };
    component.isFailed = { set: vi.fn() };
    component.pollStatus = vi.fn();

    component.ngOnInit();

    expect(post).toHaveBeenCalledWith('/api/v1/booking/booking-999/payments/refresh', {});
    expect(component.pollStatus).toHaveBeenCalledWith('booking-999');
  });

  it('stops polling and clears loading when booking status is CONFIRMED', () => {
    const component = Object.create(ResultPageComponent.prototype);
    const bookingState = { set: vi.fn() };
    const isLoading = { set: vi.fn() };
    const isFailed = { set: vi.fn() };

    component.bookingState = bookingState;
    component.isLoading = isLoading;
    component.isFailed = isFailed;
    component.pollTimer = 12345 as any;

    const mockBooking = {
      id: 'bk-1',
      code: 'CH123456',
      status: 'CONFIRMED',
      totalAmount: 180000,
      tickets: [{ id: 't1', qrCode: 'CINEHUB:TICKET:bk-1:t1' }],
    };

    component.handleBookingUpdate(mockBooking);

    expect(bookingState.set).toHaveBeenCalledWith(mockBooking);
    expect(isLoading.set).toHaveBeenCalledWith(false);
    expect(isFailed.set).toHaveBeenCalledWith(false);
    expect(component.pollTimer).toBeNull();
  });

  it('stops polling and marks isFailed=true when status is EXPIRED or CANCELLED', () => {
    const component = Object.create(ResultPageComponent.prototype);
    const bookingState = { set: vi.fn() };
    const isLoading = { set: vi.fn() };
    const isFailed = { set: vi.fn() };

    component.bookingState = bookingState;
    component.isLoading = isLoading;
    component.isFailed = isFailed;
    component.pollTimer = 54321 as any;

    const mockBooking = {
      id: 'bk-1',
      code: 'CH123456',
      status: 'EXPIRED',
    };

    component.handleBookingUpdate(mockBooking);

    expect(isLoading.set).toHaveBeenCalledWith(false);
    expect(isFailed.set).toHaveBeenCalledWith(true);
    expect(component.pollTimer).toBeNull();
  });

  it('correctly formats confirmed booking with tickets QR codes', () => {
    const component = Object.create(ResultPageComponent.prototype);
    const mockBooking = {
      id: 'bk-100',
      code: 'CH261113ABC',
      status: 'CONFIRMED' as const,
      totalAmount: 200000,
      contactEmail: 'user@cinehub.vn',
      showtime: {
        movie: { title: 'Dune 3' },
        cinema: { name: 'Galaxy Cinema' },
        auditorium: { name: 'Screen 1' },
        startTime: '2026-11-13T19:00:00.000Z',
        format: '2D',
      },
      seats: [
        { seatLabel: 'F7', price: 100000 },
        { seatLabel: 'F8', price: 100000 },
      ],
      tickets: [
        { id: 't-1', qrCode: 'CINEHUB:TICKET:1', status: 'VALID' },
        { id: 't-2', qrCode: 'CINEHUB:TICKET:2', status: 'VALID' },
      ],
    };

    const data = component.formatConfirmedBooking(mockBooking);
    expect(data).toBeDefined();
    expect(data.bookingCode).toBe('CH261113ABC');
    expect(data.movieTitle).toBe('Dune 3');
    expect(data.seats).toEqual(['F7', 'F8']);
    expect(data.qrCodes).toEqual(['CINEHUB:TICKET:1', 'CINEHUB:TICKET:2']);
  });
});
