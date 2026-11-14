import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Movie } from '@cinehub/web/shared/util';
import { buildShowtimesQueryParams } from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-movie-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group relative flex flex-col transition duration-300">
      <div
        class="relative overflow-hidden rounded-[4px] bg-[#0c1322] border border-white/[0.08] shadow-[0_8px_25px_rgba(0,0,0,0.7)] transition-all duration-300 group-hover:border-white/25 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.95)] group-hover:-translate-y-1"
      >
        <a
          [routerLink]="['/movie', movie().id]"
          class="relative block aspect-[2/3] overflow-hidden bg-slate-950"
        >
          <img
            [src]="movie().poster"
            [alt]="'Poster ' + movie().title"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
          ></div>

          @if (movie().studio) {
            <span
              class="absolute left-2 top-2 max-w-[70%] truncate rounded-[2px] bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-200 border border-white/10 backdrop-blur-sm"
            >
              {{ movie().studio }}
            </span>
          }

          <span
            class="absolute bottom-2 left-2 rounded-[2px] bg-[#e50914] px-1.5 py-0.5 text-[10px] font-black text-white shadow"
          >
            {{ movie().age }}
          </span>

          @if (movie().rating > 0) {
            <span
              class="absolute bottom-2 right-2 rounded-[2px] bg-black/85 px-1.5 py-0.5 text-[10px] font-black text-amber-400 border border-amber-400/40 backdrop-blur-sm shadow"
            >
              ★ {{ movie().rating }}
            </span>
          }
        </a>

        <!-- Hover Actions Overlay -->
        <div
          class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-black/80 p-3 opacity-0 backdrop-blur-[3px] transition duration-300 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        >
          <a
            [routerLink]="movie().status === 'now' ? ['/showtimes'] : ['/movie', movie().id]"
            [queryParams]="movie().status === 'now' ? buildShowtimesQueryParams(movie()) : null"
            class="inline-flex w-full max-w-[130px] items-center justify-center gap-1.5 rounded-[4px] bg-[#e50914] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(229,9,20,0.6)] transition hover:bg-[#ff1f2d]"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path
                d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a3 3 0 0 1 0 4v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a3 3 0 0 1 0-4z"
              />
            </svg>
            {{ movie().status === 'now' ? 'Mua vé' : 'Chi tiết' }}
          </a>

          <a
            [routerLink]="['/movie', movie().id]"
            [queryParams]="{ trailer: '1' }"
            class="inline-flex w-full max-w-[130px] items-center justify-center gap-1.5 rounded-[4px] bg-white/15 hover:bg-white/25 border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
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
          class="absolute right-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-[3px] bg-black/70 border border-white/15 backdrop-blur-sm text-white transition hover:scale-110 hover:border-white/40"
          [class.text-red-500]="isFavorite()"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
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

      <div class="pt-2.5">
        <a
          [routerLink]="['/movie', movie().id]"
          class="block truncate text-sm font-bold text-white transition hover:text-amber-300 group-hover:text-amber-300"
        >
          {{ movie().title }}
        </a>
        <p class="mt-0.5 truncate text-[11px] font-medium text-slate-400">{{ movie().genre }}</p>
        @if (movie().status !== 'now') {
          <p class="mt-1 text-[11px] font-semibold text-amber-400">{{ movie().release }}</p>
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

  buildShowtimesQueryParams(movie: Movie): Record<string, string> {
    return buildShowtimesQueryParams(movie);
  }

  toggleFavorite(): void {
    this.isFavorite.update((f) => !f);
    this.favoriteChange.emit(this.isFavorite());
  }
}
