import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { ConcessionsStore } from '@cinehub/web/concessions/data-access';
import { fmt } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-concessions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-[#020617] text-white selection:bg-amber-400 selection:text-black">
      <div class="mx-auto max-w-[1450px] px-5 py-6 md:px-9">
        <!-- Nút quay lại & Tiến trình thanh toán 3 Bước -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-2 text-xs font-black transition hover:brightness-125 text-amber-300"
          >
            ← Quay lại chọn ghế
          </button>

          <!-- 3-Step Progress Indicator: Step 2 Active -->
          <nav aria-label="Tiến trình đặt vé" class="flex items-center gap-2 text-xs font-black">
            <div
              class="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-black text-white"
                >1</span
              >
              <span>Chọn ghế</span>
            </div>
            <span class="h-0.5 w-4 rounded-full bg-amber-300/40"></span>
            <div
              class="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-400/20 px-3.5 py-1.5 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-black"
                >2</span
              >
              <span>Bắp nước</span>
            </div>
            <span class="h-0.5 w-4 rounded-full bg-white/20"></span>
            <div
              class="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-black text-white"
                >3</span
              >
              <span>Thanh toán</span>
            </div>
          </nav>
        </div>

        <!-- Bố cục 2 Cột giống nhaky_concession -->
        <div class="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <!-- Cột trái: Danh sách Combo bắp nước -->
          <div class="flex flex-col gap-6">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-2xl font-black text-white sm:text-3xl">Combo bắp nước rạp chiếu</h1>
                <p class="mt-1 text-xs font-bold text-slate-400">
                  Thưởng thức trọn vẹn suất chiếu với bắp rang bơ nóng giòn và nước giải khát
                </p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              @for (item of store.items(); track item.id) {
                <article
                  class="flex flex-col justify-between rounded-3xl border-2 border-slate-700 bg-slate-900/90 p-5 shadow-xl transition hover:border-amber-400/80 backdrop-blur-xl"
                >
                  <div>
                    <div class="flex items-center justify-between">
                      <span
                        class="rounded-md border border-amber-300/40 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black text-amber-300"
                      >
                        COMBO
                      </span>
                      <span class="text-lg">🍿🥤</span>
                    </div>

                    <h2 class="mt-3 text-base font-black text-white">{{ item.name }}</h2>
                    <p class="mt-1 text-xs font-medium text-slate-400 leading-relaxed">
                      {{ item.desc }}
                    </p>
                  </div>

                  <div class="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <span class="text-base font-black text-amber-300">
                      {{ formatPrice(item.price) }}
                    </span>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="store.decrement(item.id)"
                        [attr.aria-label]="'Giảm ' + item.name"
                        class="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white/40 bg-slate-950 text-sm font-black text-white transition hover:border-amber-400 hover:text-amber-300"
                      >
                        −
                      </button>
                      <span class="w-7 text-center text-sm font-black text-white">
                        {{ store.quantities()[item.id] ?? 0 }}
                      </span>
                      <button
                        type="button"
                        (click)="store.increment(item.id)"
                        [attr.aria-label]="'Tăng ' + item.name"
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-sm font-black text-slate-950 transition hover:bg-amber-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              }
            </div>
          </div>

          <!-- Cột phải Sidebar: Tóm tắt đơn hàng & Nút tiếp tục -->
          <aside
            class="sticky top-6 flex flex-col gap-5 rounded-3xl border-2 border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Thông tin đơn vé
            </h2>

            <div class="space-y-3 border-b border-white/10 pb-4 text-xs">
              <div class="text-base font-black text-white">{{ bookingStore.movieTitle() }}</div>
              <div class="text-slate-300">
                <span class="font-bold text-white">{{ bookingStore.cinemaName() }}</span>
                <div>
                  {{ bookingStore.screenName }} · Suất
                  <b class="text-amber-300">{{ bookingStore.showTime() }}</b> ({{
                    bookingStore.format()
                  }})
                </div>
              </div>
              <div class="text-slate-300">
                Ghế đã chọn: <b class="text-emerald-400">{{ selectedSeatList() }}</b>
              </div>
            </div>

            <!-- Price Breakdown -->
            <div class="space-y-2.5 text-xs font-bold">
              <div class="flex justify-between text-slate-300">
                <span>Tiền vé ({{ bookingStore.selectedSeats().length }} ghế):</span>
                <span class="text-amber-300 font-black">{{
                  formatPrice(bookingStore.seatsSubtotal())
                }}</span>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>Combo bắp nước:</span>
                <span class="text-amber-300 font-black">{{
                  formatPrice(store.totalAmount())
                }}</span>
              </div>
            </div>

            <!-- Grand Total -->
            <div class="flex items-end justify-between border-t border-white/10 pt-4">
              <span class="text-xs font-black uppercase tracking-wider text-amber-300">
                Tổng cộng
              </span>
              <span class="text-2xl font-black tabular-nums text-amber-300">
                {{ formatPrice(grandTotal()) }}
              </span>
            </div>

            <!-- Action Button -->
            <button
              type="button"
              (click)="proceedToCheckout()"
              class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-4 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
            >
              Tiếp tục thanh toán →
            </button>
          </aside>
        </div>
      </div>
    </main>
  `,
})
export class ConcessionsPageComponent implements OnInit {
  readonly store = inject(ConcessionsStore);
  readonly bookingStore = inject(BookingStore);
  private readonly router = inject(Router);

  readonly selectedSeatList = computed(() => {
    const seats = this.bookingStore.selectedSeats().map((s) => s.id);
    return seats.length > 0 ? seats.join(', ') : 'Chưa chọn';
  });

  readonly grandTotal = computed(
    () => this.bookingStore.seatsSubtotal() + this.store.totalAmount(),
  );

  ngOnInit(): void {
    void this.store.loadFromApi();
  }

  formatPrice(amount: number): string {
    return fmt(amount);
  }

  goBack(): void {
    void this.router.navigateByUrl('/seats');
  }

  proceedToCheckout(): void {
    void this.router.navigateByUrl('/checkout');
  }
}
