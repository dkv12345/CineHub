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
    <!-- Editorial Hero Spotlight -->
    @if (store.featuredMovie(); as hero) {
      <section
        class="relative border-b border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)]"
      >
        <div class="cinema-container py-10 lg:py-16">
          <div class="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <!-- Left Editorial Text Column -->
            <div class="space-y-4 lg:col-span-7">
              <div class="flex items-center gap-2.5">
                <span class="cinema-eyebrow">Tiêu điểm phòng chiếu</span>
                <span class="text-[var(--cinema-border)]">/</span>
                <ch-age-badge [age]="hero.age" />
                <span
                  class="inline-flex items-center gap-1 rounded-[2px] border border-[var(--cinema-border)] bg-[var(--cinema-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--cinema-text-primary)]"
                >
                  <svg
                    class="h-3 w-3 text-[var(--cinema-accent)]"
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
                class="font-display text-[var(--text-h1)] font-semibold leading-[1.08] tracking-tight text-[var(--cinema-text-primary)]"
              >
                {{ hero.title }}
              </h1>

              <p
                class="max-w-2xl text-sm leading-relaxed text-[var(--cinema-text-secondary)] line-clamp-3"
              >
                {{ hero.synopsis }}
              </p>

              <div
                class="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[var(--cinema-text-muted)]"
              >
                <span>
                  Thể loại:
                  <strong class="font-medium text-[var(--cinema-text-primary)]">{{
                    hero.genre
                  }}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Thời lượng:
                  <strong class="font-medium text-[var(--cinema-text-primary)]">{{
                    hero.duration
                  }}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Khởi chiếu:
                  <strong class="font-medium text-[var(--cinema-text-primary)]">{{
                    hero.release
                  }}</strong>
                </span>
              </div>

              <!-- Genuine Solid Action Buttons (Strictly Zero Gradients) -->
              <div class="flex flex-wrap items-center gap-3 pt-2">
                <a [routerLink]="['/movie', hero.id]" class="cinema-btn-primary">
                  <span>Đặt vé & Chọn ghế 3D POV</span>
                </a>
                <a
                  [routerLink]="['/showtimes']"
                  [queryParams]="{ movieId: hero.id }"
                  class="cinema-btn-secondary"
                >
                  <span>Xem lịch chiếu toàn quốc</span>
                </a>
              </div>
            </div>

            <!-- Right Cinematic Key Art -->
            <div class="flex justify-center lg:col-span-5">
              <a
                [routerLink]="['/movie', hero.id]"
                class="cinema-poster-frame group block w-full max-w-lg aspect-[16/10] overflow-hidden"
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

    <!-- Programming & Movie Catalog Section -->
    <section class="cinema-container py-10">
      <!-- Section Header & Filter Controls -->
      <div class="flex flex-col gap-5 border-b border-[var(--cinema-border)] pb-6">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span class="cinema-eyebrow">Chương trình tuyển chọn</span>
            <h2
              class="font-display mt-1 text-[var(--text-h2)] font-semibold text-[var(--cinema-text-primary)]"
            >
              Danh mục phim chiếu rạp
            </h2>
          </div>

          <!-- Status Switcher Tabs -->
          <div
            class="inline-flex rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] p-1"
            role="tablist"
            aria-label="Lọc theo trạng thái phát hành"
          >
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="store.statusFilter() === 'now'"
              (click)="store.setStatusFilter('now')"
              class="rounded-[2px] px-3.5 py-1.5 text-xs font-semibold transition-colors"
              [class]="
                store.statusFilter() === 'now'
                  ? 'bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] shadow-sm'
                  : 'text-[var(--cinema-text-muted)] hover:text-[var(--cinema-text-primary)]'
              "
            >
              Đang chiếu
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="store.statusFilter() === 'soon'"
              (click)="store.setStatusFilter('soon')"
              class="rounded-[2px] px-3.5 py-1.5 text-xs font-semibold transition-colors"
              [class]="
                store.statusFilter() === 'soon'
                  ? 'bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] shadow-sm'
                  : 'text-[var(--cinema-text-muted)] hover:text-[var(--cinema-text-primary)]'
              "
            >
              Sắp chiếu
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="store.statusFilter() === 'all'"
              (click)="store.setStatusFilter('all')"
              class="rounded-[2px] px-3.5 py-1.5 text-xs font-semibold transition-colors"
              [class]="
                store.statusFilter() === 'all'
                  ? 'bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] shadow-sm'
                  : 'text-[var(--cinema-text-muted)] hover:text-[var(--cinema-text-primary)]'
              "
            >
              Tất cả
            </button>
          </div>
        </div>

        <!-- Search Bar and Genre Filter Chips -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              (click)="store.setGenreFilter('all')"
              class="rounded-[2px] border px-2.5 py-1 text-xs font-medium transition-colors"
              [class]="
                store.genreFilter() === 'all'
                  ? 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] font-semibold'
                  : 'border-[var(--cinema-border)] bg-[var(--cinema-surface)] text-[var(--cinema-text-secondary)] hover:border-[var(--cinema-border-subtle)] hover:text-[var(--cinema-text-primary)]'
              "
            >
              Mọi thể loại
            </button>
            @for (genre of store.availableGenres(); track genre) {
              <button
                type="button"
                (click)="store.setGenreFilter(genre)"
                class="rounded-[2px] border px-2.5 py-1 text-xs font-medium transition-colors"
                [class]="
                  store.genreFilter() === genre
                    ? 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] font-semibold'
                    : 'border-[var(--cinema-border)] bg-[var(--cinema-surface)] text-[var(--cinema-text-secondary)] hover:border-[var(--cinema-border-subtle)] hover:text-[var(--cinema-text-primary)]'
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
              class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cinema-text-muted)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
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
      <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        @for (movie of store.filteredMovies().slice(0, 20); track movie.id) {
          <ch-movie-card [movie]="movie" />
        } @empty {
          <div
            class="cinema-panel col-span-full p-12 text-center text-sm text-[var(--cinema-text-muted)]"
          >
            Không tìm thấy bộ phim phù hợp với tiêu chí tìm kiếm hiện tại.
          </div>
        }
      </div>
    </section>

    <!-- Hospitality & Screening Experience Deferred Showcase -->
    @defer (on viewport) {
      <section
        class="border-t border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] py-12"
      >
        <div class="cinema-container">
          <div class="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <span class="cinema-eyebrow">Dịch vụ & Đặc quyền</span>
              <h2 class="font-display mt-1 text-xl font-semibold text-[var(--cinema-text-primary)]">
                Trải nghiệm rạp & Ưu đãi thành viên
              </h2>
            </div>
            <a
              routerLink="/concessions"
              class="text-xs font-semibold text-[var(--cinema-accent)] hover:underline"
            >
              Khám phá thực đơn Bắp & Bar →
            </a>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (promo of promos.slice(0, 4); track promo.id) {
              <article
                class="cinema-panel flex flex-col justify-between p-4 transition-colors hover:border-[var(--cinema-accent)]"
              >
                <div>
                  <div class="font-display text-sm font-semibold text-[var(--cinema-text-primary)]">
                    {{ promo.title }}
                  </div>
                  <p class="mt-1.5 text-xs text-[var(--cinema-text-muted)] leading-relaxed">
                    Áp dụng tại hệ thống rạp CineHub với ưu tiên nhận phòng chiếu và quầy Bar.
                  </p>
                </div>
                <div
                  class="mt-4 pt-3 border-t border-[var(--cinema-border-subtle)] text-[11px] font-medium text-[var(--cinema-accent)]"
                >
                  Ưu đãi thành viên CineHub
                </div>
              </article>
            }
          </div>
        </div>
      </section>
    } @placeholder {
      <div class="cinema-container py-8 text-xs text-[var(--cinema-text-muted)]">
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
