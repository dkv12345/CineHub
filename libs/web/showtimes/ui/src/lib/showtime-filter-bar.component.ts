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
      @if (!movieLocked()) {
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
      }

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

      @if (!movieLocked() && filters().movieId && filters().movieId !== 'all') {
        <div class="col-span-full flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span class="text-slate-400">Đang lọc theo phim:</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-bold text-amber-300"
          >
            <span>{{ selectedMovieName() }}</span>
            <button
              type="button"
              (click)="clearMovieFilter()"
              aria-label="Bỏ chọn phim"
              class="ml-1 text-slate-400 transition hover:text-white"
            >
              ✕
            </button>
          </span>
        </div>
      }
    </div>
  `,
})
export class ShowtimeFilterBarComponent {
  readonly filters = input.required<ShowtimeFilters>();
  readonly cities = input.required<readonly { id: string; name: string }[]>();
  readonly movies = input<readonly { id: string; name: string }[]>([]);
  readonly movieLocked = input(false);
  readonly filterChanged = output<Partial<ShowtimeFilters>>();
  readonly resetClicked = output<void>();

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return (
      (f.movieId && f.movieId !== 'all') ||
      (f.cityId && f.cityId !== 'all') ||
      (f.cinemaId && f.cinemaId !== 'all') ||
      (f.format && f.format !== 'all') ||
      Boolean(f.searchQuery && f.searchQuery.trim().length > 0)
    );
  });

  readonly selectedMovieName = computed(() => {
    const movieId = this.filters().movieId;
    if (!movieId || movieId === 'all') return '';
    return this.movies().find((m) => m.id === movieId)?.name || movieId;
  });

  clearMovieFilter(): void {
    this.filterChanged.emit({ movieId: null });
  }

  onSelectChange(field: keyof ShowtimeFilters, event: Event): void {
    const val = (event.target as HTMLSelectElement | HTMLInputElement).value;
    this.filterChanged.emit({
      [field]: val === 'all' || val === '' ? null : val,
    });
  }
}
