import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SeatCell, SeatLayout } from './seat-layout';

@Component({
  selector: 'ch-seat-map-3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seat-map-3d overflow-x-auto bg-transparent px-2 py-2 sm:px-4">
      <div class="mx-auto w-fit min-w-max [perspective:1100px]">
        <!-- Screen Curve Indicator -->
        <div class="mx-auto mb-6 max-w-xl text-center">
          <div
            class="h-2.5 w-full rounded-t-full border-t-2 border-amber-400 bg-gradient-to-b from-amber-400/20 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.3)]"
          ></div>
          <span
            class="mt-2 inline-block text-[11px] font-black tracking-[0.2em] uppercase text-amber-300"
          >
            Màn hình phòng chiếu · {{ layout().style }}
          </span>
        </div>

        <!-- 3D Perspective Chamber Floor -->
        <div
          class="relative mx-auto rounded-[45%_45%_18px_18px/12%_12%_18px_18px] border-x border-white/10 bg-transparent px-3 pb-7 pt-2 [transform:rotateX(14deg)] [transform-style:preserve-3d] sm:px-5"
        >
          <div class="space-y-2 [transform-style:preserve-3d]">
            @for (rowGroup of rowsGrouped(); track rowGroup.row; let rowIndex = $index) {
              <div
                class="grid items-center gap-x-1.5"
                [style.grid-template-columns]="
                  '22px repeat(' +
                  (layout().columns + layout().aislesAfter.length) +
                  ', minmax(30px, 38px)) 22px'
                "
                [style.transform]="
                  'translateZ(' + (rowIndex - 3) + 'px) scale(' + (1 + rowIndex * 0.006) + ')'
                "
                style="transform-origin: center bottom"
              >
                <span class="text-center text-xs font-black text-white">{{ rowGroup.row }}</span>

                @for (seat of rowGroup.seats; track seat.id) {
                  <button
                    type="button"
                    [disabled]="seat.sold || seat.heldByOther"
                    (click)="seatChosen.emit(seat)"
                    [attr.aria-label]="seatLabel(seat)"
                    [attr.aria-pressed]="seat.selected"
                    [style.grid-column]="seatTrack(seat) + 2"
                    class="aspect-square min-w-[30px] rounded-t-[9px] rounded-b-[5px] border text-[9px] font-extrabold shadow-[0_4px_6px_rgba(0,0,0,0.5)] transition duration-150 hover:-translate-y-1 hover:shadow-[0_8px_12px_rgba(0,0,0,0.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    [class]="seatClasses(seat)"
                  >
                    <span class="block -translate-y-px">{{ seat.id }}</span>
                  </button>
                }

                <span
                  class="text-center text-xs font-black text-white"
                  [style.grid-column]="layout().columns + layout().aislesAfter.length + 2"
                >
                  {{ rowGroup.row }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Layout Style Label -->
        <p class="mt-6 text-center text-[11px] font-extrabold text-amber-300">
          {{ layout().style }}
        </p>

        <!-- Seat Legend -->
        <div
          class="mt-6 flex flex-wrap items-center justify-center gap-5 border-t border-white/10 pt-4 text-xs font-bold text-slate-300"
        >
          <span class="inline-flex items-center gap-2">
            <span
              class="h-4 w-4 rounded-t-[6px] rounded-b-[3px] border border-[#7046c8] bg-[#8054d7]"
            ></span>
            <span>Ghế Thường</span>
          </span>

          <span class="inline-flex items-center gap-2">
            <span
              class="h-4 w-4 rounded-t-[6px] rounded-b-[3px] border border-[#c48848] bg-[#dca762]"
            ></span>
            <span class="text-amber-300 font-black">Ghế VIP</span>
          </span>

          <span class="inline-flex items-center gap-2">
            <span
              class="h-4 w-4 rounded-t-[6px] rounded-b-[3px] border border-[#cc5c89] bg-[#e589ae]"
            ></span>
            <span class="text-pink-300 font-black">Sweetbox Đôi</span>
          </span>

          <span class="inline-flex items-center gap-2">
            <span
              class="h-4 w-4 rounded-t-[6px] rounded-b-[3px] border border-red-500 bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            ></span>
            <span class="font-black text-white">Đang chọn</span>
          </span>

          <span class="inline-flex items-center gap-2">
            <span
              class="h-4 w-4 rounded-t-[6px] rounded-b-[3px] border border-cyan-300 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.85)]"
            ></span>
            <span class="text-cyan-300 font-bold">Người khác giữ</span>
          </span>

          <span class="inline-flex items-center gap-2">
            <span
              class="h-4 w-4 rounded-t-[6px] rounded-b-[3px] border border-slate-700 bg-slate-800/80"
            ></span>
            <span class="text-slate-500">Đã bán</span>
          </span>
        </div>
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
    for (const seat of this.seats()) {
      const list = map.get(seat.row) ?? [];
      list.push(seat);
      map.set(seat.row, list);
    }
    return Array.from(map.entries()).map(([row, seats]) => ({
      row,
      seats: seats.sort((a, b) => a.column - b.column),
    }));
  });

  seatTrack(seat: SeatCell): number {
    return (
      seat.column + 1 + this.layout().aislesAfter.filter((after) => seat.column >= after).length
    );
  }

  seatLabel(seat: SeatCell): string {
    const type = seat.zone === 'vip' ? 'VIP' : seat.zone === 'sweetbox' ? 'Sweetbox' : 'tiêu chuẩn';
    const status = seat.sold
      ? 'đã bán'
      : seat.heldByOther
        ? 'đang được người khác giữ'
        : seat.selected
          ? 'đang chọn'
          : 'trống';
    return `Ghế ${seat.id}, ${type}, ${status}`;
  }

  seatClasses(seat: SeatCell): string {
    if (seat.sold) {
      return 'border-slate-700 bg-slate-800/80 text-slate-500 cursor-not-allowed';
    }
    if (seat.selected) {
      return 'border-red-500 bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.8)] scale-[1.05]';
    }
    if (seat.heldByOther) {
      return 'border-cyan-300 bg-cyan-500 font-black text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.85)] animate-pulse cursor-not-allowed';
    }
    switch (seat.zone) {
      case 'sweetbox':
        return 'border-[#cc5c89] bg-[#e589ae] text-slate-950 font-black hover:brightness-110';
      case 'vip':
        return 'border-[#c48848] bg-[#dca762] text-slate-950 font-black hover:brightness-110';
      default:
        return 'border-[#7046c8] bg-[#8054d7] text-white hover:brightness-110';
    }
  }
}
