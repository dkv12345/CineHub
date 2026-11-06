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
    <main class="min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <section class="mx-auto max-w-[1440px] px-5 py-8 md:px-9">
        <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">
              Cụm rạp toàn quốc
            </p>
            <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">Lịch chiếu phim</h1>
          </div>
          <p class="text-xs font-bold text-slate-400">
            Tìm thấy
            <strong class="text-amber-300">{{ store.filteredSessions().length }}</strong> suất chiếu
            phù hợp
          </p>
        </div>

        <!-- 7-Day Timeline Selector -->
        <div class="scrollbar-hide mb-6 flex gap-2.5 overflow-x-auto pb-2">
          <button
            type="button"
            (click)="store.updateFilters({ date: null })"
            class="shrink-0 rounded-xl border-2 px-4 py-2.5 text-xs font-black transition"
            [class]="
              !store.filters().date
                ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                : 'border-white/40 bg-slate-800 text-white hover:border-amber-400'
            "
          >
            Tất cả các ngày
          </button>
          @for (d of store.days(); track d.isoDate) {
            <button
              type="button"
              (click)="store.updateFilters({ date: d.isoDate })"
              class="shrink-0 rounded-xl border-2 px-4 py-2.5 text-xs font-black transition"
              [class]="
                store.filters().date === d.isoDate
                  ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                  : 'border-white/40 bg-slate-800 text-white hover:border-amber-400'
              "
            >
              <div>{{ d.short }}</div>
              <div class="text-[10px] opacity-80">{{ d.num }}</div>
            </button>
          }
        </div>

        <!-- Filter Bar -->
        <div class="rounded-2xl border-2 border-slate-700 bg-slate-900 p-4 shadow-xl mb-6">
          <ch-showtime-filter-bar
            [filters]="store.filters()"
            [cities]="store.cities()"
            (filterChanged)="store.updateFilters($event)"
            (resetClicked)="store.resetFilters()"
          />
        </div>

        <!-- Showtimes List -->
        <cdk-virtual-scroll-viewport
          itemSize="110"
          class="h-[650px] w-full rounded-2xl border-2 border-slate-700 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-xl"
        >
          <div
            *cdkVirtualFor="let session of store.filteredSessions(); trackBy: trackBySessionId"
            class="mb-3 flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/80 p-4 transition hover:border-amber-400/60 sm:flex-row sm:items-center"
          >
            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-2.5">
                <ch-age-badge [age]="session.movie.age" />
                <a
                  [routerLink]="['/movie', session.movie.id]"
                  class="text-base font-black text-white hover:text-amber-300"
                >
                  {{ session.movie.name }}
                </a>
                <span
                  class="rounded-md border border-amber-300/40 bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300"
                >
                  {{ session.movieFormat }}
                </span>
              </div>
              <div class="text-xs font-medium text-slate-400">
                <span class="text-white font-bold">{{ session.cinema.name }}</span> ·
                {{ session.screenName }} · Ngày
                {{ session.showDate }}
              </div>
            </div>

            <div class="flex items-center gap-4">
              <span class="text-xs font-bold text-slate-400">
                Còn
                <strong class="text-emerald-400 font-black">{{
                  session.totalSeat - session.bookedSeat
                }}</strong>
                ghế
              </span>
              <a
                [routerLink]="['/seats', session.id]"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-red-900/40 transition hover:brightness-125"
              >
                <span>{{ session.showTime }}</span>
                <span>·</span>
                <span>Chọn ghế</span>
              </a>
            </div>
          </div>
        </cdk-virtual-scroll-viewport>
      </section>
    </main>
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
