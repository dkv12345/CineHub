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
    <div class="cinema-container py-8 sm:py-12">
      <div class="mb-6 space-y-1">
        <span class="cinema-eyebrow">Lịch phát hành & Suất chiếu</span>
        <h1 class="cinema-heading-section text-[var(--color-text-primary)]">
          Lịch chiếu rạp toàn quốc
        </h1>
        <p class="text-xs text-[var(--color-text-secondary)]">
          Tra cứu suất chiếu thời gian thực theo cụm rạp, định dạng và chọn ghế 3D POV trực quan.
        </p>
      </div>

      <!-- Date Strip Tabs -->
      <div class="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Chọn ngày chiếu">
        <button
          type="button"
          (click)="store.updateFilters({ date: null })"
          class="rounded-[4px] border px-3.5 py-2 text-xs font-bold transition-colors"
          [class]="
            !store.filters().date
              ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9] shadow-xs'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)]'
          "
        >
          Tất cả các ngày
        </button>
        @for (d of store.days(); track d.isoDate) {
          <button
            type="button"
            (click)="store.updateFilters({ date: d.isoDate })"
            class="rounded-[4px] border px-3.5 py-2 text-xs font-bold transition-colors"
            [class]="
              store.filters().date === d.isoDate
                ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[#fffdf9] shadow-xs'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)]'
            "
          >
            <span>{{ d.short }}</span>
            <span
              class="ml-1 text-[11px]"
              [class]="
                store.filters().date === d.isoDate
                  ? 'text-[#fffdf9]/80'
                  : 'text-[var(--color-text-secondary)]'
              "
            >
              ({{ d.num }})
            </span>
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

      <!-- Results Count Strip -->
      <div
        class="mt-6 flex items-center justify-between border-b border-[var(--color-border)] pb-3 text-xs text-[var(--color-text-secondary)]"
      >
        <span>
          Tìm thấy
          <strong class="text-[var(--color-brand-primary)]">{{
            store.filteredSessions().length
          }}</strong>
          suất chiếu phù hợp
        </span>
        <span class="text-[var(--color-text-muted)] hidden sm:inline">
          Dữ liệu kết nối trực tiếp phòng chiếu
        </span>
      </div>

      <!-- CDK Virtual Scroll Viewport with Bright Editorial Cards -->
      <cdk-virtual-scroll-viewport
        itemSize="116"
        class="mt-4 h-[620px] w-full rounded-[var(--radius-panel)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3"
      >
        <div
          *cdkVirtualFor="let session of store.filteredSessions(); trackBy: trackBySessionId"
          class="cinema-panel mb-3 flex flex-col justify-between gap-3 p-4 transition-all hover:border-[var(--color-brand-primary)] hover:shadow-xs sm:flex-row sm:items-center"
        >
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <ch-age-badge [age]="session.movie.age" />
              <a
                [routerLink]="['/movie', session.movie.id]"
                class="cinema-card-title text-[var(--color-text-primary)] no-underline hover:text-[var(--color-brand-primary)]"
              >
                {{ session.movie.name }}
              </a>
              <span
                class="rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-accent)] uppercase"
              >
                {{ session.movieFormat }}
              </span>
            </div>
            <div class="text-xs text-[var(--color-text-secondary)]">
              <span>{{ session.cinema.name }}</span>
              <span class="mx-1">·</span>
              <span>{{ session.screenName }}</span>
              <span class="mx-1">·</span>
              <span>Ngày {{ session.showDate }}</span>
            </div>
          </div>

          <div class="flex items-center gap-5">
            <div class="text-right text-xs">
              <div class="text-[var(--color-text-muted)]">Còn chỗ</div>
              <div class="font-bold text-[var(--color-success)]">
                {{ session.totalSeat - session.bookedSeat }} / {{ session.totalSeat }} ghế
              </div>
            </div>

            <a
              [routerLink]="['/seats', session.id]"
              class="cinema-btn-primary !min-h-[40px] !px-4 !py-1.5 !text-xs font-bold"
            >
              <span>{{ session.showTime }} · Chọn ghế</span>
            </a>
          </div>
        </div>
      </cdk-virtual-scroll-viewport>
    </div>
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
