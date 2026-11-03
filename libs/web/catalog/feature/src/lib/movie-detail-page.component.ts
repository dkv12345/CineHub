import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { AgeBadgeComponent } from '@cinehub/web/shared/ui';
import { dayInfo, getShows, seedReviews, type Movie } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-movie-detail-page',
  standalone: true,
  imports: [RouterLink, NgOptimizedImage, AgeBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolvedMovie(); as m) {
      <div class="cinema-container py-8 sm:py-12">
        <!-- Breadcrumb / Back Link -->
        <div class="mb-6 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <a
            routerLink="/"
            class="text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-brand-primary)]"
          >
            ← Danh mục phim
          </a>
          <span class="text-[var(--color-border)]">/</span>
          <span class="text-[var(--color-text-primary)] font-semibold">{{ m.title }}</span>
        </div>

        <div class="grid gap-10 lg:grid-cols-12 lg:gap-12 items-start">
          <!-- Poster Column (Natural Aspect Ratio, Crisp Artwork Presentation) -->
          <div class="lg:col-span-4">
            <div
              class="sticky top-24 overflow-hidden rounded-[var(--radius-poster)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md"
            >
              <img
                [ngSrc]="m.poster"
                [alt]="m.title"
                width="480"
                height="720"
                priority
                class="h-auto w-full object-cover"
              />
            </div>
          </div>

          <!-- Editorial Content & Showtimes Column -->
          <div class="space-y-8 lg:col-span-8">
            <!-- Movie Header & Key Metadata -->
            <div class="space-y-3.5">
              <div class="flex flex-wrap items-center gap-2.5">
                <ch-age-badge [age]="m.age" />
                <span
                  class="inline-flex items-center gap-1 rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-primary)] shadow-2xs"
                >
                  <svg
                    class="h-3.5 w-3.5 text-[var(--color-brand-accent)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    />
                  </svg>
                  <span>{{ m.rating }}</span>
                  <span class="text-[var(--color-text-secondary)] font-normal text-[11px]"
                    >({{ m.votes }} đánh giá)</span
                  >
                </span>
                <span class="text-xs text-[var(--color-text-secondary)]">· {{ m.duration }}</span>
              </div>

              <h1 class="cinema-heading-page leading-tight text-[var(--color-text-primary)]">
                {{ m.title }}
              </h1>

              <!-- Structured Metadata Grid -->
              <div
                class="grid gap-3 border-y border-[var(--color-border)] py-4 text-xs sm:grid-cols-2"
              >
                <div>
                  <span class="text-[var(--color-text-secondary)]">Thể loại:</span>
                  <span class="ml-1.5 font-semibold text-[var(--color-text-primary)]">{{
                    m.genre
                  }}</span>
                </div>
                <div>
                  <span class="text-[var(--color-text-secondary)]">Đạo diễn:</span>
                  <span class="ml-1.5 font-semibold text-[var(--color-text-primary)]">{{
                    m.director
                  }}</span>
                </div>
                <div class="sm:col-span-2">
                  <span class="text-[var(--color-text-secondary)]">Diễn viên chính:</span>
                  <span class="ml-1.5 font-semibold text-[var(--color-text-primary)]">{{
                    m.cast
                  }}</span>
                </div>
                <div>
                  <span class="text-[var(--color-text-secondary)]">Ngày khởi chiếu:</span>
                  <span class="ml-1.5 font-semibold text-[var(--color-text-primary)]">{{
                    m.release
                  }}</span>
                </div>
                <div>
                  <span class="text-[var(--color-text-secondary)]">Định dạng phát hành:</span>
                  <span class="ml-1.5 font-semibold text-[var(--color-brand-primary)]"
                    >2D Digital, 3D, IMAX Laser</span
                  >
                </div>
              </div>
            </div>

            <!-- Synopsis Section (Editorial Whitespace) -->
            <div class="cinema-panel p-6 space-y-2">
              <span class="cinema-eyebrow">Nội dung phim</span>
              <p
                class="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-line"
              >
                {{ m.synopsis }}
              </p>
            </div>

            <!-- Showtime Selection Section -->
            <div class="cinema-panel-raised p-6 sm:p-7 space-y-6">
              <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <span class="cinema-eyebrow">Đặt vé xem phim</span>
                  <h2 class="cinema-heading-section mt-0.5 text-[var(--color-text-primary)]">
                    Lịch chiếu & Suất xem tại rạp
                  </h2>
                </div>
                <span class="text-xs text-[var(--color-text-secondary)]">
                  Suất chiếu cập nhật thời gian thực
                </span>
              </div>

              <!-- Date Selection Strip -->
              <div class="flex flex-wrap gap-2" role="tablist" aria-label="Chọn ngày xem">
                @for (d of days; track d.offset) {
                  <button
                    type="button"
                    (click)="selectedDayOffset.set(d.offset)"
                    class="rounded-[4px] border px-4 py-2.5 text-xs transition-colors"
                    [class]="
                      selectedDayOffset() === d.offset
                        ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9] font-bold shadow-xs'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)]'
                    "
                  >
                    <div class="font-bold">{{ d.short }}</div>
                    <div
                      class="text-[11px]"
                      [class]="
                        selectedDayOffset() === d.offset
                          ? 'text-[#fffdf9]/80'
                          : 'text-[var(--color-text-secondary)]'
                      "
                    >
                      {{ d.num }}
                    </div>
                  </button>
                }
              </div>

              <!-- Venues & Showtimes List -->
              <div class="space-y-4">
                @for (cinema of store.cinemas().slice(0, 4); track cinema.id; let idx = $index) {
                  <div
                    class="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <div class="text-sm font-bold text-[var(--color-text-primary)]">
                          {{ cinema.name }}
                        </div>
                        <div class="text-xs text-[var(--color-text-secondary)]">
                          {{ cinema.address }}
                        </div>
                      </div>
                      <span
                        class="rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-brand-accent)]"
                      >
                        {{ cinema.dist }}
                      </span>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-2.5">
                      @for (slot of getCinemaShows(m.id, idx); track slot.time) {
                        <a
                          [routerLink]="[
                            '/seats',
                            m.id + '__' + cinema.id + '__' + slot.time + '__' + slot.format,
                          ]"
                          class="inline-flex items-center gap-2 rounded-[4px] border border-[var(--color-border)] bg-[#ffffff] px-3.5 py-2 text-xs font-bold text-[var(--color-text-primary)] no-underline transition-all hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)] hover:text-[var(--color-brand-primary)] shadow-2xs"
                        >
                          <span class="text-sm">{{ slot.time }}</span>
                          <span
                            class="rounded-[2px] bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--color-brand-primary)]"
                          >
                            {{ slot.format }}
                          </span>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Audience Reviews (Restrained Editorial Format) -->
            @defer (on viewport) {
              <div class="cinema-panel p-6 space-y-4">
                <div>
                  <span class="cinema-eyebrow">Cộng đồng khán giả</span>
                  <h2 class="cinema-card-title mt-0.5 text-[var(--color-text-primary)]">
                    Nhận xét từ người xem CineHub
                  </h2>
                </div>

                <div class="space-y-3">
                  @for (rev of reviews; track rev.name) {
                    <div
                      class="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 text-xs"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-[var(--color-text-primary)]">{{
                          rev.name
                        }}</span>
                        <span class="text-[var(--color-text-muted)]">{{ rev.when }}</span>
                      </div>
                      <p class="mt-1.5 leading-relaxed text-[var(--color-text-secondary)]">
                        "{{ rev.text }}"
                      </p>
                    </div>
                  }
                </div>
              </div>
            } @placeholder {
              <div class="cinema-panel p-4 text-xs text-[var(--color-text-secondary)]">
                Đang tải nhận xét...
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class MovieDetailPageComponent {
  readonly store = inject(CatalogStore);
  readonly id = input<string>('');
  readonly movie = input<Movie | null>(null);

  readonly selectedDayOffset = signal(0);
  readonly days = [0, 1, 2, 3, 4].map((offset) => dayInfo(offset));
  readonly reviews = seedReviews;

  readonly resolvedMovie = computed(
    () => this.movie() ?? this.store.findMovieById(this.id()) ?? this.store.movies()[0] ?? null,
  );

  getCinemaShows(
    movieId: string | number,
    cinemaIdx: number,
  ): Array<{ time: string; format: string }> {
    return getShows(movieId, cinemaIdx, this.selectedDayOffset());
  }
}
