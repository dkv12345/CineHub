import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { BookingStore } from '@cinehub/web/booking/data-access';
import {
  ConcessionsStore,
  MAX_CONCESSION_QUANTITY,
  type ConcessionCategory,
} from '@cinehub/web/concessions/data-access';
import { ToastService } from '@cinehub/web/core';
import { fmt } from '@cinehub/web/shared/util';

const categories: readonly { readonly id: ConcessionCategory; readonly label: string }[] = [
  { id: 'COMBO', label: 'Combo' },
  { id: 'POPCORN', label: 'Bắp' },
  { id: 'DRINK', label: 'Nước' },
  { id: 'SNACK', label: 'Snack' },
];

@Component({
  selector: 'ch-concessions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="relative min-h-screen overflow-hidden bg-[#020617] text-white selection:bg-amber-400 selection:text-black"
    >
      <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        @if (bookingStore.movieBackdropUrl()) {
          <img
            [src]="bookingStore.movieBackdropUrl()"
            alt=""
            class="h-full w-full scale-105 object-cover object-center opacity-80 blur-[1px]"
          />
        }
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_#020617_80%)]"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-b from-[#020617]/85 via-[#020617]/75 to-[#020617]"
        ></div>
      </div>
      <div class="relative z-10 mx-auto max-w-[1450px] px-5 py-6 md:px-9">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            (click)="goBack()"
            aria-label="Quay lại chọn ghế"
            class="inline-flex items-center gap-2 text-xs font-black text-amber-300 transition hover:brightness-125"
          >
            ← Quay lại chọn ghế
          </button>
          <nav aria-label="Tiến trình đặt vé" class="flex items-center gap-2 text-xs font-black">
            <span
              class="rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
              >1 · Chọn ghế</span
            >
            <span
              class="rounded-full border border-amber-300 bg-amber-400/20 px-3.5 py-1.5 text-amber-300"
              >2 · Bắp nước</span
            >
            <span
              class="rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
              >3 · Thanh toán</span
            >
          </nav>
        </div>

        <div class="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <section class="flex flex-col gap-6">
            <header>
              <p class="text-xs font-black uppercase tracking-[.2em] text-amber-300">
                Bước 2 · Hoàn thiện trải nghiệm
              </p>
              <h1 class="text-2xl font-black text-white sm:text-3xl">Bắp nước rạp chiếu</h1>
              <p class="mt-1 text-xs font-bold text-slate-300">
                Chọn món phù hợp với số vé của bạn · Tối đa {{ maxQuantity }} mỗi món
              </p>
              <p class="mt-2 text-sm font-bold text-white/90">
                {{ bookingStore.movieTitle() }} · {{ bookingStore.cinemaName() }}
              </p>
            </header>

            <div class="flex flex-wrap gap-2" role="tablist" aria-label="Danh mục bắp nước">
              @for (category of categoryList; track category.id) {
                <button
                  type="button"
                  role="tab"
                  (click)="store.selectCategory(category.id)"
                  [attr.aria-selected]="store.selectedCategory() === category.id"
                  class="rounded-xl border px-4 py-2 text-xs font-black transition"
                  [class]="
                    store.selectedCategory() === category.id
                      ? 'border-amber-300 bg-amber-400 text-slate-950'
                      : 'border-white/30 bg-slate-900 text-white hover:border-amber-300'
                  "
                >
                  {{ category.label }}
                </button>
              }
            </div>

            @if (store.loading()) {
              <div
                role="status"
                class="rounded-2xl border border-white/15 bg-slate-900/80 p-10 text-center font-bold text-slate-200"
              >
                Đang tải danh sách bắp nước…
              </div>
            } @else if (store.error()) {
              <div class="rounded-2xl border border-red-400/40 bg-slate-900/90 p-8 text-center">
                <p class="font-bold text-white">{{ store.error() }}</p>
                <button
                  type="button"
                  (click)="loadMenu()"
                  class="mt-4 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950"
                >
                  Thử tải lại
                </button>
              </div>
            } @else if (store.items().length === 0) {
              <div class="rounded-2xl border border-white/15 bg-slate-900/80 p-10 text-center">
                <p class="font-bold text-white">Hiện chưa có món bắp nước phù hợp.</p>
                <button
                  type="button"
                  (click)="skip()"
                  class="mt-4 text-sm font-black text-amber-300"
                >
                  Bỏ qua
                </button>
              </div>
            } @else if (store.visibleItems().length === 0) {
              <p
                class="rounded-2xl border border-white/15 bg-slate-900/80 p-8 text-center text-sm text-slate-300"
              >
                Danh mục này hiện chưa có món.
              </p>
            } @else {
              <div class="grid gap-4 sm:grid-cols-2">
                @for (item of store.visibleItems(); track item.id) {
                  <article
                    class="flex flex-col justify-between rounded-3xl border-2 border-slate-700 bg-slate-900/90 p-5 shadow-xl transition hover:border-amber-400/80"
                    [class.opacity-60]="!item.eligible"
                  >
                    <div>
                      @if (item.imageUrl) {
                        <img
                          [src]="item.imageUrl"
                          [alt]="item.name"
                          class="h-40 w-full rounded-2xl object-cover"
                        />
                      } @else {
                        <div
                          class="grid h-40 w-full place-items-center rounded-2xl border border-white/10 bg-slate-800 text-4xl"
                          aria-hidden="true"
                        >
                          {{
                            item.category === 'DRINK'
                              ? '🥤'
                              : item.category === 'SNACK'
                                ? '🍫'
                                : '🍿'
                          }}
                        </div>
                      }
                      <h2 class="mt-4 text-base font-black text-white">{{ item.name }}</h2>
                      <p class="mt-1 text-xs leading-relaxed text-slate-300">
                        {{ item.description || 'Thông tin món đang được cập nhật.' }}
                      </p>
                      <p class="mt-2 text-xs font-bold text-amber-200">
                        Áp dụng khi mua {{ item.minSeats }}–{{ item.maxSeats }} vé
                      </p>
                      @if (!item.eligible) {
                        <p class="mt-2 text-xs font-bold text-red-300">
                          Không áp dụng với {{ bookingStore.selectedSeats().length }} vé đã chọn.
                        </p>
                      }
                    </div>

                    <div
                      class="mt-5 flex items-center justify-between border-t border-white/10 pt-4"
                    >
                      <span class="text-base font-black text-amber-300">{{
                        formatPrice(item.price)
                      }}</span>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          (click)="store.decrement(item.id)"
                          [disabled]="!item.eligible || (store.quantities()[item.id] ?? 0) === 0"
                          [attr.aria-label]="'Giảm số lượng ' + item.name"
                          class="grid h-9 w-9 place-items-center rounded-lg border border-white/40 bg-slate-950 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <span class="w-7 text-center text-sm font-black text-white">{{
                          store.quantities()[item.id] ?? 0
                        }}</span>
                        <button
                          type="button"
                          (click)="store.increment(item.id)"
                          [disabled]="
                            !item.eligible || (store.quantities()[item.id] ?? 0) >= maxQuantity
                          "
                          [attr.aria-label]="'Tăng số lượng ' + item.name"
                          class="grid h-9 w-9 place-items-center rounded-lg bg-amber-400 text-lg font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                }
              </div>
            }
          </section>

          <aside
            class="sticky top-6 flex flex-col gap-5 rounded-3xl border-2 border-slate-700 bg-slate-900/95 p-6 shadow-2xl"
          >
            <h2 class="text-base font-black uppercase tracking-wider text-amber-300">
              Thông tin đơn vé
            </h2>
            <div class="space-y-3 border-b border-white/10 pb-4 text-xs">
              <div class="text-base font-black text-white">{{ bookingStore.movieTitle() }}</div>
              <div class="text-slate-200">
                <span class="font-bold text-white">{{ bookingStore.cinemaName() }}</span>
                <div>
                  {{ bookingStore.screenName() }} · Suất
                  <b class="text-amber-300">{{ bookingStore.showTime() }}</b> ({{
                    bookingStore.format()
                  }})
                </div>
              </div>
              <div class="text-slate-200">
                Thời gian giữ ghế: <b class="text-amber-300">{{ bookingStore.holdFormatted() }}</b>
              </div>
              <div class="text-slate-200">
                Ghế đã chọn: <b class="text-emerald-300">{{ selectedSeatList() }}</b>
              </div>
              @if (store.selectedItems().length > 0) {
                <div class="border-t border-white/10 pt-3">
                  <p class="mb-2 font-bold text-white">Bắp nước đã chọn</p>
                  @for (item of store.selectedItems(); track item.id) {
                    <div class="flex justify-between gap-3 py-1 text-slate-200">
                      <span>{{ item.name }} × {{ item.quantity }}</span>
                      <span class="shrink-0 text-amber-300">
                        {{ formatPrice(item.price * item.quantity) }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
            <div class="space-y-2.5 text-xs font-bold">
              <div class="flex justify-between text-slate-200">
                <span>Tiền vé ({{ bookingStore.selectedSeats().length }} ghế):</span>
                <span class="text-amber-300">{{ formatPrice(bookingStore.seatsSubtotal()) }}</span>
              </div>
              <div class="flex justify-between text-slate-200">
                <span>Bắp nước:</span>
                <span class="text-amber-300">{{ formatPrice(store.totalAmount()) }}</span>
              </div>
            </div>
            <div class="flex items-end justify-between border-t border-white/10 pt-4">
              <span class="text-xs font-black uppercase tracking-wider text-amber-300"
                >Tổng cộng</span
              >
              <span class="text-2xl font-black tabular-nums text-amber-300">{{
                formatPrice(grandTotal())
              }}</span>
            </div>
            <p class="text-[11px] leading-relaxed text-slate-400">
              Đây là số tiền tạm tính để hiển thị; máy chủ mới là nơi tính giá cuối cùng.
            </p>
            <button
              type="button"
              (click)="proceedToCheckout()"
              class="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-4 text-sm font-black text-white"
            >
              Tiếp tục thanh toán →
            </button>
            <button
              type="button"
              (click)="skip()"
              class="w-full py-1 text-xs font-bold text-slate-300 hover:text-white"
            >
              Bỏ qua
            </button>
          </aside>
        </div>
      </div>
    </main>
  `,
})
export class ConcessionsPageComponent implements OnInit, OnDestroy {
  readonly store = inject(ConcessionsStore);
  readonly bookingStore = inject(BookingStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private holdTimer: ReturnType<typeof setInterval> | null = null;

  readonly categoryList = categories;
  readonly maxQuantity = MAX_CONCESSION_QUANTITY;
  readonly selectedSeatList = computed(() =>
    this.bookingStore
      .selectedSeats()
      .map((seat) => seat.id)
      .join(', '),
  );
  readonly grandTotal = computed(
    () => this.bookingStore.seatsSubtotal() + this.store.totalAmount(),
  );

  ngOnInit(): void {
    this.holdTimer = setInterval(() => this.bookingStore.decrementHold(), 1000);
    void this.loadMenu();
  }

  ngOnDestroy(): void {
    if (this.holdTimer) clearInterval(this.holdTimer);
  }

  async loadMenu(): Promise<void> {
    const removed = await this.store.loadFromApi(
      this.bookingStore.cinemaId(),
      this.bookingStore.selectedSeats().length,
    );
    if (removed.length > 0) {
      this.toast.show(`Đã bỏ món không còn áp dụng: ${removed.join(', ')}.`, 'warning');
    }
  }

  formatPrice(amount: number): string {
    return fmt(amount);
  }

  goBack(): void {
    void this.router.navigate(['/seats', this.bookingStore.showtimeId()]);
  }

  proceedToCheckout(): void {
    if (this.store.error()) {
      this.toast.show('Không thể tải danh sách bắp nước. Hãy thử lại hoặc chọn Bỏ qua.', 'warning');
      return;
    }
    void this.router.navigateByUrl('/checkout');
  }

  skip(): void {
    this.store.clearConcessions();
    void this.router.navigateByUrl('/checkout');
  }
}
