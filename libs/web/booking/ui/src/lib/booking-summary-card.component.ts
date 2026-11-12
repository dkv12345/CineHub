import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-booking-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-3xl border-2 border-slate-700 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl text-white space-y-4"
    >
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <span class="text-xs font-black uppercase tracking-wider text-amber-300"
          >Tóm tắt đơn đặt vé</span
        >
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-black text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Giữ ghế: {{ holdFormatted() }}</span>
        </span>
      </div>

      <div class="space-y-2.5 text-xs text-slate-300">
        <div>
          <div class="text-base font-black text-white leading-tight">
            {{ movieTitle() }}
          </div>
          <div class="mt-1 text-xs font-medium text-slate-400">{{ cinemaName() }}</div>
        </div>

        <div class="flex items-center justify-between border-t border-white/10 pt-2.5">
          <span class="text-slate-400">Suất chiếu:</span>
          <span class="font-bold text-white"> {{ showTime() }} ({{ format() }}) </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-slate-400">Ghế đã chọn:</span>
          <span class="font-black text-amber-300">
            {{ seatLabels().length > 0 ? seatLabels().join(', ') : 'Chưa chọn ghế' }}
          </span>
        </div>
      </div>

      <div
        class="flex items-center justify-between border-t border-white/10 pt-3 text-sm font-semibold text-white"
      >
        <span class="font-bold text-slate-300">Tổng tạm tính</span>
        <span class="font-black tabular-nums text-xl text-amber-300">
          {{ formatCurrency(totalAmount()) }}
        </span>
      </div>
    </div>
  `,
})
export class BookingSummaryCardComponent {
  readonly movieTitle = input.required<string>();
  readonly cinemaName = input.required<string>();
  readonly showTime = input.required<string>();
  readonly format = input.required<string>();
  readonly seatLabels = input.required<readonly string[]>();
  readonly holdFormatted = input.required<string>();
  readonly totalAmount = input.required<number>();

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
