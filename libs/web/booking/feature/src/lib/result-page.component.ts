import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-result-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ticket(); as t) {
      <section class="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div class="rounded-3xl border border-emerald-500/40 bg-slate-900/95 p-6 shadow-2xl sm:p-8">
          <div class="text-center">
            <span
              class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl text-emerald-300"
            >
              ✓
            </span>
            <h1 class="mt-3 text-2xl font-black text-white">Đặt vé thành công!</h1>
            <p class="mt-1 text-xs text-slate-400">
              Xuất trình mã vé QR dưới đây tại quầy soát vé rạp Galaxy Cinema
            </p>
          </div>

          <div class="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-400">Mã đặt vé (Booking Code):</span>
              <strong class="text-base font-black text-amber-300">{{ t.bookingCode }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Phim:</span>
              <strong class="text-white">{{ t.movieTitle }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Rạp & Phòng chiếu:</span>
              <span class="text-slate-200">{{ t.cinemaName }} · {{ t.screenName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Suất chiếu:</span>
              <span class="text-amber-300 font-bold">{{ t.showTime }} ({{ t.format }})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Ghế ngồi:</span>
              <strong class="text-emerald-400">{{ t.seats.join(', ') }}</strong>
            </div>
            <div class="flex justify-between border-t border-slate-800 pt-3 text-sm font-bold">
              <span class="text-slate-300">Đã thanh toán ({{ t.paymentMethod }}):</span>
              <span class="text-amber-300">{{ formatCurrency(t.totalPaid) }}</span>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <a
              routerLink="/my-tickets"
              class="flex-1 rounded-xl bg-amber-500 py-3 text-center text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
            >
              Xem trong Vé của tôi
            </a>
            <a
              routerLink="/"
              class="flex-1 rounded-xl border border-slate-700 py-3 text-center text-xs font-bold text-slate-200 transition hover:border-amber-400"
            >
              Về trang chủ
            </a>
          </div>
        </div>
      </section>
    }
  `,
})
export class ResultPageComponent {
  private readonly store = inject(BookingStore);
  readonly ticketId = input<string>('');

  readonly ticket = computed(() => this.store.findTicketById(this.ticketId()));

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
