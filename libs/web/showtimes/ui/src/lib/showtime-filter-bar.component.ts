import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ShowtimeFilters } from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-showtime-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-2xl border-2 border-slate-700 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      role="search"
      aria-label="Bộ lọc lịch chiếu"
    >
      <div>
        <label
          for="filter-movie"
          class="block text-xs font-black uppercase tracking-wider text-amber-300 mb-2"
        >
          Phim
        </label>
        <select
          id="filter-movie"
          [value]="filters().movieId ?? 'all'"
          (change)="onSelectChange('movieId', $event)"
          class="w-full appearance-none rounded-xl border border-white/20 bg-slate-950 py-2.5 px-3.5 text-xs font-bold text-white outline-none transition hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
        >
          <option value="all" class="bg-slate-950 text-white">Tất cả phim</option>
          @for (movie of movies(); track movie.id) {
            <option [value]="movie.id" class="bg-slate-950 text-white">{{ movie.name }}</option>
          }
        </select>
      </div>

      <div>
        <label
          for="filter-city"
          class="block text-xs font-black uppercase tracking-wider text-amber-300 mb-2"
        >
          Tỉnh / Thành phố
        </label>
        <select
          id="filter-city"
          [value]="filters().cityId ?? 'all'"
          (change)="onSelectChange('cityId', $event)"
          class="w-full appearance-none rounded-xl border border-white/20 bg-slate-950 py-2.5 px-3.5 text-xs font-bold text-white outline-none transition hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
        >
          <option value="all" class="bg-slate-950 text-white">Toàn quốc (Tất cả cụm rạp)</option>
          @for (city of cities(); track city.id) {
            <option [value]="city.id" class="bg-slate-950 text-white">{{ city.name }}</option>
          }
        </select>
      </div>

      <div>
        <label
          for="filter-format"
          class="block text-xs font-black uppercase tracking-wider text-amber-300 mb-2"
        >
          Định dạng phòng chiếu
        </label>
        <select
          id="filter-format"
          [value]="filters().format ?? 'all'"
          (change)="onSelectChange('format', $event)"
          class="w-full appearance-none rounded-xl border border-white/20 bg-slate-950 py-2.5 px-3.5 text-xs font-bold text-white outline-none transition hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
        >
          <option value="all" class="bg-slate-950 text-white">Mọi định dạng</option>
          <option value="2D" class="bg-slate-950 text-white">2D Digital Standard</option>
          <option value="3D" class="bg-slate-950 text-white">3D RealD Cinema</option>
          <option value="IMAX" class="bg-slate-950 text-white">IMAX Laser</option>
        </select>
      </div>

      <div>
        <label
          for="filter-search"
          class="block text-xs font-black uppercase tracking-wider text-amber-300 mb-2"
        >
          Tìm kiếm phim hoặc rạp
        </label>
        <input
          id="filter-search"
          type="search"
          [value]="filters().searchQuery ?? ''"
          (input)="onSelectChange('searchQuery', $event)"
          placeholder="Nhập tên phim, cụm rạp..."
          class="w-full rounded-xl border border-white/20 bg-slate-950 py-2.5 px-3.5 text-xs font-bold text-white outline-none transition placeholder:text-slate-500 hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
        />
      </div>

      <div class="flex items-end gap-2">
        @if (hasActiveFilters()) {
          <button
            type="button"
            (click)="resetClicked.emit()"
            class="w-full rounded-xl border border-amber-400/50 bg-amber-400/10 py-2.5 px-3.5 text-xs font-black text-amber-300 transition hover:bg-amber-400 hover:text-black cursor-pointer shadow-sm"
          >
            Đặt lại bộ lọc
          </button>
        } @else {
          <div
            class="flex w-full items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 py-2.5 px-3.5 text-xs font-medium text-slate-500"
          >
            Đang hiển thị tất cả
          </div>
        }
      </div>
    </div>
  `,
})
export class ShowtimeFilterBarComponent {
  readonly filters = input.required<ShowtimeFilters>();
  readonly cities = input.required<readonly { id: string; name: string }[]>();
  readonly movies = input<readonly { id: string; name: string }[]>([]);

  readonly filterChanged = output<Partial<ShowtimeFilters>>();
  readonly resetClicked = output<void>();

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return (
      (f.movieId && f.movieId !== 'all') ||
      (f.cityId && f.cityId !== 'all') ||
      (f.cinemaId && f.cinemaId !== 'all') ||
      (f.format && f.format !== 'all') ||
      (f.searchQuery && f.searchQuery.trim().length > 0)
    );
  });

  onSelectChange(field: keyof ShowtimeFilters, event: Event): void {
    const val = (event.target as HTMLSelectElement | HTMLInputElement).value;
    this.filterChanged.emit({
      [field]: val === 'all' || val === '' ? null : val,
    });
  }
}
