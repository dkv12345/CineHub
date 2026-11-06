import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Movie } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-movie-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 shadow-xl transition hover:border-amber-400"
    >
      <div class="relative">
        <a
          [routerLink]="['/movie', movie().id]"
          class="relative block aspect-[2/3] overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/20"
        >
          <img
            [src]="movie().poster"
            [alt]="'Poster ' + movie().title"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/20"
          ></div>

          @if (movie().studio) {
            <span
              class="absolute left-3 top-3 max-w-[72%] truncate rounded-full border border-white/40 bg-slate-950/90 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur"
            >
              {{ movie().studio }}
            </span>
          }

          <span
            class="absolute bottom-3 left-3 rounded-md border border-amber-300 bg-amber-400/30 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow-lg"
          >
            {{ movie().age }}
          </span>

          @if (movie().rating > 0) {
            <span
              class="absolute bottom-3 right-3 rounded-full border border-amber-300 bg-slate-950/95 px-2.5 py-1 text-[10px] font-black text-amber-300 backdrop-blur"
            >
              ★ {{ movie().rating }}
            </span>
          }
        </a>

        <!-- Hover Actions Overlay -->
        <div
          class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 rounded-xl bg-slate-950/90 opacity-0 backdrop-blur-[3px] transition duration-300 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        >
          <a
            [routerLink]="movie().status === 'now' ? ['/showtimes'] : ['/movie', movie().id]"
            [queryParams]="movie().status === 'now' ? { movieId: movie().id } : null"
            class="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:brightness-125"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path
                d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a3 3 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a3 3 0 0 1 0-4z"
              />
            </svg>
            {{ movie().status === 'now' ? 'Mua vé' : 'Xem phim' }}
          </a>

          <a
            [routerLink]="['/movie', movie().id]"
            [queryParams]="{ trailer: '1' }"
            class="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl border-2 border-white bg-black/70 px-4 py-2 text-xs font-black text-white backdrop-blur transition hover:bg-white hover:text-black"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Trailer
          </a>
        </div>

        <!-- Favorite Heart Button -->
        <button
          type="button"
          (click)="toggleFavorite()"
          [attr.aria-label]="
            isFavorite() ? 'Bỏ yêu thích ' + movie().title : 'Yêu thích ' + movie().title
          "
          class="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full border-2 bg-slate-950/90 backdrop-blur transition hover:scale-105"
          [class]="isFavorite() ? 'border-red-500 text-red-500' : 'border-white text-white'"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            [attr.fill]="isFavorite() ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
        </button>
      </div>

      <div class="pt-3">
        <a
          [routerLink]="['/movie', movie().id]"
          class="block truncate text-xs font-black text-white transition hover:text-amber-300 group-hover:text-amber-300"
        >
          {{ movie().title }}
        </a>
        <p class="mt-1 truncate text-[11px] font-bold text-amber-300">{{ movie().genre }}</p>
        @if (movie().status !== 'now') {
          <p class="mt-1.5 text-[10px] font-black text-amber-400">{{ movie().release }}</p>
        }
      </div>
    </article>
  `,
})
export class MovieCardComponent {
  readonly movie = input.required<Movie>();
  readonly favorite = input<boolean>(false);
  readonly favoriteChange = output<boolean>();

  readonly isFavorite = signal(false);

  toggleFavorite(): void {
    this.isFavorite.update((f) => !f);
    this.favoriteChange.emit(this.isFavorite());
  }
}
