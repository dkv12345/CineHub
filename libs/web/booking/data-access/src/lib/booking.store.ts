import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { MAX_SEATS_PER_BOOKING, SEAT_HOLD_SECONDS } from '@cinehub/contracts';
import { cinemas as seedCinemas, movies as seedMovies, PRICE } from '@cinehub/web/shared/util';

export interface SelectedSeatItem {
  readonly id: string;
  readonly zone: 'normal' | 'vip' | 'sweetbox';
  readonly price: number;
}

export interface IssuedTicket {
  readonly id: string;
  readonly bookingCode: string;
  readonly movieTitle: string;
  readonly cinemaName: string;
  readonly screenName: string;
  readonly showTime: string;
  readonly format: string;
  readonly seats: readonly string[];
  readonly totalPaid: number;
  readonly paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY';
  readonly createdAt: string;
  readonly status: 'VALID' | 'USED' | 'CANCELLED';
}

export interface BookingState {
  readonly showtimeId: string;
  readonly movieTitle: string;
  readonly cinemaName: string;
  readonly screenName: string;
  readonly showTime: string;
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
  showtimeId: 'default-showtime',
  movieTitle: seedMovies[0]?.title ?? 'Dune: Hành Tinh Cát',
  cinemaName: seedCinemas[0]?.name ?? 'Galaxy CineX Hanoi Centre',
  screenName: 'IMAX Laser 01',
  showTime: '19:45',
  format: 'IMAX',
  selectedSeats: [],
  holdRemainingSeconds: SEAT_HOLD_SECONDS,
  voucherCode: null,
  discountAmount: 0,
  paymentMethod: 'VNPAY',
  issuedTickets: [
    {
      id: 'ticket-seed-01',
      bookingCode: 'CH-884920',
      movieTitle: seedMovies[0]?.title ?? 'Loạn Thế',
      cinemaName: 'Galaxy CineX Thiso Mall Sala',
      screenName: 'Cinema 02 · Dolby Atmos',
      showTime: '20:15 · Hôm nay',
      format: '2D',
      seats: ['F7', 'F8'],
      totalPaid: 230000,
      paymentMethod: 'VNPAY',
      createdAt: new Date().toISOString(),
      status: 'VALID',
    },
  ],
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
    initShowtimeFromParam(rawShowtimeId: string): void {
      if (!rawShowtimeId) return;
      const parts = rawShowtimeId.split('__');
      const movieId = parts[0] ?? '';
      const cinemaId = parts[1] ?? '';
      const time = parts[2] ?? '19:45';
      const format = parts[3] ?? '2D';

      const foundMovie = seedMovies.find((m) => String(m.id) === movieId) ?? seedMovies[0];
      const foundCinema = seedCinemas.find((c) => String(c.id) === cinemaId) ?? seedCinemas[0];

      patchState(store, {
        showtimeId: rawShowtimeId,
        movieTitle: foundMovie?.title ?? 'Phim đang chiếu',
        cinemaName: foundCinema?.name ?? 'Galaxy Cinema',
        showTime: time,
        format,
        holdRemainingSeconds: SEAT_HOLD_SECONDS,
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
      const effectiveSeats = seats.length > 0 ? seats : ['F8'];
      const subtotal = (store.seatsSubtotal() || PRICE.vip) + concessionTotal;
      const totalPaid = Math.max(0, subtotal - store.discountAmount());
      const ticketId = `tkt-${Date.now()}`;
      const bookingCode = `CH-${String(Math.floor(100000 + Math.random() * 900000))}`;

      const ticket: IssuedTicket = {
        id: ticketId,
        bookingCode,
        movieTitle: store.movieTitle(),
        cinemaName: store.cinemaName(),
        screenName: store.screenName(),
        showTime: store.showTime(),
        format: store.format(),
        seats: effectiveSeats,
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
