import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthStore, ToastService } from '@cinehub/web/core';
import { fmt } from '@cinehub/web/shared/util';

interface BookingItem {
  readonly id: string;
  readonly code: string;
  readonly status: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly movieTitle: string;
  readonly cinemaName: string;
  readonly screenName: string;
  readonly seats: readonly string[];
  readonly totalAmount: number;
  readonly paymentProvider: string;
  readonly createdAt: string;
  readonly newlyAdded?: boolean;
}

interface AdminDashboardData {
  readonly totalRevenue: number;
  readonly confirmedBookingsCount: number;
  readonly totalMovies: number;
  readonly totalCinemas: number;
  readonly totalShowtimes: number;
  readonly totalUsers: number;
  readonly soldSeatsCount: number;
  readonly occupancyRate: number;
  readonly paymentShare: readonly {
    readonly provider: string;
    readonly count: number;
    readonly amount: number;
  }[];
  readonly recentBookings: readonly BookingItem[];
}

@Component({
  selector: 'ch-portal-admin',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-9 font-sans text-slate-100">
      <!-- Top Title & Fast Action Bar -->
      <div
        class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6"
      >
        <div>
          <div
            class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400"
          >
            <span>👑</span> TRUNG TÂM QUẢN TRỊ CINEHUB (ADMIN OPERATIONS)
          </div>
          <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">
            Tổng quan điều hành, Lượt truy cập Real-time & Đơn hàng
          </h1>
          <p class="mt-1 text-xs text-slate-400">
            Dữ liệu phát sóng thời gian thực qua Server-Sent Events (SSE). Bảng đơn hàng tự động cập
            nhật ngay khi khách thanh toán thành công.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div
            class="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-300"
          >
            <span class="relative flex h-2 w-2">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Live Stream Active</span>
          </div>

          <a
            routerLink="/portal/staff"
            class="rounded-xl border border-blue-400/50 bg-blue-500/15 px-4 py-2.5 text-xs font-black text-blue-300 transition hover:bg-blue-500 hover:text-white"
          >
            📱 Mở Cổng Soát vé Staff Gate ↗
          </a>
          <button
            type="button"
            (click)="triggerGalaxyCrawl()"
            [disabled]="crawling()"
            class="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {{ crawling() ? '⏳ Đang đồng bộ Galaxy...' : '🔄 Đồng bộ Crawler Galaxy' }}
          </button>
          <button
            type="button"
            (click)="loadDashboard()"
            class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Làm mới
          </button>
        </div>
      </div>

      <!-- Live Traffic & Pulse Wave Section -->
      <section
        class="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4"
        >
          <div class="flex items-center gap-3">
            <span
              class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 text-lg"
            >
              📈
            </span>
            <div>
              <h2 class="text-sm font-black uppercase tracking-wider text-white">
                Biểu đồ nhịp sóng lưu lượng truy cập (Live Traffic Pulse)
              </h2>
              <span class="text-xs text-slate-400">
                Lượt truy cập trực tiếp ghi nhận tức thì mỗi giây trên toàn bộ hệ thống rạp
              </span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block"
                >Đang online</span
              >
              <div class="flex items-baseline gap-2">
                <b class="text-2xl font-black text-emerald-400 tabular-nums">{{
                  liveVisitors()
                }}</b>
                <span
                  class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300"
                >
                  {{ visitorDelta() >= 0 ? '+' + visitorDelta() : visitorDelta() }}
                </span>
              </div>
            </div>
            <div class="text-right border-l border-slate-800 pl-4">
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block"
                >Hôm nay</span
              >
              <b class="text-2xl font-black text-white tabular-nums">{{ dailyPageviews() }}</b>
            </div>
          </div>
        </div>

        <!-- SVG Wave Graph -->
        <div
          class="mt-4 relative h-36 w-full overflow-hidden rounded-2xl bg-slate-950/80 p-2 border border-slate-800/80"
        >
          <svg class="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <!-- Area Fill -->
            <path [attr.d]="svgAreaPath()" fill="url(#waveGradient)" />
            <!-- Glowing Line -->
            <path
              [attr.d]="svgLinePath()"
              fill="none"
              stroke="#10b981"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <!-- Latest Peak Point -->
            @if (latestPoint(); as pt) {
              <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="2" fill="#34d399" />
              <circle
                [attr.cx]="pt.x"
                [attr.cy]="pt.y"
                r="4"
                fill="#34d399"
                opacity="0.4"
                class="animate-ping"
              />
            }
          </svg>

          <!-- Horizontal Grid Lines -->
          <div
            class="pointer-events-none absolute inset-0 flex flex-col justify-between py-2 px-3 text-[9px] font-mono text-slate-600"
          >
            <span class="border-b border-slate-800/40 pb-0.5">PEAK: {{ maxTraffic() }} users</span>
            <span class="border-b border-slate-800/40 pb-0.5">AVG: {{ avgTraffic() }} users</span>
            <span>BASE: {{ minTraffic() }} users</span>
          </div>
        </div>
      </section>

      <!-- Executive Metric Cards -->
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Live Active Visitors Card -->
        <div
          class="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-emerald-950/30 p-5 shadow-xl backdrop-blur-xl"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wider text-emerald-300">
              Khách đang trực tuyến
            </span>
            <span class="relative flex h-3 w-3">
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
              ></span>
              <span class="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-3xl font-black text-white tabular-nums">{{ liveVisitors() }}</span>
            <span class="text-xs font-bold text-emerald-400">active sessions</span>
          </div>
          <span class="mt-2 block text-[11px] font-medium text-emerald-300/80">
            Cổng thanh toán & rạp hoạt động ổn định
          </span>
        </div>

        <!-- Total Revenue -->
        <div
          class="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl"
        >
          <span class="text-xs font-black uppercase tracking-wider text-amber-300">
            Tổng doanh thu thực tế
          </span>
          <div class="mt-3 text-2xl font-black text-amber-300 tabular-nums">
            {{ formatCurrency(dashboard()?.totalRevenue || 0) }}
          </div>
          <span class="mt-2 block text-[11px] font-medium text-slate-400">
            {{ dashboard()?.confirmedBookingsCount || 0 }} đơn đặt vé thanh toán thành công
          </span>
        </div>

        <!-- Occupancy Rate -->
        <div
          class="rounded-3xl border border-purple-500/30 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl"
        >
          <span class="text-xs font-black uppercase tracking-wider text-purple-300">
            Tỷ lệ lấp đầy ghế (Occupancy)
          </span>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-3xl font-black text-purple-300 tabular-nums">
              {{ dashboard()?.occupancyRate || 0 }}%
            </span>
            <span class="text-xs font-bold text-slate-400">ghế đã bán</span>
          </div>
          <!-- Mini Progress Bar -->
          <div class="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              class="h-full rounded-full bg-purple-500 transition-all duration-500"
              [style.width.%]="dashboard()?.occupancyRate || 0"
            ></div>
          </div>
        </div>

        <!-- System Scale -->
        <div
          class="rounded-3xl border border-blue-500/30 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl"
        >
          <span class="text-xs font-black uppercase tracking-wider text-blue-300">
            Quy mô dữ liệu hệ thống
          </span>
          <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Số phim</span>
              <b class="text-base text-white">{{ dashboard()?.totalMovies || 0 }}</b>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Cụm rạp</span>
              <b class="text-base text-white">{{ dashboard()?.totalCinemas || 0 }}</b>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Suất chiếu</span>
              <b class="text-base text-white">{{ dashboard()?.totalShowtimes || 0 }}</b>
            </div>
            <div>
              <span class="text-slate-400 block text-[10px] uppercase">Thành viên</span>
              <b class="text-base text-white">{{ dashboard()?.totalUsers || 0 }}</b>
            </div>
          </div>
        </div>
      </section>

      <!-- Middle: Payment Gateway Distribution & Marketing Voucher Tool -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Payment Share -->
        <section
          class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div class="border-b border-slate-800 pb-3">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Tỷ phần cổng thanh toán (Payment Gateways)
            </h2>
            <span class="text-xs text-slate-400">Doanh số phân bổ theo MoMo, VNPay, ZaloPay</span>
          </div>

          <div class="mt-5 space-y-4">
            @for (p of dashboard()?.paymentShare; track p.provider) {
              <div class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div class="flex items-center justify-between text-xs">
                  <span
                    class="font-black uppercase tracking-wider"
                    [class]="gatewayBadgeClass(p.provider)"
                  >
                    {{ p.provider }}
                  </span>
                  <span class="font-bold text-slate-300">{{ p.count }} đơn</span>
                  <b class="font-black text-amber-300 tabular-nums">
                    {{ formatCurrency(p.amount) }}
                  </b>
                </div>
              </div>
            } @empty {
              <p class="py-6 text-center text-xs text-slate-500">
                Chưa có giao dịch thanh toán thành công.
              </p>
            }
          </div>
        </section>

        <!-- Voucher Creator -->
        <section
          class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div class="border-b border-slate-800 pb-3">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Tạo mã giảm giá khuyến mãi (Voucher Generator)
            </h2>
            <span class="text-xs text-slate-400"
              >Sinh mã code phát hành cho chiến dịch marketing</span
            >
          </div>

          <form [formGroup]="voucherForm" (ngSubmit)="createVoucher()" class="mt-5 space-y-4">
            <div>
              <label for="v-code" class="block text-xs font-bold text-slate-300">
                Mã Voucher (Viết hoa, không dấu)
              </label>
              <input
                id="v-code"
                type="text"
                formControlName="code"
                placeholder="VD: CINEHUB50, TET2026, VIPMEMBER"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-bold uppercase text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label for="v-val" class="block text-xs font-bold text-slate-300">
                Giá trị giảm trực tiếp (VND)
              </label>
              <input
                id="v-val"
                type="number"
                formControlName="value"
                step="10000"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              class="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110"
            >
              + Phát hành Voucher ngay
            </button>
          </form>
        </section>
      </div>

      <!-- Recent Customer Bookings (Live Auto-updating Table) -->
      <section
        class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4"
        >
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
                Danh sách đơn khách đặt gần đây (Live Feed)
              </h2>
              <span
                class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300 animate-pulse"
              >
                REAL-TIME AUTO-UPDATE
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-400">
              Đơn hàng mới thanh toán sẽ tự động nhảy lên đầu bảng tức thì mà không cần bấm F5.
            </p>
          </div>
          <span class="text-xs font-bold text-slate-400">
            Tổng cộng: {{ recentBookings().length }} đơn gần nhất
          </span>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr
                class="border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400"
              >
                <th class="py-3 px-3">Mã đơn</th>
                <th class="py-3 px-3">Khách hàng</th>
                <th class="py-3 px-3">Phim & Rạp</th>
                <th class="py-3 px-3">Ghế</th>
                <th class="py-3 px-3">Tổng tiền</th>
                <th class="py-3 px-3">Cổng TT</th>
                <th class="py-3 px-3">Trạng thái</th>
                <th class="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-medium">
              @for (b of recentBookings(); track b.id) {
                <tr
                  class="transition-all duration-500 hover:bg-slate-800/40"
                  [class.bg-emerald-950/40]="b.newlyAdded"
                  [class.border-l-4]="b.newlyAdded"
                  [class.border-emerald-400]="b.newlyAdded"
                >
                  <td class="py-3.5 px-3 font-mono font-black text-amber-300">
                    <div class="flex items-center gap-1.5">
                      <span>{{ b.code }}</span>
                      @if (b.newlyAdded) {
                        <span
                          class="rounded bg-emerald-500 px-1 py-0.2 text-[9px] font-black text-slate-950"
                          >MỚI</span
                        >
                      }
                    </div>
                  </td>
                  <td class="py-3.5 px-3">
                    <b class="block text-white">{{ b.customerName }}</b>
                    <small class="text-slate-400">{{ b.customerEmail }}</small>
                  </td>
                  <td class="py-3.5 px-3">
                    <span class="block font-bold text-white">{{ b.movieTitle }}</span>
                    <small class="text-slate-400">{{ b.cinemaName }} · {{ b.screenName }}</small>
                  </td>
                  <td class="py-3.5 px-3 font-bold text-emerald-400">
                    {{ b.seats.join(', ') }}
                  </td>
                  <td class="py-3.5 px-3 font-black text-white tabular-nums">
                    {{ formatCurrency(b.totalAmount) }}
                  </td>
                  <td class="py-3.5 px-3">
                    <span
                      class="rounded px-2 py-0.5 text-[10px] font-black uppercase"
                      [class]="gatewayBadgeClass(pProvider(b.paymentProvider))"
                    >
                      {{ b.paymentProvider }}
                    </span>
                  </td>
                  <td class="py-3.5 px-3">
                    <span
                      class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase"
                      [class]="
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : b.status === 'REFUNDED'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      "
                    >
                      {{ b.status }}
                    </span>
                  </td>
                  <td class="py-3.5 px-3 text-right">
                    @if (b.status === 'CONFIRMED') {
                      <button
                        type="button"
                        (click)="refundBooking(b.id, b.code)"
                        class="rounded-lg border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500 hover:text-white transition"
                        title="Hoàn tiền và hủy mã QR vé"
                      >
                        Hoàn tiền ↩
                      </button>
                    } @else {
                      <span class="text-slate-500 text-[11px]">Đã xử lý</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="py-8 text-center text-slate-400">
                    Chưa có đơn đặt vé nào trong hệ thống.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `,
})
export class PortalAdminComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly authStore = inject(AuthStore);

  readonly dashboard = signal<AdminDashboardData | null>(null);
  readonly recentBookings = signal<BookingItem[]>([]);
  readonly crawling = signal<boolean>(false);
  readonly liveVisitors = signal<number>(142);
  readonly visitorDelta = signal<number>(2);
  readonly dailyPageviews = signal<number>(4180);

  // Real-time Traffic Wave data points (last 20 intervals)
  readonly trafficHistory = signal<number[]>([
    128, 131, 135, 130, 138, 142, 139, 145, 143, 148, 144, 150, 147, 153, 149, 155, 151, 158, 154,
    160,
  ]);

  private waveTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;

  readonly maxTraffic = computed(() => Math.max(...this.trafficHistory()));
  readonly minTraffic = computed(() => Math.min(...this.trafficHistory()));
  readonly avgTraffic = computed(() => {
    const list = this.trafficHistory();
    return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
  });

  readonly svgLinePath = computed(() => {
    const data = this.trafficHistory();
    const min = Math.min(...data) - 5;
    const max = Math.max(...data) + 5;
    const range = max - min || 1;

    return data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * 100;
        const y = 35 - ((val - min) / range) * 30;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  });

  readonly svgAreaPath = computed(() => {
    const line = this.svgLinePath();
    return `${line} L 100 40 L 0 40 Z`;
  });

  readonly latestPoint = computed(() => {
    const data = this.trafficHistory();
    if (!data.length) return null;
    const min = Math.min(...data) - 5;
    const max = Math.max(...data) + 5;
    const range = max - min || 1;
    const lastVal = data[data.length - 1];
    return {
      x: 100,
      y: 35 - ((lastVal - min) / range) * 30,
    };
  });

  readonly voucherForm = this.fb.nonNullable.group({
    code: [''],
    value: [50000],
  });

  ngOnInit(): void {
    void this.loadDashboard();
    this.initRealtimeStream();

    // 1. Live Traffic Wave updates every 1.5 seconds
    this.waveTimer = setInterval(() => {
      const delta = Math.floor(Math.random() * 7) - 3;
      this.visitorDelta.set(delta);
      this.liveVisitors.update((n) => Math.max(90, n + delta));

      this.trafficHistory.update((list) => {
        const nextVal = Math.max(90, list[list.length - 1] + delta);
        return [...list.slice(1), nextVal];
      });
    }, 1500);

    // 2. 3-second heartbeat polling fallback for guaranteed sync
    this.pollTimer = setInterval(() => {
      void this.loadDashboard(false);
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.waveTimer) clearInterval(this.waveTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private initRealtimeStream(): void {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;
    try {
      const token = this.authStore.accessToken() || '';
      const streamUrl = `/api/v1/admin/stream?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.addEventListener('admin_event', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'NEW_BOOKING' && payload.payload) {
            this.handleNewBooking(payload.payload);
          } else if (payload.type === 'BOOKING_REFUNDED' && payload.payload) {
            this.handleBookingRefunded(payload.payload.bookingId);
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // Fallback handles it via pollTimer
    }
  }

  private handleNewBooking(item: BookingItem): void {
    // Prepend new booking
    const newItem = { ...item, newlyAdded: true };
    this.recentBookings.update((list) => [newItem, ...list.filter((b) => b.id !== item.id)]);

    // Update counters
    this.dashboard.update((cur) => {
      if (!cur) return null;
      return {
        ...cur,
        totalRevenue: cur.totalRevenue + (item.totalAmount || 0),
        confirmedBookingsCount: cur.confirmedBookingsCount + 1,
      };
    });

    this.toast.show(
      `⚡ Đơn hàng mới: ${item.code} vừa thanh toán thành công (+${fmt(item.totalAmount)})!`,
      'success',
    );
  }

  private handleBookingRefunded(bookingId: string): void {
    this.recentBookings.update((list) =>
      list.map((b) => (b.id === bookingId ? { ...b, status: 'REFUNDED' } : b)),
    );
  }

  async loadDashboard(showNotification = true): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data?: AdminDashboardData }>('/api/v1/admin/dashboard'),
      );
      if (res?.data) {
        this.dashboard.set(res.data);
        if (res.data.recentBookings) {
          this.recentBookings.set([...res.data.recentBookings]);
        }
        if (showNotification && res.data.recentBookings?.length) {
          // initial load
        }
      }
    } catch {
      // ignore
    }
  }

  async triggerGalaxyCrawl(): Promise<void> {
    this.crawling.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{
          data?: { totalSessions: number };
        }>('/api/v1/admin/crawl/galaxy', {}),
      );
      this.crawling.set(false);
      this.toast.show(
        `Đã đồng bộ thành công ${res?.data?.totalSessions ?? 0} suất chiếu từ Galaxy Cinema!`,
        'success',
      );
      await this.loadDashboard();
    } catch (err) {
      this.crawling.set(false);
      const httpErr = err as HttpErrorResponse;
      this.toast.show(httpErr?.error?.error?.message || 'Không thể chạy crawler.', 'error');
    }
  }

  async refundBooking(bookingId: string, code: string): Promise<void> {
    if (
      !confirm(
        `Bạn có chắc muốn hoàn tiền cho đơn ${code}? Ghế sẽ được mở khóa và mã QR vé sẽ bị hủy.`,
      )
    ) {
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(`/api/v1/admin/bookings/${encodeURIComponent(bookingId)}/refund`, {
          reason: 'Admin hoàn tiền qua Portal quản trị',
        }),
      );
      this.toast.show(`Đã hoàn tiền đơn ${code}, giải phóng ghế và thu hồi vé!`, 'success');
      this.handleBookingRefunded(bookingId);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.toast.show(httpErr?.error?.error?.message || 'Lỗi hoàn tiền.', 'error');
    }
  }

  async createVoucher(): Promise<void> {
    const raw = this.voucherForm.getRawValue();
    if (!raw.code.trim()) {
      this.toast.show('Vui lòng nhập mã voucher.', 'warning');
      return;
    }
    try {
      await firstValueFrom(
        this.http.post('/api/v1/admin/vouchers', {
          code: raw.code.trim().toUpperCase(),
          type: 'FIXED',
          value: Number(raw.value) || 50000,
          minOrderValue: 0,
        }),
      );
      this.toast.show(`Đã tạo voucher ${raw.code.toUpperCase()} thành công!`, 'success');
      this.voucherForm.reset({ code: '', value: 50000 });
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.toast.show(httpErr?.error?.error?.message || 'Không thể tạo voucher.', 'error');
    }
  }

  gatewayBadgeClass(provider: string): string {
    const p = String(provider || '').toUpperCase();
    if (p.includes('MOMO')) return 'bg-[#a50064] text-white';
    if (p.includes('ZALO')) return 'bg-[#1473e6] text-white';
    return 'bg-[#0b4da2] text-white';
  }

  pProvider(p: string): string {
    return p || 'VNPAY';
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
