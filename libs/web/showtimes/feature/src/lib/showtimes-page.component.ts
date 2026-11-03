import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgeBadgeComponent } from '@cinehub/web/shared/ui';
import { ShowtimesStore } from '@cinehub/web/showtimes/data-access';
import { ShowtimeFilterBarComponent } from '@cinehub/web/showtimes/ui';
import type { GalaxySession } from '@cinehub/web/showtimes/util';

@Component({
  selector: 'ch-showtimes-page',
  standalone: true,
  imports: [RouterLink, ScrollingModule, AgeBadgeComponent, ShowtimeFilterBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div class="mb-6">
        <h1 class="text-2xl font-black text-white sm:text-3xl">Lịch chiếu rạp toàn quốc</h1>
        <p class="mt-1 text-xs text-slate-400">
          Tra cứu suất chiếu trực tuyến và chọn ghế 3D POV thời gian thực
        </p>
      </div>

      <!-- Day Strip -->
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          (click)="store.updateFilters({ date: null })"
          class="rounded-xl border px-4 py-2 text-xs font-bold transition"
          [class]="
            !store.filters().date
              ? 'border-amber-400 bg-amber-500 text-slate-950'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40'
          "
        >
          Tất cả các ngày
        </button>
        @for (d of store.days(); track d.isoDate) {
          <button
            type="button"
            (click)="store.updateFilters({ date: d.isoDate })"
            class="rounded-xl border px-4 py-2 text-xs font-bold transition"
            [class]="
              store.filters().date === d.isoDate
                ? 'border-amber-400 bg-amber-500 text-slate-950'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40'
            "
          >
            {{ d.short }} · {{ d.num }}
          </button>
        }
      </div>

      <!-- Filter Bar -->
      <ch-showtime-filter-bar
        [filters]="store.filters()"
        [cities]="store.cities()"
        (filterChanged)="store.updateFilters($event)"
        (resetClicked)="store.resetFilters()"
      />

      <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>
          Tìm thấy
          <strong class="text-amber-300">{{ store.filteredSessions().length }}</strong>
          suất chiếu phù hợp
        </span>
      </div>

      <!-- CDK Virtual Scroll Viewport for high-volume showtime schedule -->
      <cdk-virtual-scroll-viewport
        itemSize="104"
        class="mt-4 h-[620px] w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3"
      >
        <div
          *cdkVirtualFor="let session of store.filteredSessions(); trackBy: trackBySessionId"
          class="mb-3 flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:flex-row sm:items-center"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <ch-age-badge [age]="session.movie.age" />
              <a
                [routerLink]="['/movie', session.movie.id]"
                class="text-sm font-bold text-white hover:text-amber-300"
              >
                {{ session.movie.name }}
              </a>
              <span class="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                {{ session.movieFormat }}
              </span>
            </div>
            <div class="text-xs text-slate-400">
              {{ session.cinema.name }} · {{ session.screenName }} · Ngày
              {{ session.showDate }}
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400">
              Còn
              <strong class="text-emerald-400">{{ session.totalSeat - session.bookedSeat }}</strong>
              / {{ session.totalSeat }} ghế
            </span>
            <a
              [routerLink]="['/seats', session.id]"
              class="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow transition hover:from-amber-300 hover:to-amber-400"
            >
              {{ session.showTime }} · Chọn ghế
            </a>
          </div>
        </div>
      </cdk-virtual-scroll-viewport>
    </section>
  `,
})
export class ShowtimesPageComponent implements OnInit {
  readonly store = inject(ShowtimesStore);
  readonly movieId = input<string>('');

  ngOnInit(): void {
    if (this.movieId()) {
      this.store.updateFilters({ movieId: this.movieId() });
    }
    void this.store.loadSessionsFromApi();
  }

  trackBySessionId(_index: number, session: GalaxySession): string {
    return session.id;
  }
}
