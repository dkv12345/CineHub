import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { ShowtimesStore } from '@cinehub/web/showtimes/data-access';
import type { Movie } from '@cinehub/web/shared/util';
import { buildShowtimesQueryParams } from '@cinehub/web/showtimes/util';

function getReleaseYear(movie: Movie): string {
  const date = movie.startDate || movie.release;
  return date?.match(/\b(?:19|20)\d{2}\b/)?.[0] || 'Đang cập nhật';
}

function getDurationLabel(duration: string): string {
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*m/i);
  if (hours || minutes) {
    return `${Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0)} phút`;
  }
  return duration || 'Đang cập nhật';
}

function normalizeGenre(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi');
}

@Component({
  selector: 'ch-movie-detail-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolvedMovie(); as m) {
      <main
        class="min-h-screen overflow-hidden bg-slate-950 text-white"
        style="background-color: #020617; color: #ffffff;"
      >
        <!-- HERO BANNER SECTION -->
        <section
          class="relative isolate flex min-h-[520px] items-end overflow-hidden bg-slate-950 sm:min-h-[600px]"
        >
          <!-- Ảnh Backdrop Landscape -->
          <img
            [src]="m.backdrop || m.poster"
            alt=""
            class="absolute inset-0 z-0 h-full w-full object-cover object-center opacity-75"
          />
          <!-- Ambient Blur Layer theo màu Poster -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 z-[1] scale-125 bg-cover bg-center opacity-30 blur-3xl mix-blend-screen"
            [style.backgroundImage]="'url(' + (m.poster || m.backdrop) + ')'"
          ></div>
          <!-- Gradient Overlay phủ toàn bộ chiều cao -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 z-10 h-full w-full bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"
          ></div>

          <div
            class="relative z-20 mx-auto grid w-full max-w-[1440px] grid-cols-1 items-end gap-8 px-5 pb-28 pt-24 md:px-9 md:pb-36 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div class="max-w-4xl">
              <p
                class="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[.28em] text-amber-300 sm:text-sm"
              >
                <span class="h-px w-10 bg-amber-300"></span>
                {{ m.country || 'Điện ảnh' }}
              </p>

              <h1
                class="max-w-5xl text-3xl font-black tracking-wide text-white md:text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
              >
                {{ m.title.toUpperCase() }}
              </h1>

              <!-- Info Bar -->
              <div
                class="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold text-white sm:text-sm"
              >
                <span class="inline-flex items-center gap-2 text-white">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="h-4 w-4 text-amber-300"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                  </svg>
                  {{ releaseYear() }}
                </span>
                <span aria-hidden="true">|</span>
                <span>Độ tuổi: {{ m.age }}</span>
                <span aria-hidden="true">|</span>
                <span class="inline-flex items-center gap-2 text-white">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="h-4 w-4 text-amber-300"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  Thời lượng: {{ durationLabel() }}
                </span>
                <span aria-hidden="true">|</span>
                <span class="inline-flex items-center gap-2 text-white">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="h-4 w-4 text-amber-300"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                  </svg>
                  {{ languageLabel() }}
                </span>
              </div>

              <!-- Rating Badge -->
              <div class="mt-7 flex flex-wrap items-center gap-4">
                <div
                  class="grid h-[76px] w-[76px] place-items-center rounded-full border-2 border-amber-300 bg-black/70 shadow-[0_0_30px_rgba(251,191,36,.3)] backdrop-blur"
                  [attr.aria-label]="
                    'Đánh giá ' + (ratingLabel() === '—' ? 'chưa có' : ratingLabel())
                  "
                >
                  <span class="flex flex-col items-center">
                    <span class="flex items-center gap-1 text-base font-black text-amber-300">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        class="h-3.5 w-3.5"
                        fill="currentColor"
                      >
                        <path
                          d="m12 2 3.1 6.3 7 .9-5.1 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7L1.9 9.2l7-.9L12 2Z"
                        />
                      </svg>
                      {{ ratingLabel() }}
                    </span>
                    <span class="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Đánh giá
                    </span>
                  </span>
                </div>
                @if (m.votes > 0) {
                  <span class="text-xs font-semibold text-white">
                    {{ m.votes.toLocaleString('vi-VN') }} lượt đánh giá
                  </span>
                }
              </div>
            </div>

            <!-- Big Round Play Trailer Button -->
            <button
              type="button"
              (click)="openTrailer()"
              [attr.aria-label]="'Xem trailer phim ' + m.title"
              class="hidden h-16 w-16 place-items-center rounded-full border-2 border-white bg-black/40 text-white shadow-2xl backdrop-blur transition hover:scale-110 hover:border-amber-300 hover:bg-amber-400 hover:text-black md:grid lg:mb-2"
            >
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" class="ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          </div>
        </section>

        <!-- DETAILED INFO SECTION -->
        <section
          class="relative z-10 mx-auto grid max-w-[1440px] gap-8 bg-slate-950 px-5 pb-12 pt-4 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12 md:px-9 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16"
        >
          <!-- Left Column Poster Card -->
          <div class="mx-auto -mt-16 w-full max-w-[280px] md:mx-0 md:-mt-24 md:max-w-none">
            <div
              class="overflow-hidden rounded-xl bg-slate-900 shadow-2xl shadow-black/90 ring-2 ring-white/20"
            >
              <img
                [src]="m.poster || m.backdrop"
                [alt]="'Áp phích phim ' + m.title"
                class="aspect-[2/3] w-full object-cover"
              />
            </div>
            <span
              class="mt-4 inline-flex rounded-md border border-amber-300/50 bg-amber-400/20 px-3.5 py-1.5 text-xs font-black tracking-wide text-amber-300"
            >
              {{ m.age }}
            </span>
          </div>

          <!-- Right Column Details -->
          <div class="min-w-0 pt-1">
            <p class="text-xs font-extrabold uppercase tracking-[.25em] text-amber-400">
              THÔNG TIN PHIM
            </p>
            <h2 class="mt-2 text-2xl font-black text-white md:text-3xl">
              {{ m.title }}
            </h2>

            <p class="mt-4 text-base font-semibold text-white">
              <span class="font-extrabold text-amber-400">Đạo diễn:</span>
              <span class="font-bold text-white ml-2">{{ m.director }}</span>
            </p>

            <div class="mt-8">
              <h3
                class="mb-3 flex items-center gap-3 text-sm font-extrabold uppercase tracking-wide text-amber-400"
              >
                <span aria-hidden="true" class="h-5 w-1 rounded-full bg-amber-400"></span>
                NỘI DUNG PHIM
              </h3>
              <p
                class="max-w-3xl whitespace-pre-line text-sm font-medium leading-relaxed text-white sm:text-base"
              >
                {{ m.synopsis || 'Nội dung phim đang được cập nhật.' }}
              </p>
            </div>

            <!-- Thể loại Pills -->
            <div class="mt-7">
              <h3 class="mb-3 text-xs font-extrabold uppercase tracking-wide text-amber-400">
                THỂ LOẠI
              </h3>
              <div class="flex flex-wrap gap-2">
                @for (genre of genreList(); track genre) {
                  <span
                    class="rounded-full border border-white/50 bg-white/10 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-md"
                  >
                    {{ genre }}
                  </span>
                }
              </div>
            </div>

            <!-- CTA Action Buttons -->
            <div class="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                (click)="openTrailer()"
                [attr.aria-label]="'Xem trailer phim ' + m.title"
                class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white bg-white/15 px-6 py-3 text-sm font-extrabold text-white backdrop-blur-md transition hover:bg-white hover:text-black shadow-lg"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Xem trailer
              </button>

              @if (hasBookableShowtimes() || m.status !== 'soon') {
                <a
                  [routerLink]="['/showtimes']"
                  [queryParams]="showtimesQueryParams(m)"
                  [attr.aria-label]="'Mua vé phim ' + m.title"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-8 py-3 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path
                      d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a3 3 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a3 3 0 0 1 0-4z"
                    />
                  </svg>
                  Mua vé ngay
                </a>
              } @else {
                <button
                  type="button"
                  (click)="store.toggleMovieNotification(m.id)"
                  [attr.aria-pressed]="store.isMovieNotified(m.id)"
                  class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white shadow-lg transition"
                  [class]="
                    store.isMovieNotified(m.id)
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-700'
                  "
                >
                  {{ store.isMovieNotified(m.id) ? 'Đã đăng ký nhận tin' : 'Nhận thông báo' }}
                </button>
              }
            </div>

            @if (m.status === 'soon') {
              <p class="mt-3 text-xs font-semibold text-white">
                Khởi chiếu: {{ m.release }}. Đăng ký nhận tin để cập nhật lịch mở bán vé.
              </p>
            }

            <!-- Diễn viên Pills -->
            @if (castList().length > 0) {
              <div class="mt-8">
                <h3 class="mb-3 text-xs font-extrabold uppercase tracking-wide text-amber-400">
                  DIỄN VIÊN
                </h3>
                <div class="flex flex-wrap gap-2">
                  @for (actor of castList(); track actor) {
                    <span
                      class="rounded-full border border-white/20 bg-slate-900/80 px-3.5 py-1 text-xs font-bold text-white/90"
                    >
                      {{ actor }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </section>

        <!-- SIMILAR MOVIES SECTION -->
        @if (similarMovies().length > 0) {
          <section class="mx-auto max-w-[1440px] px-5 py-12 md:px-9 border-t border-white/10">
            <h2 class="mb-6 text-xl font-black uppercase text-amber-300">Có thể bạn thích</h2>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              @for (sim of similarMovies(); track sim.id) {
                <a
                  [routerLink]="['/movie', sim.id]"
                  class="group rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 shadow-lg transition hover:border-amber-400"
                >
                  <div class="aspect-[2/3] overflow-hidden rounded-xl bg-slate-950">
                    <img
                      [src]="sim.poster"
                      [alt]="sim.title"
                      class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <h3
                    class="mt-2.5 truncate text-xs font-black text-white group-hover:text-amber-300"
                  >
                    {{ sim.title }}
                  </h3>
                  <p class="text-[11px] font-bold text-amber-300">★ {{ sim.rating }}</p>
                </a>
              }
            </div>
          </section>
        }

        <!-- YOUTUBE TRAILER MODAL -->
        @if (showTrailerModal() && trailerUrl()) {
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
            (click)="closeTrailer()"
          >
            <div
              class="relative w-full max-w-4xl overflow-hidden rounded-2xl border-2 border-white/20 bg-black shadow-2xl"
              (click)="$event.stopPropagation()"
            >
              <button
                type="button"
                (click)="closeTrailer()"
                aria-label="Đóng trailer"
                class="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-slate-900/90 text-white border border-white/30 hover:border-amber-400 hover:text-amber-300 transition"
              >
                ✕
              </button>
              <div class="aspect-video w-full">
                <iframe
                  [src]="trailerUrl()"
                  title="Trailer video"
                  class="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>
            </div>
          </div>
        }
      </main>
    }
  `,
})
export class MovieDetailPageComponent implements OnInit {
  readonly store = inject(CatalogStore);
  private readonly showtimesStore = inject(ShowtimesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly id = input<string>('');
  readonly movie = input<Movie | null>(null);

  readonly showTrailerModal = signal(false);

  showtimesQueryParams(movie: Movie | null): Record<string, string> {
    return buildShowtimesQueryParams(movie ?? undefined);
  }

  readonly hasBookableShowtimes = computed(() => {
    const movie = this.resolvedMovie();
    if (!movie) return false;
    return this.showtimesStore
      .sessions()
      .some(
        (session) =>
          String(session.movie.id) === String(movie.id) ||
          (!!movie.dbId && session.movie.dbId === movie.dbId) ||
          (!!movie.slug && session.movie.slug === movie.slug),
      );
  });

  readonly resolvedMovie = computed<Movie | null>(() => {
    const currentId = this.id() || this.route.snapshot.paramMap.get('id') || '';
    const movie = this.movie() ?? this.store.findMovieById(currentId) ?? null;
    if (
      !movie ||
      this.showtimesStore.loading() ||
      this.showtimesStore.error() ||
      !this.showtimesStore.fetchedAt()
    ) {
      return movie;
    }

    const hasUpcomingSession = this.showtimesStore
      .sessions()
      .some(
        (session) =>
          String(session.movie.id) === String(movie.id) ||
          (!!movie.dbId && session.movie.dbId === movie.dbId) ||
          (!!movie.slug && session.movie.slug === movie.slug),
      );
    if (hasUpcomingSession && movie.status !== 'now') return { ...movie, status: 'now' };

    return movie;
  });

  readonly genreList = computed(() => {
    const g = this.resolvedMovie()?.genre || '';
    return g
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  });

  readonly releaseYear = computed(() => {
    const m = this.resolvedMovie();
    return m ? getReleaseYear(m) : 'Đang cập nhật';
  });

  readonly durationLabel = computed(() => {
    const m = this.resolvedMovie();
    return m ? getDurationLabel(m.duration) : 'Đang cập nhật';
  });

  readonly languageLabel = computed(() => {
    return this.resolvedMovie()?.country === 'Việt Nam' ? 'Tiếng Việt' : 'Phụ đề tiếng Việt';
  });

  readonly ratingLabel = computed(() => {
    const rating = this.resolvedMovie()?.rating ?? 0;
    return rating > 0 ? rating.toFixed(1) : '—';
  });

  readonly castList = computed(() => {
    const c = this.resolvedMovie()?.cast || '';
    return c
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && item !== 'Đang cập nhật');
  });

  readonly similarMovies = computed(() => {
    const m = this.resolvedMovie();
    if (!m) return [];
    const genres = new Set(m.genre.split(',').map(normalizeGenre).filter(Boolean));
    if (!genres.size) return [];

    return this.store
      .movies()
      .filter(
        (candidate) =>
          String(candidate.id) !== String(m.id) &&
          candidate.genre.split(',').some((genre) => genres.has(normalizeGenre(genre))),
      )
      .sort((a, b) => {
        const sharedGenreCount = (candidate: Movie) =>
          candidate.genre
            .split(',')
            .map(normalizeGenre)
            .filter((genre) => genres.has(genre)).length;
        return sharedGenreCount(b) - sharedGenreCount(a) || b.rating - a.rating;
      })
      .slice(0, 5);
  });

  readonly trailerUrl = computed<SafeResourceUrl | null>(() => {
    const m = this.resolvedMovie();
    const raw = m?.trailer;
    if (!raw) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
      );
    }
    const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
    const id = match?.[1] || 'dQw4w9WgXcQ';
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${id}?autoplay=1`,
    );
  });

  ngOnInit(): void {
    if (!this.store.loading()) {
      void this.store.refreshFromApi();
    }
    if (!this.showtimesStore.fetchedAt() && !this.showtimesStore.loading()) {
      void this.showtimesStore.loadSessionsFromApi();
    }
    if (this.route.snapshot.queryParamMap.get('trailer') === '1') {
      this.showTrailerModal.set(true);
    }
  }

  openTrailer(): void {
    this.showTrailerModal.set(true);
  }

  closeTrailer(): void {
    this.showTrailerModal.set(false);
  }
}
