import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { MAX_SEATS_PER_BOOKING, SEAT_HOLD_SECONDS } from '@cinehub/contracts';
import { PRICE } from '@cinehub/web/shared/util';

export interface ShowtimeMetadata {
  readonly movieTitle?: string;
  readonly movieId?: string;
  readonly cinemaName?: string;
  readonly cinemaId?: string;
  readonly cinemaCode?: string;
  readonly showTime?: string;
  readonly showDate?: string;
  readonly format?: string;
  readonly screenName?: string;
  readonly backdropUrl?: string;
}

export interface SelectedSeatItem {
  readonly id: string;
  readonly zone: 'normal' | 'vip' | 'sweetbox';
  readonly price: number;
}

export interface IssuedTicket {
  readonly id: string;
  readonly bookingCode: string;
  readonly movieTitle: string;
  readonly movieBackdropUrl: string;
  readonly cinemaName: string;
  readonly screenName: string;
  readonly showTime: string;
  readonly showDate: string;
  readonly format: string;
  readonly seats: readonly string[];
  readonly totalPaid: number;
  readonly paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY';
  readonly createdAt: string;
  readonly status: 'VALID' | 'USED' | 'CANCELLED';
}

export interface BookingState {
  readonly showtimeId: string;
  readonly movieId: string;
  readonly movieTitle: string;
  readonly movieBackdropUrl: string;
  readonly cinemaId: string;
  readonly cinemaCode: string;
  readonly cinemaName: string;
  readonly screenName: string;
  readonly showTime: string;
  readonly showDate: string;
  readonly format: string;
  readonly selectedSeats: readonly SelectedSeatItem[];
  readonly holdRemainingSeconds: number;
  readonly voucherCode: string | null;
  readonly discountAmount: number;
  readonly paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY';
  readonly issuedTickets: readonly IssuedTicket[];
}

const VOUCHER_CATALOG: Record<string, { label: string; amount: number }> = {
  CINEHUB50: { label: 'Giảm 50.000đ thành viên mới', amount: 50000 },
  GALAXY30: { label: 'Giảm 30.000đ đối tác Galaxy', amount: 30000 },
  VIP2026: { label: 'Giảm 45.000đ hạng VIP', amount: 45000 },
};

const initialState: BookingState = {
  showtimeId: '',
  movieId: '',
  movieTitle: '',
  movieBackdropUrl: '',
  cinemaId: '',
  cinemaCode: '',
  cinemaName: '',
  screenName: '',
  showTime: '',
  showDate: '',
  format: '',
  selectedSeats: [],
  holdRemainingSeconds: SEAT_HOLD_SECONDS,
  voucherCode: null,
  discountAmount: 0,
  paymentMethod: 'VNPAY',
  issuedTickets: [],
};

function seatPriceForZone(zone: 'normal' | 'vip' | 'sweetbox'): number {
  switch (zone) {
    case 'sweetbox':
      return PRICE.sweetbox;
    case 'vip':
      return PRICE.vip;
    default:
      return PRICE.regular;
  }
}

export const BookingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    selectedSeatIds: computed(() => new Set(store.selectedSeats().map((s) => s.id))),
    seatsSubtotal: computed(() => store.selectedSeats().reduce((sum, s) => sum + s.price, 0)),
    holdFormatted: computed(() => {
      const sec = Math.max(0, store.holdRemainingSeconds());
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      return `${m}:${s}`;
    }),
  })),
  withMethods((store) => ({
    initShowtimeFromParam(rawShowtimeId: string, metadata: ShowtimeMetadata = {}): void {
      if (!rawShowtimeId) return;
      const parts = rawShowtimeId.split('__');
      const isNewShowtime = store.showtimeId() !== rawShowtimeId;

      patchState(store, {
        showtimeId: rawShowtimeId,
        movieId: metadata.movieId || parts[0] || '',
        movieTitle: metadata.movieTitle || '',
        movieBackdropUrl: metadata.backdropUrl || '',
        cinemaId: metadata.cinemaId || '',
        cinemaCode: metadata.cinemaCode || parts[1] || '',
        cinemaName: metadata.cinemaName || '',
        screenName: metadata.screenName || '',
        showTime: metadata.showTime || parts[2] || '',
        showDate: metadata.showDate || '',
        format: metadata.format || parts[3] || '',
        selectedSeats: isNewShowtime ? [] : store.selectedSeats(),
        holdRemainingSeconds: isNewShowtime ? SEAT_HOLD_SECONDS : store.holdRemainingSeconds(),
      });
    },

    decrementHold(): void {
      patchState(store, {
        holdRemainingSeconds: Math.max(0, store.holdRemainingSeconds() - 1),
      });
    },

    toggleSeat(id: string, zone: 'normal' | 'vip' | 'sweetbox'): { ok: boolean; reason?: string } {
      const current = store.selectedSeats();
      const exists = current.some((s) => s.id === id);
      if (exists) {
        patchState(store, {
          selectedSeats: current.filter((s) => s.id !== id),
        });
        return { ok: true };
      }
      if (current.length >= MAX_SEATS_PER_BOOKING) {
        return {
          ok: false,
          reason: `Chỉ được chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế mỗi giao dịch.`,
        };
      }
      patchState(store, {
        selectedSeats: [...current, { id, zone, price: seatPriceForZone(zone) }],
      });
      return { ok: true };
    },

    applyVoucher(rawCode: string): { ok: boolean; message: string } {
      const code = rawCode.trim().toUpperCase();
      const entry = VOUCHER_CATALOG[code];
      if (!entry) {
        return {
          ok: false,
          message: 'Mã giảm giá không hợp lệ. Thử CINEHUB50 hoặc GALAXY30.',
        };
      }
      patchState(store, {
        voucherCode: code,
        discountAmount: entry.amount,
      });
      return { ok: true, message: `Đã áp dụng ${code}: ${entry.label}` };
    },

    setPaymentMethod(paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY'): void {
      patchState(store, { paymentMethod });
    },

    completeCheckout(concessionTotal: number): IssuedTicket {
      const seats = store.selectedSeats().map((s) => s.id);
      const subtotal = store.seatsSubtotal() + concessionTotal;
      const totalPaid = Math.max(0, subtotal - store.discountAmount());
      const ticketId = `tkt-${Date.now()}`;
      const bookingCode = `CH-${String(Math.floor(100000 + Math.random() * 900000))}`;

      const ticket: IssuedTicket = {
        id: ticketId,
        bookingCode,
        movieTitle: store.movieTitle(),
        movieBackdropUrl: store.movieBackdropUrl(),
        cinemaName: store.cinemaName(),
        screenName: store.screenName(),
        showTime: store.showTime(),
        showDate: store.showDate(),
        format: store.format(),
        seats,
        totalPaid,
        paymentMethod: store.paymentMethod(),
        createdAt: new Date().toISOString(),
        status: 'VALID',
      };

      patchState(store, {
        issuedTickets: [ticket, ...store.issuedTickets()],
        selectedSeats: [],
        voucherCode: null,
        discountAmount: 0,
      });
      return ticket;
    },

    findTicketById(id: string): IssuedTicket | null {
      return store.issuedTickets().find((t) => t.id === id) ?? store.issuedTickets()[0] ?? null;
    },
  })),
);
