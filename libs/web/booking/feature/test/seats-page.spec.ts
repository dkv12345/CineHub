import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { SeatsPageComponent } from '../src/index';

describe('SeatsPageComponent', () => {
  it('calls POST /seat-holds on seat select and updates expiresAt', () => {
    const post = vi.fn().mockReturnValue(
      of({
        data: {
          holdToken: 'tok-123',
          expiresAt: '2026-11-13T12:00:00.000Z',
          seatIds: ['A1'],
        },
      }),
    );
    const toast = { show: vi.fn() };
    const liveAnnouncer = { announce: vi.fn() };
    const toggleSeat = vi.fn().mockReturnValue({ ok: true });
    const expiresAtSignal = { set: vi.fn() };
    const lastActiveSeatSignal = { set: vi.fn() };

    const component = Object.create(SeatsPageComponent.prototype);
    component.http = { post };
    component.toast = toast;
    component.liveAnnouncer = liveAnnouncer;
    component.store = {
      selectedSeatIds: () => new Set(),
      toggleSeat,
    };
    component.expiresAt = expiresAtSignal;
    component.lastActiveSeat = lastActiveSeatSignal;
    component.currentShowtimeId = () => 'showtime-1';
    component.findSeatIdForLabel = (lbl: string) => lbl;

    const mockSeat = { id: 'A1', zone: 'normal' } as any;
    component.onSeatChosen(mockSeat);

    expect(post).toHaveBeenCalledWith('/api/v1/showtimes/showtime-1/seat-holds', {
      showtimeId: 'showtime-1',
      seatIds: ['A1'],
    });
    expect(toggleSeat).toHaveBeenCalledWith('A1', 'normal');
    expect(expiresAtSignal.set).toHaveBeenCalledWith('2026-11-13T12:00:00.000Z');
    expect(toast.show).toHaveBeenCalledWith('Đã giữ ghế A1', 'success');
  });

  it('handles 409 Conflict: alerts user that seat is taken and refreshes seat map', () => {
    const post = vi.fn().mockReturnValue(
      throwError(() => ({
        status: 409,
        error: {
          code: 'SEAT_TAKEN',
          message: 'Một hoặc nhiều ghế đang được người khác giữ',
          details: { conflicts: ['B5'] },
        },
      })),
    );
    const toast = { show: vi.fn() };
    const loadSeatsMap = vi.fn();
    const toggleSeat = vi.fn();

    const component = Object.create(SeatsPageComponent.prototype);
    component.http = { post };
    component.toast = toast;
    component.store = {
      selectedSeatIds: () => new Set(),
      toggleSeat,
    };
    component.currentShowtimeId = () => 'showtime-1';
    component.findSeatIdForLabel = (lbl: string) => lbl;
    component.loadSeatsMap = loadSeatsMap;

    const mockSeat = { id: 'B5', zone: 'vip' } as any;
    component.onSeatChosen(mockSeat);

    expect(post).toHaveBeenCalled();
    expect(toggleSeat).not.toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledWith(
      'Ghế B5 đã bị người khác nhanh tay giữ mất. Vui lòng chọn ghế khác!',
      'warning',
    );
    expect(loadSeatsMap).toHaveBeenCalledWith('showtime-1');
  });

  it('calls DELETE /seat-holds when confirming unselect of a seat', () => {
    const del = vi.fn().mockReturnValue(of({ data: { releasedCount: 1 } }));
    const toast = { show: vi.fn() };
    const liveAnnouncer = { announce: vi.fn() };
    const toggleSeat = vi.fn();
    const loadSeatsMap = vi.fn();
    const pendingUnselectSeat = { set: vi.fn() };
    const lastActiveSeat = { set: vi.fn() };
    const expiresAt = { set: vi.fn() };

    const component = Object.create(SeatsPageComponent.prototype);
    component.http = { delete: del };
    component.toast = toast;
    component.liveAnnouncer = liveAnnouncer;
    component.store = {
      toggleSeat,
      selectedSeats: () => [],
    };
    component.pendingUnselectSeat = pendingUnselectSeat;
    component.lastActiveSeat = lastActiveSeat;
    component.expiresAt = expiresAt;
    component.currentShowtimeId = () => 'showtime-1';
    component.findSeatIdForLabel = (lbl: string) => lbl;
    component.loadSeatsMap = loadSeatsMap;

    const mockSeat = { id: 'C3', zone: 'normal' } as any;
    component.confirmUnselectSeat(mockSeat);

    expect(del).toHaveBeenCalledWith('/api/v1/showtimes/showtime-1/seat-holds', {
      body: {
        showtimeId: 'showtime-1',
        seatIds: ['C3'],
      },
    });
    expect(toggleSeat).toHaveBeenCalledWith('C3', 'normal');
    expect(expiresAt.set).toHaveBeenCalledWith(null);
  });

  it('proceedToConcessions navigates to /concessions without releasing seat holds', () => {
    const navigateByUrl = vi.fn();
    const httpDelete = vi.fn();

    const component = Object.create(SeatsPageComponent.prototype);
    component.router = { navigateByUrl };
    component.http = { delete: httpDelete };
    component.store = { selectedSeats: () => [{ id: 'A1', zone: 'normal', price: 90000 }] };
    component.toast = { show: vi.fn() };

    component.proceedToConcessions();

    expect(httpDelete).not.toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/concessions');
  });

  it('goBack releases active seat holds and clears selection', () => {
    const navigateByUrl = vi.fn();
    const httpDelete = vi.fn().mockReturnValue(of({ data: { releasedCount: 1 } }));
    const clearSelectedSeats = vi.fn();
    const expiresAt = { set: vi.fn() };

    const component = Object.create(SeatsPageComponent.prototype);
    component.router = { navigateByUrl };
    component.http = { delete: httpDelete };
    component.store = {
      selectedSeats: () => [{ id: 'A1', zone: 'normal', price: 90000 }],
      clearSelectedSeats,
    };
    component.expiresAt = expiresAt;
    component.currentShowtimeId = () => 'showtime-1';
    component.findSeatIdForLabel = (lbl: string) => lbl;

    component.goBack();

    expect(httpDelete).toHaveBeenCalledWith('/api/v1/showtimes/showtime-1/seat-holds', {
      body: {
        showtimeId: 'showtime-1',
        seatIds: ['A1'],
      },
    });
    expect(clearSelectedSeats).toHaveBeenCalled();
    expect(expiresAt.set).toHaveBeenCalledWith(null);
    expect(navigateByUrl).toHaveBeenCalledWith('/showtimes');
  });
});
