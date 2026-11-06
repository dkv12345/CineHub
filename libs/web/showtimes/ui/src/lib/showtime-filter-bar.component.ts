import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ShowtimeFilters } from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-showtime-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="cinema-panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 shadow-2xs"
      role="search"
      aria-label="Bộ lọc lịch chiếu"
    >
      <div>
        <label for="filter-movie" class="cinema-label">Phim</label>
        <select
          id="filter-movie"
          [value]="filters().movieId ?? 'all'"
          (change)="onSelectChange('movieId', $event)"
          class="cinema-input"
        >
          <option value="all">Tất cả phim</option>
          @for (movie of movies(); track movie.id) {
            <option [value]="movie.id">{{ movie.name }}</option>
          }
        </select>
      </div>

      <div>
        <label for="filter-city" class="cinema-label">Tỉnh / Thành phố</label>
        <select
          id="filter-city"
          [value]="filters().cityId ?? 'all'"
          (change)="onSelectChange('cityId', $event)"
          class="cinema-input"
        >
          <option value="all">Toàn quốc (Tất cả cụm rạp)</option>
          @for (city of cities(); track city.id) {
            <option [value]="city.id">{{ city.name }}</option>
          }
        </select>
      </div>

      <div>
        <label for="filter-format" class="cinema-label">Định dạng phòng chiếu</label>
        <select
          id="filter-format"
          [value]="filters().format ?? 'all'"
          (change)="onSelectChange('format', $event)"
          class="cinema-input"
        >
          <option value="all">Mọi định dạng</option>
          <option value="2D">2D Digital Standard</option>
          <option value="3D">3D RealD Cinema</option>
          <option value="IMAX">IMAX Laser</option>
        </select>
      </div>

      <div>
        <label for="filter-search" class="cinema-label">Tìm kiếm phim hoặc rạp</label>
        <input
          id="filter-search"
          type="search"
          [value]="filters().searchQuery ?? ''"
          (input)="onSelectChange('searchQuery', $event)"
          placeholder="Nhập tên phim, cụm rạp..."
          class="cinema-input"
        />
      </div>

      <div class="flex items-end">
        <button type="button" (click)="resetClicked.emit()" class="cinema-btn-secondary w-full">
          Đặt lại bộ lọc
        </button>
      </div>

      @if (filters().movieId && filters().movieId !== 'all') {
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
  readonly cities = input.required<ReadonlyArray<{ id: string; name: string }>>();
  readonly movies = input<ReadonlyArray<{ id: string; name: string }>>([]);
  readonly filterChanged = output<Partial<ShowtimeFilters>>();
  readonly resetClicked = output<void>();

  readonly selectedMovieName = computed(() => {
    const id = this.filters().movieId;
    if (!id || id === 'all') return '';
    const match = this.movies().find((m) => m.id === id);
    return match?.name || id;
  });

  clearMovieFilter(): void {
    this.filterChanged.emit({ movieId: 'all' });
  }

  onSelectChange(key: keyof ShowtimeFilters, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    this.filterChanged.emit({ [key]: target?.value ?? '' });
  }
}
