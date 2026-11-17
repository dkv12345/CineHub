import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { fmt } from '@cinehub/web/shared/util';

interface BackendBooking {
  id: string;
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  totalAmount: number;
  contactEmail: string;
  qrCode?: string;
  qrDataUrl?: string;
  showtime?: {
    movie?: { title: string };
    cinema?: { name: string };
    auditorium?: { name: string };
    startTime?: string;
    format?: string;
  };
  seats?: Array<{
    seatLabel: string;
    price: number;
  }>;
  tickets?: Array<{
    id: string;
    qrCode: string;
    qrDataUrl?: string;
    status: string;
  }>;
  payments?: Array<{
    provider: string;
    status: string;
  }>;
}

@Component({
  selector: 'ch-result-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="relative grid min-h-screen place-items-center bg-[#020617] px-5 py-12 text-white selection:bg-amber-400 selection:text-black"
    >
      <div class="relative z-10 w-full max-w-[560px] text-center">
        @if (isLoading()) {
          <div
            class="rounded-3xl border border-white/20 bg-slate-900/60 p-8 text-center backdrop-blur-xl"
          >
            <div
              class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"
            ></div>
            <h2 class="mt-4 text-xl font-black text-amber-300">Đang đối soát thanh toán...</h2>
            <p class="mt-2 text-xs text-slate-400">
              Vui lòng chờ trong giây lát trong khi hệ thống xác nhận giao dịch.
            </p>
          </div>
        } @else if (isFailed()) {
          <div
            class="rounded-3xl border border-red-500/30 bg-slate-900/60 p-8 text-center backdrop-blur-xl"
          >
            <div
              class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-500/20 text-red-400"
            >
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 class="mt-4 text-2xl font-black text-red-400">Thanh toán chưa hoàn tất</h2>
            <p class="mt-2 text-xs text-slate-300">
              Giao dịch chưa được xác nhận hoặc đã hết hạn giữ chỗ.
            </p>
            <div class="mt-6 flex justify-center gap-3">
              <a
                routerLink="/showtimes"
                class="rounded-xl bg-amber-400 px-6 py-3 text-xs font-black text-black"
              >
                Đặt lại vé khác
              </a>
            </div>
          </div>
        } @else if (displayData(); as t) {
          <!-- Success State -->
          <div
            class="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)] backdrop-blur-md"
          >
            <svg
              viewBox="0 0 24 24"
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 class="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Cảm ơn bạn đã đặt vé!
          </h1>
          <p class="mt-2 text-xs font-bold leading-relaxed text-white/90 sm:text-sm">
            Vé đã được gửi tới email <b class="text-amber-300">{{ t.email }}</b> và lưu trong mục
            <b class="text-amber-300">Vé của tôi</b>.
          </p>

          <!-- Khung Thông Tin Đơn Hàng -->
          <div
            class="mt-8 rounded-3xl border border-white/20 bg-slate-900/60 p-6 text-left shadow-2xl backdrop-blur-xl sm:p-8"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <small class="text-xs font-black uppercase tracking-wider text-amber-300">
                  Mã đơn hàng
                </small>
                <b
                  class="mt-1 block text-2xl font-black tracking-widest tabular-nums text-amber-300"
                >
                  {{ t.bookingCode }}
                </b>
              </div>
              <span
                class="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400"
              >
                Thành công
              </span>
            </div>

            <dl class="mt-5 space-y-3.5 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-white/70">Phim</dt>
                <dd class="text-right font-black text-white">{{ t.movieTitle }}</dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-white/70">Suất chiếu</dt>
                <dd class="text-right font-black text-white">
                  {{ t.showTime }} · <span class="text-amber-300">{{ t.format }}</span>
                </dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-white/70">Rạp chiếu</dt>
                <dd class="text-right font-black text-white">{{ t.cinemaName }}</dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-white/70">Phòng chiếu</dt>
                <dd class="text-right font-black text-white">{{ t.screenName }}</dd>
              </div>

              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-white/70">Ghế ngồi</dt>
                <dd class="text-right font-black text-emerald-400">{{ t.seats.join(', ') }}</dd>
              </div>

              <div class="flex justify-between gap-4 border-t border-white/10 pt-3">
                <dt class="font-semibold text-white/70">Tổng thanh toán</dt>
                <dd class="text-right text-lg font-black text-amber-300">
                  {{ formatCurrency(t.totalPaid) }}
                </dd>
              </div>
            </dl>

            <!-- Mã QR Vé Điện Tử Duy Nhất Cho Đơn Đặt Vé -->
            @if (t.singleQrCode) {
              <div class="mt-6 border-t border-white/10 pt-5 text-center">
                <span
                  class="inline-block rounded-full border border-amber-400/40 bg-amber-400/15 px-3.5 py-1 text-xs font-black text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                >
                  Mã QR Check-in vào rạp (Đại diện cho {{ t.seats.length }} ghế)
                </span>
                <p class="mt-2 text-xs font-bold text-slate-300">
                  Xuất trình mã này cho nhân viên soát vé tại cửa phòng chiếu để vào rạp:
                </p>

                <div class="mt-4 flex flex-col items-center">
                  <div
                    class="flex flex-col items-center rounded-3xl bg-white p-5 shadow-2xl text-black"
                  >
                    <img
                      [src]="t.singleQrImage"
                      alt="QR Check-in Vé"
                      class="h-[220px] w-[220px] object-contain rounded-xl"
                      loading="eager"
                    />
                    <div class="mt-3 text-center">
                      <span
                        class="block font-mono text-xs font-black tracking-widest text-slate-900"
                      >
                        {{ t.singleQrCode }}
                      </span>
                      <span
                        class="mt-1.5 inline-block rounded-lg bg-slate-100 px-3 py-1 font-mono text-xs font-black text-slate-800"
                      >
                        Ghế: {{ t.seats.join(', ') }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Action Buttons -->
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                routerLink="/my-tickets"
                class="flex-1 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-3.5 text-center text-xs font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
              >
                Xem vé của bạn
              </a>
              <a
                routerLink="/"
                class="flex-1 rounded-xl border-2 border-white bg-slate-950/40 py-3.5 text-center text-xs font-black text-white transition hover:bg-white hover:text-black"
              >
                Về trang chủ
              </a>
            </div>
          </div>
        }
      </div>
    </main>
  `,
})
export class ResultPageComponent implements OnInit, OnDestroy {
  private readonly store = inject(BookingStore);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly bookingId = input<string>('');
  readonly ticketId = input<string>('');
  readonly bookingState = signal<BackendBooking | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isFailed = signal<boolean>(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  encodeURIComponent(val: string): string {
    return encodeURIComponent(val || '');
  }

  ngOnInit(): void {
    const id =
      this.bookingId() ||
      this.ticketId() ||
      this.route.snapshot.paramMap.get('bookingId') ||
      this.route.snapshot.paramMap.get('ticketId') ||
      this.route.snapshot.queryParamMap.get('bookingId') ||
      '';

    if (!id) {
      this.isLoading.set(false);
      return;
    }

    // 1. Nếu có param từ cổng thanh toán redirect về (resultCode, vnp_ResponseCode, status, orderId, v.v.):
    // Luôn gọi API refresh đối chiếu của backend trước, TUYỆT ĐỐI không tin resultCode trên URL để kết luận thành công!
    const query = this.route.snapshot.queryParams;
    if (
      query['resultCode'] !== undefined ||
      query['vnp_ResponseCode'] !== undefined ||
      query['status'] !== undefined ||
      query['apptransid'] !== undefined
    ) {
      this.http.post<any>(`/api/v1/booking/${id}/payments/refresh`, {}).subscribe({
        next: (res) => {
          if (res.data) this.handleBookingUpdate(res.data);
        },
        error: () => {
          // Bỏ qua lỗi và để polling xử lý tiếp
        },
      });
    }

    // 2. Dùng interval(2500) gọi GET /api/v1/booking/${id} (và đối chiếu) cho đến khi status là CONFIRMED, FAILED hoặc EXPIRED
    this.pollStatus(id);

    // 3. Giới hạn thời gian chờ 30 giây: nếu quá thời gian thì chuyển trạng thái
    this.timeoutTimer = setTimeout(() => {
      if (this.isLoading()) {
        this.isLoading.set(false);
        if (!this.bookingState() || this.bookingState()?.status !== 'CONFIRMED') {
          const localTicket = this.store.findTicketById(id) ?? this.store.issuedTickets()[0];
          if (!localTicket) this.isFailed.set(true);
        }
      }
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private pollStatus(id: string): void {
    const fetchBooking = () => {
      this.http.get<any>(`/api/v1/booking/${id}`).subscribe({
        next: (res) => {
          if (res.data) this.handleBookingUpdate(res.data);
        },
        error: () => {
          // Nếu 404 hoặc không tìm thấy, dừng polling để tránh lặp lỗi và fallback về local store nếu có
          if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
          }
          const localTicket = this.store.findTicketById(id) ?? this.store.issuedTickets()[0];
          if (localTicket) {
            this.isLoading.set(false);
          } else {
            this.isLoading.set(false);
            this.isFailed.set(true);
          }
        },
      });
    };

    fetchBooking();
    this.pollTimer = setInterval(fetchBooking, 2500);
  }

  private handleBookingUpdate(data: BackendBooking): void {
    this.bookingState.set(data);
    if (data.status === 'CONFIRMED') {
      this.isLoading.set(false);
      this.isFailed.set(false);
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    } else if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
      this.isLoading.set(false);
      this.isFailed.set(true);
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }
  }

  formatConfirmedBooking(b: BackendBooking) {
    const singleCode = b.qrCode || b.tickets?.[0]?.qrCode || b.code;
    const singleImage =
      b.qrDataUrl ||
      b.tickets?.[0]?.qrDataUrl ||
      'https://quickchart.io/qr?text=' + encodeURIComponent(singleCode) + '&size=240&margin=2';

    return {
      bookingCode: b.code,
      email: b.contactEmail,
      movieTitle: b.showtime?.movie?.title || 'Phim đã đặt',
      cinemaName: b.showtime?.cinema?.name || 'Rạp CineHub',
      screenName: b.showtime?.auditorium?.name || 'Phòng chiếu',
      showTime: b.showtime?.startTime
        ? new Date(b.showtime.startTime).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Suất chiếu',
      format: b.showtime?.format || '2D',
      seats: (b.seats || []).map((s) => s.seatLabel),
      totalPaid: b.totalAmount,
      singleQrCode: singleCode,
      singleQrImage: singleImage,
    };
  }

  readonly displayData = computed(() => {
    const b = this.bookingState();
    if (b && b.status === 'CONFIRMED') {
      return this.formatConfirmedBooking(b);
    }

    // Fallback to local store ticket if available
    const activeId =
      this.bookingId() ||
      this.ticketId() ||
      this.route.snapshot.paramMap.get('bookingId') ||
      this.route.snapshot.paramMap.get('ticketId') ||
      '';
    const local = this.store.findTicketById(activeId) ?? this.store.issuedTickets()[0];
    if (local) {
      const code = local.qrPayload || local.bookingCode;
      const img =
        local.qrDataUrl ||
        'https://quickchart.io/qr?text=' + encodeURIComponent(code) + '&size=240&margin=2';
      return {
        bookingCode: local.bookingCode,
        email: 'bạn',
        movieTitle: local.movieTitle,
        cinemaName: local.cinemaName,
        screenName: local.screenName,
        showTime: local.showTime,
        format: local.format,
        seats: [...local.seats],
        totalPaid: local.totalPaid,
        singleQrCode: code,
        singleQrImage: img,
      };
    }

    return null;
  });

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
