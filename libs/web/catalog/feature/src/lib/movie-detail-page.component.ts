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
        <div class="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <!-- Poster Column (2:3 Frame) -->
          <div class="lg:col-span-4">
            <div class="cinema-poster-frame sticky top-24 aspect-[2/3] w-full">
              <img
                [ngSrc]="m.poster"
                [alt]="m.title"
                width="480"
                height="720"
                priority
                class="h-full w-full object-cover"
              />
            </div>
          </div>

          <!-- Editorial Metadata & Quick Showtime Selector -->
          <div class="space-y-8 lg:col-span-8">
            <!-- Title & Primary Details -->
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2.5">
                <ch-age-badge [age]="m.age" />
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
                  <span>{{ m.rating }}</span>
                  <span class="text-[var(--cinema-text-muted)] font-normal"
                    >({{ m.votes }} đánh giá)</span
                  >
                </span>
                <span class="text-xs text-[var(--cinema-text-muted)]">{{ m.duration }}</span>
              </div>

              <h1
                class="font-display text-[var(--text-h1)] font-semibold leading-tight text-[var(--cinema-text-primary)]"
              >
                {{ m.title }}
              </h1>

              <div
                class="grid gap-2 border-t border-[var(--cinema-border-subtle)] pt-3 text-xs sm:grid-cols-2"
              >
                <div>
                  <span class="text-[var(--cinema-text-muted)]">Thể loại:</span>
                  <span class="ml-1 text-[var(--cinema-text-primary)] font-medium">{{
                    m.genre
                  }}</span>
                </div>
                <div>
                  <span class="text-[var(--cinema-text-muted)]">Đạo diễn:</span>
                  <span class="ml-1 text-[var(--cinema-text-primary)] font-medium">{{
                    m.director
                  }}</span>
                </div>
                <div class="sm:col-span-2">
                  <span class="text-[var(--cinema-text-muted)]">Diễn viên:</span>
                  <span class="ml-1 text-[var(--cinema-text-primary)] font-medium">{{
                    m.cast
                  }}</span>
                </div>
                <div>
                  <span class="text-[var(--cinema-text-muted)]">Khởi chiếu:</span>
                  <span class="ml-1 text-[var(--cinema-text-primary)] font-medium">{{
                    m.release
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Synopsis Panel -->
            <div class="cinema-panel p-5">
              <span class="cinema-eyebrow">Tóm tắt nội dung</span>
              <p
                class="mt-2 text-sm leading-relaxed text-[var(--cinema-text-secondary)] whitespace-pre-line"
              >
                {{ m.synopsis }}
              </p>
            </div>

            <!-- Date Picker & Showtime Selector -->
            <div class="cinema-panel p-5 sm:p-6 space-y-5">
              <div>
                <span class="cinema-eyebrow">Đặt vé nhanh</span>
                <h2
                  class="font-display mt-0.5 text-lg font-semibold text-[var(--cinema-text-primary)]"
                >
                  Chọn ngày & suất chiếu tại rạp
                </h2>
              </div>

              <!-- Date Strip -->
              <div class="flex flex-wrap gap-2">
                @for (d of days; track d.offset) {
                  <button
                    type="button"
                    (click)="selectedDayOffset.set(d.offset)"
                    class="rounded-[2px] border px-3.5 py-2 text-xs transition-colors"
                    [class]="
                      selectedDayOffset() === d.offset
                        ? 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] font-semibold'
                        : 'border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] text-[var(--cinema-text-secondary)] hover:border-[var(--cinema-border-subtle)] hover:text-[var(--cinema-text-primary)]'
                    "
                  >
                    <div class="font-medium">{{ d.short }}</div>
                    <div class="text-[11px] text-[var(--cinema-text-muted)]">{{ d.num }}</div>
                  </button>
                }
              </div>

              <!-- Cinema Venues & Showtime Slots -->
              <div class="space-y-3.5">
                @for (cinema of store.cinemas().slice(0, 4); track cinema.id; let idx = $index) {
                  <div
                    class="rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] p-4"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-sm font-semibold text-[var(--cinema-text-primary)]">
                          {{ cinema.name }}
                        </div>
                        <div class="text-xs text-[var(--cinema-text-muted)]">
                          {{ cinema.address }}
                        </div>
                      </div>
                      <span
                        class="rounded-[2px] border border-[var(--cinema-border-subtle)] bg-[var(--cinema-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--cinema-accent)]"
                      >
                        {{ cinema.dist }}
                      </span>
                    </div>

                    <div class="mt-3.5 flex flex-wrap gap-2">
                      @for (slot of getCinemaShows(m.id, idx); track slot.time) {
                        <a
                          [routerLink]="[
                            '/seats',
                            m.id + '__' + cinema.id + '__' + slot.time + '__' + slot.format,
                          ]"
                          class="inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--cinema-border)] bg-[var(--cinema-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--cinema-text-primary)] no-underline transition-colors hover:border-[var(--cinema-accent)] hover:bg-[var(--cinema-surface-raised)]"
                        >
                          <span>{{ slot.time }}</span>
                          <span
                            class="rounded-[2px] bg-[var(--cinema-surface-inset)] px-1.5 py-0.2 text-[10px] text-[var(--cinema-accent)]"
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

            <!-- Editorial Audience Reviews -->
            @defer (on viewport) {
              <div class="cinema-panel p-5 space-y-4">
                <div>
                  <span class="cinema-eyebrow">Ý kiến khán giả</span>
                  <h2
                    class="font-display mt-0.5 text-base font-semibold text-[var(--cinema-text-primary)]"
                  >
                    Đánh giá từ khán giả CineHub
                  </h2>
                </div>

                <div class="space-y-3">
                  @for (rev of reviews; track rev.name) {
                    <div
                      class="rounded-[2px] border border-[var(--cinema-border-subtle)] bg-[var(--cinema-surface-inset)] p-3.5 text-xs"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-semibold text-[var(--cinema-text-primary)]">{{
                          rev.name
                        }}</span>
                        <span class="text-[var(--cinema-text-muted)]">{{ rev.when }}</span>
                      </div>
                      <p class="mt-1.5 leading-relaxed text-[var(--cinema-text-secondary)] italic">
                        "{{ rev.text }}"
                      </p>
                    </div>
                  }
                </div>
              </div>
            } @placeholder {
              <div class="cinema-panel p-4 text-xs text-[var(--cinema-text-muted)]">
                Đang tải đánh giá từ khán giả...
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
