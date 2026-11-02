import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SeatCell, SeatLayout } from './seat-layout';

@Component({
  selector: 'ch-seat-map-3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto py-3">
      <!-- Curved Screen Indicator -->
      <div class="mx-auto mb-8 max-w-xl text-center">
        <div
          class="h-2.5 w-full rounded-t-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_8px_28px_rgba(251,191,36,0.45)]"
        ></div>
        <span
          class="mt-2 inline-block text-[11px] font-bold tracking-[0.25em] uppercase text-amber-300/80"
        >
          MÀN HÌNH IMAX LASER · {{ layout().style }}
        </span>
      </div>

      <!-- Seat Rows -->
      <div class="mx-auto w-fit space-y-2">
        @for (rowGroup of rowsGrouped(); track rowGroup.row) {
          <div class="flex items-center gap-1.5">
            <span class="w-6 text-center text-xs font-extrabold text-slate-400">
              {{ rowGroup.row }}
            </span>

            @for (seat of rowGroup.seats; track seat.id) {
              <button
                type="button"
                [disabled]="seat.sold"
                (click)="seatChosen.emit(seat)"
                [attr.aria-label]="'Ghế ' + seat.id + ' hạng ' + seat.zone"
                [attr.aria-pressed]="seat.selected"
                class="h-8 w-8 rounded-lg border text-[11px] font-extrabold transition"
                [class]="seatClasses(seat)"
              >
                {{ seat.id }}
              </button>
            }
          </div>
        }
      </div>

      <!-- Legend -->
      <div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
        <span class="inline-flex items-center gap-1.5">
          <span class="h-3.5 w-3.5 rounded border border-sky-400/50 bg-sky-950"></span>
          Ghế Thường (90.000đ)
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-3.5 w-3.5 rounded border border-amber-400/70 bg-amber-950"></span>
          Ghế VIP (115.000đ)
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-3.5 w-3.5 rounded border border-rose-400/70 bg-rose-950"></span>
          Sweetbox Đôi (220.000đ)
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-3.5 w-3.5 rounded bg-emerald-400"></span>
          Đang chọn
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-3.5 w-3.5 rounded bg-slate-800"></span>
          Đã đặt
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
      return 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600';
    }
    if (seat.selected) {
      return 'scale-105 border-emerald-300 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30';
    }
    switch (seat.zone) {
      case 'sweetbox':
        return 'border-rose-400/60 bg-rose-950/80 text-rose-100 hover:bg-rose-900';
      case 'vip':
        return 'border-amber-400/60 bg-amber-950/80 text-amber-100 hover:bg-amber-900';
      default:
        return 'border-sky-400/50 bg-sky-950/75 text-sky-100 hover:bg-sky-900';
    }
  }
}
