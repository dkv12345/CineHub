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
      <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div class="grid gap-8 lg:grid-cols-12">
          <!-- Poster Column -->
          <div class="lg:col-span-4">
            <div
              class="overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl"
            >
              <img
                [ngSrc]="m.poster"
                [alt]="m.title"
                width="480"
                height="720"
                priority
                class="w-full object-cover"
              />
            </div>
          </div>

          <!-- Metadata & Quick Showtime Selector -->
          <div class="lg:col-span-8 space-y-6">
            <div>
              <div class="flex flex-wrap items-center gap-2.5">
                <ch-age-badge [age]="m.age" />
                <span
                  class="rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300"
                >
                  ★ {{ m.rating }} ({{ m.votes }} đánh giá)
                </span>
                <span class="text-xs text-slate-400">{{ m.duration }}</span>
              </div>

              <h1 class="mt-3 text-3xl font-black text-white sm:text-4xl">
                {{ m.title }}
              </h1>

              <div class="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                <div><span class="text-slate-400">Thể loại:</span> {{ m.genre }}</div>
                <div><span class="text-slate-400">Đạo diễn:</span> {{ m.director }}</div>
                <div class="sm:col-span-2">
                  <span class="text-slate-400">Diễn viên:</span> {{ m.cast }}
                </div>
                <div><span class="text-slate-400">Khởi chiếu:</span> {{ m.release }}</div>
              </div>
            </div>

            <div
              class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm leading-relaxed text-slate-200"
            >
              <h2 class="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                Nội dung phim
              </h2>
              <p class="whitespace-pre-line">{{ m.synopsis }}</p>
            </div>

            <!-- Date Picker & Showtime Slots -->
            <div class="rounded-2xl border border-amber-500/25 bg-slate-900/90 p-5">
              <h2 class="text-base font-bold text-white">Chọn ngày & suất chiếu nhanh</h2>

              <div class="mt-3 flex flex-wrap gap-2">
                @for (d of days; track d.offset) {
                  <button
                    type="button"
                    (click)="selectedDayOffset.set(d.offset)"
                    class="rounded-xl border px-3.5 py-2 text-xs font-bold transition"
                    [class]="
                      selectedDayOffset() === d.offset
                        ? 'border-amber-400 bg-amber-500 text-slate-950'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-amber-500/40'
                    "
                  >
                    <div>{{ d.short }}</div>
                    <div class="text-[11px] opacity-80">{{ d.num }}</div>
                  </button>
                }
              </div>

              <div class="mt-5 space-y-4">
                @for (cinema of store.cinemas().slice(0, 4); track cinema.id; let idx = $index) {
                  <div class="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="text-sm font-bold text-white">
                          {{ cinema.name }}
                        </div>
                        <div class="text-xs text-slate-400">
                          {{ cinema.address }}
                        </div>
                      </div>
                      <span class="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-amber-300">
                        {{ cinema.dist }}
                      </span>
                    </div>

                    <div class="mt-3 flex flex-wrap gap-2">
                      @for (slot of getCinemaShows(m.id, idx); track slot.time) {
                        <a
                          [routerLink]="[
                            '/seats',
                            m.id + '__' + cinema.id + '__' + slot.time + '__' + slot.format,
                          ]"
                          class="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500 hover:text-slate-950"
                        >
                          <span>{{ slot.time }}</span>
                          <span class="rounded bg-slate-900/60 px-1.5 py-0.5 text-[10px]">
                            {{ slot.format }}
                          </span>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Deferred Audience Reviews -->
            @defer (on viewport) {
              <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 class="text-base font-bold text-white">Đánh giá từ khán giả CineHub</h2>
                <div class="mt-4 space-y-3">
                  @for (rev of reviews; track rev.name) {
                    <div
                      class="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3.5 text-xs"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-amber-300">{{ rev.name }}</span>
                        <span class="text-slate-400">{{ rev.when }}</span>
                      </div>
                      <p class="mt-1.5 text-slate-300">{{ rev.text }}</p>
                    </div>
                  }
                </div>
              </div>
            } @placeholder {
              <div class="text-xs text-slate-500">Đang tải đánh giá...</div>
            }
          </div>
        </div>
      </section>
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
