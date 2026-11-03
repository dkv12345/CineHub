import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConcessionsStore } from '@cinehub/web/concessions/data-access';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-concessions-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cinema-container max-w-6xl py-8 sm:py-12">
      <!-- Section Header with Hospitality Tone -->
      <div
        class="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--cinema-border)] pb-6 sm:flex-row sm:items-end"
      >
        <div class="space-y-1">
          <span class="cinema-eyebrow">Dịch vụ ẩm thực phòng chiếu</span>
          <h1
            class="font-display text-[var(--text-h2)] font-semibold text-[var(--cinema-text-primary)]"
          >
            Thực đơn Bắp & Quầy Bar CineHub
          </h1>
          <p class="text-xs text-[var(--cinema-text-muted)]">
            Đặt trước combo bắp rang thơm lừng và nước giải khát để nhận tại quầy Bar ưu tiên.
          </p>
        </div>

        @if (store.totalCount() > 0) {
          <div
            class="cinema-panel-raised flex items-center gap-4 px-4 py-2.5 border-[var(--cinema-accent)]"
          >
            <div class="text-xs">
              <div class="text-[var(--cinema-text-muted)]">
                Đã chọn
                <strong class="text-[var(--cinema-text-primary)]">{{ store.totalCount() }}</strong>
                phần
              </div>
              <div class="font-display font-semibold text-[var(--cinema-accent)]">
                {{ formatPrice(store.totalAmount()) }}
              </div>
            </div>
            <a
              routerLink="/checkout"
              class="cinema-btn-primary !min-h-[38px] !px-3.5 !py-1 !text-xs font-semibold"
            >
              Tiếp tục đặt vé
            </a>
          </div>
        }
      </div>

      <!-- Menu Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (item of store.items(); track item.id) {
          <article
            class="cinema-panel flex flex-col justify-between p-5 transition-colors hover:border-[var(--cinema-accent)]"
          >
            <div>
              <!-- Minimal SVG Hospitality Icon (Zero Emojis) -->
              <div
                class="inline-flex h-10 w-10 items-center justify-center rounded-[2px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] text-[var(--cinema-accent)]"
              >
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
              </div>

              <h2
                class="font-display mt-3.5 text-base font-semibold text-[var(--cinema-text-primary)]"
              >
                {{ item.name }}
              </h2>
              <p class="mt-1.5 text-xs text-[var(--cinema-text-muted)] leading-relaxed">
                {{ item.desc }}
              </p>
            </div>

            <div
              class="mt-6 flex items-center justify-between border-t border-[var(--cinema-border-subtle)] pt-4"
            >
              <span class="font-display text-sm font-semibold text-[var(--cinema-text-primary)]">
                {{ formatPrice(item.price) }}
              </span>

              <!-- Stepper Control -->
              <div
                class="flex items-center gap-1.5"
                role="group"
                [attr.aria-label]="'Số lượng ' + item.name"
              >
                <button
                  type="button"
                  (click)="store.decrement(item.id)"
                  [attr.aria-label]="'Giảm ' + item.name"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-[2px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] text-xs text-[var(--cinema-text-secondary)] transition-colors hover:border-[var(--cinema-accent)] hover:text-[var(--cinema-text-primary)]"
                >
                  −
                </button>
                <span
                  class="w-6 text-center text-xs font-semibold text-[var(--cinema-text-primary)]"
                >
                  {{ store.quantities()[item.id] ?? 0 }}
                </span>
                <button
                  type="button"
                  (click)="store.increment(item.id)"
                  [attr.aria-label]="'Tăng ' + item.name"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-[2px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-raised)] text-xs text-[var(--cinema-text-primary)] transition-colors hover:border-[var(--cinema-accent)] hover:bg-[var(--cinema-accent)] hover:text-[#171512]"
                >
                  +
                </button>
              </div>
            </div>
          </article>
        }
      </div>
    </div>
  `,
})
export class ConcessionsPageComponent implements OnInit {
  readonly store = inject(ConcessionsStore);

  ngOnInit(): void {
    void this.store.loadFromApi();
  }

  formatPrice(amount: number): string {
    return fmt(amount);
  }
}
