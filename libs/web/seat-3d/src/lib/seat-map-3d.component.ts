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
          class="h-2 w-full rounded-t-full border-t-2 border-[var(--color-brand-primary)] bg-gradient-to-b from-[var(--color-brand-primary)]/15 to-transparent"
        ></div>
        <span
          class="mt-2 inline-block font-ui text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-brand-primary)]"
        >
          Màn hình phòng chiếu · {{ layout().style }}
        </span>
      </div>

      <!-- Seat Grid (Clean Bright Auditorium Chamber) -->
      <div class="mx-auto w-fit space-y-2 select-none">
        @for (rowGroup of rowsGrouped(); track rowGroup.row) {
          <div class="flex items-center gap-1.5">
            <span
              class="w-6 text-center font-ui text-xs font-bold text-[var(--color-text-secondary)]"
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
                class="h-8 w-8 rounded-[3px] border font-ui text-[11px] font-bold transition-all duration-150"
                [class]="seatClasses(seat)"
              >
                {{ seat.id }}
              </button>
            }

            <span
              class="w-6 text-center font-ui text-xs font-bold text-[var(--color-text-secondary)]"
            >
              {{ rowGroup.row }}
            </span>
          </div>
        }
      </div>

      <!-- Legend (Accessible non-color differentiation) -->
      <div
        class="mt-8 flex flex-wrap items-center justify-center gap-5 border-t border-[var(--color-border)] pt-4 font-ui text-xs text-[var(--color-text-secondary)]"
      >
        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[3px] border border-[var(--color-border)] bg-[#ffffff]"
          ></span>
          <span>Ghế Thường (90.000đ)</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[3px] border border-[var(--color-brand-accent)] bg-[#fdf9f2]"
          ></span>
          <span>Ghế VIP (115.000đ)</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span class="h-4 w-4 rounded-[3px] border border-[#7C2638] bg-[#F3E9E7]"></span>
          <span>Sweetbox Đôi (220.000đ)</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[3px] border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]"
          ></span>
          <span class="font-bold text-[var(--color-text-primary)]">Đang chọn</span>
        </span>

        <span class="inline-flex items-center gap-2">
          <span
            class="h-4 w-4 rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] seat-sold-pattern"
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
      return 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] opacity-55 seat-sold-pattern';
    }
    if (seat.selected) {
      return 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9] font-bold scale-[1.05] shadow-xs';
    }
    switch (seat.zone) {
      case 'sweetbox':
        return 'border-[#7C2638] bg-[#F3E9E7] text-[#7C2638] hover:bg-[#ebdcd9]';
      case 'vip':
        return 'border-[var(--color-brand-accent)] bg-[#fdf9f2] text-[var(--color-brand-accent)] hover:bg-[var(--color-brand-subtle)] hover:border-[var(--color-brand-primary)]';
      default:
        return 'border-[var(--color-border)] bg-[#ffffff] text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)]';
    }
  }
}
