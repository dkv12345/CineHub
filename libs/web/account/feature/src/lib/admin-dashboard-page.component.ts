import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '@cinehub/web/core';
import { fmt } from '@cinehub/web/shared/util';

interface AdminDashboardData {
  readonly kpis: {
    readonly totalRevenue: number;
    readonly totalBookings: number;
    readonly occupancyRate: number;
    readonly totalUsers: number;
    readonly totalMovies: number;
    readonly totalCinemas: number;
  };
  readonly gatewayStats: readonly {
    readonly gateway: string;
    readonly count: number;
    readonly amount: number;
  }[];
  readonly recentBookings: readonly {
    readonly id: string;
    readonly code: string;
    readonly status: string;
    readonly totalAmount: number;
    readonly customerEmail: string;
    readonly movieTitle: string;
    readonly cinemaName: string;
    readonly seats: readonly string[];
    readonly createdAt: string;
  }[];
  readonly crawlRuns: readonly {
    readonly id: string;
    readonly source: string;
    readonly status: string;
    readonly moviesSynced: number;
    readonly showtimesSynced: number;
    readonly startedAt: string;
  }[];
}

@Component({
  selector: 'ch-admin-dashboard-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[#020617] px-5 py-8 text-white md:px-9">
      <div class="mx-auto max-w-6xl space-y-8">
        <!-- Header & Crawler Trigger -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">
              Cổng quản trị hệ thống · FR-ADM-01..05
            </p>
            <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">
              Bảng điều khiển Quản trị viên (Admin Portal)
            </h1>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              (click)="triggerGalaxyCrawl()"
              [disabled]="crawling()"
              class="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-amber-300 disabled:opacity-50"
            >
              {{ crawling() ? '⏳ Đang đồng bộ Galaxy...' : '🔄 Chạy Crawler Galaxy Cinema' }}
            </button>
            <button
              type="button"
              (click)="loadDashboard()"
              class="rounded-xl border border-white/20 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Làm mới dữ liệu
            </button>
          </div>
        </div>

        <!-- KPI Cards -->
        @if (dashboard(); as d) {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-3xl border border-amber-400/30 bg-slate-900/90 p-5">
              <span class="text-xs font-bold text-slate-400">Tổng doanh thu thực thu</span>
              <div class="mt-2 text-2xl font-black text-amber-300">
                {{ formatCurrency(d.kpis.totalRevenue) }}
              </div>
              <span class="mt-1 block text-[11px] text-emerald-400">
                {{ d.kpis.totalBookings }} đơn đặt vé thành công
              </span>
            </div>

            <div class="rounded-3xl border border-emerald-400/30 bg-slate-900/90 p-5">
              <span class="text-xs font-bold text-slate-400">Tỷ lệ lấp đầy ghế (Occupancy)</span>
              <div class="mt-2 text-2xl font-black text-emerald-400">
                {{ d.kpis.occupancyRate }}%
              </div>
              <span class="mt-1 block text-[11px] text-slate-400">
                Tính trên toàn bộ ShowtimeSeat
              </span>
            </div>

            <div class="rounded-3xl border border-cyan-400/30 bg-slate-900/90 p-5">
              <span class="text-xs font-bold text-slate-400">Danh mục Phim & Rạp</span>
              <div class="mt-2 text-2xl font-black text-cyan-300">
                {{ d.kpis.totalMovies }} phim · {{ d.kpis.totalCinemas }} rạp
              </div>
              <span class="mt-1 block text-[11px] text-slate-400">
                Đồng bộ tự động từ Galaxy API
              </span>
            </div>

            <div class="rounded-3xl border border-purple-400/30 bg-slate-900/90 p-5">
              <span class="text-xs font-bold text-slate-400">Tài khoản thành viên</span>
              <div class="mt-2 text-2xl font-black text-purple-300">
                {{ d.kpis.totalUsers }} người dùng
              </div>
              <span class="mt-1 block text-[11px] text-slate-400">
                RBAC: CUSTOMER / STAFF / ADMIN
              </span>
            </div>
          </div>

          <!-- Recent Bookings & Refund Action -->
          <section class="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Đơn đặt vé gần đây & Hoàn tiền (Refund / Void QR)
            </h2>
            <div class="mt-4 overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-white/10 text-slate-400">
                    <th class="py-2.5 pr-4">Mã đơn</th>
                    <th class="py-2.5 pr-4">Khách hàng</th>
                    <th class="py-2.5 pr-4">Phim & Rạp</th>
                    <th class="py-2.5 pr-4">Ghế</th>
                    <th class="py-2.5 pr-4">Tổng tiền</th>
                    <th class="py-2.5 pr-4">Trạng thái</th>
                    <th class="py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/10">
                  @for (b of d.recentBookings; track b.id) {
                    <tr>
                      <td class="py-3 pr-4 font-mono font-black text-amber-300">{{ b.code }}</td>
                      <td class="py-3 pr-4 text-slate-200">{{ b.customerEmail }}</td>
                      <td class="py-3 pr-4">
                        <b class="text-white">{{ b.movieTitle }}</b>
                        <div class="text-[11px] text-slate-400">{{ b.cinemaName }}</div>
                      </td>
                      <td class="py-3 pr-4 font-bold text-emerald-300">{{ b.seats.join(', ') }}</td>
                      <td class="py-3 pr-4 font-black text-white">
                        {{ formatCurrency(b.totalAmount) }}
                      </td>
                      <td class="py-3 pr-4">
                        <span
                          class="rounded-md px-2 py-0.5 text-[10px] font-black"
                          [class]="
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : b.status === 'REFUNDED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                          "
                        >
                          {{ b.status }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        @if (b.status === 'CONFIRMED') {
                          <button
                            type="button"
                            (click)="refundBooking(b.id, b.code)"
                            class="rounded-lg border border-rose-400/50 bg-rose-500/15 px-3 py-1 text-[11px] font-black text-rose-300 hover:bg-rose-500 hover:text-white transition"
                          >
                            Hoàn tiền & Hủy vé
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }

        <!-- CRUD Forms: Thêm Voucher & Thêm Phim -->
        <div class="grid gap-6 md:grid-cols-2">
          <section class="rounded-3xl border border-white/15 bg-slate-900/90 p-6">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Tạo mã giảm giá (Voucher) mới
            </h2>
            <form [formGroup]="voucherForm" (ngSubmit)="createVoucher()" class="mt-4 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-300">Mã Code</label>
                  <input
                    type="text"
                    formControlName="code"
                    placeholder="SUMMER50"
                    class="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs uppercase text-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300">Mức giảm (VNĐ)</label>
                  <input
                    type="number"
                    formControlName="value"
                    class="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                class="w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-300"
              >
                + Lưu Voucher vào MySQL
              </button>
            </form>
          </section>

          <section class="rounded-3xl border border-white/15 bg-slate-900/90 p-6">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Thêm phim mới vào Catalog
            </h2>
            <form [formGroup]="movieForm" (ngSubmit)="createMovie()" class="mt-4 space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-300">Tên phim</label>
                <input
                  type="text"
                  formControlName="title"
                  placeholder="Lật Mặt 8: Vòng Tay Nắng"
                  class="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-300">Thời lượng (phút)</label>
                  <input
                    type="number"
                    formControlName="durationMinutes"
                    class="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300">Giới hạn tuổi</label>
                  <input
                    type="text"
                    formControlName="ageRating"
                    placeholder="T13"
                    class="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                class="w-full rounded-xl bg-gradient-to-r from-red-600 to-amber-500 py-2.5 text-xs font-black text-white"
              >
                + Tạo Phim & Xoá Cache Redis
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly dashboard = signal<AdminDashboardData | null>(null);
  readonly crawling = signal<boolean>(false);

  readonly voucherForm = this.fb.nonNullable.group({
    code: [''],
    value: [40000],
  });

  readonly movieForm = this.fb.nonNullable.group({
    title: [''],
    durationMinutes: [125],
    ageRating: ['T13'],
  });

  ngOnInit(): void {
    void this.loadDashboard();
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
      // ignore if unauthorized in unit test
    }
  }

  async triggerGalaxyCrawl(): Promise<void> {
    this.crawling.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{
          data?: { moviesSynced: number; showtimesSynced: number };
        }>('/api/v1/admin/crawl/galaxy', {}),
      );
      this.crawling.set(false);
      this.toast.show(
        `Đã đồng bộ ${res?.data?.moviesSynced ?? 0} phim và ${res?.data?.showtimesSynced ?? 0} suất chiếu từ Galaxy Cinema!`,
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
    try {
      await firstValueFrom(
        this.http.post(`/api/v1/admin/bookings/${encodeURIComponent(bookingId)}/refund`, {
          reason: 'Admin hoàn tiền theo yêu cầu khách hàng',
        }),
      );
      this.toast.show(`Đã hoàn tiền đơn ${code}, giải phóng ghế và vô hiệu hóa QR vé!`, 'success');
      await this.loadDashboard();
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.toast.show(httpErr?.error?.error?.message || 'Lỗi hoàn tiền.', 'error');
    }
  }

  async createVoucher(): Promise<void> {
    const raw = this.voucherForm.getRawValue();
    if (!raw.code.trim()) return;
    try {
      await firstValueFrom(
        this.http.post('/api/v1/admin/vouchers', {
          code: raw.code.trim().toUpperCase(),
          type: 'FIXED',
          value: Number(raw.value) || 30000,
          minOrderValue: 0,
        }),
      );
      this.toast.show(`Đã tạo voucher ${raw.code.toUpperCase()} thành công!`, 'success');
      this.voucherForm.reset({ code: '', value: 40000 });
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.toast.show(httpErr?.error?.error?.message || 'Không thể tạo voucher.', 'error');
    }
  }

  async createMovie(): Promise<void> {
    const raw = this.movieForm.getRawValue();
    if (!raw.title.trim()) return;
    try {
      await firstValueFrom(
        this.http.post('/api/v1/admin/movies', {
          title: raw.title.trim(),
          durationMinutes: Number(raw.durationMinutes) || 120,
          ageRating: raw.ageRating || 'T13',
          status: 'NOW_SHOWING',
        }),
      );
      this.toast.show(`Đã tạo phim "${raw.title}" và làm mới cache Redis!`, 'success');
      this.movieForm.reset({ title: '', durationMinutes: 125, ageRating: 'T13' });
      await this.loadDashboard();
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.toast.show(httpErr?.error?.error?.message || 'Không thể tạo phim.', 'error');
    }
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
