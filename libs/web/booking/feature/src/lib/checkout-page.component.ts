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
    <div class="cinema-container max-w-5xl py-8 sm:py-12">
      <div class="mb-6 space-y-1">
        <span class="cinema-eyebrow">Bước 2 / 3 · Thanh toán & Đơn vé</span>
        <h1 class="font-display text-[var(--text-h2)] font-bold text-[var(--color-text-primary)]">
          Xác nhận đơn vé điện tử
        </h1>
        <p class="text-xs text-[var(--color-text-secondary)]">
          Kiểm tra thông tin chi tiết vé, nhập mã giảm giá và chọn phương thức thanh toán an toàn.
        </p>
      </div>

      <div class="grid gap-8 lg:grid-cols-12 lg:gap-8 items-start">
        <!-- Left: Gateways & Voucher Selection -->
        <div class="space-y-6 lg:col-span-7">
          <!-- Payment Gateway Selection -->
          <div class="cinema-panel p-6 space-y-4 shadow-xs">
            <div>
              <span class="cinema-eyebrow">Phương thức thanh toán</span>
              <h2 class="font-display text-base font-bold text-[var(--color-text-primary)]">
                Chọn cổng thanh toán trực tuyến
              </h2>
            </div>

            <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Cổng thanh toán">
              @for (m of gateways; track m.code) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="bookingStore.paymentMethod() === m.code"
                  (click)="bookingStore.setPaymentMethod(m.code)"
                  class="rounded-[4px] border p-4 text-left transition-all"
                  [class]="
                    bookingStore.paymentMethod() === m.code
                      ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-subtle)] text-[var(--color-brand-primary)] font-bold shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-surface-secondary)]'
                  "
                >
                  <div class="text-sm font-bold">{{ m.name }}</div>
                  <div class="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                    {{ m.desc }}
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- Voucher Form -->
          <div class="cinema-panel p-6 space-y-3 shadow-xs">
            <div>
              <span class="cinema-eyebrow">Ưu đãi thành viên</span>
              <h2 class="font-display text-base font-bold text-[var(--color-text-primary)]">
                Mã giảm giá / Thẻ quà tặng
              </h2>
            </div>

            <form [formGroup]="voucherForm" (ngSubmit)="applyVoucher()" class="flex gap-2.5">
              <input
                type="text"
                formControlName="code"
                placeholder="Nhập mã (VD: CINEHUB50, GALAXY30)"
                aria-label="Mã giảm giá"
                class="cinema-input flex-1 uppercase"
              />
              <button type="submit" class="cinema-btn-secondary !min-h-[42px] !px-5 font-bold">
                Áp dụng
              </button>
            </form>

            @if (voucherMessage()) {
              <p class="text-xs font-semibold text-[var(--color-brand-primary)]">
                {{ voucherMessage() }}
              </p>
            }
          </div>
        </div>

        <!-- Right: Order Summary & Confirmation Action -->
        <div class="space-y-5 lg:col-span-5">
          <ch-booking-summary-card
            [movieTitle]="bookingStore.movieTitle()"
            [cinemaName]="bookingStore.cinemaName()"
            [showTime]="bookingStore.showTime()"
            [format]="bookingStore.format()"
            [seatLabels]="seatLabels()"
            [holdFormatted]="bookingStore.holdFormatted()"
            [totalAmount]="grandTotal()"
          />

          <!-- Line Items Breakdown -->
          <div
            class="cinema-panel p-5 space-y-2.5 text-xs text-[var(--color-text-secondary)] shadow-xs"
          >
            <div class="flex justify-between">
              <span>Tiền ghế ({{ seatLabels().length }} ghế):</span>
              <span class="font-semibold text-[var(--color-text-primary)]">{{
                formatCurrency(bookingStore.seatsSubtotal())
              }}</span>
            </div>
            <div class="flex justify-between">
              <span>Combo Bắp & Nước:</span>
              <span class="font-semibold text-[var(--color-text-primary)]">{{
                formatCurrency(concessionsStore.totalAmount())
              }}</span>
            </div>
            @if (bookingStore.discountAmount() > 0) {
              <div class="flex justify-between text-[var(--color-success)] font-semibold">
                <span>Ưu đãi voucher:</span>
                <span>− {{ formatCurrency(bookingStore.discountAmount()) }}</span>
              </div>
            }
          </div>

          <!-- Solid CineHub Burgundy Action Button -->
          <button
            type="button"
            (click)="confirmPayment()"
            class="cinema-btn-primary w-full !min-h-[48px] !text-sm font-bold shadow-sm"
          >
            Xác nhận thanh toán · {{ formatCurrency(grandTotal()) }}
          </button>

          <div class="text-center">
            <a
              routerLink="/concessions"
              class="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
            >
              + Đặt thêm Combo Bắp & Nước quầy ưu tiên
            </a>
          </div>
        </div>
      </div>
    </div>
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
    { code: 'VNPAY' as const, name: 'VNPay QR', desc: 'Quét mã VietQR ngân hàng' },
    { code: 'MOMO' as const, name: 'Ví MoMo', desc: 'Thanh toán tức thời' },
    { code: 'ZALOPAY' as const, name: 'ZaloPay', desc: 'Ví điện tử ZaloPay' },
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
