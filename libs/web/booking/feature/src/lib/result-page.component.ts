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
        <div class="cinema-panel-raised overflow-hidden p-6 sm:p-8 space-y-6">
          <!-- Top Confirmation Status -->
          <div class="text-center space-y-2">
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-[3px] border border-[var(--cinema-success)] bg-[var(--cinema-success-bg)] text-[var(--cinema-success)]"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span class="cinema-eyebrow">Thanh toán hoàn tất</span>
            <h1
              class="font-display text-[var(--text-h2)] font-semibold text-[var(--cinema-text-primary)]"
            >
              Vé điện tử xác nhận
            </h1>
            <p class="text-xs text-[var(--cinema-text-muted)]">
              Xuất trình mã vé hoặc mã QR tại quầy soát vé khi vào phòng chiếu.
            </p>
          </div>

          <!-- Cinema Ticket Perforated Card Stub -->
          <div
            class="rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] p-5 space-y-3.5 text-xs relative"
          >
            <!-- Booking Reference Code -->
            <div
              class="flex items-center justify-between border-b border-dashed border-[var(--cinema-border)] pb-3"
            >
              <span class="text-[var(--cinema-text-muted)]">Mã đặt vé:</span>
              <strong
                class="font-mono text-base font-bold tracking-widest text-[var(--cinema-accent)]"
              >
                {{ t.bookingCode }}
              </strong>
            </div>

            <!-- Details -->
            <div class="space-y-2 text-[var(--cinema-text-secondary)]">
              <div class="flex justify-between">
                <span class="text-[var(--cinema-text-muted)]">Phim:</span>
                <strong class="font-display text-sm text-[var(--cinema-text-primary)]">{{
                  t.movieTitle
                }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--cinema-text-muted)]">Cụm rạp:</span>
                <span class="text-[var(--cinema-text-primary)] font-medium"
                  >{{ t.cinemaName }} · {{ t.screenName }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--cinema-text-muted)]">Suất chiếu:</span>
                <span class="text-[var(--cinema-text-primary)] font-medium"
                  >{{ t.showTime }} ({{ t.format }})</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--cinema-text-muted)]">Ghế ngồi:</span>
                <strong class="text-[var(--cinema-accent)]">{{ t.seats.join(', ') }}</strong>
              </div>
            </div>

            <!-- Total and Payment Method -->
            <div
              class="flex items-center justify-between border-t border-dashed border-[var(--cinema-border)] pt-3 text-sm font-semibold"
            >
              <span class="text-[var(--cinema-text-secondary)]"
                >Tổng thanh toán ({{ t.paymentMethod }}):</span
              >
              <span class="font-display text-base text-[var(--cinema-text-primary)]">
                {{ formatCurrency(t.totalPaid) }}
              </span>
            </div>

            <!-- QR Code Verification Badge -->
            <div
              class="mt-3 flex items-center justify-center rounded-[2px] border border-[var(--cinema-border-subtle)] bg-[var(--cinema-surface)] py-3 text-[11px] text-[var(--cinema-text-muted)]"
            >
              <span>Mã QR điện tử CineHub đã kích hoạt</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2.5 sm:flex-row">
            <a routerLink="/my-tickets" class="cinema-btn-primary flex-1 !min-h-[44px] text-center">
              Xem trong Vé của tôi
            </a>
            <a routerLink="/" class="cinema-btn-secondary flex-1 !min-h-[44px] text-center">
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
