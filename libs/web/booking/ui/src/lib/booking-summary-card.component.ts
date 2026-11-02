import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-booking-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <span class="text-xs font-bold uppercase tracking-wider text-amber-400">
          Tóm tắt đơn vé
        </span>
        <span class="rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
          Giữ ghế: {{ holdFormatted() }}
        </span>
      </div>

      <div class="mt-3 space-y-1.5 text-xs text-slate-300">
        <div class="text-base font-extrabold text-white">{{ movieTitle() }}</div>
        <div>{{ cinemaName() }}</div>
        <div>
          Suất: <strong class="text-amber-300">{{ showTime() }}</strong> ·
          {{ format() }}
        </div>
        <div>
          Ghế đã chọn:
          <strong class="text-emerald-400">
            {{ seatLabels().length > 0 ? seatLabels().join(', ') : 'Chưa chọn' }}
          </strong>
        </div>
      </div>

      <div
        class="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-sm font-black text-white"
      >
        <span>Tổng tạm tính</span>
        <span class="text-lg text-amber-300">{{ formatCurrency(totalAmount()) }}</span>
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
