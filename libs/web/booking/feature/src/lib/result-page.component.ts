import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { ToastService } from '@cinehub/web/core';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-result-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ticket(); as t) {
      <main
        class="relative grid min-h-screen place-items-center bg-[#020617] px-5 py-12 text-white selection:bg-amber-400 selection:text-black"
      >
        <div class="relative z-10 w-full max-w-[580px] text-center">
          <!-- Circular Emerald Success Icon -->
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
            Vé điện tử ký số HMAC-SHA256 đã được gửi tới email của bạn và lưu trong mục
            <b class="text-amber-300">Vé của tôi</b>.
          </p>

          <!-- Khung Thông Tin Đơn Hàng & QR Code -->
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

            <!-- QR Code Ký Số HMAC-SHA256 -->
            <div
              class="my-5 flex flex-col items-center rounded-2xl border border-white/10 bg-slate-950/70 p-4"
            >
              <div
                class="grid h-[168px] w-[168px] rounded-2xl bg-white p-2.5 shadow-xl"
                [style.grid-template-columns]="'repeat(25, minmax(0, 1fr))'"
                role="img"
                [attr.aria-label]="'Mã QR vé ' + t.bookingCode"
              >
                @for (cell of qrCells(t.qrPayload || t.bookingCode); track $index) {
                  <span class="min-h-0 min-w-0" [class.bg-black]="cell"></span>
                }
              </div>
              <p class="mt-2 font-mono text-[11px] font-bold text-slate-300 break-all text-center">
                {{ t.qrPayload || t.id }}
              </p>
              <button
                type="button"
                (click)="copyQrPayload(t.qrPayload || t.bookingCode)"
                class="mt-2 rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-[11px] font-black text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition"
              >
                {{ copied() ? '✓ Đã sao chép mã QR' : '📋 Sao chép mã QR để Soát vé' }}
              </button>
            </div>

            <dl class="mt-4 space-y-3.5 text-sm">
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
                <dt class="font-semibold text-white/70">Tổng thanh toán ({{ t.paymentMethod }})</dt>
                <dd class="text-right text-lg font-black text-amber-300">
                  {{ formatCurrency(t.totalPaid) }}
                </dd>
              </div>
            </dl>

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
        </div>
      </main>
    }
  `,
})
export class ResultPageComponent implements OnInit {
  private readonly store = inject(BookingStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly ticketId = input<string>('');
  readonly copied = signal<boolean>(false);

  readonly ticket = computed(() => {
    const id = this.ticketId() || this.route.snapshot.paramMap.get('ticketId') || '';
    return this.store.findTicketById(id) ?? this.store.issuedTickets()[0] ?? null;
  });

  ngOnInit(): void {
    const id = this.ticketId() || this.route.snapshot.paramMap.get('ticketId') || '';
    if (id) {
      void this.store.loadTicketByIdFromApi(id);
    } else {
      void this.store.loadMyTicketsFromApi();
    }
  }

  qrCells(code: string): boolean[] {
    const size = 25;
    const finders = [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ];
    let seed = 0;
    for (const character of code) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;

    return Array.from({ length: size * size }, (_, index) => {
      const row = Math.floor(index / size);
      const column = index % size;
      for (const [top, left] of finders) {
        const rowOffset = row - top;
        const columnOffset = column - left;
        if (rowOffset < 0 || columnOffset < 0 || rowOffset >= 7 || columnOffset >= 7) continue;
        return (
          rowOffset === 0 ||
          rowOffset === 6 ||
          columnOffset === 0 ||
          columnOffset === 6 ||
          (rowOffset >= 2 && rowOffset <= 4 && columnOffset >= 2 && columnOffset <= 4)
        );
      }
      return ((seed + index * 17 + (index % size) * 13) >>> 2) % 2 === 0;
    });
  }

  copyQrPayload(payload: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(payload);
    }
    this.copied.set(true);
    this.toast.show('Đã sao chép mã QR vé điện tử!', 'success');
    setTimeout(() => this.copied.set(false), 2000);
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
