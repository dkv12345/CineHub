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
      <!-- Section Header with Modern Hospitality Tone -->
      <div
        class="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-end"
      >
        <div class="space-y-1">
          <span class="cinema-eyebrow">Dịch vụ ẩm thực phòng chiếu</span>
          <h1 class="font-display text-[var(--text-h2)] font-bold text-[var(--color-text-primary)]">
            Thực đơn Bắp & Quầy Bar CineHub
          </h1>
          <p class="text-xs text-[var(--color-text-secondary)]">
            Đặt trước combo bắp rang thơm lừng và nước giải khát để nhận tại quầy Bar ưu tiên.
          </p>
        </div>

        @if (store.totalCount() > 0) {
          <div
            class="cinema-panel-raised flex items-center gap-4 px-4 py-2.5 border-[var(--color-brand-primary)] shadow-sm"
          >
            <div class="text-xs">
              <div class="text-[var(--color-text-secondary)]">
                Đã chọn
                <strong class="text-[var(--color-text-primary)]">{{ store.totalCount() }}</strong>
                phần
              </div>
              <div class="font-display font-bold text-[var(--color-brand-primary)]">
                {{ formatPrice(store.totalAmount()) }}
              </div>
            </div>
            <a
              routerLink="/checkout"
              class="cinema-btn-primary !min-h-[38px] !px-4 !py-1 !text-xs font-bold"
            >
              Tiếp tục đặt vé
            </a>
          </div>
        }
      </div>

      <!-- Menu Grid -->
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        @for (item of store.items(); track item.id) {
          <article
            class="cinema-panel flex flex-col justify-between p-5 transition-all hover:border-[var(--color-brand-primary)] hover:shadow-xs"
          >
            <div>
              <!-- Minimal SVG Hospitality Icon (Zero Emojis) -->
              <div
                class="inline-flex h-10 w-10 items-center justify-center rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-brand-primary)]"
              >
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
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

              <h2 class="font-display mt-3.5 text-base font-bold text-[var(--color-text-primary)]">
                {{ item.name }}
              </h2>
              <p class="mt-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {{ item.desc }}
              </p>
            </div>

            <div
              class="mt-6 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4"
            >
              <span class="font-display text-sm font-bold text-[var(--color-brand-primary)]">
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
                  class="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--color-border)] bg-[#ffffff] text-xs font-bold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                >
                  −
                </button>
                <span class="w-6 text-center text-xs font-bold text-[var(--color-text-primary)]">
                  {{ store.quantities()[item.id] ?? 0 }}
                </span>
                <button
                  type="button"
                  (click)="store.increment(item.id)"
                  [attr.aria-label]="'Tăng ' + item.name"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-xs font-bold text-[#fffdf9] transition-colors hover:bg-[var(--color-brand-deep)]"
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
