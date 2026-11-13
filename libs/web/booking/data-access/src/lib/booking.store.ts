import { computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
  readonly seatId?: string;
  readonly zone: 'normal' | 'vip' | 'sweetbox';
  readonly price: number;
}

export interface ServerSeatCell {
  readonly id: string;
  readonly showtimeSeatId?: string;
  readonly seatId?: string;
  readonly row: string;
  readonly rowIndex: number;
  readonly column: number;
  readonly colSpan?: number;
  readonly zone: 'normal' | 'vip' | 'sweetbox';
  readonly price?: number;
  readonly status?: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
  readonly sold: boolean;
  readonly selected: boolean;
  readonly heldByViewer?: boolean;
  readonly heldByOther?: boolean;
  readonly heldUntil?: string | null;
}

export interface ServerSeatLayout {
  readonly rows: number;
  readonly columns: number;
  readonly aislesAfter: number[];
  readonly vipFromRow: number;
  readonly sweetbox: { row: number; from: number; to: number };
  readonly style: string;
}

export interface IssuedTicket {
  readonly id: string;
  readonly bookingId?: string;
  readonly bookingCode: string;
  readonly movieTitle: string;
  readonly movieBackdropUrl: string;
  readonly cinemaName: string;
  readonly screenName: string;
  readonly showTime: string;
  readonly showDate: string;
  readonly showtimeStartTime?: string | null;
  readonly format: string;
  readonly seats: readonly string[];
  readonly totalPaid: number;
  readonly paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY' | 'DEMO';
  readonly qrPayload?: string;
  readonly qrVersion?: number;
  readonly usedAt?: string | null;
  readonly createdAt: string;
  readonly status: 'VALID' | 'USED' | 'CANCELLED' | 'VOID';
}

export interface BookingState {
  readonly showtimeId: string;
  readonly serverShowtimeId: string | null;
  readonly bookingId: string | null;
  readonly bookingCode: string | null;
  readonly holdExpiresAt: string | null;
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
  readonly serverSeats: readonly ServerSeatCell[];
  readonly serverLayout: ServerSeatLayout | null;
  readonly loadingSeatMap: boolean;
  readonly holdRemainingSeconds: number;
  readonly voucherCode: string | null;
  readonly discountAmount: number;
  readonly paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY' | 'DEMO';
  readonly issuedTickets: readonly IssuedTicket[];
}

const STORAGE_KEY = 'cinehub_booking_store_state';

const VOUCHER_CATALOG: Record<string, { label: string; amount: number }> = {
  CINEHUB50: { label: 'Giảm 50.000đ thành viên mới', amount: 50000 },
  CINEHUB50K: { label: 'Giảm 50.000đ thành viên mới', amount: 50000 },
  GALAXY30: { label: 'Giảm 30.000đ đối tác Galaxy', amount: 30000 },
  VIP2026: { label: 'Giảm 45.000đ hạng VIP', amount: 45000 },
  CINEHUB20: { label: 'Giảm 20% tối đa 60.000đ', amount: 40000 },
};

const defaultInitialState: BookingState = {
  showtimeId: '',
  serverShowtimeId: null,
  bookingId: null,
  bookingCode: null,
  holdExpiresAt: null,
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
  serverSeats: [],
  serverLayout: null,
  loadingSeatMap: false,
  holdRemainingSeconds: SEAT_HOLD_SECONDS,
  voucherCode: null,
  discountAmount: 0,
  paymentMethod: 'VNPAY',
  issuedTickets: [],
};

function loadSavedState(): BookingState {
  try {
    if (typeof sessionStorage === 'undefined') return defaultInitialState;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultInitialState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultInitialState,
      ...parsed,
      serverSeats: [],
      loadingSeatMap: false,
    };
  } catch {
    return defaultInitialState;
  }
}

