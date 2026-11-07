import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AgeBadgeComponent } from '@cinehub/web/shared/ui';
import { ShowtimesStore } from '@cinehub/web/showtimes/data-access';
import { ShowtimeFilterBarComponent } from '@cinehub/web/showtimes/ui';
import { vietnamDate, type GalaxySession, type ShowtimeFilters } from '@cinehub/web/showtimes/util';

interface CinemaGroup {
  readonly id: string;
  readonly cinema: GalaxySession['cinema'];
  readonly movieGroups: readonly MovieGroup[];
  readonly sessionCount: number;
}

interface MovieGroup {
  readonly id: string;
  readonly movie: GalaxySession['movie'];
  readonly sessions: readonly GalaxySession[];
}

@Component({
  selector: 'ch-showtimes-page',
  standalone: true,
  imports: [RouterLink, AgeBadgeComponent, ShowtimeFilterBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <section class="mx-auto max-w-[1440px] px-5 py-8 md:px-9">
        <header
          class="mb-7 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="min-w-0">
            <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">
              {{ hasMovieFilter() ? 'Lịch chiếu theo phim' : 'Lịch chiếu · Cụm rạp toàn quốc' }}
            </p>
            <h1 class="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {{ hasMovieFilter() ? selectedMovieName() : 'Chọn suất chiếu toàn quốc' }}
            </h1>
            @if (hasMovieFilter()) {
              <p class="mt-2 text-sm font-bold text-slate-200">
                Chọn ngày và cụm rạp để xem các suất chiếu của phim này.
              </p>
            }
          </div>
          <div class="flex flex-wrap items-center gap-3">
            @if (hasMovieFilter()) {
              <a
                routerLink="/showtimes"
                class="rounded-xl border border-amber-300/50 bg-amber-400/10 px-4 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-400/20"
              >
                Xem lịch toàn quốc
              </a>
            }
            @if (store.fetchedAt()) {
              <p class="text-xs font-bold text-slate-400">
                Cập nhật lúc
                <strong class="text-slate-200">{{ formatFetchedAt(store.fetchedAt()) }}</strong>
              </p>
            }
            <button
              type="button"
              (click)="retry()"
              [disabled]="store.loading()"
              aria-label="Làm mới lịch chiếu"
              class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-4 py-2.5 text-xs font-black text-white transition hover:border-amber-300/60 hover:text-amber-200 disabled:opacity-50"
            >
              <span aria-hidden="true" [class.animate-spin]="store.loading()">↻</span>
              {{ store.loading() ? 'Đang cập nhật' : 'Cập nhật lịch' }}
            </button>
          </div>
        </header>

        @if (store.stale()) {
          <p
            class="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
          >
            Dữ liệu lịch chiếu đang dùng bản lưu gần nhất từ
            {{ formatFetchedAt(store.fetchedAt()) }}.
          </p>
        }
        @if (store.error() && store.sessions().length > 0) {
          <div
            class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-red-950/60 px-4 py-3 text-sm text-red-100"
          >
            <span>{{ store.error() }}</span>
            <button type="button" (click)="retry()" class="font-black text-amber-200">
              Thử lại
            </button>
          </div>
        }

        <section
          class="mb-6 rounded-3xl border border-white/10 bg-white/[.025] p-4 shadow-xl sm:p-5"
          aria-label="Chọn ngày chiếu"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">
                Lịch trong 7 ngày tới
              </p>
              <h2 class="mt-1 text-sm font-black text-white">Chọn ngày xem phim</h2>
            </div>
            <span class="text-xs font-bold text-slate-400">
              {{ store.filteredSessions().length }} suất phù hợp
            </span>
          </div>
          <div class="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
            <button
              type="button"
              (click)="setDate(null)"
              [attr.aria-pressed]="!store.filters().date"
              class="flex min-w-[110px] shrink-0 flex-col items-center justify-center rounded-2xl border px-4 py-3 text-xs font-black transition"
              [class]="
                !store.filters().date
                  ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_8px_24px_rgba(251,191,36,.18)]'
                  : 'border-white/15 bg-slate-900/80 text-white hover:border-amber-400/70'
              "
            >
              <span>Tất cả</span>
              <span class="mt-1 text-[10px] opacity-75">Ngày</span>
            </button>
            @for (day of store.days(); track day.isoDate) {
              <button
                type="button"
                (click)="setDate(day.isoDate)"
                [disabled]="day.count === 0"
                [attr.aria-pressed]="store.filters().date === day.isoDate"
                [attr.aria-label]="
                  day.short +
                  ' ngày ' +
                  day.num +
                  '/' +
                  day.month +
                  ', ' +
                  day.count +
                  ' suất chiếu'
                "
                class="flex min-w-[110px] shrink-0 flex-col items-center justify-center rounded-2xl border px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35"
                [class]="
                  store.filters().date === day.isoDate
                    ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_8px_24px_rgba(251,191,36,.18)]'
                    : 'border-white/15 bg-slate-900/80 text-white hover:border-amber-400/70'
                "
              >
                <span class="text-[10px] uppercase opacity-75">{{ day.short }}</span>
                <span class="mt-0.5 text-lg font-black">{{ day.num }}/{{ day.month }}</span>
                <span class="mt-0.5 text-[10px] opacity-80">{{ day.count }} suất</span>
              </button>
            }
          </div>
        </section>

        <div class="mb-6 rounded-2xl border-2 border-slate-700 bg-slate-900 p-4 shadow-xl">
          <ch-showtime-filter-bar
            [filters]="store.filters()"
            [cities]="store.cities()"
            [movies]="store.movies()"
            [movieLocked]="hasMovieFilter()"
            (filterChanged)="updateFilters($event)"
            (resetClicked)="resetFilters()"
          />
        </div>

        @if (store.loading()) {
          <div
            role="status"
            class="rounded-2xl border border-white/15 bg-slate-900/80 p-10 text-center text-sm font-bold text-slate-200"
          >
            Đang tải lịch chiếu mới nhất…
          </div>
        } @else if (store.error() && store.sessions().length === 0) {
          <div class="rounded-2xl border border-red-400/40 bg-slate-900/90 p-10 text-center">
            <h2 class="text-xl font-black text-white">{{ store.error() }}</h2>
            <button
              type="button"
              (click)="retry()"
              class="mt-5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950"
            >
              Thử tải lại
            </button>
          </div>
        } @else if (cinemaGroups().length > 0) {
          <div class="space-y-5">
            @for (group of cinemaGroups(); track group.id) {
              <section
                class="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/30"
              >
                <div
                  class="flex flex-col gap-4 border-b border-white/10 bg-gradient-to-r from-white/[.04] to-transparent p-4 sm:flex-row sm:items-center sm:p-5"
                >
                  <button
                    type="button"
                    (click)="openCinemaGallery(group.cinema)"
                    [attr.aria-label]="'Xem ảnh của ' + group.cinema.name"
                    class="group/cinema-image relative h-36 w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:h-32 sm:w-56"
                  >
                    @if (cinemaImages(group.cinema).length > 0) {
                      <img
                        [src]="cinemaImages(group.cinema)[0]"
                        [alt]="'Ảnh ' + group.cinema.name"
                        class="h-full w-full object-cover transition duration-300 group-hover/cinema-image:scale-105"
                      />
                      @if (cinemaImages(group.cinema).length > 1) {
                        <span
                          class="absolute bottom-2 right-2 rounded-lg border border-white/20 bg-slate-950/85 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur"
                        >
                          +{{ cinemaImages(group.cinema).length - 1 }} ảnh
                        </span>
                      }
                    } @else {
                      <span class="grid h-full place-items-center text-xs text-slate-400">
                        Chưa có ảnh rạp
                      </span>
                    }
                  </button>
                  <div class="min-w-0">
                    <p class="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">
                      Rạp chiếu phim
                    </p>
                    <h2 class="mt-1 text-xl font-black text-white">{{ group.cinema.name }}</h2>
                    <p class="mt-1 flex items-start gap-2 text-sm text-slate-300">
                      <span aria-hidden="true" class="mt-0.5 text-amber-300">⌖</span>
                      <span>{{ group.cinema.address || 'Đang cập nhật địa chỉ' }}</span>
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      @if (group.cinema.phone) {
                        <a
                          [href]="telephoneUrl(group.cinema.phone)"
                          class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[.04] px-3 py-1.5 text-xs font-bold text-slate-100 transition hover:border-amber-300/50 hover:text-amber-200"
                          [attr.aria-label]="'Gọi hotline ' + group.cinema.phone"
                        >
                          <span aria-hidden="true">☎</span>
                          Hotline {{ group.cinema.phone }}
                        </a>
                      }
                      @if (group.cinema.address) {
                        <a
                          [href]="directionsUrl(group.cinema)"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-200 transition hover:bg-amber-400/20"
                          [attr.aria-label]="'Chỉ đường đến ' + group.cinema.name"
                        >
                          <span aria-hidden="true">➤</span>
                          Chỉ đường
                        </a>
                      }
                    </div>
                    <p class="mt-2 text-xs font-bold text-amber-300">
                      {{ group.sessionCount }} suất chiếu
                    </p>
                  </div>
                </div>
                <div class="space-y-5 p-4 sm:p-5">
                  @for (movieGroup of group.movieGroups; track movieGroup.id) {
                    <article class="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                      <div class="flex items-start gap-4">
                        @if (movieGroup.movie.imagePortrait || movieGroup.movie.imageLandscape) {
                          <img
                            [src]="
                              movieGroup.movie.imagePortrait || movieGroup.movie.imageLandscape
                            "
                            [alt]="'Poster ' + movieGroup.movie.name"
                            class="h-24 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/15 sm:h-28 sm:w-[74px]"
                          />
                        }
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <ch-age-badge [age]="movieGroup.movie.age" />
                            <a
                              [routerLink]="[
                                '/movie',
                                movieGroup.movie.dbId || movieGroup.movie.id,
                              ]"
                              class="text-lg font-black text-white transition hover:text-amber-300"
                            >
                              {{ movieGroup.movie.name }}
                            </a>
                          </div>
                          <p class="mt-1 text-xs font-medium text-slate-400">
                            {{ movieGroup.movie.duration }} phút ·
                            {{ movieGroup.sessions.length }} suất tại rạp này
                          </p>
                          <div class="mt-4 flex flex-wrap gap-2">
                            @for (session of movieGroup.sessions; track session.id) {
                              @if (session.status === 'SOLD_OUT') {
                                <button
                                  type="button"
                                  disabled
                                  class="min-w-[112px] cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-left opacity-60"
                                  [attr.aria-label]="
                                    'Suất ' +
                                    session.showTime +
                                    ', ' +
                                    session.movieFormat +
                                    ', đã hết vé'
                                  "
                                >
                                  <span class="block text-sm font-black text-slate-300">
                                    {{ session.showTime }}
                                  </span>
                                  <span class="mt-1 block text-[10px] font-bold text-slate-400">
                                    {{ session.movieFormat }} · Hết vé
                                  </span>
                                </button>
                              } @else {
                                <a
                                  [routerLink]="['/seats', session.id]"
                                  [queryParams]="seatParams(session)"
                                  class="min-w-[112px] rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-left transition hover:border-amber-300 hover:bg-amber-400 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                                  [attr.aria-label]="
                                    'Chọn suất ' +
                                    session.showTime +
                                    ', ' +
                                    session.movieFormat +
                                    ', ' +
                                    (session.caption === 'voice' ? 'lồng tiếng' : 'phụ đề') +
                                    (store.filters().date ? '' : ', ngày ' + session.showDate)
                                  "
                                >
                                  <span class="block text-sm font-black">
                                    {{ session.showTime }}
                                    @if (!store.filters().date) {
                                      · {{ formatSessionDate(session.showDate) }}
                                    }
                                  </span>
                                  <span class="mt-1 block text-[10px] font-bold text-amber-200">
                                    {{ session.movieFormat }} ·
                                    {{ session.caption === 'voice' ? 'Lồng tiếng' : 'Phụ đề' }}
                                  </span>
                                </a>
                              }
                            }
                          </div>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              </section>
            }
          </div>
        } @else {
          <div
            class="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/70 p-8 text-center"
          >
            <h2 class="text-xl font-black text-white sm:text-2xl">
              {{
                hasMovieFilter()
                  ? 'Phim này chưa có suất chiếu sắp tới'
                  : 'Không tìm thấy suất chiếu phù hợp'
              }}
            </h2>
            <p class="mt-2 max-w-md text-sm text-slate-300">
              {{
                hasMovieFilter()
                  ? 'Lịch chiếu sẽ được cập nhật khi rạp công bố suất mới.'
                  : 'Thử đổi ngày hoặc bộ lọc rạp để xem lịch chiếu.'
              }}
            </p>
            @if (hasMovieFilter()) {
              <a
                routerLink="/"
                class="mt-6 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950"
              >
                Xem phim khác
              </a>
            } @else {
              <button
                type="button"
                (click)="resetFilters()"
                class="mt-6 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950"
              >
                Xóa bộ lọc
              </button>
            }
          </div>
        }
      </section>

      @if (galleryCinema(); as cinema) {
        <div
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="presentation"
          (click)="closeCinemaGallery()"
        >
          <section
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="'Thư viện ảnh ' + cinema.name"
            class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/15 bg-slate-950 p-5 shadow-2xl sm:p-7"
            (click)="$event.stopPropagation()"
          >
            <header class="mb-5 flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">
                  Hình ảnh rạp
                </p>
                <h2 class="mt-1 text-xl font-black text-white sm:text-2xl">{{ cinema.name }}</h2>
                <p class="mt-1 text-sm text-slate-300">{{ cinema.address }}</p>
              </div>
              <button
                type="button"
                (click)="closeCinemaGallery()"
                aria-label="Đóng thư viện ảnh"
                class="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/[.05] text-lg text-white transition hover:border-amber-300 hover:text-amber-200"
              >
                ×
              </button>
            </header>
            @if (cinemaImages(cinema).length > 0) {
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                @for (image of cinemaImages(cinema); track image) {
                  <img
                    [src]="image"
                    [alt]="'Ảnh ' + cinema.name"
                    loading="lazy"
                    class="aspect-[4/3] w-full rounded-2xl border border-white/10 object-cover"
                  />
                }
              </div>
            } @else {
              <p
                class="rounded-xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-slate-300"
              >
                Rạp chưa có hình ảnh bổ sung.
              </p>
            }
          </section>
        </div>
      }
    </main>
  `,
})
export class ShowtimesPageComponent implements OnInit {
  readonly store = inject(ShowtimesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly galleryCinema = signal<GalaxySession['cinema'] | null>(null);

  readonly hasMovieFilter = computed(() => {
    const movieId = this.store.filters().movieId;
    return !!movieId && String(movieId).toLowerCase() !== 'all';
  });

  readonly selectedMovieName = computed(() => {
    if (!this.hasMovieFilter()) return '';
    const target = String(this.store.filters().movieId);
    return (
      this.store
        .movies()
        .find((movie) => movie.id === target || movie.dbId === target || movie.slug === target)
        ?.name ??
      this.store
        .sessions()
        .find(
          (session) =>
            session.movie.id === target ||
            session.movie.dbId === target ||
            session.movie.slug === target,
        )?.movie.name ??
      target
    );
  });

  readonly cinemaGroups = computed<CinemaGroup[]>(() => {
    const groups = new Map<
      string,
      {
        cinema: GalaxySession['cinema'];
        movies: Map<string, { movie: GalaxySession['movie']; sessions: GalaxySession[] }>;
      }
    >();
    for (const session of this.store.filteredSessions()) {
      const id = session.cinema.dbId || session.cinema.id || session.cinema.code;
      const group = groups.get(id) ?? { cinema: session.cinema, movies: new Map() };
      const movieId = session.movie.dbId || session.movie.slug || session.movie.id;
      const movieGroup = group.movies.get(movieId) ?? { movie: session.movie, sessions: [] };
      movieGroup.sessions.push(session);
      group.movies.set(movieId, movieGroup);
      groups.set(id, group);
    }
    return [...groups.entries()]
      .map(([id, group]) => {
        const movieGroups = [...group.movies.entries()]
          .map(([movieId, movieGroup]) => ({
            id: movieId,
            movie: movieGroup.movie,
            sessions: movieGroup.sessions.sort(
              (a, b) =>
                a.showDate.localeCompare(b.showDate) || a.showTime.localeCompare(b.showTime),
            ),
          }))
          .sort((a, b) => a.movie.name.localeCompare(b.movie.name, 'vi'));
        return {
          id,
          cinema: group.cinema,
          movieGroups,
          sessionCount: movieGroups.reduce((count, movie) => count + movie.sessions.length, 0),
        };
      })
      .sort(
        (a, b) =>
          a.cinema.order - b.cinema.order || a.cinema.name.localeCompare(b.cinema.name, 'vi'),
      );
  });

  ngOnInit(): void {
    let previousMovieId: string | null = null;
    const loadingSessions = this.store.loadSessionsFromApi();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const legacyDay = params.get('day');
      const date =
        params.get('date') || (legacyDay !== null ? vietnamDate(Number(legacyDay)) : null);
      const movieId = params.get('movie') || params.get('movieId') || 'all';
      this.store.updateFilters({
        movieId,
        cinemaId: params.get('cinema') || params.get('cinemaId') || 'all',
        date,
      });
      if (
        movieId !== previousMovieId &&
        movieId !== 'all' &&
        !date &&
        this.store.fetchedAt() &&
        !this.store.loading()
      ) {
        this.selectEarliestDateIfAvailable();
      }
      previousMovieId = movieId;
    });
    void loadingSessions.then(() => this.selectEarliestDateIfAvailable());
  }

  setDate(date: string | null): void {
    this.store.updateFilters({ date });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date, day: null },
      queryParamsHandling: 'merge',
    });
  }

  updateFilters(filters: Partial<ShowtimeFilters>): void {
    this.store.updateFilters(filters);
    const queryParams: Record<string, string | null> = {};
    if (filters.date !== undefined) {
      queryParams['date'] = filters.date ?? null;
      queryParams['day'] = null;
    }
    if (filters.cinemaId !== undefined) {
      queryParams['cinema'] = filters.cinemaId === 'all' ? null : (filters.cinemaId ?? null);
      queryParams['cinemaId'] = null;
    }
    if (filters.movieId !== undefined) {
      queryParams['movie'] = filters.movieId === 'all' ? null : String(filters.movieId ?? '');
      queryParams['movieId'] = null;
    }
    if (Object.keys(queryParams).length > 0) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge',
      });
    }
  }

  resetFilters(): void {
    this.updateFilters({
      date: null,
      movieId: this.hasMovieFilter() ? this.store.filters().movieId : 'all',
      cinemaId: 'all',
      cityId: 'all',
      format: 'all',
      searchQuery: '',
    });
  }

  retry(): void {
    void this.store.loadSessionsFromApi();
  }

  seatParams(session: GalaxySession): Record<string, string> {
    return {
      movieTitle: session.movie.name,
      movieId: session.movie.dbId || session.movie.id,
      cinemaName: session.cinema.name,
      cinemaId: session.cinema.dbId || '',
      cinemaCode: session.cinema.code,
      showTime: session.showTime,
      showDate: session.showDate,
      format: session.movieFormat,
      screenName: session.screenName,
      backdrop: session.movie.imageLandscape || session.movie.imagePortrait,
    };
  }

  formatFetchedAt(value: string | null): string {
    if (!value) return 'thời điểm không xác định';
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }

  formatSessionDate(value: string): string {
    const date = new Date(`${value.slice(0, 10)}T12:00:00+07:00`);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  }

  cinemaImages(cinema: GalaxySession['cinema']): string[] {
    return [...new Set([cinema.imageLandscape, cinema.imagePortrait, ...(cinema.imageUrls ?? [])])]
      .map((image) => image.trim())
      .filter(Boolean);
  }

  openCinemaGallery(cinema: GalaxySession['cinema']): void {
    this.galleryCinema.set(cinema);
  }

  closeCinemaGallery(): void {
    this.galleryCinema.set(null);
  }

  directionsUrl(cinema: GalaxySession['cinema']): string {
    const destination =
      cinema.latitude && cinema.longitude
        ? `${cinema.latitude},${cinema.longitude}`
        : cinema.address;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }

  telephoneUrl(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
  }

  private selectEarliestDateIfAvailable(): void {
    if (
      !this.hasMovieFilter() ||
      this.route.snapshot.queryParamMap.has('date') ||
      this.route.snapshot.queryParamMap.has('day') ||
      !this.store.fetchedAt() ||
      this.store.error()
    ) {
      return;
    }

    const firstAvailableDay = this.store.days().find((day) => day.count > 0);
    if (firstAvailableDay) this.setDate(firstAvailableDay.isoDate);
  }
}
