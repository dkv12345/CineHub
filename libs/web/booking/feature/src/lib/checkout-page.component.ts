import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { applyVoucherSchema } from '@cinehub/contracts';
import { BookingStore } from '@cinehub/web/booking/data-access';
import { BookingSummaryCardComponent } from '@cinehub/web/booking/ui';
import { ConcessionsStore } from '@cinehub/web/concessions/data-access';
import { ToastService } from '@cinehub/web/core';
import { fmt, zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BookingSummaryCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 class="mb-6 text-2xl font-black text-white sm:text-3xl">
        Thanh toán & Xác nhận vé điện tử
      </h1>

      <div class="grid gap-8 lg:grid-cols-12">
        <div class="lg:col-span-7 space-y-6">
          <!-- Payment Gateway Picker -->
          <div class="rounded-2xl border border-slate-800 bg-slate-900/85 p-5">
            <h2 class="text-base font-bold text-white">Chọn phương thức thanh toán</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              @for (m of gateways; track m.code) {
                <button
                  type="button"
                  (click)="bookingStore.setPaymentMethod(m.code)"
                  class="rounded-xl border p-3.5 text-left transition"
                  [class]="
                    bookingStore.paymentMethod() === m.code
                      ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  "
                >
                  <div class="text-sm font-extrabold">{{ m.name }}</div>
                  <div class="mt-0.5 text-[11px] opacity-75">{{ m.desc }}</div>
                </button>
              }
            </div>
          </div>

          <!-- Voucher Form (Contract-First Zod Validator) -->
          <div class="rounded-2xl border border-slate-800 bg-slate-900/85 p-5">
            <h2 class="text-base font-bold text-white">Mã giảm giá / Voucher</h2>
            <form [formGroup]="voucherForm" (ngSubmit)="applyVoucher()" class="mt-3 flex gap-2">
              <input
                type="text"
                formControlName="code"
                placeholder="Nhập mã (VD: CINEHUB50, GALAXY30)"
                aria-label="Mã giảm giá"
                class="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white uppercase placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
              >
                Áp dụng
              </button>
            </form>
            @if (voucherMessage()) {
              <p class="mt-2 text-xs text-amber-300">{{ voucherMessage() }}</p>
            }
          </div>
        </div>

        <div class="lg:col-span-5 space-y-5">
          <ch-booking-summary-card
            [movieTitle]="bookingStore.movieTitle()"
            [cinemaName]="bookingStore.cinemaName()"
            [showTime]="bookingStore.showTime()"
            [format]="bookingStore.format()"
            [seatLabels]="seatLabels()"
            [holdFormatted]="bookingStore.holdFormatted()"
            [totalAmount]="grandTotal()"
          />

          <div
            class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs space-y-2 text-slate-300"
          >
            <div class="flex justify-between">
              <span>Tiền ghế:</span>
              <span>{{ formatCurrency(bookingStore.seatsSubtotal()) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Combo Bắp & Nước:</span>
              <span>{{ formatCurrency(concessionsStore.totalAmount()) }}</span>
            </div>
            <div class="flex justify-between text-emerald-400">
              <span>Giảm giá Voucher:</span>
              <span>− {{ formatCurrency(bookingStore.discountAmount()) }}</span>
            </div>
          </div>

          <button
            type="button"
            (click)="confirmPayment()"
            class="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-300 hover:to-teal-400"
          >
            Xác nhận thanh toán · {{ formatCurrency(grandTotal()) }}
          </button>

          <div class="text-center">
            <a routerLink="/concessions" class="text-xs text-amber-400 hover:underline">
              + Thêm Combo Bắp & Nước
            </a>
          </div>
        </div>
      </div>
    </section>
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
    { code: 'VNPAY' as const, name: 'VNPay QR', desc: 'Quét QR ngân hàng' },
    { code: 'MOMO' as const, name: 'Ví MoMo', desc: 'Thanh toán siêu tốc' },
    { code: 'ZALOPAY' as const, name: 'ZaloPay', desc: 'Miễn phí giao dịch' },
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

  formatCurrency(n: number): string {
    return fmt(n);
  }
}
