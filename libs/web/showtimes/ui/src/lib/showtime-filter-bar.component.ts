import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ShowtimeFilters } from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-showtime-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl"
      role="search"
      aria-label="Bộ lọc lịch chiếu"
    >
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
        <!-- 1. Chọn Phim -->
        <div>
          <label
            for="filter-movie"
            class="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2"
          >
            Phim
          </label>
          <div class="relative">
            <select
              id="filter-movie"
              [value]="currentMovieValue()"
              (change)="onSelectChange('movieId', $event)"
              class="h-[46px] w-full appearance-none rounded-xl border border-white/20 bg-slate-950 py-2.5 pl-3.5 pr-9 text-xs font-bold text-white outline-none transition hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
            >
              <option value="all" class="bg-slate-950 font-bold text-white">Tất cả phim</option>
              @for (movie of movies(); track movie.id) {
                <option [value]="movie.id" class="bg-slate-950 font-semibold text-white">
                  {{ movie.name }}
                </option>
              }
            </select>
            <span
              class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              >▼</span
            >
          </div>
        </div>

        <!-- 2. Tỉnh / Thành phố -->
        <div>
          <label
            for="filter-city"
            class="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2"
          >
            Tỉnh / Thành phố
          </label>
          <div class="relative">
            <select
              id="filter-city"
              [value]="currentCityValue()"
              (change)="onCityChange($event)"
              class="h-[46px] w-full appearance-none rounded-xl border border-white/20 bg-slate-950 py-2.5 pl-3.5 pr-9 text-xs font-bold text-white outline-none transition hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
            >
              <option value="all" class="bg-slate-950 font-bold text-white">
                Toàn quốc (Tất cả cụm rạp)
              </option>
              @for (city of cities(); track city.id) {
                <option [value]="city.id" class="bg-slate-950 font-semibold text-white">
                  {{ city.name }}
                </option>
              }
            </select>
            <span
              class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              >▼</span
            >
          </div>
        </div>

        <!-- 3. Cụm rạp -->
        <div>
          <label
            for="filter-cinema"
            class="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2"
          >
            Cụm rạp
          </label>
          <div class="relative">
            <select
              id="filter-cinema"
              [value]="currentCinemaValue()"
              (change)="onSelectChange('cinemaId', $event)"
              class="h-[46px] w-full appearance-none rounded-xl border border-white/20 bg-slate-950 py-2.5 pl-3.5 pr-9 text-xs font-bold text-white outline-none transition hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
            >
              <option value="all" class="bg-slate-950 font-bold text-white">
                {{ filteredCinemas().length > 0 ? 'Tất cả rạp' : 'Chưa có rạp phù hợp' }}
              </option>
              @for (cinema of filteredCinemas(); track cinema.id) {
                <option [value]="cinema.id" class="bg-slate-950 font-semibold text-white">
                  {{ cinema.name }}
                </option>
              }
            </select>
            <span
              class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              >▼</span
            >
          </div>
        </div>

        <!-- 4. Định dạng phòng chiếu -->
        <div>
          <label
            for="filter-format"
            class="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2"
          >
            Định dạng phòng chiếu
          </label>
          <div class="relative">
            <select
              id="filter-format"
              [value]="currentFormatValue()"
              (change)="onSelectChange('format', $event)"
              class="h-[46px] w-full appearance-none rounded-xl border border-white/20 bg-slate-950 py-2.5 pl-3.5 pr-9 text-xs font-bold text-white outline-none transition hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
            >
              <option value="all" class="bg-slate-950 font-bold text-white">Mọi định dạng</option>
              @for (fmt of formats(); track fmt) {
                <option [value]="fmt" class="bg-slate-950 font-semibold text-white">
                  {{ formatDisplay(fmt) }}
                </option>
              }
            </select>
            <span
              class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              >▼</span
            >
          </div>
        </div>

        <!-- 5. Tìm kiếm phim hoặc rạp -->
        <div>
          <label
            for="filter-search"
            class="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2"
          >
            Tìm kiếm phim hoặc rạp
          </label>
          <div class="relative">
            <input
              id="filter-search"
              type="search"
              [value]="filters().searchQuery ?? ''"
              (input)="onSearchInput($event)"
              placeholder="Nhập tên phim, cụm rạp..."
              class="h-[46px] w-full rounded-xl border border-white/20 bg-slate-950 py-2.5 pl-3.5 pr-9 text-xs font-bold text-white outline-none transition placeholder:text-slate-500 hover:border-white/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
            />
            @if (filters().searchQuery) {
              <button
                type="button"
                (click)="clearFilter('searchQuery')"
                aria-label="Xóa từ khóa tìm kiếm"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            }
          </div>
        </div>

        <!-- 6. Thao tác đặt lại -->
        <div>
          <span
            class="block text-[11px] font-black uppercase tracking-wider text-transparent mb-2 select-none pointer-events-none"
          >
            Thao tác
          </span>
          <button
            type="button"
            (click)="resetClicked.emit()"
            [disabled]="!hasActiveFilters()"
            aria-label="Đặt lại bộ lọc"
            class="h-[46px] w-full rounded-xl border font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            [class]="
              hasActiveFilters()
                ? 'border-amber-400/50 bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-black shadow-amber-400/10'
                : 'border-white/10 bg-slate-950/60 text-slate-500'
            "
          >
            <span aria-hidden="true" class="text-xs">↺</span>
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      <!-- Active Filter Tags / Chips -->
      @if (hasActiveFilters()) {
        <div
          class="col-span-full mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs"
        >
          <span class="text-slate-400 font-semibold text-[11px] uppercase tracking-wider"
            >Đang lọc:</span
          >
          @if (selectedMovieName()) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-bold text-amber-300"
            >
              Phim: {{ selectedMovieName() }}
              <button
                type="button"
                (click)="clearFilter('movieId')"
                aria-label="Bỏ chọn phim"
                class="ml-1 text-slate-400 transition hover:text-white font-black cursor-pointer"
              >
                ✕
              </button>
            </span>
          }
          @if (selectedCityName()) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-bold text-amber-300"
            >
              Khu vực: {{ selectedCityName() }}
              <button
                type="button"
                (click)="clearFilter('cityId')"
                aria-label="Bỏ chọn khu vực"
                class="ml-1 text-slate-400 transition hover:text-white font-black cursor-pointer"
              >
                ✕
              </button>
            </span>
          }
          @if (selectedCinemaName()) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-bold text-amber-300"
            >
              Rạp: {{ selectedCinemaName() }}
              <button
                type="button"
                (click)="clearFilter('cinemaId')"
                aria-label="Bỏ chọn rạp"
                class="ml-1 text-slate-400 transition hover:text-white font-black cursor-pointer"
              >
                ✕
              </button>
            </span>
          }
          @if (selectedFormatName()) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-bold text-amber-300"
            >
              Định dạng: {{ selectedFormatName() }}
              <button
                type="button"
                (click)="clearFilter('format')"
                aria-label="Bỏ chọn định dạng"
                class="ml-1 text-slate-400 transition hover:text-white font-black cursor-pointer"
              >
                ✕
              </button>
            </span>
          }
          @if (filters().searchQuery) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-bold text-amber-300"
            >
              Tìm kiếm: "{{ filters().searchQuery }}"
              <button
                type="button"
                (click)="clearFilter('searchQuery')"
                aria-label="Xóa từ khóa tìm kiếm"
                class="ml-1 text-slate-400 transition hover:text-white font-black cursor-pointer"
              >
                ✕
              </button>
            </span>
          }
          <button
            type="button"
            (click)="resetClicked.emit()"
            class="ml-2 text-[11px] font-bold text-amber-400 underline hover:text-amber-300 cursor-pointer"
          >
            Xóa tất cả
          </button>
        </div>
      }
    </div>
  `,
})
export class ShowtimeFilterBarComponent {
  readonly filters = input.required<ShowtimeFilters>();
  readonly cities = input.required<readonly { id: string; name: string }[]>();
  readonly cinemas = input<
    readonly { id: string; name: string; cityId?: string; cityName?: string }[]
  >([]);
  readonly formats = input<readonly string[]>(['2D', '3D', 'IMAX']);
  readonly movies = input<readonly { id: string; name: string; slug?: string; dbId?: string }[]>(
    [],
  );
  readonly movieLocked = input(false);
  readonly filterChanged = output<Partial<ShowtimeFilters>>();
  readonly resetClicked = output<void>();

  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return Boolean(
      (f.movieId && f.movieId !== 'all') ||
      (f.cityId && f.cityId !== 'all') ||
      (f.cinemaId && f.cinemaId !== 'all') ||
      (f.format && f.format !== 'all') ||
      (f.searchQuery && f.searchQuery.trim().length > 0),
    );
  });

  readonly filteredCinemas = computed(() => {
    const list = this.cinemas();
    const cityId = this.filters().cityId;
    if (!cityId || cityId === 'all') return list;
    const target = cityId.toLowerCase();
    return list.filter((c) => {
      const matchCityId = c.cityId?.toLowerCase() === target;
      const matchCityName =
        c.cityName?.toLowerCase() === target || c.cityName?.toLowerCase().includes(target);
      return matchCityId || matchCityName;
    });
  });

  readonly currentMovieValue = computed(() => {
    const current = this.filters().movieId;
    if (!current || current === 'all') return 'all';
    const target = String(current).toLowerCase().trim();
    const found = this.movies().find((m) => {
      const id = m.id.toLowerCase();
      const rawId = ('rawId' in m ? String((m as any).rawId) : '').toLowerCase();
      const dbId = (m.dbId || '').toLowerCase();
      const slug = (m.slug || '').toLowerCase();
      const name = m.name.toLowerCase();
      return (
        id === target || rawId === target || dbId === target || slug === target || name === target
      );
    });
    return found ? found.id : target;
  });

  readonly currentCityValue = computed(() => {
    const current = this.filters().cityId;
    if (!current || current === 'all') return 'all';
    const target = String(current).toLowerCase();
    const found = this.cities().find(
      (c) => c.id.toLowerCase() === target || c.name.toLowerCase() === target,
    );
    return found ? found.id : current;
  });

  readonly currentCinemaValue = computed(() => {
    const current = this.filters().cinemaId;
    if (!current || current === 'all') return 'all';
    const target = String(current).toLowerCase();
    const found = this.cinemas().find(
      (c) =>
        c.id.toLowerCase() === target ||
        c.name.toLowerCase() === target ||
        c.name.toLowerCase().includes(target),
    );
    return found ? found.id : current;
  });

  readonly currentFormatValue = computed(() => {
    const current = this.filters().format;
    if (!current || current === 'all') return 'all';
    return current;
  });

  readonly selectedMovieName = computed(() => {
    const movieId = this.filters().movieId;
    if (!movieId || movieId === 'all') return '';
    const target = String(movieId).toLowerCase().trim();
    const found = this.movies().find((m) => {
      const id = m.id.toLowerCase();
      const rawId = ('rawId' in m ? String((m as any).rawId) : '').toLowerCase();
      const dbId = (m.dbId || '').toLowerCase();
      const slug = (m.slug || '').toLowerCase();
      const name = m.name.toLowerCase();
      return (
        id === target || rawId === target || dbId === target || slug === target || name === target
      );
    });
    return found ? found.name : target;
  });

  readonly selectedCityName = computed(() => {
    const cityId = this.filters().cityId;
    if (!cityId || cityId === 'all') return '';
    const target = String(cityId).toLowerCase();
    return (
      this.cities().find((c) => c.id.toLowerCase() === target || c.name.toLowerCase() === target)
        ?.name || cityId
    );
  });

  readonly selectedCinemaName = computed(() => {
    const cinemaId = this.filters().cinemaId;
    if (!cinemaId || cinemaId === 'all') return '';
    const target = String(cinemaId).toLowerCase();
    return (
      this.cinemas().find(
        (c) =>
          c.id.toLowerCase() === target ||
          c.name.toLowerCase() === target ||
          c.name.toLowerCase().includes(target),
      )?.name || cinemaId
    );
  });

  readonly selectedFormatName = computed(() => {
    const fmt = this.filters().format;
    if (!fmt || fmt === 'all') return '';
    return this.formatDisplay(fmt);
  });

  formatDisplay(fmt: string): string {
    const f = fmt.toUpperCase();
    if (f === '2D') return '2D Digital Standard';
    if (f === '3D') return '3D RealD Cinema';
    if (f === 'IMAX') return 'IMAX Laser';
    if (f.includes('4DX')) return '4DX Motion';
    if (f.includes('SCREENX')) return 'ScreenX 270°';
    return fmt;
  }

  onCityChange(event: Event): void {
    const cityId = (event.target as HTMLSelectElement).value;
    const partial: Partial<ShowtimeFilters> = {
      cityId: cityId === 'all' || cityId === '' ? null : cityId,
    };
    if (this.filters().cinemaId && this.filters().cinemaId !== 'all') {
      const cinema = this.cinemas().find((c) => c.id === this.filters().cinemaId);
      if (cinema && cityId !== 'all') {
        const matchesCity =
          cinema.cityId?.toLowerCase() === cityId.toLowerCase() ||
          cinema.cityName?.toLowerCase() === cityId.toLowerCase();
        if (!matchesCity) {
          partial.cinemaId = null;
        }
      }
    }
    this.filterChanged.emit(partial);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.filterChanged.emit({
      searchQuery: val,
    });
  }

  clearFilter(field: keyof ShowtimeFilters): void {
    if (field === 'searchQuery') {
      this.filterChanged.emit({ searchQuery: '' });
    } else {
      this.filterChanged.emit({ [field]: null });
    }
  }

  onSelectChange(field: keyof ShowtimeFilters, event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterChanged.emit({
      [field]: val === 'all' || val === '' ? null : val,
    });
  }
}
