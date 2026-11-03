import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SeatCell, SeatLayout } from './seat-layout';

@Component({
  selector: 'ch-seat-map-3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto py-2">
      <!-- Architectural Screen Indicator -->
      <div class="mx-auto mb-8 max-w-xl text-center">
        <div
          class="h-2 w-full rounded-t-full border-t-2 border-[var(--cinema-accent)] bg-gradient-to-b from-[var(--cinema-accent)]/20 to-transparent"
        ></div>
        <span
          class="mt-2 inline-block font-ui text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--cinema-text-muted)]"
        >
          Màn hình phòng chiếu · {{ layout().style }}
        </span>
      </div>

      <!-- Seat Grid -->
      <div class="mx-auto w-fit space-y-2 select-none">
        @for (rowGroup of rowsGrouped(); track rowGroup.row) {
          <div class="flex items-center gap-1.5">
            <span
              class="w-6 text-center font-ui text-xs font-semibold text-[var(--cinema-text-muted)]"
            >
              {{ rowGroup.row }}
            </span>

            @for (seat of rowGroup.seats; track seat.id) {
              <button
                type="button"
                [disabled]="seat.sold"
                (click)="seatChosen.emit(seat)"
                [attr.aria-label]="
                  'Ghế ' + seat.id + ' hạng ' + seat.zone + (seat.sold ? ' (Đã bán)' : '')
                "
                [attr.aria-pressed]="seat.selected"
                class="h-8 w-8 rounded-[2px] border font-ui text-[11px] font-semibold transition-colors duration-150"
                [class]="seatClasses(seat)"
              >
                {{ seat.id }}
              </button>
            }

            <span
              class="w-6 text-center font-ui text-xs font-semibold text-[var(--cinema-text-muted)]"
            >
              {{ rowGroup.row }}
            </span>
          </div>
        }
      </div>

      <!-- Editorial Seat Legend (with Non-Color Hatched Sold Differentiation) -->
      <div
        class="mt-8 flex flex-wrap items-center justify-center gap-5 border-t border-[var(--cinema-border-subtle)] pt-4 font-ui text-xs text-[var(--cinema-text-secondary)]"
      >
        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[2px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-raised)]"
          ></span>
          <span>Ghế Thường (90.000đ)</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[2px] border border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)]"
          ></span>
          <span>Ghế VIP (115.000đ)</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span class="h-4 w-4 rounded-[2px] border border-[#d77870]/60 bg-[#2a1615]"></span>
          <span>Sweetbox Đôi (220.000đ)</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[2px] border border-[var(--cinema-action)] bg-[var(--cinema-action)]"
          ></span>
          <span class="font-semibold text-[var(--cinema-text-primary)]">Đang chọn</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[2px] border border-[var(--cinema-border-subtle)] bg-[var(--cinema-surface-inset)] seat-sold-pattern"
          ></span>
          <span>Đã bán / Khóa</span>
        </span>
      </div>
    </div>
  `,
})
export class SeatMap3DComponent {
  readonly layout = input.required<SeatLayout>();
  readonly seats = input.required<readonly SeatCell[]>();
  readonly seatChosen = output<SeatCell>();

  readonly rowsGrouped = computed(() => {
    const map = new Map<string, SeatCell[]>();
    for (const s of this.seats()) {
      const list = map.get(s.row) ?? [];
      list.push(s);
      map.set(s.row, list);
    }
    return Array.from(map.entries()).map(([row, seats]) => ({ row, seats }));
  });

  seatClasses(seat: SeatCell): string {
    if (seat.sold) {
      return 'cursor-not-allowed border-[var(--cinema-border-subtle)] bg-[var(--cinema-surface-inset)] text-[var(--cinema-text-muted)] opacity-50 seat-sold-pattern';
    }
    if (seat.selected) {
      return 'border-[var(--cinema-action)] bg-[var(--cinema-action)] text-[var(--cinema-action-text)] font-bold scale-[1.04] shadow-sm';
    }
    switch (seat.zone) {
      case 'sweetbox':
        return 'border-[#d77870]/60 bg-[#2a1615] text-[#f2c6c2] hover:border-[#d77870] hover:bg-[#391e1d]';
      case 'vip':
        return 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-accent)] hover:bg-[var(--cinema-accent)] hover:text-[#171512]';
      default:
        return 'border-[var(--cinema-border)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-secondary)] hover:border-[var(--cinema-accent)] hover:text-[var(--cinema-text-primary)]';
    }
  }
}
