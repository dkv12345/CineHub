import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ShowtimeFilters } from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-showtime-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <label for="filter-city" class="block text-xs font-semibold text-slate-400">
          Tỉnh / Thành phố
        </label>
        <select
          id="filter-city"
          [value]="filters().cityId ?? 'all'"
          (change)="onSelectChange('cityId', $event)"
          class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="all">Toàn quốc</option>
          @for (city of cities(); track city.id) {
            <option [value]="city.id">{{ city.name }}</option>
          }
        </select>
      </div>

      <div>
        <label for="filter-format" class="block text-xs font-semibold text-slate-400">
          Định dạng phòng chiếu
        </label>
        <select
          id="filter-format"
          [value]="filters().format ?? 'all'"
          (change)="onSelectChange('format', $event)"
          class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="all">Tất cả định dạng</option>
          <option value="2D">2D Standard</option>
          <option value="3D">3D</option>
          <option value="IMAX">IMAX Laser</option>
        </select>
      </div>

      <div>
        <label for="filter-search" class="block text-xs font-semibold text-slate-400">
          Tìm theo tên phim hoặc rạp
        </label>
        <input
          id="filter-search"
          type="search"
          [value]="filters().searchQuery ?? ''"
          (input)="onSelectChange('searchQuery', $event)"
          placeholder="Nhập tên phim, rạp..."
          class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        />
      </div>

      <div class="flex items-end">
        <button
          type="button"
          (click)="resetClicked.emit()"
          class="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
        >
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  `,
})
export class ShowtimeFilterBarComponent {
  readonly filters = input.required<ShowtimeFilters>();
  readonly cities = input.required<ReadonlyArray<{ id: string; name: string }>>();
  readonly filterChanged = output<Partial<ShowtimeFilters>>();
  readonly resetClicked = output<void>();

  onSelectChange(key: keyof ShowtimeFilters, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    this.filterChanged.emit({ [key]: target?.value ?? '' });
  }
}
