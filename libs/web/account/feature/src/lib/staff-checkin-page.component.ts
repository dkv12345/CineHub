import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '@cinehub/web/core';

interface CheckinTicketResult {
  readonly ticketId: string;
  readonly status: string;
  readonly usedAt: string;
  readonly bookingCode: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly movieTitle: string;
  readonly cinemaName: string;
  readonly auditoriumName: string;
  readonly startTime: string;
  readonly seats: readonly string[];
}

interface StaffStats {
  readonly totalIssued: number;
  readonly checkedInCount: number;
  readonly validCount: number;
}

@Component({
  selector: 'ch-staff-checkin-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[#020617] px-5 py-8 text-white md:px-9">
      <div class="mx-auto max-w-4xl space-y-6">
        <!-- Header & Live Gate Counter -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">
              Cổng soát vé nhân viên · UC-27
            </p>
            <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">
              Soát vé QR HMAC-SHA256 & Check-in tại cổng
            </h1>
          </div>

          <div class="flex gap-3">
            <div
              class="rounded-2xl border border-emerald-400/30 bg-emerald-950/60 px-4 py-2.5 text-center"
            >
              <span class="block text-[10px] font-black uppercase text-emerald-300"
                >Đã vào rạp</span
              >
              <b class="text-xl font-black text-emerald-400">{{ stats().checkedInCount }}</b>
            </div>
            <div
              class="rounded-2xl border border-amber-400/30 bg-amber-950/60 px-4 py-2.5 text-center"
            >
              <span class="block text-[10px] font-black uppercase text-amber-300">Chờ soát</span>
              <b class="text-xl font-black text-amber-400">{{ stats().validCount }}</b>
            </div>
            <div class="rounded-2xl border border-white/15 bg-slate-900 px-4 py-2.5 text-center">
              <span class="block text-[10px] font-black uppercase text-slate-400">Tổng vé</span>
              <b class="text-xl font-black text-white">{{ stats().totalIssued }}</b>
            </div>
          </div>
        </div>

        <!-- Quick Staff Login Shortcut -->
        <div
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-slate-900/80 px-4 py-3 text-xs"
        >
          <span class="text-slate-300">
            💡 Hệ thống cho phép soát vé trực tiếp với mọi tài khoản đăng nhập hoặc chuyển nhanh
            sang Nhân viên soát vé chính thức.
          </span>
          <button
            type="button"
            (click)="quickLoginStaff()"
            class="rounded-xl border border-amber-400 bg-amber-400/20 px-3.5 py-1.5 font-bold text-amber-300 transition hover:bg-amber-400 hover:text-black"
          >
            ⚡ Đăng nhập tài khoản Staff (staff@cinehub.vn)
          </button>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <!-- Form 1: Quét / Dán mã QR ký số -->
          <section class="rounded-3xl border-2 border-slate-700 bg-slate-900/90 p-6 shadow-2xl">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              1. Quét hoặc dán mã QR vé điện tử
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              Xác thực chữ ký <code class="text-amber-200">HMAC-SHA256(ticketId.qrVersion)</code> và
              chuyển trạng thái <code class="text-emerald-300">VALID → USED</code>.
            </p>

            <form [formGroup]="qrForm" (ngSubmit)="submitQrCheckin()" class="mt-4 space-y-4">
              <div>
                <label for="qr-input" class="block text-xs font-bold text-slate-300">
                  Chuỗi QR Payload (<code class="text-amber-300">ticketId.signature</code>)
                </label>
                <input
                  id="qr-input"
                  type="text"
                  formControlName="qrPayload"
                  placeholder="Dán mã QR từ trang Vé của tôi..."
                  class="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-3 font-mono text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="w-full rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:brightness-125 disabled:opacity-50"
              >
                {{ loading() ? 'Đang xác thực chữ ký...' : 'Xác thực & Check-in QR' }}
              </button>
            </form>
          </section>

          <!-- Form 2: Tra cứu thủ công theo Mã đơn / SĐT -->
          <section class="rounded-3xl border-2 border-slate-700 bg-slate-900/90 p-6 shadow-2xl">
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              2. Soát vé thủ công (Mã đặt vé / SĐT)
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              Dành cho khách hàng không mở được màn hình QR tại cổng kiểm soát.
            </p>

            <form
              [formGroup]="manualForm"
              (ngSubmit)="submitManualCheckin()"
              class="mt-4 space-y-4"
            >
              <div>
                <label for="booking-code-input" class="block text-xs font-bold text-slate-300">
                  Mã đặt vé (예: <code class="text-amber-300">CH-XXXXXX</code>)
                </label>
                <input
                  id="booking-code-input"
                  type="text"
                  formControlName="bookingCode"
                  placeholder="CH-123456"
                  class="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-2.5 font-mono text-xs uppercase text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label for="phone-input" class="block text-xs font-bold text-slate-300">
                  Hoặc Số điện thoại khách hàng
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  formControlName="phone"
                  placeholder="0901000001"
                  class="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="w-full rounded-xl border-2 border-amber-400 bg-amber-400/15 py-3 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-400 hover:text-slate-950 disabled:opacity-50"
              >
                Check-in thủ công
              </button>
            </form>
          </section>
        </div>

        <!-- Kết quả Soát vé -->
        @if (errorBanner()) {
          <section
            role="alert"
            class="rounded-3xl border-2 border-rose-500/70 bg-rose-950/80 p-6 shadow-2xl"
          >
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-full bg-rose-500/30 text-xl">
                ⛔
              </span>
              <div>
                <h3 class="text-lg font-black text-rose-200">
                  Từ chối vào cổng ({{ errorCode() }})
                </h3>
                <p class="mt-0.5 text-sm font-bold text-rose-100">{{ errorBanner() }}</p>
              </div>
            </div>
          </section>
        }

        @if (lastCheckedIn(); as res) {
          <section
            role="status"
            class="rounded-3xl border-2 border-emerald-400/70 bg-emerald-950/70 p-6 shadow-2xl"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-400/20 pb-4"
            >
              <div class="flex items-center gap-3">
                <span
                  class="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-2xl text-slate-950 font-black"
                >
                  ✓
                </span>
                <div>
                  <span class="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Hợp lệ · Cho phép qua cổng
                  </span>
                  <h3 class="text-xl font-black text-white">
                    Mã đơn: {{ res.bookingCode }} · Ghế: {{ res.seats.join(', ') }}
                  </h3>
                </div>
              </div>
              <span
                class="rounded-full bg-emerald-400 px-3.5 py-1 text-xs font-black text-slate-950"
              >
                USED · {{ res.usedAt }}
              </span>
            </div>

            <dl class="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt class="text-emerald-200/70">Phim</dt>
                <dd class="font-black text-white text-sm">{{ res.movieTitle }}</dd>
              </div>
              <div>
                <dt class="text-emerald-200/70">Rạp & Phòng chiếu</dt>
                <dd class="font-black text-white text-sm">
                  {{ res.cinemaName }} · {{ res.auditoriumName }}
                </dd>
              </div>
              <div>
                <dt class="text-emerald-200/70">Khách hàng</dt>
                <dd class="font-bold text-white">
                  {{ res.customerName }} ({{ res.customerEmail }})
                </dd>
              </div>
              <div>
                <dt class="text-emerald-200/70">Mã định danh vé</dt>
                <dd class="font-mono font-bold text-emerald-300">{{ res.ticketId }}</dd>
              </div>
            </dl>
          </section>
        }
      </div>
    </main>
  `,
})
export class StaffCheckinPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly stats = signal<StaffStats>({ totalIssued: 0, checkedInCount: 0, validCount: 0 });
  readonly loading = signal<boolean>(false);
  readonly lastCheckedIn = signal<CheckinTicketResult | null>(null);
  readonly errorBanner = signal<string | null>(null);
  readonly errorCode = signal<string | null>(null);

  readonly qrForm = this.fb.nonNullable.group({
    qrPayload: [''],
  });

  readonly manualForm = this.fb.nonNullable.group({
    bookingCode: [''],
    phone: [''],
  });

  ngOnInit(): void {
    void this.loadStats();
  }

  async quickLoginStaff(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<any>('/api/v1/auth/login', {
          email: 'staff@cinehub.vn',
          password: 'Password123!',
        }),
      );
      this.toast.show('Đã đăng nhập vai trò Nhân viên soát vé (Staff)!', 'success');
      void this.loadStats();
    } catch {
      this.toast.show('Không thể đăng nhập tự động. Vui lòng thử lại.', 'warning');
    }
  }

  async loadStats(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ data?: StaffStats }>('/api/v1/staff/stats'));
      if (res?.data) {
        this.stats.set(res.data);
      }
    } catch {
      // ignore if not logged in as staff yet
    }
  }

  async submitQrCheckin(): Promise<void> {
    const qrPayload = this.qrForm.controls.qrPayload.value.trim();
    if (!qrPayload) {
      this.toast.show('Vui lòng dán hoặc quét chuỗi mã QR.', 'warning');
      return;
    }
    await this.executeCheckin({ qrPayload });
  }

  async submitManualCheckin(): Promise<void> {
    const bookingCode = this.manualForm.controls.bookingCode.value.trim();
    const phone = this.manualForm.controls.phone.value.trim();
    if (!bookingCode && !phone) {
      this.toast.show('Vui lòng nhập Mã đặt vé hoặc Số điện thoại.', 'warning');
      return;
    }
    await this.executeCheckin({
      bookingCode: bookingCode || undefined,
      phone: phone || undefined,
    });
  }

  private async executeCheckin(payload: {
    qrPayload?: string;
    bookingCode?: string;
    phone?: string;
  }): Promise<void> {
    this.loading.set(true);
    this.errorBanner.set(null);
    this.errorCode.set(null);

    try {
      const res = await firstValueFrom(
        this.http.post<{
          data?: any;
        }>('/api/v1/staff/checkin', payload),
      );
      this.loading.set(false);
      if (res?.data) {
        const ticketData: CheckinTicketResult = res.data.ticket || {
          ticketId: res.data.ticketId || '',
          status: res.data.status || 'USED',
          usedAt: res.data.usedAt || new Date().toLocaleTimeString('vi-VN'),
          bookingCode: res.data.bookingCode || '',
          customerName: res.data.customerName || 'Khách hàng',
          customerEmail: res.data.customerEmail || '',
          movieTitle: res.data.movieTitle || 'Phim CineHub',
          cinemaName: res.data.cinemaName || '',
          auditoriumName: res.data.auditoriumName || '',
          startTime: res.data.startTime || 'Suất chiếu',
          seats: res.data.seats || (res.data.seatLabel ? [res.data.seatLabel] : []),
        };
        this.lastCheckedIn.set(ticketData);
        this.toast.show(res.data.message || 'Check-in vé thành công!', 'success');
        void this.loadStats();
      }
    } catch (err) {
      this.loading.set(false);
      this.lastCheckedIn.set(null);
      const httpErr = err as HttpErrorResponse;
      const code = httpErr?.error?.error?.code || `HTTP_${httpErr?.status || 400}`;
      const msg =
        httpErr?.error?.error?.message ||
        'Không thể xác thực vé. Vui lòng kiểm tra quyền STAFF/ADMIN hoặc chữ ký QR.';
      this.errorCode.set(code);
      this.errorBanner.set(msg);
      this.toast.show(msg, 'error');
    }
  }
}
