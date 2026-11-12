import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { BookingStore, type IssuedTicket } from '@cinehub/web/booking/data-access';
import { CatalogStore } from '@cinehub/web/catalog/data-access';
import { ToastService } from '@cinehub/web/core';
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
          <div class="flex flex-wrap gap-2">
            @for (tab of statusTabs; track tab.key) {
              <button
                type="button"
                (click)="ticketsStore.setStatusFilter(tab.key)"
                [attr.aria-pressed]="ticketsStore.statusFilter() === tab.key"
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
                        {{ ticket.showTime }}{{ ticket.showDate ? ' · ' + ticket.showDate : '' }}
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
                <div class="truncate text-center text-[10px] font-black uppercase text-slate-600">
                  {{ ticket.cinemaName }}
                </div>
                <div
                  class="pointer-events-none absolute -right-3 top-0 z-10 hidden h-full w-6 md:block"
                  aria-hidden="true"
                >
                  <span
                    class="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[#020617]"
                  ></span>
                  <span
                    class="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[#020617]"
                  ></span>
                </div>
              </div>

              <div
                class="z-10 hidden border-r-2 border-dashed border-white/20 md:block"
                aria-hidden="true"
              ></div>

              <!-- 2. Thân Vé Dark Luxury Bên Phải -->
              <div class="relative flex flex-1 flex-col justify-between overflow-hidden p-6">
                @if (ticket.movieBackdropUrl) {
                  <img
                    [src]="ticket.movieBackdropUrl"
                    alt=""
                    class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
                  />
                }
                <div
                  class="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/50"
                ></div>
                <div class="relative z-10">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <span
                      class="rounded-md border px-3 py-1 text-xs font-black"
                      [class]="ticketStatusClasses(ticket.status)"
                    >
                      {{ ticketStatusLabel(ticket.status) }}
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
                    Suất chiếu: {{ ticket.showTime
                    }}{{ ticket.showDate ? ' · ' + ticket.showDate : '' }} ({{ ticket.format }}) ·
                    Ghế:
                    {{ ticket.seats.join(', ') }}
                  </p>
                </div>

                <div
                  class="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4"
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
                    [attr.aria-label]="'Mở mã QR vào rạp cho vé ' + ticket.bookingCode"
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
            role="presentation"
          >
            <div
              class="relative w-full max-w-sm rounded-3xl border-2 border-amber-400/50 bg-slate-950 p-6 text-center shadow-2xl"
              (click)="$event.stopPropagation()"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ticket-qr-title"
            >
              <button
                type="button"
                (click)="closeQrModal()"
                aria-label="Đóng mã QR"
                class="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-white hover:bg-slate-700"
              >
                ✕
              </button>

              <div
                id="ticket-qr-title"
                class="mt-2 text-xs font-black uppercase tracking-wider text-amber-300"
              >
                MÃ VÉ ĐIỆN TỬ (HMAC-SHA256)
              </div>
              <h3 class="mt-1 text-lg font-black text-white">{{ ticket.movieTitle }}</h3>
              <p class="text-xs text-slate-400">
                {{ ticket.cinemaName }} · Ghế {{ ticket.seats.join(', ') }}
              </p>

              <!-- Simulated High-res QR Grid -->
              <div
                class="mx-auto my-5 grid h-[220px] w-[220px] rounded-2xl bg-white p-3 shadow-2xl"
                [style.grid-template-columns]="'repeat(25, minmax(0, 1fr))'"
                role="img"
                [attr.aria-label]="'Mã QR vé ' + ticket.bookingCode"
              >
                @for (cell of qrCells(ticket.qrPayload || ticket.bookingCode); track $index) {
                  <span class="min-h-0 min-w-0" [class.bg-black]="cell"></span>
                }
              </div>

              <div class="mb-3 rounded-xl border border-white/10 bg-slate-900 p-2">
                <p class="font-mono text-[10px] text-slate-300 break-all">
                  {{ ticket.qrPayload || ticket.bookingCode }}
                </p>
              </div>

              <button
                type="button"
                (click)="copyQr(ticket.qrPayload || ticket.bookingCode)"
                class="mb-3 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-300 transition"
              >
                📋 Sao chép mã QR để Soát vé (/staff/checkin)
              </button>

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
export class MyTicketsPageComponent implements OnInit {
  readonly bookingStore = inject(BookingStore);
  readonly ticketsStore = inject(TicketsStore);
  readonly catalogStore = inject(CatalogStore);
  private readonly toast = inject(ToastService);

  readonly activeQrTicket = signal<IssuedTicket | null>(null);

  readonly statusTabs = [
    { key: 'ALL' as const, label: 'Tất cả' },
    { key: 'VALID' as const, label: 'Sắp tới / Còn hiệu lực' },
    { key: 'USED' as const, label: 'Đã xem / Đã quét' },
  ];

  readonly filteredTickets = computed(() => {
    const status = this.ticketsStore.statusFilter();
    const list = this.bookingStore.issuedTickets();
    if (status === 'ALL') return list;
    return list.filter((t) => t.status === status);
  });

  ngOnInit(): void {
    void this.bookingStore.loadMyTicketsFromApi();
  }

  barcodePattern(code: string): number[] {
    return Array.from({ length: 38 }, (_, index) => {
      let hash = index * 31;
      for (const character of code) hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
      return (hash % 3) + 1;
    });
  }

  qrCells(code: string): boolean[] {
    const size = 25;
    const finders = [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ];
    let seed = 0;
    for (const character of code) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;

    return Array.from({ length: size * size }, (_, index) => {
      const row = Math.floor(index / size);
      const column = index % size;
      for (const [top, left] of finders) {
        const rowOffset = row - top;
        const columnOffset = column - left;
        if (rowOffset < 0 || columnOffset < 0 || rowOffset >= 7 || columnOffset >= 7) continue;
        return (
          rowOffset === 0 ||
          rowOffset === 6 ||
          columnOffset === 0 ||
          columnOffset === 6 ||
          (rowOffset >= 2 && rowOffset <= 4 && columnOffset >= 2 && columnOffset <= 4)
        );
      }
      return ((seed + index * 17 + (index % size) * 13) >>> 2) % 2 === 0;
    });
  }

  ticketStatusLabel(status: IssuedTicket['status']): string {
    switch (status) {
      case 'VALID':
        return 'Đã thanh toán';
      case 'USED':
        return 'Đã sử dụng';
      case 'CANCELLED':
      case 'VOID':
        return 'Đã hủy / Hoàn tiền';
    }
  }

  ticketStatusClasses(status: IssuedTicket['status']): string {
    switch (status) {
      case 'VALID':
        return 'border-emerald-400/40 bg-emerald-500/20 text-emerald-400';
      case 'USED':
        return 'border-slate-400/30 bg-slate-500/20 text-slate-300';
      case 'CANCELLED':
      case 'VOID':
        return 'border-red-400/40 bg-red-500/20 text-red-300';
    }
  }

  openQrModal(ticket: IssuedTicket): void {
    this.activeQrTicket.set(ticket);
  }

  closeQrModal(): void {
    this.activeQrTicket.set(null);
  }

  copyQr(payload: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(payload);
    }
    this.toast.show('Đã sao chép mã QR vé điện tử!', 'success');
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
