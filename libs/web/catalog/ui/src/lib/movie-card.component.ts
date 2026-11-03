import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Movie } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-movie-card',
  standalone: true,
  imports: [RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group cinema-panel flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[var(--color-brand-primary)]"
    >
      <!-- Poster Frame 2:3 ratio -->
      <a
        [routerLink]="['/movie', movie().id]"
        class="cinema-poster-frame aspect-[2/3] w-full block relative"
        [attr.aria-label]="'Chi tiết phim ' + movie().title"
      >
        <img
          [ngSrc]="movie().poster"
          [alt]="movie().title"
          width="400"
          height="600"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />

        <!-- Top Badges -->
        <div
          class="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none"
        >
          <span
            class="inline-flex items-center justify-center rounded-[3px] border border-[var(--color-border)] bg-[#ffffff]/95 px-1.5 py-0.5 font-ui text-[11px] font-bold tracking-wider text-[var(--color-text-primary)] uppercase shadow-xs backdrop-blur-xs"
          >
            {{ movie().age }}
          </span>

          <span
            class="inline-flex items-center gap-1 rounded-[3px] border border-[var(--color-border)] bg-[#ffffff]/95 px-1.5 py-0.5 font-ui text-[11px] font-bold text-[var(--color-text-primary)] shadow-xs backdrop-blur-xs"
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
            <span>{{ movie().rating }}</span>
          </span>
        </div>
      </a>

      <!-- Content Area -->
      <div class="flex flex-1 flex-col justify-between p-4">
        <div>
          <a
            [routerLink]="['/movie', movie().id]"
            class="cinema-card-title line-clamp-1 text-[var(--color-text-primary)] no-underline transition-colors group-hover:text-[var(--color-brand-primary)]"
          >
            {{ movie().title }}
          </a>
          <p class="cinema-metadata mt-1 line-clamp-1 text-xs">
            {{ movie().genre }} · {{ movie().duration }}
          </p>
        </div>

        <!-- Solid Actions -->
        <div class="mt-4 grid grid-cols-2 gap-2">
          <a
            [routerLink]="['/movie', movie().id]"
            class="cinema-btn-primary !min-h-[36px] !px-2.5 !py-1 !text-xs text-center font-semibold"
          >
            Đặt vé
          </a>
          <a
            [routerLink]="['/showtimes']"
            [queryParams]="{ movieId: movie().id }"
            class="cinema-btn-secondary !min-h-[36px] !px-2 !py-1 !text-xs text-center font-semibold"
          >
            Suất chiếu
          </a>
        </div>
      </div>
    </article>
  `,
})
export class MovieCardComponent {
  readonly movie = input.required<Movie>();
}
