import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { applyVoucherSchema } from '@cinehub/contracts';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { ConcessionsStore } from '@cinehub/web/concessions/data-access';
import { ToastService } from '@cinehub/web/core';
import { fmt, zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule],
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
            ← Quay lại bắp nước
          </button>

          <!-- 3-Step Progress Indicator: Step 3 Active -->
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
              class="flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/60 px-3.5 py-1.5 text-white/70"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-black text-white"
                >2</span
              >
              <span>Bắp nước</span>
            </div>
            <span class="h-0.5 w-4 rounded-full bg-amber-300/40"></span>
            <div
              class="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-400/20 px-3.5 py-1.5 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
            >
              <span
                class="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-black"
                >3</span
              >
              <span>Thanh toán</span>
            </div>
          </nav>
        </div>

        <!-- Bố cục 2 Cột giống nhaky_concession -->
        <div class="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <!-- Cột trái: Thông tin đơn hàng chi tiết -->
          <div class="flex flex-col gap-6">
            <!-- Header Phim -->
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <h1 class="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {{ bookingStore.movieTitle().toUpperCase() }}
                </h1>
                <span class="rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-black">
                  IMDb 8.5/10
                </span>
              </div>
              <div class="mt-2 flex items-center gap-3">
                <span
                  class="rounded border border-amber-300/80 bg-amber-400/20 px-2 py-0.5 text-xs font-black text-amber-300"
                >
                  T13
                </span>
                <span class="text-xs font-extrabold text-white">
                  120 PHÚT | ĐIỆN ẢNH CHIẾU RẠP
                </span>
              </div>
            </div>

            <!-- Chi tiết đơn vé -->
            <section
              class="rounded-3xl border-2 border-slate-700 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl"
            >
              <h2 class="text-lg font-black text-amber-300">Thông tin đơn hàng</h2>

              <dl class="mt-4 divide-y divide-white/10 text-sm">
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Phim</dt>
                  <dd class="text-right font-black text-white">{{ bookingStore.movieTitle() }}</dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Suất chiếu</dt>
                  <dd class="text-right font-black text-white">
                    {{ bookingStore.showTime() }} · Hôm nay ·
                    <span class="text-amber-300">{{ bookingStore.format() }}</span>
                  </dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Phòng chiếu</dt>
                  <dd class="text-right font-black text-white">{{ bookingStore.screenName }}</dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Rạp chiếu</dt>
                  <dd class="text-right font-black text-white">{{ bookingStore.cinemaName() }}</dd>
                </div>
                <div class="flex justify-between gap-6 py-3.5">
                  <dt class="font-semibold text-white/70">Ghế ngồi</dt>
                  <dd class="text-right font-black text-emerald-400">
                    {{ seatLabels().length > 0 ? seatLabels().join(', ') : 'F7, F8' }}
                  </dd>
                </div>
                @if (concessionsStore.selectedItems().length > 0) {
                  <div class="flex justify-between gap-6 py-3.5">
                    <dt class="font-semibold text-white/70">Bắp nước</dt>
                    <dd class="text-right font-black text-amber-300">
                      @for (c of concessionsStore.selectedItems(); track c.id) {
                        <div>{{ c.name }} (x{{ c.qty }})</div>
                      }
                    </dd>
                  </div>
                }
              </dl>
            </section>
          </div>

          <!-- Cột phải: Phương thức & Nút Thanh toán -->
          <aside
            class="sticky top-6 flex flex-col gap-5 rounded-3xl border-2 border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <fieldset>
              <legend class="text-base font-black uppercase tracking-wider text-amber-300">
                Phương thức thanh toán
              </legend>

              <div class="mt-4 space-y-3">
                @for (m of gateways; track m.code) {
                  <label
                    (click)="bookingStore.setPaymentMethod(m.code)"
                    class="flex cursor-pointer items-center gap-4 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition"
                    [class]="
                      bookingStore.paymentMethod() === m.code
                        ? 'border-amber-400/80 bg-slate-950/70 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                        : 'border-white/20 bg-slate-950/20 hover:border-white/40'
                    "
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      [checked]="bookingStore.paymentMethod() === m.code"
                      class="h-4 w-4 accent-amber-400"
                    />
                    <span
                      class="grid h-9 w-11 place-items-center rounded-lg text-xs font-black text-white shadow-md"
                      [class]="m.badge"
                    >
                      {{ m.mark }}
                    </span>
                    <span class="min-w-0 flex-1">
                      <b class="block text-sm font-black text-white">{{ m.name }}</b>
                      <small class="mt-0.5 block text-[11px] font-semibold text-white/70">{{
                        m.desc
                      }}</small>
                    </span>
                  </label>
                }
              </div>
            </fieldset>

            <!-- Voucher Code Input -->
            <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <span class="text-xs font-bold text-amber-300">Mã giảm giá / Voucher:</span>
              <form [formGroup]="voucherForm" (ngSubmit)="applyVoucher()" class="mt-2 flex gap-2">
                <input
                  type="text"
                  formControlName="code"
                  placeholder="CINEHUB20"
                  class="flex-1 rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs font-bold text-white uppercase placeholder-white/40 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="submit"
                  class="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition"
                >
                  Áp dụng
                </button>
              </form>
              @if (voucherMessage()) {
                <p class="mt-2 text-xs text-amber-300 font-semibold">{{ voucherMessage() }}</p>
              }
            </div>

            <!-- Bảng tính tổng tiền -->
            <div class="space-y-2 border-t border-white/10 pt-4 text-xs font-bold">
              <div class="flex justify-between">
                <span class="text-white">Vé ({{ seatLabels().length || 1 }} ghế)</span>
                <span class="tabular-nums text-amber-300">{{
                  formatCurrency(bookingStore.seatsSubtotal() || 115000)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white">Bắp nước</span>
                <span class="tabular-nums text-amber-300">{{
                  formatCurrency(concessionsStore.totalAmount())
                }}</span>
              </div>
              @if (bookingStore.discountAmount() > 0) {
                <div class="flex justify-between text-emerald-400">
                  <span>Giảm giá:</span>
                  <span>− {{ formatCurrency(bookingStore.discountAmount()) }}</span>
                </div>
              }
            </div>

            <!-- Total Amount -->
            <div class="flex items-end justify-between border-t border-white/10 pt-4">
              <span class="text-xs font-black uppercase tracking-wider text-amber-300">
                Tổng cộng
              </span>
              <span class="text-2xl font-black tabular-nums text-amber-300">
                {{ formatCurrency(grandTotal()) }}
              </span>
            </div>

            <!-- Action Buttons -->
            <button
              type="button"
              (click)="confirmPayment()"
              class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 py-4 text-sm font-black text-white shadow-xl shadow-red-900/50 transition hover:brightness-125"
            >
              Thanh toán ngay
            </button>

            <button
              type="button"
              (click)="goBack()"
              class="w-full py-1 text-xs font-bold text-white/60 transition hover:text-white"
            >
              Hủy thanh toán
            </button>
          </aside>
        </div>
      </div>
    </main>
  `,
})
export class CheckoutPageComponent {
  readonly bookingStore = inject(BookingStore);
  readonly concessionsStore = inject(ConcessionsStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly voucherMessage = signal<string | null>(null);

  readonly gateways = [
    {
      code: 'VNPAY' as const,
      name: 'VNPay',
      desc: 'Quét QR hoặc thẻ ATM nội địa',
      badge: 'bg-[#0b4da2]',
      mark: 'VN',
    },
    {
      code: 'ZALOPAY' as const,
      name: 'ZaloPay',
      desc: 'Ví điện tử ZaloPay',
      badge: 'bg-[#1473e6]',
      mark: 'Z',
    },
    {
      code: 'MOMO' as const,
      name: 'Ví MoMo',
      desc: 'Ví điện tử MoMo',
      badge: 'bg-[#a50064]',
      mark: 'M',
    },
  ];

  readonly voucherForm = this.fb.nonNullable.group(
    {
      code: [''],
    },
    { validators: [zodFormGroupValidator(applyVoucherSchema)] },
  );

  readonly seatLabels = computed(() => this.bookingStore.selectedSeats().map((s) => s.id));

  readonly grandTotal = computed(() => {
    const subtotal =
      (this.bookingStore.seatsSubtotal() || 115000) + this.concessionsStore.totalAmount();
    return Math.max(0, subtotal - this.bookingStore.discountAmount());
  });

  applyVoucher(): void {
    const raw = this.voucherForm.controls.code.value;
    const res = this.bookingStore.applyVoucher(raw);
    this.voucherMessage.set(res.message);
    this.toast.show(res.message, res.ok ? 'success' : 'warning');
  }

  confirmPayment(): void {
    const ticket = this.bookingStore.completeCheckout(this.concessionsStore.totalAmount());
    this.concessionsStore.clearConcessions();
    this.toast.show(`Đặt vé thành công! Mã đặt vé: ${ticket.bookingCode}`, 'success');
    void this.router.navigate(['/result', ticket.id]);
  }

  goBack(): void {
    void this.router.navigateByUrl('/concessions');
  }

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
