import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { fmt } from '@cinehub/web/shared/util';
import { TicketsStore } from '@cinehub/web/tickets/data-access';

@Component({
  selector: 'ch-my-tickets-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cinema-container max-w-5xl py-8 sm:py-12">
      <div
        class="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-end"
      >
        <div class="space-y-1">
          <span class="cinema-eyebrow">Tài khoản thành viên</span>
          <h1 class="font-display text-[var(--text-h2)] font-bold text-[var(--color-text-primary)]">
            Vé điện tử của tôi
          </h1>
          <p class="text-xs text-[var(--color-text-secondary)]">
            Quản lý lịch sử đặt vé, trạng thái thanh toán và mã QR vào phòng chiếu.
          </p>
        </div>

        <!-- Status Filter Tabs -->
        <div
          class="inline-flex rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-2xs"
          role="tablist"
          aria-label="Lọc vé theo trạng thái"
        >
          @for (tab of statusTabs; track tab.key) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="ticketsStore.statusFilter() === tab.key"
              (click)="ticketsStore.setStatusFilter(tab.key)"
              class="rounded-[3px] px-4 py-1.5 text-xs font-bold transition-colors"
              [class]="
                ticketsStore.statusFilter() === tab.key
                  ? 'bg-[var(--color-brand-primary)] text-[#fffdf9] shadow-xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              "
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <!-- Tickets Grid -->
      <div class="grid gap-5 md:grid-cols-2">
        @for (ticket of filteredTickets(); track ticket.id) {
          <article
            class="cinema-panel flex flex-col justify-between p-5 transition-all hover:border-[var(--color-brand-primary)] hover:shadow-sm"
          >
            <div class="space-y-3">
              <div
                class="flex items-center justify-between border-b border-dashed border-[var(--color-border)] pb-3"
              >
                <span
                  class="font-mono text-xs font-bold tracking-wider text-[var(--color-brand-primary)]"
                >
                  {{ ticket.bookingCode }}
                </span>
                <span
                  class="rounded-[3px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  [class]="
                    ticket.status === 'VALID'
                      ? 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]'
                  "
                >
                  {{ ticket.status === 'VALID' ? 'Còn hiệu lực' : 'Đã sử dụng' }}
                </span>
              </div>

              <div>
                <h2
                  class="font-display text-base font-bold leading-tight text-[var(--color-text-primary)]"
                >
                  {{ ticket.movieTitle }}
                </h2>
                <div class="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {{ ticket.cinemaName }} · {{ ticket.screenName }}
                </div>
              </div>

              <div class="text-xs text-[var(--color-text-secondary)] space-y-0.5">
                <div>
                  <span class="text-[var(--color-text-secondary)]">Suất:</span>
                  <span class="ml-1 font-semibold text-[var(--color-text-primary)]"
                    >{{ ticket.showTime }} ({{ ticket.format }})</span
                  >
                </div>
                <div>
                  <span class="text-[var(--color-text-secondary)]">Ghế:</span>
                  <span class="ml-1 font-bold text-[var(--color-brand-primary)]">{{
                    ticket.seats.join(', ')
                  }}</span>
                </div>
              </div>
            </div>

            <div
              class="mt-5 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3"
            >
              <div>
                <div class="text-[10px] text-[var(--color-text-secondary)]">
                  Đã thanh toán ({{ ticket.paymentMethod }})
                </div>
                <div class="font-display text-sm font-bold text-[var(--color-brand-primary)]">
                  {{ formatCurrency(ticket.totalPaid) }}
                </div>
              </div>

              <a
                [routerLink]="['/result', ticket.id]"
                class="cinema-btn-secondary !min-h-[36px] !px-3.5 !py-1 !text-xs font-bold"
              >
                Xem mã vé QR
              </a>
            </div>
          </article>
        } @empty {
          <div
            class="cinema-panel col-span-full p-12 text-center text-sm text-[var(--color-text-secondary)]"
          >
            Chưa có vé nào trong danh mục này.
          </div>
        }
      </div>
    </div>
  `,
})
export class MyTicketsPageComponent {
  readonly bookingStore = inject(BookingStore);
  readonly ticketsStore = inject(TicketsStore);

  readonly statusTabs = [
    { key: 'ALL' as const, label: 'Tất cả' },
    { key: 'VALID' as const, label: 'Còn hiệu lực' },
    { key: 'USED' as const, label: 'Đã sử dụng' },
  ];

  readonly filteredTickets = computed(() => {
    const status = this.ticketsStore.statusFilter();
    const list = this.bookingStore.issuedTickets();
    if (status === 'ALL') return list;
    return list.filter((t) => t.status === status);
  });

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