function persistState(state: Partial<BookingState>): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const {
      serverSeats: _ignoredSeats,
      loadingSeatMap: _ignoredLoading,
      ...rest
    } = state as BookingState;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
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
  withMethods((store) => {
    const http = inject(HttpClient, { optional: true });

    const snapshotAndPersist = () => {
      persistState({
        showtimeId: store.showtimeId(),
        serverShowtimeId: store.serverShowtimeId(),
        bookingId: store.bookingId(),
        bookingCode: store.bookingCode(),
        holdExpiresAt: store.holdExpiresAt(),
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
    };

    return {
      initShowtimeFromParam(rawShowtimeId: string, metadata: ShowtimeMetadata = {}): void {
        if (!rawShowtimeId) return;
        const parts = rawShowtimeId.split('__');
        const isNewShowtime = store.showtimeId() !== rawShowtimeId;

        const updatedSeats = isNewShowtime ? [] : store.selectedSeats();
        const updatedHold = isNewShowtime ? SEAT_HOLD_SECONDS : store.holdRemainingSeconds();

        patchState(store, {
          showtimeId: rawShowtimeId,
          ...(isNewShowtime
            ? {
                bookingId: null,
                bookingCode: null,
                holdExpiresAt: null,
                serverSeats: [],
                serverLayout: null,
              }
            : {}),
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

        snapshotAndPersist();
      },

      decrementHold(): { expiredNow: boolean } {
        const expiresAt = store.holdExpiresAt();
        if (expiresAt) {
          const prevSec = store.holdRemainingSeconds();
          const remaining = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
          patchState(store, { holdRemainingSeconds: remaining });
          if (remaining === 0 && prevSec > 0 && store.selectedSeats().length > 0) {
            patchState(store, {
              selectedSeats: [],
              bookingId: null,
              bookingCode: null,
              holdExpiresAt: null,
            });
            snapshotAndPersist();
            return { expiredNow: true };
          }
          return { expiredNow: false };
        }

        const newSec = Math.max(0, store.holdRemainingSeconds() - 1);
        patchState(store, { holdRemainingSeconds: newSec });
        return { expiredNow: false };
      },

      async loadSeatMapFromApi(
        rawShowtimeId: string,
        metadata: ShowtimeMetadata = {},
      ): Promise<{ ok: boolean }> {
        const targetId = rawShowtimeId || store.showtimeId();
        if (!targetId || !http) return { ok: false };

        patchState(store, { loadingSeatMap: true });

        try {
          const queryParams: Record<string, string> = {};
          const metaTitle = metadata.movieTitle || store.movieTitle();
          const metaCinema = metadata.cinemaName || store.cinemaName();
          const metaScreen = metadata.screenName || store.screenName();
          const metaTime = metadata.showTime || store.showTime();
          const metaDate = metadata.showDate || store.showDate();
          const metaFormat = metadata.format || store.format();
          const metaBackdrop = metadata.backdropUrl || store.movieBackdropUrl();

          if (metaTitle) queryParams['movieTitle'] = metaTitle;
          if (metaCinema) queryParams['cinemaName'] = metaCinema;
          if (metaScreen) queryParams['screenName'] = metaScreen;
          if (metaTime) queryParams['showTime'] = metaTime;
          if (metaDate) queryParams['showDate'] = metaDate;
          if (metaFormat) queryParams['format'] = metaFormat;
          if (metaBackdrop) queryParams['backdropUrl'] = metaBackdrop;

          const res = await firstValueFrom(
            http.get<{
              data?: {
                showtimeId: string;
                movie?: { id: string; title: string; backdropUrl?: string };
                cinema?: { id: string; code: string; name: string };
                auditorium?: { id: string; name: string };
                format?: string;
                startTime?: string;
                layout: ServerSeatLayout;
                seats: ServerSeatCell[];
                activeHold?: {
                  bookingId: string;
                  bookingCode: string;
                  seats: { id: string; zone: 'normal' | 'vip' | 'sweetbox'; price: number }[];
                  voucherCode: string | null;
                  discountAmount: number;
                  expiresAt: string;
                  remainingSeconds: number;
                } | null;
              };
            }>(`/api/v1/booking/seats/${encodeURIComponent(targetId)}`, { params: queryParams }),
          );

          const payload = res?.data;
          if (!payload) {
            patchState(store, { loadingSeatMap: false });
            return { ok: false };
          }

          const activeHold = payload.activeHold;
          const syncedSelectedSeats: SelectedSeatItem[] = activeHold
            ? activeHold.seats.map((s) => ({
                id: s.id,
                zone: s.zone,
                price: s.price,
              }))
            : payload.seats
                .filter((s) => s.heldByViewer)
                .map((s) => ({
                  id: s.id,
                  zone: s.zone,
                  price: s.price ?? seatPriceForZone(s.zone),
                }));

          patchState(store, {
            serverShowtimeId: payload.showtimeId,
            serverLayout: payload.layout,
            serverSeats: payload.seats,
            loadingSeatMap: false,
            ...(payload.movie?.title && !store.movieTitle()
              ? { movieTitle: payload.movie.title }
              : {}),
            ...(payload.movie?.backdropUrl && !store.movieBackdropUrl()
              ? { movieBackdropUrl: payload.movie.backdropUrl }
              : {}),
            ...(payload.cinema?.name && !store.cinemaName()
              ? { cinemaName: payload.cinema.name }
              : {}),
            ...(payload.cinema?.id && !store.cinemaId() ? { cinemaId: payload.cinema.id } : {}),
            ...(payload.auditorium?.name && !store.screenName()
              ? { screenName: payload.auditorium.name }
              : {}),
            ...(activeHold
              ? {
                  bookingId: activeHold.bookingId,
                  bookingCode: activeHold.bookingCode,
                  selectedSeats: syncedSelectedSeats,
                  holdExpiresAt: activeHold.expiresAt,
                  holdRemainingSeconds: activeHold.remainingSeconds,
                  ...(activeHold.voucherCode
                    ? {
                        voucherCode: activeHold.voucherCode,
                        discountAmount: activeHold.discountAmount,
                      }
                    : {}),
                }
              : store.holdExpiresAt()
                ? {
                    // Server hold was released or expired on server
                    selectedSeats: [],
                    bookingId: null,
                    bookingCode: null,
                    holdExpiresAt: null,
                  }
                : {}),
          });

          snapshotAndPersist();
          return { ok: true };
        } catch {
          patchState(store, { loadingSeatMap: false });
          return { ok: false };
        }
      },

      async holdSeatsOnServer(
        seatIds: readonly string[],
        metadata: ShowtimeMetadata = {},
      ): Promise<{ ok: boolean; code?: string; message?: string }> {
        const showtimeId = store.showtimeId();
        if (!showtimeId || !http) return { ok: true };

        try {
          const res = await firstValueFrom(
            http.post<{
              data?: {
                bookingId: string;
                bookingCode: string;
                showtimeId: string;
                seats: { id: string; zone: 'normal' | 'vip' | 'sweetbox'; price: number }[];
                expiresAt: string;
                remainingSeconds: number;
              };
            }>('/api/v1/booking/holds', {
              showtimeId,
              seatIds,
              metadata: {
                movieTitle: metadata.movieTitle || store.movieTitle(),
                cinemaName: metadata.cinemaName || store.cinemaName(),
                screenName: metadata.screenName || store.screenName(),
                showTime: metadata.showTime || store.showTime(),
                showDate: metadata.showDate || store.showDate(),
                format: metadata.format || store.format(),
                backdropUrl: metadata.backdropUrl || store.movieBackdropUrl(),
              },
            }),
          );

          const data = res?.data;
          if (data) {
            patchState(store, {
              bookingId: data.bookingId,
              bookingCode: data.bookingCode,
              serverShowtimeId: data.showtimeId,
              selectedSeats: data.seats.map((s) => ({
                id: s.id,
                zone: s.zone,
                price: s.price,
              })),
              holdExpiresAt: data.expiresAt,
              holdRemainingSeconds: data.remainingSeconds,
            });
            snapshotAndPersist();
          }
          await this.loadSeatMapFromApi(showtimeId, metadata);
          return { ok: true };
        } catch (err) {
          const httpErr = err as HttpErrorResponse;
          const errCode =
            httpErr?.error?.error?.code || (httpErr?.status === 409 ? 'SEAT_TAKEN' : 'ERROR');
          const errMsg =
            httpErr?.error?.error?.message ||
            (httpErr?.status === 409
              ? '409 SEAT_TAKEN: Ghế này vừa được người khác giữ hoặc đã bán.'
              : 'Không thể giữ ghế.');
          await this.loadSeatMapFromApi(showtimeId, metadata);
          return { ok: false, code: errCode, message: errMsg };
        }
      },

      async releaseSeatOnServer(seatId?: string): Promise<{ ok: boolean; message?: string }> {
        const showtimeId = store.showtimeId();
        if (!showtimeId || !http) return { ok: true };

        try {
          const url = seatId
            ? `/api/v1/booking/holds/${encodeURIComponent(showtimeId)}/seats/${encodeURIComponent(seatId)}`
            : `/api/v1/booking/holds/${encodeURIComponent(showtimeId)}`;

          await firstValueFrom(http.delete(url));
          await this.loadSeatMapFromApi(showtimeId);
          return { ok: true };
        } catch (err) {
          const httpErr = err as HttpErrorResponse;
          return {
            ok: false,
            message: httpErr?.error?.error?.message || 'Không thể nhả ghế.',
          };
        }
      },

      setHoldRemainingSeconds(sec: number): void {
        patchState(store, { holdRemainingSeconds: Math.max(0, sec) });
      },

      clearSelectedSeats(): void {
        patchState(store, { selectedSeats: [] });
      },

      toggleSeat(
        id: string,
        zone: 'normal' | 'vip' | 'sweetbox',
        customPrice?: number,
        seatId?: string,
      ): { ok: boolean; reason?: string } {
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
          updatedSeats = [
            ...current,
            {
              id,
              ...(seatId ? { seatId } : {}),
              zone,
              price: customPrice ?? seatPriceForZone(zone),
            },
          ];
        }

        patchState(store, { selectedSeats: updatedSeats });
        snapshotAndPersist();

        return { ok: true };
      },

      applyVoucher(rawCode: string): { ok: boolean; message: string } {
        const code = rawCode.trim().toUpperCase();
        const entry = VOUCHER_CATALOG[code];
        if (!entry) {
          return {
            ok: false,
            message: 'Mã giảm giá không hợp lệ. Thử CINEHUB50, GALAXY30 hoặc VIP2026.',
          };
        }
        patchState(store, {
          voucherCode: code,
          discountAmount: entry.amount,
        });
        snapshotAndPersist();

        return { ok: true, message: `Đã áp dụng ${code}: ${entry.label}` };
      },

      async validateVoucherOnServer(
        rawCode: string,
        concessionSubtotal = 0,
      ): Promise<{ ok: boolean; message: string }> {
        const code = rawCode.trim().toUpperCase();
        if (!code) {
          return { ok: false, message: 'Vui lòng nhập mã voucher.' };
        }
        if (!http) {
          return this.applyVoucher(code);
        }

        try {
          const subtotal = store.seatsSubtotal() + concessionSubtotal;
          const res = await firstValueFrom(
            http.post<{
              data?: {
                valid: boolean;
                code: string;
                discountAmount: number;
                message: string;
              };
            }>('/api/v1/booking/vouchers/validate', {
              code,
              bookingId: store.bookingId() || undefined,
              subtotalAmount: subtotal,
            }),
          );
          const data = res?.data;
          if (!data || !data.valid) {
            return { ok: false, message: data?.message || 'Mã giảm giá không hợp lệ.' };
          }
          patchState(store, {
            voucherCode: data.code,
            discountAmount: data.discountAmount,
          });
          snapshotAndPersist();
          return { ok: true, message: data.message };
        } catch (err) {
          const httpErr = err as HttpErrorResponse;
          if (httpErr?.status === 0) {
            return this.applyVoucher(code);
          }
          const msg =
            httpErr?.error?.error?.message ||
            'Mã giảm giá không tồn tại, đã hết hạn hoặc không đủ điều kiện.';
          return { ok: false, message: msg };
        }
      },

      async checkoutOnServer(
        concessions: readonly {
          concessionId: string;
          name?: string;
          quantity: number;
          unitPrice: number;
        }[],
      ): Promise<{
        ok: boolean;
        bookingId?: string;
        bookingCode?: string;
        totalAmount?: number;
        message?: string;
      }> {
        if (!http) {
          return { ok: true };
        }
        try {
          const res = await firstValueFrom(
            http.post<{
              data?: {
                bookingId: string;
                bookingCode: string;
                discountAmount: number;
                totalAmount: number;
                expiresAt: string;
              };
            }>('/api/v1/booking/checkout', {
              bookingId: store.bookingId() || undefined,
              showtimeId: store.showtimeId() || undefined,
              seatIds: store.selectedSeats().map((s) => s.id),
              concessions,
              voucherCode: store.voucherCode() || undefined,
              paymentMethod: store.paymentMethod(),
            }),
          );
          const data = res?.data;
          if (data) {
            patchState(store, {
              bookingId: data.bookingId,
              bookingCode: data.bookingCode,
              discountAmount: data.discountAmount,
              holdExpiresAt: data.expiresAt,
            });
            snapshotAndPersist();
            return {
              ok: true,
              bookingId: data.bookingId,
              bookingCode: data.bookingCode,
              totalAmount: data.totalAmount,
            };
          }
          return { ok: true };
        } catch (err) {
          const httpErr = err as HttpErrorResponse;
          return {
            ok: false,
            message:
              httpErr?.error?.error?.message ||
              'Phiên giữ ghế đã hết hạn hoặc có lỗi khi chốt đơn hàng.',
          };
        }
      },

      async loadMyTicketsFromApi(): Promise<void> {
        if (!http) return;
        try {
          const res = await firstValueFrom(
            http.get<{ data?: IssuedTicket[] }>('/api/v1/booking/tickets'),
          );
          const tickets = res?.data;
          if (Array.isArray(tickets) && tickets.length > 0) {
            patchState(store, { issuedTickets: tickets });
            snapshotAndPersist();
          }
        } catch {
          // Keep existing in-memory tickets if unauthenticated or offline
        }
      },

      async loadTicketByIdFromApi(ticketId: string): Promise<IssuedTicket | null> {
        if (!http || !ticketId) return this.findTicketById(ticketId);
        try {
          const res = await firstValueFrom(
            http.get<{ data?: IssuedTicket }>(
              `/api/v1/booking/tickets/${encodeURIComponent(ticketId)}`,
            ),
          );
          const ticket = res?.data;
          if (ticket) {
            const existing = store.issuedTickets().filter((t) => t.id !== ticket.id);
            patchState(store, { issuedTickets: [ticket, ...existing] });
            snapshotAndPersist();
            return ticket;
          }
        } catch {
          // Fallback to local store
        }
        return this.findTicketById(ticketId);
      },

      recordServerConfirmedTicket(ticket: IssuedTicket): void {
        const existing = store.issuedTickets().filter((t) => t.id !== ticket.id);
        patchState(store, {
          issuedTickets: [ticket, ...existing],
          selectedSeats: [],
          bookingId: null,
          bookingCode: null,
          holdExpiresAt: null,
          voucherCode: null,
          discountAmount: 0,
        });
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // ignore
        }
      },

      setPaymentMethod(paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY' | 'DEMO'): void {
        patchState(store, { paymentMethod });
      },

      completeCheckout(concessionTotal: number): IssuedTicket {
        const seats = store.selectedSeats().map((s) => s.id);
        const subtotal = store.seatsSubtotal() + concessionTotal;
        const totalPaid = Math.max(0, subtotal - store.discountAmount());
        const ticketId = `tkt-${Date.now()}`;
        const bookingCode =
          store.bookingCode() || `CH-${String(Math.floor(100000 + Math.random() * 900000))}`;

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
          bookingId: null,
          bookingCode: null,
          holdExpiresAt: null,
          voucherCode: null,
          discountAmount: 0,
        });

        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // ignore
        }

        return ticket;
      },

      findTicketById(id: string): IssuedTicket | null {
        return (
          store
            .issuedTickets()
            .find((t) => t.id === id || t.bookingCode === id || t.bookingId === id) ??
          store.issuedTickets()[0] ??
          null
        );
      },
    };
  }),
);
