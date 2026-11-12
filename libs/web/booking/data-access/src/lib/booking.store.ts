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

const STORAGE_KEY = 'cinehub_booking_store_state';

const VOUCHER_CATALOG: Record<string, { label: string; amount: number }> = {
  CINEHUB50: { label: 'Giảm 50.000đ thành viên mới', amount: 50000 },
  GALAXY30: { label: 'Giảm 30.000đ đối tác Galaxy', amount: 30000 },
  VIP2026: { label: 'Giảm 45.000đ hạng VIP', amount: 45000 },
};

const defaultInitialState: BookingState = {
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

// Hàm đọc dữ liệu đã lưu từ Session Storage
function loadSavedState(): BookingState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultInitialState;
    const parsed = JSON.parse(raw);
    return { ...defaultInitialState, ...parsed };
  } catch {
    return defaultInitialState;
  }
}

// Hàm hỗ trợ lưu State xuống Session Storage
function persistState(state: BookingState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[BookingStore] không thể lưu state:', err);
  }
}

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
  withState(loadSavedState()),
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

      const updatedSeats = isNewShowtime ? [] : store.selectedSeats();
      const updatedHold = isNewShowtime ? SEAT_HOLD_SECONDS : store.holdRemainingSeconds();

      patchState(store, {
        showtimeId: rawShowtimeId,
        movieId: metadata.movieId || parts[0] || store.movieId(),
        movieTitle: metadata.movieTitle || store.movieTitle(),
        movieBackdropUrl: metadata.backdropUrl || store.movieBackdropUrl(),
        cinemaId: metadata.cinemaId || store.cinemaId(),
        cinemaCode: metadata.cinemaCode || parts[1] || store.cinemaCode(),
        cinemaName: metadata.cinemaName || store.cinemaName(),
        screenName: metadata.screenName || store.screenName(),
        showTime: metadata.showTime || parts[2] || store.showTime(),
        showDate: metadata.showDate || store.showDate(),
        format: metadata.format || parts[3] || store.format(),
        selectedSeats: updatedSeats,
        holdRemainingSeconds: updatedHold,
      });

      persistState({
        showtimeId: store.showtimeId(),
        movieId: store.movieId(),
        movieTitle: store.movieTitle(),
        movieBackdropUrl: store.movieBackdropUrl(),
        cinemaId: store.cinemaId(),
        cinemaCode: store.cinemaCode(),
        cinemaName: store.cinemaName(),
        screenName: store.screenName(),
        showTime: store.showTime(),
        showDate: store.showDate(),
        format: store.format(),
        selectedSeats: store.selectedSeats(),
        holdRemainingSeconds: store.holdRemainingSeconds(),
        voucherCode: store.voucherCode(),
        discountAmount: store.discountAmount(),
        paymentMethod: store.paymentMethod(),
        issuedTickets: store.issuedTickets(),
      });
    },

    decrementHold(): void {
      const newSec = Math.max(0, store.holdRemainingSeconds() - 1);
      patchState(store, { holdRemainingSeconds: newSec });
    },

    setHoldRemainingSeconds(sec: number): void {
      patchState(store, { holdRemainingSeconds: Math.max(0, sec) });
    },

    clearSelectedSeats(): void {
      patchState(store, { selectedSeats: [] });
    },

    toggleSeat(id: string, zone: 'normal' | 'vip' | 'sweetbox'): { ok: boolean; reason?: string } {
      const current = store.selectedSeats();
      const exists = current.some((s) => s.id === id);
      let updatedSeats: SelectedSeatItem[];

      if (exists) {
        updatedSeats = current.filter((s) => s.id !== id);
      } else {
        if (current.length >= MAX_SEATS_PER_BOOKING) {
          return {
            ok: false,
            reason: `Chỉ được chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế mỗi giao dịch.`,
          };
        }
        updatedSeats = [...current, { id, zone, price: seatPriceForZone(zone) }];
      }

      patchState(store, { selectedSeats: updatedSeats });

      persistState({
        showtimeId: store.showtimeId(),
        movieId: store.movieId(),
        movieTitle: store.movieTitle(),
        movieBackdropUrl: store.movieBackdropUrl(),
        cinemaId: store.cinemaId(),
        cinemaCode: store.cinemaCode(),
        cinemaName: store.cinemaName(),
        screenName: store.screenName(),
        showTime: store.showTime(),
        showDate: store.showDate(),
        format: store.format(),
        selectedSeats: updatedSeats,
        holdRemainingSeconds: store.holdRemainingSeconds(),
        voucherCode: store.voucherCode(),
        discountAmount: store.discountAmount(),
        paymentMethod: store.paymentMethod(),
        issuedTickets: store.issuedTickets(),
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

      persistState({
        showtimeId: store.showtimeId(),
        movieId: store.movieId(),
        movieTitle: store.movieTitle(),
        movieBackdropUrl: store.movieBackdropUrl(),
        cinemaId: store.cinemaId(),
        cinemaCode: store.cinemaCode(),
        cinemaName: store.cinemaName(),
        screenName: store.screenName(),
        showTime: store.showTime(),
        showDate: store.showDate(),
        format: store.format(),
        selectedSeats: store.selectedSeats(),
        holdRemainingSeconds: store.holdRemainingSeconds(),
        voucherCode: code,
        discountAmount: entry.amount,
        paymentMethod: store.paymentMethod(),
        issuedTickets: store.issuedTickets(),
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

      // Xóa cache session sau khi hoàn tất vé thành công
      sessionStorage.removeItem(STORAGE_KEY);

      return ticket;
    },

    findTicketById(id: string): IssuedTicket | null {
      return store.issuedTickets().find((t) => t.id === id) ?? store.issuedTickets()[0] ?? null;
    },
  })),
);
