import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-result-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ticket(); as t) {
      <div class="cinema-container max-w-lg py-12">
        <div class="cinema-panel-raised p-6 sm:p-8 space-y-6 shadow-md">
          <!-- Top Confirmation Status -->
          <div class="text-center space-y-2">
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-[4px] border border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)] shadow-2xs"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span class="cinema-eyebrow">Giao dịch thành công</span>
            <h1 class="cinema-heading-section text-[var(--color-text-primary)]">
              Vé điện tử CineHub
            </h1>
            <p class="text-xs text-[var(--color-text-secondary)]">
              Xuất trình mã vé hoặc mã QR tại quầy soát vé khi vào phòng chiếu.
            </p>
          </div>

          <!-- Cinema Ticket Perforated Card Stub -->
          <div
            class="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-5 space-y-4 text-xs relative shadow-2xs"
          >
            <!-- Booking Reference Code -->
            <div
              class="flex items-center justify-between border-b border-dashed border-[var(--color-border)] pb-3"
            >
              <span class="text-[var(--color-text-secondary)] font-medium">Mã đặt vé:</span>
              <strong
                class="font-mono text-base font-bold tracking-widest text-[var(--color-brand-primary)]"
              >
                {{ t.bookingCode }}
              </strong>
            </div>

            <!-- Details -->
            <div class="space-y-2 text-[var(--color-text-secondary)]">
              <div class="flex justify-between">
                <span class="text-[var(--color-text-secondary)]">Phim:</span>
                <strong class="font-semibold text-sm text-[var(--color-text-primary)]">{{
                  t.movieTitle
                }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--color-text-secondary)]">Cụm rạp:</span>
                <span class="text-[var(--color-text-primary)] font-semibold"
                  >{{ t.cinemaName }} · {{ t.screenName }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--color-text-secondary)]">Suất chiếu:</span>
                <span class="text-[var(--color-text-primary)] font-semibold"
                  >{{ t.showTime }} ({{ t.format }})</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--color-text-secondary)]">Ghế ngồi:</span>
                <strong class="text-[var(--color-brand-primary)]">{{ t.seats.join(', ') }}</strong>
              </div>
            </div>

            <!-- Total and Payment Method -->
            <div
              class="flex items-center justify-between border-t border-dashed border-[var(--color-border)] pt-3 text-sm font-bold"
            >
              <span class="text-[var(--color-text-secondary)]"
                >Tổng thanh toán ({{ t.paymentMethod }}):</span
              >
              <span
                class="cinema-price font-semibold tabular-nums text-base text-[var(--color-brand-primary)]"
              >
                {{ formatCurrency(t.totalPaid) }}
              </span>
            </div>

            <!-- QR Code Verification Badge -->
            <div
              class="mt-3 flex items-center justify-center rounded-[3px] border border-[var(--color-border)] bg-[#ffffff] py-3 text-[11px] font-semibold text-[var(--color-text-secondary)] shadow-2xs"
            >
              <span>Mã QR điện tử đã sẵn sàng xuất trình</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2.5 sm:flex-row">
            <a
              routerLink="/my-tickets"
              class="cinema-btn-primary flex-1 !min-h-[44px] text-center font-bold"
            >
              Xem trong Vé của tôi
            </a>
            <a
              routerLink="/"
              class="cinema-btn-secondary flex-1 !min-h-[44px] text-center font-semibold"
            >
              Về trang chủ
            </a>
          </div>
        </div>
      </div>
    }
  `,
})
export class ResultPageComponent {
  private readonly store = inject(BookingStore);
  readonly ticketId = input<string>('');

  readonly ticket = computed(() => this.store.findTicketById(this.ticketId()));

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
