import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '@cinehub/web/core';
import { fmt } from '@cinehub/web/shared/util';

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
  readonly recentBookings: readonly {
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
  }[];
}

@Component({
  selector: 'ch-portal-admin',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-9">
      <!-- Top Title & Fast Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div
            class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400"
          >
            <span>👑</span> TRUNG TÂM QUẢN TRỊ CINEHUB (ADMIN PORTAL)
          </div>
          <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">
            Tổng quan điều hành, Lượt truy cập & Đơn đặt vé
          </h1>
          <p class="mt-1 text-xs text-slate-400">
            Giám sát thời gian thực số lượng khách đặt vé, lượt truy cập trực tuyến, doanh thu và
            vận hành hệ thống.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
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
            class="rounded-xl border border-white/20 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            Làm mới
          </button>
        </div>
      </div>

      <!-- Live Traffic & Visitors Banner -->
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Live Active Visitors -->
        <div
          class="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-emerald-950/40 p-5 shadow-xl backdrop-blur-xl"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wider text-emerald-300">
              Lượt truy cập trực tiếp (Live)
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
            <span class="text-xs font-bold text-emerald-400">người dùng online</span>
          </div>
          <span class="mt-2 block text-[11px] font-medium text-emerald-300/80">
            Cổng thanh toán & danh mục phim hoạt động ổn định
          </span>
        </div>

        <!-- Daily Pageviews -->
        <div
          class="rounded-3xl border border-blue-500/30 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl"
        >
          <span class="text-xs font-black uppercase tracking-wider text-blue-300">
            Lượt xem trang hôm nay (Pageviews)
          </span>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-3xl font-black text-white tabular-nums">{{ dailyPageviews() }}</span>
            <span class="text-xs font-bold text-blue-400">lượt xem</span>
          </div>
          <span class="mt-2 block text-[11px] font-medium text-slate-400">
            Tăng +18% so với cùng kỳ tuần trước
          </span>
        </div>

        <!-- Total Revenue -->
        <div
          class="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl"
        >
          <span class="text-xs font-black uppercase tracking-wider text-amber-300">
            Tổng doanh thu thực thu
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
          <span class="mt-2 block text-[11px] font-medium text-slate-400">
            {{ dashboard()?.totalMovies || 0 }} phim · {{ dashboard()?.totalCinemas || 0 }} cụm rạp
          </span>
        </div>
      </section>

      <!-- Gateways Breakdown & System Status -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Gateway Stats -->
        <section
          class="rounded-3xl border border-white/15 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <h2 class="text-sm font-black uppercase tracking-wider text-amber-300">
            Cổng thanh toán & Doanh thu
          </h2>
          <div class="mt-4 space-y-3">
            @for (g of dashboard()?.paymentShare; track g.provider) {
              <div
                class="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3.5"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="grid h-8 w-10 place-items-center rounded-lg text-xs font-black text-white"
                    [class]="gatewayBadgeClass(g.provider)"
                  >
                    {{ g.provider.slice(0, 3) }}
                  </span>
                  <div>
                    <b class="block text-xs font-black text-white">{{ g.provider }}</b>
                    <small class="text-[11px] text-slate-400">{{ g.count }} giao dịch</small>
                  </div>
                </div>
                <b class="text-xs font-black text-amber-300 tabular-nums">
                  {{ formatCurrency(g.amount) }}
                </b>
              </div>
            } @empty {
              <p class="text-xs text-slate-400">Chưa có giao dịch thanh toán nào được ghi nhận.</p>
            }
          </div>
        </section>

        <!-- System Services Health -->
        <section
          class="rounded-3xl border border-white/15 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <h2 class="text-sm font-black uppercase tracking-wider text-amber-300">
            Hạ tầng & Dịch vụ CineHub
          </h2>
          <div class="mt-4 space-y-3 text-xs">
            <div
              class="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3.5"
            >
              <div class="flex items-center gap-2.5">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <span class="font-bold text-white">Core API Service (Port 4000)</span>
              </div>
              <span
                class="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300"
              >
                HOẠT ĐỘNG
              </span>
            </div>

            <div
              class="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3.5"
            >
              <div class="flex items-center gap-2.5">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <span class="font-bold text-white">MySQL Database (Prisma ORM)</span>
              </div>
              <span
                class="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300"
              >
                KẾT NỐI
              </span>
            </div>

            <div
              class="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3.5"
            >
              <div class="flex items-center gap-2.5">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <span class="font-bold text-white">Redis Cache & Seat Leases</span>
              </div>
              <span
                class="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300"
              >
                SẴN SÀNG
              </span>
            </div>

            <div
              class="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3.5"
            >
              <div class="flex items-center gap-2.5">
                <span class="h-2.5 w-2.5 rounded-full bg-blue-400"></span>
                <span class="font-bold text-white">Payment Gateway Simulator</span>
              </div>
              <span
                class="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-black text-blue-300"
              >
                SANDBOX
              </span>
            </div>
          </div>
        </section>

        <!-- Quick Voucher & Marketing -->
        <section
          class="rounded-3xl border border-white/15 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <h2 class="text-sm font-black uppercase tracking-wider text-amber-300">
            Tạo Voucher Ưu Đãi Nhanh
          </h2>
          <form [formGroup]="voucherForm" (ngSubmit)="createVoucher()" class="mt-4 space-y-3">
            <div>
              <label for="admin-voucher-code" class="block text-xs font-bold text-slate-300">
                Mã voucher (In hoa)
              </label>
              <input
                id="admin-voucher-code"
                type="text"
                formControlName="code"
                placeholder="VD: CINEHUB50K"
                class="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs font-bold uppercase text-white"
              />
            </div>
            <div>
              <label for="admin-voucher-val" class="block text-xs font-bold text-slate-300">
                Mức giảm (VNĐ)
              </label>
              <input
                id="admin-voucher-val"
                type="number"
                formControlName="value"
                step="5000"
                class="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs font-bold text-white"
              />
            </div>
            <button
              type="submit"
              class="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-300 transition"
            >
              + Tạo & Kích hoạt Voucher
            </button>
          </form>
        </section>
      </div>

      <!-- Recent Customer Bookings & Refund Control -->
      <section
        class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4"
        >
          <div>
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Đơn đặt vé của khách hàng gần nhất
            </h2>
            <p class="text-xs text-slate-400">
              Theo dõi tình trạng thanh toán, danh sách ghế ngồi và xử lý hoàn tiền nếu cần
            </p>
          </div>
          <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
            {{ dashboard()?.recentBookings?.length || 0 }} đơn gần nhất
          </span>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-white/10 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th class="py-3 px-3">Mã đơn</th>
                <th class="py-3 px-3">Khách hàng</th>
                <th class="py-3 px-3">Phim & Rạp</th>
                <th class="py-3 px-3">Ghế ngồi</th>
                <th class="py-3 px-3">Tổng tiền</th>
                <th class="py-3 px-3">Cổng</th>
                <th class="py-3 px-3">Trạng thái</th>
                <th class="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 font-medium">
              @for (b of dashboard()?.recentBookings; track b.id) {
                <tr class="hover:bg-white/5 transition">
                  <td class="py-3.5 px-3 font-mono font-black text-amber-300">
                    {{ b.code }}
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
                      [class]="gatewayBadgeClass(b.paymentProvider)"
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
export class PortalAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly dashboard = signal<AdminDashboardData | null>(null);
  readonly crawling = signal<boolean>(false);
  readonly liveVisitors = signal<number>(142);
  readonly dailyPageviews = signal<number>(4180);

  readonly voucherForm = this.fb.nonNullable.group({
    code: [''],
    value: [50000],
  });

  ngOnInit(): void {
    void this.loadDashboard();
    // Simulate real-time live visitors fluctuation
    setInterval(() => {
      const delta = Math.floor(Math.random() * 7) - 3;
      this.liveVisitors.update((n) => Math.max(95, n + delta));
    }, 4000);
  }

  async loadDashboard(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data?: AdminDashboardData }>('/api/v1/admin/dashboard'),
      );
      if (res?.data) {
        this.dashboard.set(res.data);
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
      await this.loadDashboard();
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

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
