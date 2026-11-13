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
  readonly recentCheckins?: Array<{
    ticketId: string;
    bookingCode: string;
    seatLabel: string;
    movieTitle: string;
    cinemaName: string;
    screenName: string;
    customerName: string;
    usedAt: string;
    checkedInBy: string;
  }>;
}

@Component({
  selector: 'ch-portal-staff',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-6xl space-y-6 px-5 py-8 md:px-9">
      <!-- Top Overview & Live Counters -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div
            class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-400"
          >
            <span>🎟️</span> CỔNG SOÁT VÉ NHÂN VIÊN
          </div>
          <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">
            Quét mã QR soát vé & Check-in tại cổng rạp
          </h1>
          <p class="mt-1 text-xs text-slate-400">
            Xác thực chữ ký HMAC-SHA256, chuyển trạng thái vé VALID → USED và chống vé quay vòng.
          </p>
        </div>

        <div class="flex gap-3">
          <div
            class="rounded-2xl border border-emerald-400/30 bg-emerald-950/60 px-4 py-2.5 text-center shadow-lg"
          >
            <span class="block text-[10px] font-black uppercase text-emerald-300">Đã vào rạp</span>
            <b class="text-xl font-black text-emerald-400">{{ stats().checkedInCount }}</b>
          </div>
          <div
            class="rounded-2xl border border-amber-400/30 bg-amber-950/60 px-4 py-2.5 text-center shadow-lg"
          >
            <span class="block text-[10px] font-black uppercase text-amber-300">Chờ soát</span>
            <b class="text-xl font-black text-amber-400">{{ stats().validCount }}</b>
          </div>
          <div
            class="rounded-2xl border border-white/15 bg-slate-900 px-4 py-2.5 text-center shadow-lg"
          >
            <span class="block text-[10px] font-black uppercase text-slate-400">Tổng vé</span>
            <b class="text-xl font-black text-white">{{ stats().totalIssued }}</b>
          </div>
        </div>
      </div>

      <!-- Result Banner: When Check-in succeeds -->
      @if (lastCheckedIn(); as res) {
        <section
          class="relative overflow-hidden rounded-3xl border-2 border-emerald-400 bg-emerald-950/70 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/30 pb-4"
          >
            <div class="flex items-center gap-3">
              <span
                class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-500/50"
              >
                ✓
              </span>
              <div>
                <span class="text-xs font-black uppercase tracking-wider text-emerald-300">
                  HỢP LỆ · CHO PHÉP KHÁCH QUA CỔNG
                </span>
                <h2 class="text-xl font-black text-white sm:text-2xl">
                  Mã đơn: <span class="font-mono text-amber-300">{{ res.bookingCode }}</span>
                </h2>
              </div>
            </div>

            <div class="text-right">
              <span
                class="inline-block rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-black text-slate-950"
              >
                USED · Check-in lúc {{ res.usedAt }}
              </span>
              <span class="mt-1 block text-[11px] font-bold text-emerald-200">
                Áp dụng cho toàn bộ {{ res.seats.length }} ghế
              </span>
            </div>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
              <span class="text-emerald-200/70 font-semibold">Tên phim</span>
              <b class="mt-1 block text-sm font-black text-white">{{ res.movieTitle }}</b>
            </div>

            <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
              <span class="text-emerald-200/70 font-semibold">Rạp & Phòng chiếu</span>
              <b class="mt-1 block text-sm font-black text-white">
                {{ res.cinemaName }} · {{ res.auditoriumName }}
              </b>
            </div>

            <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
              <span class="text-emerald-200/70 font-semibold">Danh sách ghế vào rạp</span>
              <b class="mt-1 block text-sm font-black text-amber-300">
                {{ res.seats.join(', ') }}
              </b>
            </div>

            <div class="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-3.5">
              <span class="text-emerald-200/70 font-semibold">Khách hàng</span>
              <b class="mt-1 block text-xs font-bold text-white truncate">
                {{ res.customerName }}
              </b>
              <span class="text-[11px] text-slate-400 truncate block">{{ res.customerEmail }}</span>
            </div>
          </div>
        </section>
      }

      <!-- Error Banner -->
      @if (errorBanner(); as err) {
        <section
          class="rounded-3xl border-2 border-red-500 bg-red-950/80 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-500 text-lg font-black text-white"
            >
              ✕
            </span>
            <div class="min-w-0 flex-1">
              <b class="block text-sm font-black text-red-200 uppercase tracking-wide">
                Từ chối vào cổng ({{ errorCode() || 'TỪ CHỐI' }})
              </b>
              <p class="mt-1 text-xs font-semibold text-red-300 leading-relaxed">
                {{ err }}
              </p>
            </div>
            <button
              type="button"
              (click)="errorBanner.set(null)"
              class="text-xs font-black uppercase text-red-400 hover:text-white"
            >
              Đóng ✕
            </button>
          </div>
        </section>
      }

      <!-- 2 Main Scanning / Lookup Sections -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Form 1: Quét / Dán mã QR ký số -->
        <section
          class="flex flex-col justify-between rounded-3xl border border-white/15 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div>
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
                1. Quét / Dán mã QR vé điện tử
              </h2>
              <span
                class="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-black text-blue-300"
              >
                Mã vạch 2D / Camera
              </span>
            </div>
            <p class="mt-2 text-xs text-slate-300">
              Đưa đầu đọc mã vạch quét vào màn hình điện thoại của khách, hoặc dán chuỗi ký số QR
              vào đây:
            </p>

            <form [formGroup]="qrForm" (ngSubmit)="submitQrCheckin()" class="mt-4 space-y-4">
              <div>
                <label for="qr-payload-input" class="block text-xs font-bold text-slate-300">
                  Chuỗi QR Payload (<code class="text-amber-300">ticketId.signature</code> hoặc mã
                  đơn)
                </label>
                <div class="relative mt-1.5">
                  <input
                    id="qr-payload-input"
                    type="text"
                    formControlName="qrPayload"
                    placeholder="Dán mã QR đã sao chép từ Vé của tôi..."
                    class="w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-3.5 pr-10 font-mono text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  @if (qrForm.controls.qrPayload.value) {
                    <button
                      type="button"
                      (click)="qrForm.reset()"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  }
                </div>
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-blue-950/50 transition hover:brightness-125 disabled:opacity-50"
              >
                {{ loading() ? 'Đang xác thực chữ ký số...' : '⚡ Xác thực & Cho qua cổng' }}
              </button>
            </form>
          </div>

          <div
            class="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-[11px] text-slate-400"
          >
            💡 <b>Mẹo nhân viên:</b> Nếu dùng máy quét cầm tay USB/Bluetooth, bấm chuột vào ô nhập
            và bóp cò máy quét, hệ thống sẽ tự động xác thực và kiểm tra ngay.
          </div>
        </section>

        <!-- Form 2: Tra cứu thủ công Mã đơn / SĐT -->
        <section
          class="flex flex-col justify-between rounded-3xl border border-white/15 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div>
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
                2. Tra cứu thủ công (Nếu khách quên vé)
              </h2>
              <span
                class="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300"
              >
                Backup Manual
              </span>
            </div>
            <p class="mt-2 text-xs text-slate-300">
              Nhập mã đơn đặt vé (ví dụ: <code class="text-amber-300 font-mono">CH2611...</code>)
              hoặc số điện thoại khách hàng:
            </p>

            <form
              [formGroup]="manualForm"
              (ngSubmit)="submitManualCheckin()"
              class="mt-4 space-y-4"
            >
              <div>
                <label for="manual-code-input" class="block text-xs font-bold text-slate-300">
                  Mã đơn đặt vé (Booking Code)
                </label>
                <input
                  id="manual-code-input"
                  type="text"
                  formControlName="bookingCode"
                  placeholder="Ví dụ: CH2611A3BC"
                  class="mt-1.5 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-3.5 font-mono text-xs uppercase text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label for="manual-phone-input" class="block text-xs font-bold text-slate-300">
                  Số điện thoại khách hàng
                </label>
                <input
                  id="manual-phone-input"
                  type="tel"
                  formControlName="phone"
                  placeholder="Ví dụ: 0901234567"
                  class="mt-1.5 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-3.5 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="w-full rounded-2xl border border-white/20 bg-slate-800/90 py-4 text-xs font-black uppercase tracking-wider text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {{ loading() ? 'Đang tra cứu DB...' : 'Tra cứu & Check-in đơn' }}
              </button>
            </form>
          </div>

          <div
            class="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-[11px] text-slate-400"
          >
            🔒 Hệ thống chỉ duyệt qua cổng những đơn vé đã có trạng thái <b>CONFIRMED</b> (đã thanh
            toán thành công).
          </div>
        </section>
      </div>
    </main>
  `,
})
export class PortalStaffComponent implements OnInit {
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

  async loadStats(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ data?: StaffStats }>('/api/v1/staff/stats'));
      if (res?.data) {
        this.stats.set(res.data);
      }
    } catch {
      // ignore
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
        this.qrForm.reset();
        this.manualForm.reset();
        void this.loadStats();
      }
    } catch (err) {
      this.loading.set(false);
      this.lastCheckedIn.set(null);
      const httpErr = err as HttpErrorResponse;
      const code = httpErr?.error?.error?.code || `HTTP_${httpErr?.status || 400}`;
      const msg =
        httpErr?.error?.error?.message ||
        httpErr?.error?.message ||
        'Không thể xác thực vé. Vui lòng kiểm tra lại mã QR hoặc mã đơn.';
      this.errorCode.set(code);
      this.errorBanner.set(msg);
      this.toast.show(msg, 'error');
    }
  }
}
