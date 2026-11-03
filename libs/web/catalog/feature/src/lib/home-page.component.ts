import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { MovieCardComponent } from '@cinehub/web/catalog/ui';
import { AgeBadgeComponent } from '@cinehub/web/shared/ui';
import { promotions } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-home-page',
  standalone: true,
  imports: [RouterLink, NgOptimizedImage, MovieCardComponent, AgeBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Editorial Hero Spotlight (Bright Premium Cinema) -->
    @if (store.featuredMovie(); as hero) {
      <section
        class="border-b border-[var(--color-border)] bg-[var(--color-surface)] py-10 lg:py-16"
      >
        <div class="cinema-container">
          <div class="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <!-- Left Text Column -->
            <div class="space-y-4 lg:col-span-7">
              <div class="flex items-center gap-2.5">
                <span class="cinema-eyebrow">Tiêu điểm điện ảnh tuần này</span>
                <span class="text-[var(--color-border)]">/</span>
                <ch-age-badge [age]="hero.age" />
                <span
                  class="inline-flex items-center gap-1 rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-0.5 text-xs font-bold text-[var(--color-text-primary)]"
                >
                  <svg
                    class="h-3 w-3 text-[var(--color-brand-accent)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    />
                  </svg>
                  <span>{{ hero.rating }}</span>
                </span>
              </div>

              <h1
                class="font-display text-[var(--text-h1)] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)]"
              >
                {{ hero.title }}
              </h1>

              <p
                class="max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-3"
              >
                {{ hero.synopsis }}
              </p>

              <div
                class="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[var(--color-text-secondary)]"
              >
                <span>
                  Thể loại:
                  <strong class="font-semibold text-[var(--color-text-primary)]">{{
                    hero.genre
                  }}</strong>
                </span>
                <span aria-hidden="true" class="text-[var(--color-border)]">·</span>
                <span>
                  Thời lượng:
                  <strong class="font-semibold text-[var(--color-text-primary)]">{{
                    hero.duration
                  }}</strong>
                </span>
                <span aria-hidden="true" class="text-[var(--color-border)]">·</span>
                <span>
                  Khởi chiếu:
                  <strong class="font-semibold text-[var(--color-text-primary)]">{{
                    hero.release
                  }}</strong>
                </span>
              </div>

              <!-- Solid Purposeful Buttons -->
              <div class="flex flex-wrap items-center gap-3 pt-3">
                <a [routerLink]="['/movie', hero.id]" class="cinema-btn-primary !min-h-[44px]">
                  <span>Đặt vé & Chọn ghế 3D POV</span>
                </a>
                <a
                  [routerLink]="['/showtimes']"
                  [queryParams]="{ movieId: hero.id }"
                  class="cinema-btn-secondary !min-h-[44px]"
                >
                  <span>Xem lịch chiếu rạp</span>
                </a>
              </div>
            </div>

            <!-- Right Cinematic Art Frame -->
            <div class="flex justify-center lg:col-span-5">
              <a
                [routerLink]="['/movie', hero.id]"
                class="cinema-poster-frame group block w-full max-w-lg aspect-[16/10] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-md"
                [attr.aria-label]="'Xem chi tiết phim ' + hero.title"
              >
                <img
                  [ngSrc]="hero.backdrop || hero.poster"
                  [alt]="hero.title"
                  width="640"
                  height="400"
                  priority
                  class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </a>
            </div>
          </div>
        </div>
      </section>
    }

    <!-- Programming Catalog Section -->
    <section class="cinema-container py-10 lg:py-14">
      <!-- Section Header & Filter Controls -->
      <div class="flex flex-col gap-5 border-b border-[var(--color-border)] pb-6">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span class="cinema-eyebrow">Chương trình tuyển chọn</span>
            <h2
              class="font-display mt-1 text-[var(--text-h2)] font-bold text-[var(--color-text-primary)]"
            >
              Danh mục phim chiếu rạp
            </h2>
          </div>

          <!-- Status Tabs -->
          <div
            class="inline-flex rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-2xs"
            role="tablist"
            aria-label="Lọc theo tình trạng phát hành"
          >
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="store.statusFilter() === 'now'"
              (click)="store.setStatusFilter('now')"
              class="rounded-[3px] px-4 py-1.5 text-xs font-bold transition-colors"
              [class]="
                store.statusFilter() === 'now'
                  ? 'bg-[var(--color-brand-primary)] text-[#fffdf9] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              "
            >
              Đang chiếu
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="store.statusFilter() === 'soon'"
              (click)="store.setStatusFilter('soon')"
              class="rounded-[3px] px-4 py-1.5 text-xs font-bold transition-colors"
              [class]="
                store.statusFilter() === 'soon'
                  ? 'bg-[var(--color-brand-primary)] text-[#fffdf9] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              "
            >
              Sắp chiếu
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="store.statusFilter() === 'all'"
              (click)="store.setStatusFilter('all')"
              class="rounded-[3px] px-4 py-1.5 text-xs font-bold transition-colors"
              [class]="
                store.statusFilter() === 'all'
                  ? 'bg-[var(--color-brand-primary)] text-[#fffdf9] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              "
            >
              Tất cả
            </button>
          </div>
        </div>

        <!-- Filter Chips & Search Bar -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              (click)="store.setGenreFilter('all')"
              class="rounded-[3px] border px-3 py-1 text-xs font-semibold transition-colors"
              [class]="
                store.genreFilter() === 'all'
                  ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]'
              "
            >
              Mọi thể loại
            </button>
            @for (genre of store.availableGenres(); track genre) {
              <button
                type="button"
                (click)="store.setGenreFilter(genre)"
                class="rounded-[3px] border px-3 py-1 text-xs font-semibold transition-colors"
                [class]="
                  store.genreFilter() === genre
                    ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]'
                "
              >
                {{ genre }}
              </button>
            }
          </div>

          <div class="relative w-full max-w-xs">
            <input
              type="search"
              [value]="store.searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Tìm theo tên phim, đạo diễn..."
              aria-label="Tìm kiếm phim"
              class="cinema-input !min-h-[38px] !py-1.5 !text-xs !pl-8"
            />
            <svg
              class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Movie Grid -->
      <div class="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @for (movie of store.filteredMovies().slice(0, 20); track movie.id) {
          <ch-movie-card [movie]="movie" />
        } @empty {
          <div
            class="cinema-panel col-span-full p-12 text-center text-sm text-[var(--color-text-secondary)]"
          >
            Không tìm thấy bộ phim phù hợp với tiêu chí tìm kiếm hiện tại.
          </div>
        }
      </div>
    </section>

    <!-- Hospitality & Screening Experience Deferred Section -->
    @defer (on viewport) {
      <section class="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-14">
        <div class="cinema-container">
          <div class="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <span class="cinema-eyebrow">Dịch vụ & Đặc quyền</span>
              <h2 class="font-display mt-1 text-xl font-bold text-[var(--color-text-primary)]">
                Trải nghiệm rạp & Ưu đãi thành viên
              </h2>
            </div>
            <a
              routerLink="/concessions"
              class="text-xs font-bold text-[var(--color-brand-primary)] hover:underline"
            >
              Khám phá thực đơn Bắp & Quầy Bar →
            </a>
          </div>

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            @for (promo of promos.slice(0, 4); track promo.id) {
              <article
                class="cinema-panel p-5 transition-all hover:shadow-md hover:border-[var(--color-brand-primary)] flex flex-col justify-between"
              >
                <div>
                  <div class="font-display text-base font-bold text-[var(--color-text-primary)]">
                    {{ promo.title }}
                  </div>
                  <p class="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    Áp dụng tại hệ thống rạp CineHub với ưu tiên nhận phòng chiếu và quầy Bar.
                  </p>
                </div>
                <div
                  class="mt-4 pt-3 border-t border-[var(--color-border-subtle)] text-[11px] font-bold text-[var(--color-brand-accent)]"
                >
                  Ưu đãi thành viên CineHub
                </div>
              </article>
            }
          </div>
        </div>
      </section>
    } @placeholder {
      <div class="cinema-container py-8 text-xs text-[var(--color-text-secondary)]">
        Đang tải thông tin ưu đãi...
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
