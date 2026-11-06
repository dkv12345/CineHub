import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BookingStore, type IssuedTicket } from '@cinehub/web/booking/data-access';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { fmt } from '@cinehub/web/shared/util';
import { TicketsStore } from '@cinehub/web/tickets/data-access';

@Component({
  selector: 'ch-my-tickets-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <section class="mx-auto max-w-5xl px-5 py-8 md:px-9">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">Quản lý vé</p>
            <h1 class="mt-1 text-2xl font-black text-white sm:text-3xl">Vé điện tử của tôi</h1>
          </div>

          <!-- Status Filter Tabs -->
          <div class="flex gap-2">
            @for (tab of statusTabs; track tab.key) {
              <button
                type="button"
                (click)="ticketsStore.setStatusFilter(tab.key)"
                class="rounded-xl border-2 px-4 py-2 text-xs font-black transition"
                [class]="
                  ticketsStore.statusFilter() === tab.key
                    ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                    : 'border-white/20 bg-slate-900 text-white/80 hover:border-white/50'
                "
              >
                {{ tab.label }}
              </button>
            }
          </div>
        </div>

        <!-- Ticket Stubs List -->
        <ul class="flex flex-col gap-6">
          @for (ticket of filteredTickets(); track ticket.id) {
            <li
              class="relative flex flex-col overflow-hidden rounded-3xl border-2 border-white/20 bg-slate-900/90 shadow-2xl transition duration-300 hover:border-amber-400/80 md:flex-row"
            >
              <!-- 1. Cuống Vé Trắng Bên Trái (White Stub) -->
              <div
                class="relative flex w-full shrink-0 flex-col justify-between bg-white p-5 text-slate-950 md:w-[260px]"
              >
                <div>
                  <div
                    class="flex items-center justify-between border-b border-slate-200 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500"
                  >
                    <span>RẠP CHIẾU</span>
                    <span class="font-bold text-red-600">{{ ticket.format || '2D' }}</span>
                  </div>

                  <div class="mt-3 grid grid-cols-2 gap-2 text-left">
                    <div>
                      <span class="block text-[9px] font-black uppercase text-slate-400">
                        HÀNG
                      </span>
                      <b class="text-xs font-black text-slate-900">{{
                        ticket.seats[0]?.[0] || 'F'
                      }}</b>
                    </div>
                    <div>
                      <span class="block text-[9px] font-black uppercase text-slate-400">GHẾ</span>
                      <b class="text-xs font-black text-slate-900">{{ ticket.seats.join(', ') }}</b>
                    </div>
                    <div class="col-span-2 mt-1">
                      <span class="block text-[9px] font-black uppercase text-slate-400">
                        NGÀY & GIỜ
                      </span>
                      <b class="text-xs font-black text-slate-900">
                        {{ ticket.showTime }}
                      </b>
                    </div>
                  </div>
                </div>

                <!-- Barcode Graphics -->
                <div
                  class="my-4 flex flex-col items-center justify-center border-t border-slate-200 pt-3"
                >
                  <div class="flex h-9 items-stretch gap-[2px] overflow-hidden px-1">
                    @for (w of barcodePattern(ticket.bookingCode); track $index) {
                      <span [style.width.px]="w" class="inline-block h-full bg-slate-950"></span>
                    }
                  </div>
                  <span
                    class="mt-1 font-mono text-[10px] font-black tracking-widest text-slate-700"
                  >
                    {{ ticket.bookingCode }}
                  </span>
                </div>
              </div>

              <!-- 2. Thân Vé Dark Luxury Bên Phải -->
              <div class="relative flex flex-1 flex-col justify-between p-6">
                <div>
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <span
                      class="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400"
                    >
                      {{ ticket.status === 'VALID' ? 'Đã thanh toán' : 'Đã sử dụng' }}
                    </span>
                    <span class="text-xs font-bold text-white/50">{{ ticket.paymentMethod }}</span>
                  </div>

                  <h2 class="mt-3 text-xl font-black text-white md:text-2xl">
                    {{ ticket.movieTitle }}
                  </h2>
                  <p class="mt-1 text-xs font-bold text-slate-300">
                    {{ ticket.cinemaName }} · {{ ticket.screenName }}
                  </p>
                  <p class="mt-1 text-xs font-black text-amber-300">
                    Suất chiếu: {{ ticket.showTime }} ({{ ticket.format }}) · Ghế:
                    {{ ticket.seats.join(', ') }}
                  </p>
                </div>

                <div
                  class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4"
                >
                  <div>
                    <span class="text-[11px] font-semibold text-white/60">Tổng thanh toán:</span>
                    <div class="text-lg font-black text-amber-300">
                      {{ formatCurrency(ticket.totalPaid) }}
                    </div>
                  </div>

                  <button
                    type="button"
                    (click)="openQrModal(ticket)"
                    class="inline-flex items-center gap-2 rounded-xl border-2 border-amber-400/60 bg-amber-400/15 px-4 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-400 hover:text-slate-950"
                  >
                    <span>📱</span>
                    <span>Mã QR vào rạp</span>
                  </button>
                </div>
              </div>
            </li>
          } @empty {
            <div
              class="rounded-3xl border-2 border-slate-700 bg-slate-900/80 p-12 text-center text-sm font-bold text-white/60"
            >
              Bạn chưa có vé nào trong mục này. Hãy đặt vé xem phim ngay!
            </div>
          }
        </ul>

        <!-- Zoomed QR Code Modal -->
        @if (activeQrTicket(); as ticket) {
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
            (click)="closeQrModal()"
          >
            <div
              class="relative w-full max-w-sm rounded-3xl border-2 border-amber-400/50 bg-slate-950 p-6 text-center shadow-2xl"
              (click)="$event.stopPropagation()"
            >
              <button
                type="button"
                (click)="closeQrModal()"
                class="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-white hover:bg-slate-700"
              >
                ✕
              </button>

              <div class="mt-2 text-xs font-black uppercase tracking-wider text-amber-300">
                MÃ VÉ ĐIỆN TỬ
              </div>
              <h3 class="mt-1 text-lg font-black text-white">{{ ticket.movieTitle }}</h3>
              <p class="text-xs text-slate-400">
                {{ ticket.cinemaName }} · Ghế {{ ticket.seats.join(', ') }}
              </p>

              <!-- Simulated High-res QR Grid -->
              <div
                class="mx-auto my-6 grid h-[200px] w-[200px] place-items-center rounded-2xl bg-white p-3 shadow-2xl"
              >
                <div class="flex flex-col items-center justify-center text-slate-950">
                  <div class="font-mono text-3xl font-black">QR</div>
                  <div class="font-mono text-xs font-black tracking-widest mt-2">
                    {{ ticket.bookingCode }}
                  </div>
                </div>
              </div>

              <p class="text-[11px] font-bold text-slate-400">
                Đưa mã này cho nhân viên soát vé tại cửa phòng chiếu.
              </p>
            </div>
          </div>
        }
      </section>
    </main>
  `,
})
export class MyTicketsPageComponent {
  readonly bookingStore = inject(BookingStore);
  readonly ticketsStore = inject(TicketsStore);
  readonly catalogStore = inject(CatalogStore);

  readonly activeQrTicket = signal<IssuedTicket | null>(null);

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

  barcodePattern(code: string): number[] {
    const arr = [2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1];
    return arr;
  }

  openQrModal(ticket: IssuedTicket): void {
    this.activeQrTicket.set(ticket);
  }

  closeQrModal(): void {
    this.activeQrTicket.set(null);
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
