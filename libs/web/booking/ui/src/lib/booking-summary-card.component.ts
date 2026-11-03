import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-booking-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cinema-panel-raised p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-[var(--cinema-border)] pb-3">
        <span class="cinema-eyebrow">Tóm tắt đơn đặt vé</span>
        <span
          class="inline-flex items-center gap-1 rounded-[2px] border border-[var(--cinema-warning)]/50 bg-[var(--cinema-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cinema-warning)]"
        >
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Giữ ghế: {{ holdFormatted() }}</span>
        </span>
      </div>

      <div class="space-y-2 text-xs text-[var(--cinema-text-secondary)]">
        <div>
          <div
            class="font-display text-base font-semibold leading-tight text-[var(--cinema-text-primary)]"
          >
            {{ movieTitle() }}
          </div>
          <div class="mt-0.5 text-[var(--cinema-text-muted)]">{{ cinemaName() }}</div>
        </div>

        <div
          class="flex items-center justify-between border-t border-[var(--cinema-border-subtle)] pt-2"
        >
          <span>Suất chiếu:</span>
          <span class="font-semibold text-[var(--cinema-text-primary)]">
            {{ showTime() }} ({{ format() }})
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span>Ghế đã chọn:</span>
          <span class="font-semibold text-[var(--cinema-accent)]">
            {{ seatLabels().length > 0 ? seatLabels().join(', ') : 'Chưa chọn ghế' }}
          </span>
        </div>
      </div>

      <div
        class="flex items-center justify-between border-t border-[var(--cinema-border)] pt-3 text-sm font-semibold text-[var(--cinema-text-primary)]"
      >
        <span>Tổng tạm tính</span>
        <span class="font-display text-lg text-[var(--cinema-text-primary)]">
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
