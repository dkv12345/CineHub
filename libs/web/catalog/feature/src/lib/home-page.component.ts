import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { MovieCardComponent } from '@cinehub/web/catalog/ui';
import { promotions } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-home-page',
  standalone: true,
  imports: [RouterLink, NgOptimizedImage, MovieCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero Spotlight Banner -->
    @if (store.featuredMovie(); as hero) {
      <section class="relative overflow-hidden border-b border-slate-800/80 bg-slate-950">
        <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
          <div class="grid items-center gap-8 lg:grid-cols-12">
            <div class="lg:col-span-7 space-y-4">
              <div class="inline-flex items-center gap-2">
                <span
                  class="rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300"
                >
                  ★ {{ hero.rating }} · Suất chiếu IMAX & 3D POV
                </span>
                <span class="rounded-md bg-rose-600/90 px-2 py-0.5 text-xs font-bold text-white">
                  {{ hero.age }}
                </span>
              </div>

              <h1 class="text-3xl font-black tracking-tight text-white sm:text-5xl">
                {{ hero.title }}
              </h1>

              <p class="text-sm text-slate-300 line-clamp-3 max-w-2xl">
                {{ hero.synopsis }}
              </p>

              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span
                  >Thể loại: <strong class="text-slate-200">{{ hero.genre }}</strong></span
                >
                <span>·</span>
                <span
                  >Thời lượng: <strong class="text-slate-200">{{ hero.duration }}</strong></span
                >
                <span>·</span>
                <span
                  >Khởi chiếu: <strong class="text-slate-200">{{ hero.release }}</strong></span
                >
              </div>

              <div class="flex flex-wrap items-center gap-3 pt-2">
                <a
                  [routerLink]="['/movie', hero.id]"
                  class="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:from-amber-300 hover:to-amber-400"
                >
                  Đặt vé & Chọn ghế 3D
                </a>
                <a
                  [routerLink]="['/showtimes']"
                  [queryParams]="{ movieId: hero.id }"
                  class="rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white transition hover:border-amber-400"
                >
                  Xem lịch chiếu toàn quốc
                </a>
              </div>
            </div>

            <div class="lg:col-span-5 flex justify-center">
              <a
                [routerLink]="['/movie', hero.id]"
                class="relative overflow-hidden rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/10"
              >
                <img
                  [ngSrc]="hero.backdrop || hero.poster"
                  [alt]="hero.title"
                  width="640"
                  height="380"
                  priority
                  class="h-64 w-full object-cover sm:h-80"
                />
              </a>
            </div>
          </div>
        </div>
      </section>
    }

    <!-- Filter & Search Controls -->
    <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="store.statusFilter() === 'now'"
            (click)="store.setStatusFilter('now')"
            class="rounded-xl px-4 py-2 text-sm font-bold transition"
            [class]="
              store.statusFilter() === 'now'
                ? 'bg-amber-500 text-slate-950'
                : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
            "
          >
            Phim đang chiếu
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="store.statusFilter() === 'soon'"
            (click)="store.setStatusFilter('soon')"
            class="rounded-xl px-4 py-2 text-sm font-bold transition"
            [class]="
              store.statusFilter() === 'soon'
                ? 'bg-amber-500 text-slate-950'
                : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
            "
          >
            Phim sắp chiếu
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="store.statusFilter() === 'all'"
            (click)="store.setStatusFilter('all')"
            class="rounded-xl px-4 py-2 text-sm font-bold transition"
            [class]="
              store.statusFilter() === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'border border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
            "
          >
            Tất cả
          </button>
        </div>

        <div class="flex flex-1 max-w-md items-center gap-2">
          <input
            type="search"
            [value]="store.searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Tìm theo tên phim, đạo diễn, diễn viên..."
            aria-label="Tìm kiếm phim"
            class="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      <!-- Genre Filter Chips -->
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          (click)="store.setGenreFilter('all')"
          class="rounded-lg px-3 py-1 text-xs font-semibold transition"
          [class]="
            store.genreFilter() === 'all'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          "
        >
          Mọi thể loại
        </button>
        @for (genre of store.availableGenres(); track genre) {
          <button
            type="button"
            (click)="store.setGenreFilter(genre)"
            class="rounded-lg px-3 py-1 text-xs font-semibold transition"
            [class]="
              store.genreFilter() === genre
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            "
          >
            {{ genre }}
          </button>
        }
      </div>

      <!-- Movie Grid -->
      <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @for (movie of store.filteredMovies().slice(0, 20); track movie.id) {
          <ch-movie-card [movie]="movie" />
        } @empty {
          <div
            class="col-span-full rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-sm text-slate-400"
          >
            Không tìm thấy bộ phim phù hợp với bộ lọc hiện tại.
          </div>
        }
      </div>
    </section>

    <!-- Below-the-fold Promotions & Cinema Showcase deferred until viewport -->
    @defer (on viewport) {
      <section class="mx-auto max-w-7xl border-t border-slate-800/80 px-4 py-10 sm:px-6">
        <h2 class="text-xl font-bold text-white">Ưu đãi & Khuyến mãi thành viên</h2>
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          @for (promo of promos.slice(0, 4); track promo.id) {
            <div class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div class="text-xs font-bold text-amber-300">{{ promo.title }}</div>
              <p class="mt-1 text-xs text-slate-400">
                Áp dụng tại toàn bộ cụm rạp Galaxy Cinema trên CineHub.
              </p>
            </div>
          }
        </div>
      </section>
    } @placeholder {
      <div class="mx-auto max-w-7xl px-4 py-8 text-xs text-slate-500">
        Đang tải ưu đãi thành viên...
      </div>
    }
  `,
})
export class HomePageComponent implements OnInit {
  readonly store = inject(CatalogStore);
  readonly promos = promotions;

  ngOnInit(): void {
    void this.store.refreshFromApi();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.store.setSearchQuery(target?.value ?? '');
  }
}
