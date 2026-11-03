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
      class="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/75 shadow-lg transition hover:-translate-y-1 hover:border-amber-500/40"
    >
      <a
        [routerLink]="['/movie', movie().id]"
        class="relative aspect-[2/3] w-full overflow-hidden bg-slate-950"
      >
        <img
          [ngSrc]="movie().poster"
          [alt]="movie().title"
          width="400"
          height="600"
          class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"
        ></div>

        <span
          class="absolute top-3 left-3 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-extrabold text-slate-950 shadow"
        >
          {{ movie().age }}
        </span>

        <span
          class="absolute top-3 right-3 rounded-md bg-slate-950/85 px-2 py-0.5 text-xs font-bold text-amber-300 backdrop-blur"
        >
          ★ {{ movie().rating }}
        </span>
      </a>

      <div class="flex flex-1 flex-col justify-between p-4">
        <div>
          <a
            [routerLink]="['/movie', movie().id]"
            class="line-clamp-1 text-base font-bold text-white group-hover:text-amber-300"
          >
            {{ movie().title }}
          </a>
          <p class="mt-1 line-clamp-1 text-xs text-slate-400">
            {{ movie().genre }} · {{ movie().duration }}
          </p>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <a
            [routerLink]="['/movie', movie().id]"
            class="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-2 text-center text-xs font-bold text-slate-950 transition hover:from-amber-300 hover:to-amber-400"
          >
            Đặt vé
          </a>
          <a
            [routerLink]="['/showtimes']"
            [queryParams]="{ movieId: movie().id }"
            class="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-amber-400 hover:text-white"
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
