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
        <h1
          class="font-display text-[var(--text-h2)] font-semibold text-[var(--cinema-text-primary)]"
        >
          Lịch chiếu rạp toàn quốc
        </h1>
        <p class="text-xs text-[var(--cinema-text-muted)]">
          Tra cứu suất chiếu thời gian thực theo cụm rạp, định dạng và chọn ghế 3D POV trực quan.
        </p>
      </div>

      <!-- Date Strip Tabs -->
      <div class="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Chọn ngày chiếu">
        <button
          type="button"
          (click)="store.updateFilters({ date: null })"
          class="rounded-[2px] border px-3.5 py-1.5 text-xs font-medium transition-colors"
          [class]="
            !store.filters().date
              ? 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] font-semibold'
              : 'border-[var(--cinema-border)] bg-[var(--cinema-surface)] text-[var(--cinema-text-secondary)] hover:border-[var(--cinema-border-subtle)] hover:text-[var(--cinema-text-primary)]'
          "
        >
          Tất cả các ngày
        </button>
        @for (d of store.days(); track d.isoDate) {
          <button
            type="button"
            (click)="store.updateFilters({ date: d.isoDate })"
            class="rounded-[2px] border px-3.5 py-1.5 text-xs font-medium transition-colors"
            [class]="
              store.filters().date === d.isoDate
                ? 'border-[var(--cinema-accent)] bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] font-semibold'
                : 'border-[var(--cinema-border)] bg-[var(--cinema-surface)] text-[var(--cinema-text-secondary)] hover:border-[var(--cinema-border-subtle)] hover:text-[var(--cinema-text-primary)]'
            "
          >
            <span>{{ d.short }}</span>
            <span class="ml-1 text-[var(--cinema-text-muted)]">({{ d.num }})</span>
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
        class="mt-5 flex items-center justify-between border-b border-[var(--cinema-border-subtle)] pb-3 text-xs text-[var(--cinema-text-secondary)]"
      >
        <span>
          Hiện có
          <strong class="text-[var(--cinema-accent)]">{{ store.filteredSessions().length }}</strong>
          suất chiếu phù hợp
        </span>
        <span class="text-[var(--cinema-text-muted)] hidden sm:inline">
          Dữ liệu phòng chiếu cập nhật liên tục
        </span>
      </div>

      <!-- CDK Virtual Scroll Viewport with Refined Editorial Cards -->
      <cdk-virtual-scroll-viewport
        itemSize="112"
        class="mt-4 h-[620px] w-full rounded-[var(--radius-panel)] border border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] p-3"
      >
        <div
          *cdkVirtualFor="let session of store.filteredSessions(); trackBy: trackBySessionId"
          class="cinema-panel mb-3 flex flex-col justify-between gap-3 p-4 transition-colors hover:border-[var(--cinema-accent)] sm:flex-row sm:items-center"
        >
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <ch-age-badge [age]="session.movie.age" />
              <a
                [routerLink]="['/movie', session.movie.id]"
                class="font-display text-sm font-semibold text-[var(--cinema-text-primary)] no-underline hover:text-[var(--cinema-accent)]"
              >
                {{ session.movie.name }}
              </a>
              <span
                class="rounded-[2px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-raised)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--cinema-accent)]"
              >
                {{ session.movieFormat }}
              </span>
            </div>
            <div class="text-xs text-[var(--cinema-text-muted)]">
              <span>{{ session.cinema.name }}</span>
              <span class="mx-1">·</span>
              <span>{{ session.screenName }}</span>
              <span class="mx-1">·</span>
              <span>Ngày {{ session.showDate }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right text-xs">
              <div class="text-[var(--cinema-text-muted)]">Còn khả dụng</div>
              <div class="font-semibold text-[var(--cinema-success)]">
                {{ session.totalSeat - session.bookedSeat }} / {{ session.totalSeat }} ghế
              </div>
            </div>

            <a
              [routerLink]="['/seats', session.id]"
              class="cinema-btn-primary !min-h-[38px] !px-4 !py-1.5 !text-xs"
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
