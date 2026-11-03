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
    <section class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-white sm:text-3xl">Vé điện tử của tôi</h1>
          <p class="mt-1 text-xs text-slate-400">
            Quản lý toàn bộ vé đã đặt và mã QR vào phòng chiếu
          </p>
        </div>

        <div class="flex gap-2">
          @for (tab of statusTabs; track tab.key) {
            <button
              type="button"
              (click)="ticketsStore.setStatusFilter(tab.key)"
              class="rounded-xl border px-3.5 py-1.5 text-xs font-bold transition"
              [class]="
                ticketsStore.statusFilter() === tab.key
                  ? 'border-amber-400 bg-amber-500 text-slate-950'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
              "
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        @for (ticket of filteredTickets(); track ticket.id) {
          <article
            class="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl"
          >
            <div>
              <div class="flex items-center justify-between">
                <span
                  class="rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300"
                >
                  {{ ticket.bookingCode }}
                </span>
                <span class="text-xs text-slate-400">{{ ticket.paymentMethod }}</span>
              </div>

              <h2 class="mt-3 text-lg font-extrabold text-white">
                {{ ticket.movieTitle }}
              </h2>
              <p class="mt-1 text-xs text-slate-300">
                {{ ticket.cinemaName }} · {{ ticket.screenName }}
              </p>
              <p class="mt-1 text-xs text-amber-300 font-semibold">
                Suất chiếu: {{ ticket.showTime }} ({{ ticket.format }}) · Ghế:
                {{ ticket.seats.join(', ') }}
              </p>
            </div>

            <div class="mt-5 flex items-center justify-between border-t border-slate-800 pt-3">
              <span class="text-sm font-black text-white">
                {{ formatCurrency(ticket.totalPaid) }}
              </span>
              <a
                [routerLink]="['/result', ticket.id]"
                class="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500 hover:text-slate-950"
              >
                Xem mã QR
              </a>
            </div>
          </article>
        }
      </div>
    </section>
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
